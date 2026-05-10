'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  itemId: string;
  onUploadDone?: () => void;
}

interface UploadStatus {
  filename: string;
  state: 'uploading' | 'done' | 'error';
  error?: string;
}

export function FileDropzone({ itemId, onUploadDone }: FileDropzoneProps) {
  const [uploads, setUploads] = React.useState<UploadStatus[]>([]);

  function updateUpload(filename: string, patch: Partial<UploadStatus>) {
    setUploads((prev) =>
      prev.map((u) => (u.filename === filename ? { ...u, ...patch } : u))
    );
  }

  async function uploadFile(file: File) {
    setUploads((prev) => [...prev, { filename: file.name, state: 'uploading' }]);

    try {
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

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!uploadRes.ok) {
        updateUpload(file.name, { state: 'error', error: 'Upload zu OBS fehlgeschlagen' });
        return;
      }

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
      onUploadDone?.();
    } catch {
      updateUpload(file.name, { state: 'error', error: 'Unbekannter Fehler' });
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      for (const file of acceptedFiles) {
        uploadFile(file);
      }
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">
          {isDragActive ? 'Dateien loslassen...' : 'Dateien hier ablegen oder klicken'}
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-1.5">
          {uploads.map((u, i) => (
            <div
              key={`${u.filename}-${i}`}
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
