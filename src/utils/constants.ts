export const FILE_STATUSES = [
  'upload_initiated',
  'scan_in_progress',
  'approved',
  'rejected',
  'pending_review',
] as const;

export const FILE_TYPES = ['image', 'video', 'audio', 'document'] as const;

export const FILE_VISIBILITY = ['private', 'public'] as const;

export const POST_DRAFT_STATUSES = ['draft', 'accepted', 'discarded'] as const;

export const CONTENT_PROPOSAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const CONTENT_PROPOSAL_SOURCES = ['ai', 'fallback'] as const;

export const AI_REQUEST_TYPES = [
  'generate',
  'regenerate',
  'hashtags',
  'recommend',
  'improve',
  'related',
  'agent',
] as const;

export type FileStatus = (typeof FILE_STATUSES)[number];
export type FileType = (typeof FILE_TYPES)[number];
export type FileVisibility = (typeof FILE_VISIBILITY)[number];
export type PostDraftStatus = (typeof POST_DRAFT_STATUSES)[number];
export type ContentProposalStatus = (typeof CONTENT_PROPOSAL_STATUSES)[number];
export type ContentProposalSource = (typeof CONTENT_PROPOSAL_SOURCES)[number];
export type AiRequestType = (typeof AI_REQUEST_TYPES)[number];

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'AI_UNAVAILABLE',
  'AI_TIMEOUT',
  'AI_SAFETY',
  'DB_ERROR',
  'INTERNAL_ERROR',
  'INVALID_STATE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
