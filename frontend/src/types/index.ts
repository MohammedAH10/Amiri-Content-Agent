export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface FileListResponse extends ApiResponse<FileRecord[]> {
  count: number;
}

export type FileType = 'image' | 'video' | 'audio' | 'document';
export type FileStatus = 'upload_initiated' | 'scan_in_progress' | 'approved' | 'rejected';
export type Tone = 'professional' | 'casual' | 'excited';
export type PostFormat = 'short' | 'long' | 'bullet';

export interface FileRecord {
  id: string;
  name: string;
  type: FileType;
  size: number;
  url: string;
  description?: string;
  tags: string[];
  uploadDate: string;
  status: FileStatus;
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Variation {
  label: string;
  content: string;
}

export interface GeneratePostResult {
  content: string;
  variations: Variation[];
  improvements: string[];
  relatedIdeas: string[];
  fallbackUsed: boolean;
}

export interface SuggestHashtagsResult {
  hashtags: string[];
}

export interface SuggestImprovementsResult {
  improvements: string[];
}

export interface RelatedIdeasResult {
  relatedIdeas: string[];
}

export interface MediaRecommendationResult {
  recommendations: ScoredRecommendation[];
  noResultReason: string | null;
}

export interface ScoredRecommendation {
  fileId: string;
  name: string;
  type: string;
  score: number;
  reason: string;
  url: string;
  size: number;
  tags: string[];
  uploadDate: string;
}

export interface DraftRecord {
  id: string;
  userId: string;
  inputText: string;
  tone: Tone;
  format: PostFormat;
  generatedContent: GeneratePostResult | null;
  selectedVariation: string | null;
  acceptedOutput: string | null;
  attachedFileIds: string[];
  status: 'draft' | 'accepted' | 'discarded';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFilePayload {
  name: string;
  type: FileType;
  size: number;
  url: string;
  tags?: string[];
}

export interface CreateFileUploadPayload {
  name: string;
  file: File;
  tags?: string[];
}

export interface UpdateStatusPayload {
  status: 'approved' | 'rejected';
  moderationReason?: string;
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface FileRef {
  id: string;
  name: string;
  type: FileType;
  size: number;
  url: string;
  description?: string;
  tags: string[];
  uploadDate: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContentProposalRecord {
  id: string;
  fileId: string;
  file?: FileRef | null;
  userId: string;
  angle: string;
  caption: string;
  writeUp: string;
  hashtags: string[];
  previewText: string;
  instructions: string | null;
  status: ProposalStatus;
  feedback: string | null;
  reviewedAt: string | null;
  modelUsed: string;
  generationSource: 'ai' | 'fallback';
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListResponse extends ApiResponse<ContentProposalRecord[]> {
  count: number;
}
