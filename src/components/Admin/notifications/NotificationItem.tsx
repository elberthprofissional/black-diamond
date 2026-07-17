import { useState, useRef, useEffect } from 'react';
import { Bell, Trash2, Check, Loader2, Circle, CircleCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Notification } from '../../../hooks/useNotifications';
import { parseNotifBody, relativeTime } from '../../../lib/notifications';

interface NotificationItemProps {
  notif: Notification;
  onSelect: (n: Notification) => void;
  onDelete: (id: string) => void;
  size?: 'compact' | 'normal';
  /** When true, shows a checkbox for bulk selection */
  selectable?: boolean;
  /** Whether this item is currently selected (only used when selectable=true) */
  selected?: boolean;
  /** Called when the checkbox is toggled */
  onToggleSelect?: (id: string) => void;
}

export default function NotificationItem({
  notif,
  onSelect,
  onDelete,
  size = 'compact',
  selectable = false,
  selected = false,
  onToggleSelect,
}: NotificationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

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
      // Auto-cancel after 3 seconds if not confirmed
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      // Second click — confirm deletion
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setDeleting(true);
      onDelete(notif.id);
    }
  };

  return (
    <div
      className={`group relative flex items-start gap-3 px-5 py-3.5 transition-colors border-b border-white/[0.03] ${
        selected ? 'bg-[#D4AF37]/[0.04] hover:bg-[#D4AF37]/[0.06]' : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Selection checkbox */}
      {selectable && onToggleSelect && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            if (confirmDelete) {
              if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
              setConfirmDelete(false);
            }
            onToggleSelect(notif.id);
          }}
          className="shrink-0 mt-2.5 cursor-pointer text-zinc-600 hover:text-[#D4AF37] transition-colors"
          whileTap={{ scale: 0.85 }}
        >
          {selected ? <CircleCheck size={20} className="text-[#D4AF37]" /> : <Circle size={20} />}
        </motion.button>
      )}

      <button
        onClick={() => {
          if (confirmDelete) {
            // Cancel pending delete
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            setConfirmDelete(false);
            return;
          }
          if (selectable && onToggleSelect) {
            onToggleSelect(notif.id);
            return;
          }
          onSelect(notif);
        }}
        className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
      >
        <div className="relative shrink-0">
          <div
            className={`${avatarSize} rounded-xl flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#D4AF37]/10'}`}
          >
            {notif.read ? (
              <Bell size={isCompact ? 16 : 18} className="text-zinc-500" />
            ) : (
              <span
                className={`${isCompact ? 'text-[13px]' : 'text-[14px]'} font-bold text-[#D4AF37]`}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!notif.read && (
            <span
              className={`absolute -top-0.5 -right-0.5 rounded-full bg-[#D4AF37] border-2 border-[#0A0A0A] ${
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

      {/* Delete button (only in non-selectable mode) */}
      {!selectable && (
        <button
          onClick={handleDeleteClick}
          disabled={deleting}
          className={`shrink-0 mt-1 p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            confirmDelete
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/10'
              : 'text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100'
          }`}
          title={confirmDelete ? 'Clique novamente para confirmar' : 'Excluir notificação'}
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : confirmDelete ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      )}

      {/* Confirm deletion hint */}
      {confirmDelete && !deleting && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 whitespace-nowrap">
          <span className="text-[9px] text-red-400/40 font-medium">Clique no ✓ p/ confirmar</span>
        </div>
      )}
    </div>
  );
}
