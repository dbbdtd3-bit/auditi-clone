'use client';

import * as React from 'react';
import { Download, Trash2, FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDropzone } from './file-dropzone';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PbcFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
  downloadUrl?: string | null;
}

interface Props {
  itemId: string;
  files: PbcFile[];
  onRefresh: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModalFileList({ itemId, files: initialFiles, onRefresh }: Props) {
  const [files, setFiles] = React.useState(initialFiles);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  async function handleDownloadAll() {
    const a = document.createElement('a');
    a.href = `/api/pbc/items/${itemId}/download`;
    a.download = '';
    a.click();
  }

  async function handleDelete(fileId: string) {
    if (!confirm('Datei wirklich löschen?')) return;
    setDeleting(fileId);
    try {
      const res = await fetch(`/api/pbc/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        onRefresh();
      } else {
        alert('Datei konnte nicht gelöscht werden');
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Dateien ({files.length})</span>
        </div>
        {files.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadAll}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Alle herunterladen
          </Button>
        )}
      </div>

      <FileDropzone itemId={itemId} onUploadDone={() => { onRefresh(); }} />

      {files.length > 0 && (
        <div
          className={cn(
            'space-y-1.5 pr-1',
            files.length >= 3 && 'max-h-[178px] overflow-y-auto dataly-scrollbar'
          )}
        >
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{file.filename}</p>
                <p className="text-[10px] text-slate-400">
                  {formatBytes(file.sizeBytes)} · {format(new Date(file.createdAt), 'dd. MMM yyyy', { locale: de })}
                </p>
              </div>
              {file.downloadUrl && (
                <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 shrink-0"
                onClick={() => handleDelete(file.id)}
                disabled={deleting === file.id}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
