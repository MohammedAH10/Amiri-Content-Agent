'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { FileType } from '@/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getFileTypeFromName(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'document';
  return 'document';
}

function getFileExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index === -1 || index === name.length - 1) return '';
  return name.slice(index).toLowerCase();
}

function buildStoredName(displayName: string, originalName: string): string {
  const trimmed = displayName.trim();
  const ext = getFileExtension(originalName);
  const withoutExistingExt = ext && trimmed.toLowerCase().endsWith(ext)
    ? trimmed.slice(0, -ext.length)
    : trimmed;
  return `${withoutExistingExt}${ext}`.replace(/\s+/g, '-');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FileUploadForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { name: string; type: FileType; size: number; tags: string[]; description: string; file: File }) => void;
  loading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [fileError, setFileError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError('');
    if (file && file.size > MAX_FILE_SIZE) {
      setFileError(`File too large (${formatBytes(file.size)}). Max: ${formatBytes(MAX_FILE_SIZE)}`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(`File too large (${formatBytes(selectedFile.size)}). Max: ${formatBytes(MAX_FILE_SIZE)}`);
      return;
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const storedName = buildStoredName(newName, selectedFile.name);

    onSubmit({
      name: storedName,
      type: getFileTypeFromName(storedName),
      size: selectedFile.size,
      tags: tagList,
      file: selectedFile,
      description: description.trim(),
    });
  };

  const storedName = selectedFile && newName.trim() ? buildStoredName(newName, selectedFile.name) : '';
  const type = storedName ? getFileTypeFromName(storedName) : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Input
        label="New file name"
        placeholder="product launch"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        required
      />

      <div>
        <label className="block text-label-sm text-neon-violet uppercase tracking-widest mb-1 ml-1">
          File
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-glass-border rounded-xl p-6 text-center cursor-pointer hover:border-neon-cyan/50 transition-colors bg-black/20"
        >
          <span className="text-3xl text-text-muted font-bold">+</span>
          <p className="mt-2 text-sm text-text-muted">
            {selectedFile ? selectedFile.name : 'Click to select a file'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        {fileError && <p className="mt-1 text-sm text-error">{fileError}</p>}
      </div>

      <Input
        label="Tags (comma separated, optional)"
        placeholder="product, launch, marketing"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <div>
        <label className="block text-label-sm text-neon-violet uppercase tracking-widest mb-1 ml-1">
          Description (optional)
        </label>
        <textarea
          className="w-full bg-black/40 border border-glass-border rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 min-h-[64px] resize-y"
          placeholder="What is this about? The content agent uses this to draft your post."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {storedName && selectedFile && (
        <div className="glass-card rounded-xl p-3 text-xs text-text-muted space-y-1">
          <p>Stored name: <span className="text-on-surface">{storedName}</span></p>
          <p>Original extension: <span className="text-on-surface">{getFileExtension(selectedFile.name) || 'none'}</span></p>
          <p>Type: <span className="text-on-surface capitalize">{type}</span></p>
          <p>Size: <span className="text-on-surface">{formatBytes(selectedFile.size)}</span></p>
        </div>
      )}

      <Button type="submit" loading={loading} disabled={!newName.trim() || !selectedFile} className="w-full">
        Submit for Review
      </Button>
    </form>
  );
}
