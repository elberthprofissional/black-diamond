import { useState } from 'react';
import { Bell, Trash2, Check } from 'lucide-react';
import { type Notification } from '../../../hooks/useNotifications';
import { parseNotifBody, relativeTime } from '../../../lib/notifications';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';

interface NotificationItemProps {
  notif: Notification;
  onSelect: (n: Notification) => void;
  onDelete: (id: string) => void;
  size?: 'compact' | 'normal';
}

export default function NotificationItem({
  notif,
  onSelect,
  onDelete,
  size = 'compact',
}: NotificationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const data = parseNotifBody(notif.body);
  const name = data ? data.clientName : notif.title;
  const desc = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
  const extra = data ? Math.max(0, data.services.split(', ').length - 2) : 0;

  const isCompact = size === 'compact';
  const avatarSize = isCompact ? 'w-10 h-10' : 'w-12 h-12';
  const textSize = isCompact ? 'text-[13px]' : 'text-[14px]';
  const descSize = isCompact ? 'text-[11px]' : 'text-[12px]';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="group relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] border-b border-white/[0.03]">
      <ConfirmDeleteModal
        open={confirmDelete}
        onConfirm={() => {
          onDelete(notif.id);
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <button
        onClick={() => {
          setConfirmDelete(false);
          onSelect(notif);
        }}
        className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
      >
        <div className="relative shrink-0">
          <div
            className={`${avatarSize} rounded-xl flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'}`}
          >
            {notif.read ? (
              <Bell size={isCompact ? 16 : 18} className="text-zinc-500" />
            ) : (
              <span
                className={`${isCompact ? 'text-[13px]' : 'text-[14px]'} font-bold text-[#C5A059]`}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!notif.read && (
            <span
              className={`absolute -top-0.5 -right-0.5 rounded-full bg-[#C5A059] border-2 border-[#0A0A0A] ${
                isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'
              }`}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`${textSize} ${notif.read ? 'text-zinc-400' : 'text-white font-medium'}`}>
            {name}
          </p>
          {desc && (
            <p className={`${descSize} text-zinc-500 mt-0.5 truncate`}>
              {desc}
              {extra > 0 ? ` +${extra}` : ''}
            </p>
          )}
          {!isCompact && (
            <span className="text-[11px] text-zinc-600 mt-1 block">
              {relativeTime(notif.created_at)}
            </span>
          )}
        </div>

        {isCompact && (
          <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
            {relativeTime(notif.created_at)}
          </span>
        )}
      </button>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        className={`shrink-0 mt-1 p-1 rounded transition-all cursor-pointer ${
          confirmDelete
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100'
        }`}
        title={confirmDelete ? 'Confirmar exclusão' : 'Excluir notificação'}
      >
        {confirmDelete ? <Check size={14} /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}
