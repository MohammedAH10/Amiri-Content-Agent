'use client';

import { create } from 'zustand';
import type { ContentProposalRecord, FileRecord, ProposalStatus } from '@/types';
import {
  approveProposal as apiApprove,
  generateForFile as apiGenerate,
  listProposals as apiListProposals,
  regenerateProposal as apiRegenerate,
  rejectProposal as apiReject,
} from '@/services/agent.service';
import { fetchFiles } from '@/services/files.service';

export interface AgentStudioState {
  files: FileRecord[];
  proposals: ContentProposalRecord[];
  selectedFileId: string | null;
  statusFilter: ProposalStatus | '';
  loadingFiles: boolean;
  loadingProposals: boolean;
  generatingFileIds: string[];
  reviewingId: string | null;
  error: string | null;

  loadAll: () => Promise<void>;
  loadFiles: () => Promise<void>;
  loadProposals: () => Promise<void>;
  runAgent: (fileId: string, instructions?: string) => Promise<void>;
  approve: (id: string) => Promise<void>;
  reject: (id: string, feedback?: string) => Promise<void>;
  regenerate: (id: string, instructions?: string) => Promise<void>;
  setSelectedFileId: (fileId: string) => void;
  setStatusFilter: (status: ProposalStatus | '') => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

const initial = {
  files: [] as FileRecord[],
  proposals: [] as ContentProposalRecord[],
  selectedFileId: null as string | null,
  statusFilter: '' as ProposalStatus | '',
  loadingFiles: false,
  loadingProposals: false,
  generatingFileIds: [] as string[],
  reviewingId: null as string | null,
  error: null as string | null,
};

const upsertProposal = (
  proposals: ContentProposalRecord[],
  incoming: ContentProposalRecord,
): ContentProposalRecord[] => {
  const idx = proposals.findIndex((p) => p.id === incoming.id);
  if (idx === -1) return [incoming, ...proposals];
  const next = [...proposals];
  next[idx] = incoming;
  return next;
};

export const useAgentStudioStore = create<AgentStudioState>((set, get) => ({
  ...initial,

  loadAll: async () => {
    await Promise.all([get().loadFiles(), get().loadProposals()]);
  },

  loadFiles: async () => {
    set({ loadingFiles: true, error: null });
    try {
      const res = await fetchFiles({ status: 'approved' });
      if (res.success && res.data) {
        set({ files: res.data });
      } else {
        set({ error: res.error?.message || 'Failed to load media' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Failed to load media' });
    } finally {
      set({ loadingFiles: false });
    }
  },

  loadProposals: async () => {
    set({ loadingProposals: true, error: null });
    try {
      const params = get().statusFilter ? { status: get().statusFilter } : undefined;
      const res = await apiListProposals(params);
      if (res.success && res.data) {
        set({ proposals: res.data });
      } else {
        set({ error: res.error?.message || 'Failed to load proposals' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Failed to load proposals' });
    } finally {
      set({ loadingProposals: false });
    }
  },

  runAgent: async (fileId, instructions) => {
    set((s) => ({
      generatingFileIds: [...s.generatingFileIds, fileId],
      error: null,
    }));
    try {
      const res = await apiGenerate(fileId, { userId: 'web-user', instructions });
      if (res.success && res.data) {
        set((s) => ({
          proposals: upsertProposal(s.proposals, res.data as ContentProposalRecord),
          selectedFileId: fileId,
        }));
      } else {
        set({ error: res.error?.message || 'Agent generation failed' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Agent generation failed' });
    } finally {
      set((s) => ({
        generatingFileIds: s.generatingFileIds.filter((id) => id !== fileId),
      }));
    }
  },

  approve: async (id) => {
    set({ reviewingId: id, error: null });
    try {
      const res = await apiApprove(id);
      if (res.success && res.data) {
        set((s) => ({ proposals: upsertProposal(s.proposals, res.data as ContentProposalRecord) }));
      } else {
        set({ error: res.error?.message || 'Approval failed' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Approval failed' });
    } finally {
      set({ reviewingId: null });
    }
  },

  reject: async (id, feedback) => {
    set({ reviewingId: id, error: null });
    try {
      const res = await apiReject(id, feedback);
      if (res.success && res.data) {
        set((s) => ({ proposals: upsertProposal(s.proposals, res.data as ContentProposalRecord) }));
      } else {
        set({ error: res.error?.message || 'Rejection failed' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Rejection failed' });
    } finally {
      set({ reviewingId: null });
    }
  },

  regenerate: async (id, instructions) => {
    set({ reviewingId: id, error: null });
    try {
      const res = await apiRegenerate(id, instructions);
      if (res.success && res.data) {
        set((s) => ({ proposals: upsertProposal(s.proposals, res.data as ContentProposalRecord) }));
      } else {
        set({ error: res.error?.message || 'Regeneration failed' });
      }
    } catch (err: any) {
      set({ error: err?.error?.message || err?.message || 'Regeneration failed' });
    } finally {
      set({ reviewingId: null });
    }
  },

  setSelectedFileId: (fileId) => set({ selectedFileId: fileId }),
  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().loadProposals();
  },
  setError: (err) => set({ error: err }),
  reset: () => set({ ...initial }),
}));