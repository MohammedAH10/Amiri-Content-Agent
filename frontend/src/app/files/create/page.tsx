'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import ErrorAlert from '@/components/ui/ErrorAlert';
import FileUploadForm from '@/components/files/FileUploadForm';
import { createFileFromUpload } from '@/services/files.service';
import type { FileType } from '@/types';

export default function CreateFilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    name: string;
    type: FileType;
    size: number;
    tags: string[];
    description: string;
    file: File;
  }) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await createFileFromUpload({
        name: data.name,
        file: data.file,
        tags: data.tags,
        description: data.description,
      });
      clearTimeout(timeoutId);
      if (res.success && res.data) {
        router.push(`/agent?fileId=${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to create file');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Upload timed out. Please try a smaller file or check your connection.');
      } else {
        setError(err?.error?.message || err?.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-stack-lg">
      <Card>
        <h2 className="font-sora text-headline-lg text-on-surface mb-4">Upload File</h2>
        <p className="text-sm text-text-muted mb-4">
          Select a file and enter the name you want stored. The original extension and file size are detected automatically.
        </p>
        <FileUploadForm onSubmit={handleSubmit} loading={loading} />
        {loading && (
          <div className="mt-4">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-violet to-neon-cyan animate-pulse rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-text-muted mt-1 text-center">Uploading...</p>
          </div>
        )}
      </Card>

      {error && <ErrorAlert message={error} onRetry={() => setError(null)} />}
    </div>
  );
}
