import File from '../models/File';
import { FileAttrs, FileDocument } from '../types';
import { FileStatus, FileType } from '../utils/constants';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { moderateFile } from './moderation.service';
import { scheduleAutoAgentRun } from './contentAgent.service';
import { REJECT_THRESHOLD, FLAG_THRESHOLD } from './safety/moderationPolicy';

type CreateFileInput = Omit<FileAttrs, 'status' | 'uploadDate' | 'moderationReason'>;

export type CreateFileFromUploadInput = {
  name: string;
  type: FileType;
  size: number;
  tags: string[];
  data: Buffer;
  description?: string;
};

export type InitiateS3UploadInput = {
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  tags: string[];
  description: string;
  data: Buffer;
  s3Bucket: string;
  s3Key: string;
  s3Url: string;
  ownerId: string | null;
};

export type ModerationResultInput = {
  score: number;
  categories: string[];
};

type ListFilesFilters = {
  type?: FileType;
  status?: FileStatus;
};

type UpdateFileStatusInput = {
  status: 'approved' | 'rejected';
  moderationReason?: string;
};

export const createFile = async (input: CreateFileInput): Promise<FileDocument> => {
  try {
    return File.create({
      ...input,
      status: 'upload_initiated',
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to save file record to database.', {
        originalError: error.message,
      });
    }
    throw error;
  }
};

export const createFileFromUpload = async (input: CreateFileFromUploadInput): Promise<FileDocument> => {
  try {
    const file = await File.create({
      name: input.name,
      type: input.type,
      size: input.size,
      tags: input.tags,
      description: input.description || '',
      data: input.data,
      status: 'upload_initiated',
      url: '_',
    });
    file.set('url', `/api/files/${file._id.toString()}/data`);
    await file.save();
    return file;
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to save file record to database.', {
        originalError: error.message,
      });
    }
    throw error;
  }
};

export const createFileFromUploadWithModeration = async (
  input: CreateFileFromUploadInput,
): Promise<FileDocument> => {
  const file = await createFileFromUpload(input);

  const result = moderateFile(file.name, file.tags, file.description);

  const updateData: { status: FileStatus; moderationReason?: string } = {
    status: result.action,
    moderationReason: result.reason,
  };

  if (result.action === 'approved') {
    updateData.status = 'approved';
    updateData.moderationReason = result.reason;
  } else if (result.action === 'pending_review') {
    updateData.status = 'pending_review';
    updateData.moderationReason = result.reason;
  } else {
    updateData.status = 'rejected';
    updateData.moderationReason = result.reason;
  }

  file.set(updateData);
  await file.save();

  logger.info('Upload moderation complete', {
    fileId: file._id.toString(),
    fileName: file.name,
    action: result.action,
    score: result.score,
  });

  if (file.status === 'approved') {
    scheduleAutoAgentRun(file._id.toString());
  }

  return file;
};

