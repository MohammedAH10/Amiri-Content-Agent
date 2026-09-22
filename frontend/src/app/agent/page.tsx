'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAgentStudioStore } from '@/store/agentStudio.store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import EmptyState from '@/components/ui/EmptyState';
import FileUploadForm from '@/components/files/FileUploadForm';
import AgentMediaCard from '@/components/agent/AgentMediaCard';
import ProposalCard from '@/components/agent/ProposalCard';
import { createFileFromUpload } from '@/services/files.service';
import type { FileType, ProposalStatus } from '@/types';

const STATUS_FILTERS: { value: ProposalStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AgentStudioPage() {
  const {
    files,
    proposals,
    selectedFileId,
    statusFilter,
    loadingFiles,
    loadingProposals,
    generatingFileIds,
    reviewingId,
    error,
    loadAll,
    loadFiles,
    runAgent,
    approve,
    reject,
    regenerate,
    setSelectedFileId,
    setStatusFilter,
  } = useAgentStudioStore();

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const proposalByFileId = useMemo(() => {
    const map: Record<string, (typeof proposals)[number]> = {};
    // latest proposal per file wins (proposals are sorted desc by updatedAt)
    for (const p of proposals) {
      if (!map[p.fileId]) map[p.fileId] = p;
    }
    return map;
  }, [proposals]);

  useEffect(() => {
    loadAll();
    const params = new URLSearchParams(window.location.search);
    const fileId = params.get('fileId');
    if (fileId) setSelectedFileId(fileId);
  }, []);

  const handleUpload = async (data: {
    name: string;
    type: FileType;
    size: number;
    tags: string[];
    description: string;
    file: File;
  }) => {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await createFileFromUpload({
        name: data.name,
        file: data.file,
        tags: data.tags,
        description: data.description,
      });
      if (res.success && res.data) {
        setSelectedFileId(res.data.id);
        setShowUpload(false);
        await loadFiles();
      } else {
        setUploadError(res.error?.message || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err?.error?.message || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredProposals = useMemo(() => {
    if (!statusFilter) return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-violet/10 via-transparent to-neon-cyan/10 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sora text-headline-lg text-on-surface">Agent Studio</h2>
              <p className="text-sm text-text-muted mt-1 max-w-2xl">
                Drop your media, add a description and tags — the content agent drafts the post
                write-up, caption and hashtags on its own. Preview each package, then approve or reject it.
              </p>
            </div>
            <Button onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? 'Close' : 'Drop Media'}
            </Button>
          </div>

          {showUpload && (
            <div className="mt-6 border-t border-glass-border pt-6">
              <FileUploadForm onSubmit={handleUpload} loading={uploading} />
              {uploadError && (
                <div className="mt-3">
                  <ErrorAlert message={uploadError} />
                </div>
              )}
              <p className="text-xs text-text-muted mt-3">
                Once the media is approved by the moderation pipeline, the agent will automatically
                draft a content package for it.
              </p>
            </div>
          )}
        </div>
      </Card>

      {error && <ErrorAlert message={error} onRetry={loadAll} />}

      {/* Media grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sora text-headline-md text-on-surface">Approved Media</h3>
          <div className="flex items-center gap-2">
            <label className="block text-label-sm text-neon-violet uppercase tracking-widest">
              Proposal Status
            </label>
            <select
              className="bg-black/40 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-neon-cyan/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | '')}
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingFiles ? (
          <Spinner />
        ) : files.length === 0 ? (
          <EmptyState
            title="No approved media yet"
            description="Drop media above or upload in the Library — the agent will take it from there."
            action={<Button onClick={() => setShowUpload(true)}>Drop Media</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {files.map((file) => (
              <AgentMediaCard
                key={file.id}
                file={file}
                proposal={proposalByFileId[file.id]}
                generating={generatingFileIds.includes(file.id)}
                selected={selectedFileId === file.id}
                onSelect={() => setSelectedFileId(file.id)}
                onRunAgent={(instructions) => runAgent(file.id, instructions)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Proposals / previews */}
      <Card>
        <h3 className="font-sora text-headline-md text-on-surface mb-4">Agent Drafts</h3>

        {loadingProposals ? (
          <Spinner />
        ) : filteredProposals.length === 0 ? (
          <EmptyState
            title="No agent drafts yet"
            description={
              statusFilter
                ? `No ${statusFilter} proposals. Pick another filter or let the agent draft one.`
                : 'Ask the agent to draft content for a media item above.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                reviewing={reviewingId === proposal.id}
                generating={generatingFileIds.includes(proposal.fileId)}
                onApprove={() => approve(proposal.id)}
                onReject={() => reject(proposal.id)}
                onRegenerate={(instructions) => regenerate(proposal.id, instructions)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}