import api from './api';
import type {
  ApiResponse,
  FileListResponse,
  FileRecord,
  CreateFilePayload,
  CreateFileUploadPayload,
  UpdateStatusPayload,
} from '@/types';

export async function fetchFiles(params?: {
  type?: string;
  status?: string;
}): Promise<FileListResponse> {
  return api.get('/files', { params });
}

export async function fetchFileById(id: string): Promise<ApiResponse<FileRecord>> {
  return api.get(`/files/${id}`);
}

export async function createFile(
  payload: CreateFilePayload
): Promise<ApiResponse<FileRecord>> {
  return api.post('/files', payload);
}

export async function updateFileStatus(
  id: string,
  payload: UpdateStatusPayload
): Promise<ApiResponse<FileRecord>> {
  return api.patch(`/files/${id}/status`, payload);
}

export async function createFileFromUpload(
  payload: CreateFileUploadPayload
): Promise<ApiResponse<FileRecord>> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('file', payload.file);
  if (payload.tags && payload.tags.length > 0) {
    formData.append('tags', payload.tags.join(','));
  }
  if (payload.description) {
    formData.append('description', payload.description);
  }

  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw body;
  }

  return res.json();
}
