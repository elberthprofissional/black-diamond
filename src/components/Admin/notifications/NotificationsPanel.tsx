import { useState, useCallback } from 'react';
import { Bell, X as XIcon, Trash2, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Notification } from '../../../hooks/useNotifications';
import NotificationDetail from './NotificationDetail';
import NotificationItem from './NotificationItem';
import NotificationFilters from './NotificationFilters';

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
}

export default function NotificationsPanel({
  notifications,
  unreadCount,
  markAllAsRead,
  onClose,
  onDelete,
  bulkDelete,
}: NotificationsPanelProps) {
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === displayed.length) return new Set();
      return new Set(displayed.map((n) => n.id));
    });
  }, [displayed]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, bulkDelete]);

  if (selected) {
    return (
      <NotificationDetail notif={selected} onBack={() => setSelected(null)} onClose={onClose} />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        {selectionMode ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold text-white">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selecionada${selectedIds.size !== 1 ? 's' : ''}`
                  : 'Selecionar'}
              </span>
              {displayed.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-[9px] font-bold text-[#D4AF37] hover:text-[#d4b06a] transition-colors cursor-pointer"
                >
                  {selectedIds.size === displayed.length ? 'Desmarcar' : 'Marcar todas'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 size={11} />
                  Excluir {selectedIds.size}
                </button>
              )}
              <button
                onClick={toggleSelectionMode}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <XIcon size={14} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <Bell size={16} className="text-[#D4AF37]" />
              <h2 className="text-[14px] font-bold text-white">Notificações</h2>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={toggleSelectionMode}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white border border-white/[0.06] transition-all cursor-pointer active:scale-95"
                >
                  <ListChecks size={11} />
                  Selecionar
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 hover:border-[#D4AF37]/30 transition-all cursor-pointer active:scale-95"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  {unreadCount} lida{unreadCount !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <XIcon size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar (when items selected) */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-2 bg-[#D4AF37]/[0.04] border-b border-[#D4AF37]/10">
              <span className="text-[10px] text-zinc-500">
                {selectedIds.size} de {displayed.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter (hidden during selection mode) */}
      {!selectionMode && notifications.length > 0 && (
        <NotificationFilters
          onlyUnread={onlyUnread}
          unreadCount={unreadCount}
          onChange={setOnlyUnread}
        />
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-700" />
            </div>
            <p className="text-[13px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
            <p className="text-[11px] text-zinc-600">
              {onlyUnread
                ? 'Todas as notificações foram lidas.'
                : 'Quando houver novidades, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          displayed.map((n) => (
            <NotificationItem
              key={n.id}
              notif={n}
              onSelect={setSelected}
              onDelete={onDelete}
              selectable={selectionMode}
              selected={selectedIds.has(n.id)}
              onToggleSelect={toggleSelectId}
            />
          ))
        )}
      </div>
    </div>
  );
}
