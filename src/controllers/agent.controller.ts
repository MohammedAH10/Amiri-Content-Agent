import { RequestHandler } from 'express';

import * as contentAgentService from '../services/contentAgent.service';
import { ContentProposalDocument } from '../types';

const serializeProposal = (proposal: ContentProposalDocument) => {
  const plain = proposal.toObject() as { fileId: unknown } & Record<string, unknown>;
  const populated = plain.fileId as { _id?: { toString(): string } } & Record<string, unknown> | null;

  let fileId = String(proposal.fileId);
  let file: Record<string, unknown> | null = null;

  if (populated && typeof populated === 'object' && '_id' in populated) {
    fileId = populated._id.toString();
    file = {
      id: fileId,
      name: populated.name,
      type: populated.type,
      size: populated.size,
      url: populated.url,
      description: populated.description,
      tags: populated.tags,
      uploadDate: populated.uploadDate,
      status: populated.status,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };
  }

  return {
    id: proposal._id.toString(),
    fileId,
    file,
    userId: proposal.userId,
    angle: proposal.angle,
    caption: proposal.caption,
    writeUp: proposal.writeUp,
    hashtags: proposal.hashtags,
    previewText: proposal.previewText,
    instructions: proposal.instructions || null,
    status: proposal.status,
    feedback: proposal.feedback || null,
    reviewedAt: proposal.reviewedAt,
    modelUsed: proposal.modelUsed,
    generationSource: proposal.generationSource,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
  };
};

export const generateForFile: RequestHandler = async (req, res, next) => {
  try {
    const fileId = String(req.params.fileId);
    const { userId, instructions } = req.body;

    const proposal = await contentAgentService.runAgentForFile(fileId, {
      userId,
      instructions,
    });

    res.status(201).json({ success: true, data: serializeProposal(proposal) });
  } catch (error) {
    next(error);
  }
};

export const listProposals: RequestHandler = async (req, res, next) => {
  try {
    const { status, userId } = req.query;
    const proposals = await contentAgentService.listProposals({
      status: status as string | undefined,
      userId: userId as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: proposals.map(serializeProposal),
      count: proposals.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getProposal: RequestHandler = async (req, res, next) => {
  try {
    const proposal = await contentAgentService.getProposalById(String(req.params.id));
    res.status(200).json({ success: true, data: serializeProposal(proposal) });
  } catch (error) {
    next(error);
  }
};

export const approveProposal: RequestHandler = async (req, res, next) => {
  try {
    const proposal = await contentAgentService.approveProposal(String(req.params.id));
    res.status(200).json({ success: true, data: serializeProposal(proposal) });
  } catch (error) {
    next(error);
  }
};

export const rejectProposal: RequestHandler = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    const proposal = await contentAgentService.rejectProposal(
      String(req.params.id),
      feedback,
    );
    res.status(200).json({ success: true, data: serializeProposal(proposal) });
  } catch (error) {
    next(error);
  }
};

export const regenerateProposal: RequestHandler = async (req, res, next) => {
  try {
    const { instructions } = req.body;
    const proposal = await contentAgentService.regenerateProposal(
      String(req.params.id),
      instructions,
    );
    res.status(200).json({ success: true, data: serializeProposal(proposal) });
  } catch (error) {
    next(error);
  }
};