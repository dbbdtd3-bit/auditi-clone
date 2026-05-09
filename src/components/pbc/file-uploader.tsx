'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  itemId: string;
}

interface UploadStatus {
  filename: string;
  state: 'uploading' | 'done' | 'error';
  error?: string;
}

export function FileUploader({ itemId }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = React.useState<UploadStatus[]>([]);

  function updateUpload(filename: string, patch: Partial<UploadStatus>) {
    setUploads((prev) =>
      prev.map((u) => (u.filename === filename ? { ...u, ...patch } : u))
    );
  }

  async function uploadFile(file: File) {
    setUploads((prev) => [...prev, { filename: file.name, state: 'uploading' }]);

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || 'application/octet-stream' }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        updateUpload(file.name, { state: 'error', error: err.error || 'Presign fehlgeschlagen' });
        return;
      }

      const { uploadUrl, obsKey } = await presignRes.json();

      // Step 2: Upload file directly to OBS
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!uploadRes.ok) {
        updateUpload(file.name, { state: 'error', error: 'Upload zu OBS fehlgeschlagen' });
        return;
      }

      // Step 3: Create file record in DB
      const fileRes = await fetch(`/api/pbc/items/${itemId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          obsKey,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        }),
      });

      if (!fileRes.ok) {
        const err = await fileRes.json();
        updateUpload(file.name, { state: 'error', error: err.error || 'Datei konnte nicht gespeichert werden' });
        return;
      }

      updateUpload(file.name, { state: 'done' });
    } catch {
      updateUpload(file.name, { state: 'error', error: 'Unbekannter Fehler' });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Clear input so same file can be selected again
    e.target.value = '';

    for (const file of files) {
      await uploadFile(file);
    }
    router.refresh();
  }

  const hasActiveUploads = uploads.some((u) => u.state === 'uploading');

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={hasActiveUploads}
        className="w-full border-dashed border-2 h-12"
      >
        {hasActiveUploads ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Hochladen...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Dateien hochladen
          </>
        )}
      </Button>

      {uploads.length > 0 && (
        <div className="space-y-1.5">
          {uploads.map((u) => (
            <div
              key={u.filename}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-slate-50"
            >
              {u.state === 'uploading' && (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
              )}
              {u.state === 'done' && (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              )}
              {u.state === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span className="flex-1 truncate text-slate-700">{u.filename}</span>
              {u.state === 'uploading' && (
                <span className="text-xs text-blue-600">Hochladen...</span>
              )}
              {u.state === 'done' && (
                <span className="text-xs text-green-600">Fertig</span>
              )}
              {u.state === 'error' && (
                <span className="text-xs text-red-600">{u.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
