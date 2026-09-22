import api from './api';
import type {
  ApiResponse,
  ContentProposalRecord,
  ProposalListResponse,
  ProposalStatus,
} from '@/types';

export async function generateForFile(
  fileId: string,
  payload?: { userId?: string; instructions?: string },
): Promise<ApiResponse<ContentProposalRecord>> {
  return api.post(`/agent/generate/${fileId}`, payload || {});
}

export async function listProposals(params?: {
  status?: ProposalStatus;
  userId?: string;
}): Promise<ProposalListResponse> {
  return api.get('/agent/proposals', { params });
}

export async function getProposal(id: string): Promise<ApiResponse<ContentProposalRecord>> {
  return api.get(`/agent/proposals/${id}`);
}

export async function approveProposal(
  id: string,
): Promise<ApiResponse<ContentProposalRecord>> {
  return api.post(`/agent/proposals/${id}/approve`);
}

export async function rejectProposal(
  id: string,
  feedback?: string,
): Promise<ApiResponse<ContentProposalRecord>> {
  return api.post(`/agent/proposals/${id}/reject`, { feedback });
}

export async function regenerateProposal(
  id: string,
  instructions?: string,
): Promise<ApiResponse<ContentProposalRecord>> {
  return api.post(`/agent/proposals/${id}/regenerate`, { instructions });
}