export const listFiles = async (filters: ListFilesFilters = {}): Promise<FileDocument[]> => {
  const query: Partial<Pick<FileAttrs, 'type' | 'status'>> = {};

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = 'approved';
  }

  let files: FileDocument[];
  try {
    files = await File.find(query).sort({ uploadDate: -1 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to retrieve files from database.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!filters.status) {
    try {
      const filteredCount = await File.countDocuments({
        ...(filters.type ? { type: filters.type } : {}),
        status: { $ne: 'approved' },
      });

      if (filteredCount > 0) {
        logger.warn('Non-approved files filtered from list response', {
          filteredCount,
          type: filters.type,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && (error as any).name === 'MongoServerError') {
        throw new AppError(500, 'DB_ERROR', 'Failed to count files in database.', {
          originalError: error.message,
        });
      }
      throw error;
    }
  }

  return files;
};

export const getFileById = async (fileId: string): Promise<FileDocument> => {
  let file: FileDocument | null;
  try {
    file = await File.findById(fileId);
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to retrieve file from database.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!file) {
    throw new AppError(404, 'NOT_FOUND', 'File not found');
  }

  return file;
};

export const updateFileStatus = async (
  fileId: string,
  input: UpdateFileStatusInput,
): Promise<FileDocument> => {
  const update: Record<string, unknown> = {
    status: input.status,
    moderationReason: input.status === 'rejected' ? input.moderationReason : undefined,
  };

  if (input.status === 'approved') {
    update.moderationReason = undefined;
  }

  let file: FileDocument | null;
  try {
    file = await File.findByIdAndUpdate(fileId, update, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to update file status in database.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!file) {
    throw new AppError(404, 'NOT_FOUND', 'File not found');
  }

  logger.info('File status updated', {
    fileId: file._id.toString(),
    status: file.status,
  });

  return file;
};

export const initiateS3Upload = async (
  input: InitiateS3UploadInput,
): Promise<FileDocument> => {
  try {
    const file = await File.create({
      name: input.name,
      type: input.type,
      mimeType: input.mimeType,
      size: input.size,
      tags: input.tags,
      description: input.description,
      data: input.data,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      s3Url: input.s3Url,
      ownerId: input.ownerId,
      status: 'upload_initiated',
      url: `https://${input.s3Bucket}.s3.us-east-1.amazonaws.com/${input.s3Key}`,
    });

    const fileId = file._id.toString();
    file.set('url', `/api/files/${fileId}/data`);

    await file.save();

    logger.info('S3 file record created', {
      fileId,
      s3Key: input.s3Key,
      status: 'upload_initiated',
    });

    const scanFile = await File.findByIdAndUpdate(
      fileId,
      {
        status: 'scan_in_progress',
        moderationReason: 'Scan initiated — S3 upload complete, moderation pipeline triggered.',
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (!scanFile) {
      throw new AppError(500, 'DB_ERROR', 'File record lost during scan transition');
    }

    logger.info('S3 workflow: scan initiated', {
      fileId,
      s3Key: input.s3Key,
      status: 'scan_in_progress',
    });

    return scanFile;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to save S3 file record to database.', {
        originalError: error.message,
      });
    }
    throw error;
  }
};

export const processModerationResult = async (
  fileId: string,
  result: ModerationResultInput,
): Promise<FileDocument> => {
  let file: FileDocument | null;
  try {
    file = await File.findById(fileId);
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to query file in database.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!file) {
    throw new AppError(404, 'NOT_FOUND', 'File not found');
  }

  if (file.status !== 'scan_in_progress') {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Cannot process moderation result for file in status "${file.status}". Expected "scan_in_progress".`,
    );
  }

  const { score } = result;
  const categories = result.categories.length > 0
    ? result.categories.join(', ')
    : 'moderation scan completed';

  let newStatus: FileStatus;
  let reason: string;

  if (score >= REJECT_THRESHOLD) {
    newStatus = 'rejected';
    reason = `Auto-rejected by moderation pipeline — safety score ${score}/100. Categories: ${categories}.`;
  } else if (score >= FLAG_THRESHOLD) {
    newStatus = 'pending_review';
    reason = `Flagged for admin review — safety score ${score}/100. Categories: ${categories}.`;
  } else {
    newStatus = 'approved';
    reason = `Auto-approved by moderation pipeline — safety score ${score}/100. No significant issues.`;
  }

  try {
    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      { status: newStatus, moderationReason: reason },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedFile) {
      throw new AppError(500, 'DB_ERROR', 'Failed to update file with moderation result.');
    }

    logger.info('Moderation pipeline completed', {
      fileId,
      previousStatus: file.status,
      newStatus,
      score,
    });

    if (newStatus === 'approved') {
      scheduleAutoAgentRun(fileId);
    }

    return updatedFile;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to update file with moderation result.', {
        originalError: error.message,
      });
    }
    throw error;
  }
};

export const getFileByS3Key = async (s3Key: string): Promise<FileDocument> => {
  let file: FileDocument | null;
  try {
    file = await File.findOne({ s3Key });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).name === 'MongoServerError') {
      throw new AppError(500, 'DB_ERROR', 'Failed to query file by S3 key.', {
        originalError: error.message,
      });
    }
    throw error;
  }

  if (!file) {
    throw new AppError(404, 'NOT_FOUND', `File not found for S3 key: ${s3Key}`);
  }

  return file;
};
