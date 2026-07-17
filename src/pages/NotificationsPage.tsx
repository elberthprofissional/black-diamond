import { useState, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Trash2, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import NotificationDetail from '../components/Admin/notifications/NotificationDetail';
import NotificationItem from '../components/Admin/notifications/NotificationItem';
import NotificationFilters from '../components/Admin/notifications/NotificationFilters';

const NotificationsPage: FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification, bulkDelete } =
    useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode — clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === displayed.length) {
        return new Set();
      }
      return new Set(displayed.map((n) => n.id));
    });
  }, [displayed]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await bulkDelete(ids);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, bulkDelete]);

  if (selected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <NotificationDetail
          notif={selected}
          onBack={() => setSelected(null)}
          onClose={() => navigate('/admin')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectionMode) toggleSelectionMode();
              else navigate('/admin');
            }}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          {selectionMode ? (
            <>
              <span className="text-[14px] font-bold text-white">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selecionada${selectedIds.size !== 1 ? 's' : ''}`
                  : 'Selecionar'}
              </span>
              {displayed.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-[#D4AF37] hover:text-[#d4b06a] transition-colors cursor-pointer"
                >
                  {selectedIds.size === displayed.length ? 'Desmarcar' : 'Marcar todas'}
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-[16px] font-bold text-white">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </div>
        {selectionMode ? (
          selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all cursor-pointer active:scale-95"
            >
              <Trash2 size={12} />
              Excluir {selectedIds.size}
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer active:scale-95"
              >
                <ListChecks size={12} />
                Selecionar
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Marcar lidas
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar (sticky at top when items selected) */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-[#D4AF37]/[0.04] border-b border-[#D4AF37]/10 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                {selectedIds.size} de {displayed.length} selecionada
                {displayed.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={12} />
                Excluir selecionadas
              </button>
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
          <div className="flex flex-col items-center justify-center flex-1 px-6 mt-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
              <Bell size={24} className="text-zinc-700" />
            </div>
            <p className="text-[14px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
            <p className="text-[12px] text-zinc-600">
              {onlyUnread
                ? 'Todas as notificações foram lidas.'
                : 'Quando houver novidades, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {displayed.map((notif) => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                onSelect={setSelected}
                onDelete={(id) => clearNotification?.(id)}
                size="normal"
                selectable={selectionMode}
                selected={selectedIds.has(notif.id)}
                onToggleSelect={toggleSelectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
