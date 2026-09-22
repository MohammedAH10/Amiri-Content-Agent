import ContentProposal from '../models/ContentProposal';
import File from '../models/File';
import { ContentProposalDocument } from '../types';
import { ContentProposalStatus } from '../utils/constants';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { generateContentPackage } from './agent.service';

export type AutoRunResult =
  | { ran: true; proposal: ContentProposalDocument }
  | { ran: false; reason: 'SKIPPED_BY_CONFIG' | 'NO_FILE' | 'NOT_APPROVED' | 'ALREADY_PENDING' };

export const getAgentFile = async (fileId: string) => {
  let file;
  try {
    file = await File.findById(fileId);
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to query file for agent run.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!file) {
    throw new AppError(404, 'NOT_FOUND', `File ${fileId} not found.`);
  }

  return file;
};

export const runAgentForFile = async (
  fileId: string,
  opts: { userId?: string; instructions?: string } = {},
): Promise<ContentProposalDocument> => {
  const file = await getAgentFile(fileId);

  const output = await generateContentPackage(
    {
      name: file.name,
      description: file.description,
      tags: file.tags,
      type: file.type,
    },
    opts.instructions,
    opts.userId,
  );

  const existing = await ContentProposal.findOne({ fileId: file._id });

  if (existing) {
    existing.angle = output.angle;
    existing.caption = output.caption;
    existing.writeUp = output.writeUp;
    existing.hashtags = output.hashtags;
    existing.previewText = output.previewText;
    existing.instructions = opts.instructions || existing.instructions;
    existing.status = 'pending';
    existing.feedback = null;
    existing.reviewedAt = null;
    existing.modelUsed = output.modelUsed;
    existing.generationSource = output.generationSource;
    if (opts.userId) existing.userId = opts.userId;
    await existing.save();
    logger.info('Agent proposal regenerated', {
      proposalId: existing._id.toString(),
      fileId: file._id.toString(),
      source: output.generationSource,
    });
    return existing;
  }

  const proposal = await ContentProposal.create({
    fileId: file._id,
    userId: opts.userId || null,
    angle: output.angle,
    caption: output.caption,
    writeUp: output.writeUp,
    hashtags: output.hashtags,
    previewText: output.previewText,
    instructions: opts.instructions || null,
    status: 'pending',
    modelUsed: output.modelUsed,
    generationSource: output.generationSource,
  });

  logger.info('Agent proposal created', {
    proposalId: proposal._id.toString(),
    fileId: file._id.toString(),
    source: output.generationSource,
  });

  return proposal;
};

export const autoRunAgentForFile = async (
  fileId: string,
  opts: { userId?: string } = {},
): Promise<AutoRunResult> => {
  if (process.env.AUTO_AGENT_ENABLED !== 'true') {
    return { ran: false, reason: 'SKIPPED_BY_CONFIG' };
  }
  if (process.env.NODE_ENV === 'test') {
    return { ran: false, reason: 'SKIPPED_BY_CONFIG' };
  }

  const file = await getAgentFile(fileId);
  if (file.status !== 'approved') {
    return { ran: false, reason: 'NOT_APPROVED' };
  }

  const pending = await ContentProposal.findOne({ fileId: file._id, status: 'pending' });
  if (pending) {
    return { ran: false, reason: 'ALREADY_PENDING' };
  }

  try {
    const proposal = await runAgentForFile(fileId, opts);
    return { ran: true, proposal };
  } catch (error) {
    logger.error('Auto agent run failed', {
      fileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ran: false, reason: 'NO_FILE' };
  }
};

export const scheduleAutoAgentRun = (
  fileId: string,
  opts: { userId?: string } = {},
): void => {
  setImmediate(() => {
    autoRunAgentForFile(fileId, opts).catch((error) => {
      logger.error('Scheduled auto agent run crashed', {
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
};

export const getProposalById = async (id: string): Promise<ContentProposalDocument> => {
  let proposal;
  try {
    proposal = await ContentProposal.findById(id).populate('fileId');
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to query content proposal.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!proposal) {
    throw new AppError(404, 'NOT_FOUND', `Content proposal ${id} not found.`);
  }

  return proposal;
};

export const listProposals = async (filter: {
  status?: ContentProposalStatus | string;
  userId?: string | string[];
} = {}): Promise<ContentProposalDocument[]> => {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.userId) query.userId = filter.userId;

  return ContentProposal.find(query).sort({ updatedAt: -1 }).populate('fileId').exec();
};

export const approveProposal = async (id: string): Promise<ContentProposalDocument> => {
  const proposal = await getProposalById(id);

  if (proposal.status === 'approved') {
    return proposal;
  }
  if (proposal.status !== 'pending' && proposal.status !== 'rejected') {
    throw new AppError(400, 'INVALID_STATE', `Cannot approve a proposal with status "${proposal.status}".`);
  }

  proposal.status = 'approved';
  proposal.reviewedAt = new Date();
  proposal.feedback = null;
  await proposal.save();

  logger.info('Content proposal approved', { proposalId: id, fileId: proposal.fileId.toString() });
  return proposal;
};

export const rejectProposal = async (
  id: string,
  feedback?: string,
): Promise<ContentProposalDocument> => {
  const proposal = await getProposalById(id);

  if (proposal.status === 'rejected') {
    return proposal;
  }
  if (proposal.status !== 'pending' && proposal.status !== 'approved') {
    throw new AppError(400, 'INVALID_STATE', `Cannot reject a proposal with status "${proposal.status}".`);
  }

  proposal.status = 'rejected';
  proposal.reviewedAt = new Date();
  proposal.feedback = feedback || null;
  await proposal.save();

  logger.info('Content proposal rejected', { proposalId: id, fileId: proposal.fileId.toString() });
  return proposal;
};

export const regenerateProposal = async (
  id: string,
  instructions?: string,
): Promise<ContentProposalDocument> => {
  const proposal = await getProposalById(id);
  return runAgentForFile(proposal.fileId.toString(), { instructions });
};