'use client';

import { useState } from 'react';
import type { ContentProposalRecord, FileRecord } from '@/types';
import Button from '@/components/ui/Button';
import { formatFileSize } from '@/utils/formatters';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40',
  approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  rejected: 'bg-neon-pink/20 text-neon-pink border-neon-pink/40',
};

export default function AgentMediaCard({
  file,
  proposal,
  generating,
  selected,
  onSelect,
  onRunAgent,
}: {
  file: FileRecord;
  proposal?: ContentProposalRecord | null;
  generating: boolean;
  selected: boolean;
  onSelect: () => void;
  onRunAgent: (instructions?: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [instructions, setInstructions] = useState('');
  const showImage = file.type === 'image' && !imageFailed;

  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden transition-all ${
        selected ? 'ring-2 ring-neon-cyan/60' : 'hover:scale-[1.02]'
      }`}
    >
      {showImage && file.url ? (
        <div className="relative aspect-video" onClick={onSelect}>
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover cursor-pointer"
            onError={() => setImageFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className="h-24 bg-black/30 flex items-center justify-center text-text-muted cursor-pointer"
          onClick={onSelect}
        >
          <span className="text-2xl font-bold uppercase text-[10px]">[{file.type}]</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-on-surface truncate text-sm">{file.name}</h4>
            <p className="text-xs text-text-muted mt-0.5">
              {file.type} / {formatFileSize(file.size)}
            </p>
          </div>
          {proposal && (
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${
                STATUS_STYLES[proposal.status] || ''
              }`}
            >
              {proposal.status}
            </span>
          )}
        </div>

        {file.description && (
          <p className="text-xs text-text-muted mt-2 line-clamp-2">{file.description}</p>
        )}

        {file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {file.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] glass-card px-2 py-0.5 rounded text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? 'Hide' : 'Guide'}
          </Button>
          <Button
            size="sm"
            onClick={() => onRunAgent()}
            loading={generating}
            disabled={generating}
          >
            {proposal ? 'Regenerate' : 'Ask Agent'}
          </Button>
        </div>

        {showGuide && (
          <div className="mt-3">
            <textarea
              className="w-full bg-black/40 border border-glass-border rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/50 min-h-[56px] resize-y"
              placeholder="Optional direction for the agent (e.g. keep it playful, focus on the launch)…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                onRunAgent(instructions || undefined);
                setInstructions('');
                setShowGuide(false);
              }}
              disabled={generating}
            >
              Run with directions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}