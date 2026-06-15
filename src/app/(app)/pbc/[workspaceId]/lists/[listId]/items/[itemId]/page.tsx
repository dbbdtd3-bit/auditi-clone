import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getPresignedDownload } from '@/lib/obs';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  User,
  Paperclip,
  Download,
} from 'lucide-react';
import { FileUploader } from '@/components/pbc/file-uploader';
import { CommentSection } from '@/components/pbc/comment-section';
import { ItemStatusActions } from '@/components/pbc/item-status-actions';
import { canAccessWorkspace } from '@/lib/pbc-access';

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
  if (item.list.workspaceId !== workspaceId) notFound();
  if (item.listId !== listId) notFound();

  const engagement = item.list.workspace.engagement;
  const cfg = statusConfig[item.status] || statusConfig.OPEN;

  const currentUser = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!currentUser?.id) notFound();

  const canAccess = await canAccessWorkspace(
    currentUser.id,
    currentUser.role === 'WP_ADMIN' || currentUser.role === 'WP_TEAM',
    workspaceId
  );
  if (!canAccess) notFound();

  const currentUserName = currentUser?.name || 'Unbekannt';
  const currentUserRole = currentUser?.role || '';
  const isWpUser = ['WP_ADMIN', 'WP_TEAM'].includes(currentUserRole);

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
      <Breadcrumbs items={[
        { label: 'PBC', href: '/pbc' },
        { label: engagement.title, href: `/pbc/${workspaceId}` },
        { label: item.list.title, href: `/pbc/${workspaceId}/lists/${listId}` },
        { label: item.title },
      ]} />

      <div className="flex items-center justify-between border-b border-dataly-line bg-dataly-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-dataly-ink">{item.title}</h1>
          <p className="text-[13px] text-dataly-muted mt-0.5">
            {engagement.title} · {item.list.title}
          </p>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Item Details Card */}
            <Card>
              <CardContent className="py-5 space-y-4">
                {item.description && (
                  <p className="text-sm text-dataly-slate whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dataly-line">
                  {item.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-dataly-muted shrink-0" />
                      <div>
                        <p className="text-xs text-dataly-muted">Fällig am</p>
                        <p className="text-sm text-dataly-ink">
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
                      <User className="h-4 w-4 text-dataly-muted shrink-0" />
                      <div>
                        <p className="text-xs text-dataly-muted">Zugewiesen an</p>
                        <p className="text-sm text-dataly-ink">{item.assignedTo}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-dataly-line">
                  <ItemStatusActions itemId={itemId} currentStatus={item.status} isWpUser={isWpUser} />
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
                  <Paperclip className="h-4 w-4 text-dataly-slate" />
                  <h3 className="text-sm font-semibold text-dataly-ink">
                    Dateien ({item.files.length})
                  </h3>
                </div>

                <FileUploader itemId={itemId} />

                {filesWithUrls.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dataly-line">
                    {filesWithUrls.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 group">
                        <FileText className="h-4 w-4 text-dataly-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-dataly-ink truncate">
                            {file.filename}
                          </p>
                          <p className="text-[10px] text-dataly-muted">
                            {formatBytes(file.sizeBytes)} · {file.uploadedBy}
                          </p>
                        </div>
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-dataly-surface-subtle"
                            title="Herunterladen"
                          >
                            <Download className="h-3.5 w-3.5 text-dataly-slate" />
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
                <p className="text-xs font-semibold text-dataly-muted uppercase tracking-wide">Details</p>
                <div className="space-y-1.5 text-xs text-dataly-slate">
                  <div className="flex justify-between">
                    <span className="text-dataly-muted">Mandant</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {engagement.mandant.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dataly-muted">Engagement</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {engagement.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dataly-muted">Liste</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {item.list.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dataly-muted">Status</span>
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
