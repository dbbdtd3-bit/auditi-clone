import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getPresignedDownload } from '@/lib/obs';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  User,
  Paperclip,
  Download,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { FileUploader } from '@/components/pbc/file-uploader';
import { CommentSection } from '@/components/pbc/comment-section';
import { ItemStatusActions } from '@/components/pbc/item-status-actions';

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
}> = {
  OPEN: { label: 'Offen', variant: 'secondary' },
  UPLOADED: { label: 'Hochgeladen', variant: 'default' },
  ACCEPTED: { label: 'Akzeptiert', variant: 'success' },
  NEEDS_REVISION: { label: 'Überarbeitung nötig', variant: 'warning' },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getItem(itemId: string) {
  try {
    return await prisma.pbcRequestItem.findUnique({
      where: { id: itemId },
      include: {
        files: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        list: {
          include: {
            workspace: {
              include: { engagement: { include: { mandant: true } } },
            },
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; listId: string; itemId: string }>;
}) {
  const { workspaceId, listId, itemId } = await params;
  const [item, session] = await Promise.all([getItem(itemId), auth()]);

  if (!item) notFound();

  const engagement = item.list.workspace.engagement;
  const cfg = statusConfig[item.status] || statusConfig.OPEN;

  const currentUser = session?.user as { name?: string; role?: string } | undefined;
  const currentUserName = currentUser?.name || 'Unbekannt';
  const currentUserRole = currentUser?.role || 'WP_TEAM';

  // Load presigned download URLs server-side
  const filesWithUrls = await Promise.all(
    item.files.map(async (file) => {
      try {
        const downloadUrl = await getPresignedDownload(file.obsKey);
        return { ...file, downloadUrl };
      } catch {
        return { ...file, downloadUrl: null };
      }
    })
  );

  return (
    <div>
      <Header
        title={item.title}
        description={`${engagement.title} · ${item.list.title}`}
      />

      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 flex-wrap">
          <Link href="/pbc" className="hover:text-slate-900 transition-colors">PBC</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href={`/pbc/${workspaceId}`} className="hover:text-slate-900 transition-colors truncate max-w-[120px]">
            {engagement.title}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href={`/pbc/${workspaceId}/lists/${listId}`} className="hover:text-slate-900 transition-colors truncate max-w-[120px]">
            {item.list.title}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-slate-900 truncate max-w-[120px]">{item.title}</span>
        </nav>

        {/* Back */}
        <Link
          href={`/pbc/${workspaceId}/lists/${listId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Item Details Card */}
            <Card>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                    {item.description && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {item.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Fällig am</p>
                        <p className="text-sm text-slate-700">
                          {new Date(item.dueDate).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {item.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Zugewiesen an</p>
                        <p className="text-sm text-slate-700">{item.assignedTo}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status actions for WP team */}
                <div className="pt-2 border-t border-slate-100">
                  <ItemStatusActions itemId={itemId} currentStatus={item.status} />
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardContent className="py-5">
                <CommentSection
                  itemId={itemId}
                  comments={item.comments.map((c) => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                  }))}
                  currentUserName={currentUserName}
                  currentUserRole={currentUserRole}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar column */}
          <div className="space-y-5">
            {/* File Upload */}
            <Card>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">
                    Dateien ({item.files.length})
                  </h3>
                </div>

                <FileUploader itemId={itemId} uploaderName={currentUserName} />

                {filesWithUrls.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {filesWithUrls.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 group">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {file.filename}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatBytes(file.sizeBytes)} · {file.uploadedBy}
                          </p>
                        </div>
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100"
                            title="Herunterladen"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta info */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mandant</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {engagement.mandant.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engagement</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {engagement.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Liste</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {item.list.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
