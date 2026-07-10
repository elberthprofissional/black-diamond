import { useState, useRef, useEffect, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { formatPhone } from '../../lib/utils';

function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(callback, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

function parseNotifBody(body: string) {
  // Try JSON format first (new format)
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.clientName === 'string') {
      return {
        clientName: parsed.clientName.replace(/\s*\[MENSALISTA\]/, '').trim(),
        services: parsed.services || '',
        dateTime: parsed.dateTime || '',
        totalPrice: parsed.totalPrice || '',
        clientPhone: parsed.clientPhone || '',
        manageUrl: parsed.manageUrl || '',
      };
    }
  } catch {
    // Not JSON — fall through to legacy format
  }

  // Legacy pipe-separated format (backwards compatibility)
  const parts = body.split(' | ');
  if (parts.length < 6) return null;
  return {
    clientName: parts[0].replace(/\s*\[MENSALISTA\]/, '').trim(),
    services: parts[1].trim(),
    dateTime: parts[2].trim(),
    totalPrice: parts[3].trim(),
    clientPhone: parts[4].trim(),
    manageUrl: parts[5].trim(),
  };
}
/* ─── Detail Page ─── */
function NotificationDetail({ notif, onBack }: { notif: Notification; onBack: () => void }) {
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  const isCancelled = notif.tag?.startsWith('cancelled-') || data.manageUrl === 'Cancelado';
  const [date, time] = data.dateTime.split(' às ');
  const services = data.services.split(', ');

  const handleRemind = () => {
    const msg = `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`;
    window.open(`https://wa.me/${data.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Close Button */}
      <div className="px-5 py-4 flex justify-end shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-5">
            <svg
              className="w-5 h-5 text-red-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="text-[13px] font-bold text-red-400">Agendamento Cancelado</p>
              <p className="text-[11px] text-red-400/70">
                Este agendamento foi cancelado e não está mais ativo.
              </p>
            </div>
          </div>
        )}

        {/* Client */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#C5A059]/10 border-2 border-[#C5A059]/20 flex items-center justify-center text-base font-bold text-[#C5A059] shrink-0">
            {data.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-white truncate">{data.clientName}</p>
            <p className="text-[13px] text-zinc-500">{formatPhone(data.clientPhone)}</p>
          </div>
        </div>

        {/* Date + Time */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg">
            <svg
              className="w-4 h-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <span className="text-[13px] text-zinc-400">{date}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#C5A059]/10 rounded-lg">
            <svg
              className="w-4 h-4 text-[#C5A059]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-[13px] text-[#C5A059] font-bold">{time}</span>
          </div>
        </div>

        {/* Services Card */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-6">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">
            Serviços
          </span>
          <div className="space-y-2.5">
            {services.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0" />
                <span className="text-[13px] text-zinc-300">{s}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-white/[0.04] my-3" />
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-[16px] font-black text-[#C5A059]">{data.totalPrice}</span>
          </div>
        </div>

        {/* Actions */}
        {isCancelled ? (
          <div className="space-y-3">
            <button
              onClick={() => window.open(`https://wa.me/${data.clientPhone}`, '_blank')}
              className="w-full h-12 bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              Falar com Cliente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleRemind}
              className="w-full h-12 bg-[#C5A059] text-black hover:bg-[#A68233] font-bold text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Enviar Lembrete
            </button>
            <button
              onClick={() => window.open(data.manageUrl, '_blank')}
              className="w-full h-12 bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              Reagendar
            </button>
            <button
              onClick={() => window.open(data.manageUrl, '_blank')}
              className="w-full h-12 bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-1.5"
            >
              Cancelar Agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Mobile Item (separate component to use useLongPress hook) ─── */
function MobileNotifItem({
  notif,
  isSelected,
  isSelectionMode,
  toggleSelect,
  setSelected,
  setIsSelectionMode,
  setSelectedIds,
  name,
  time,
  services,
  extra,
}: {
  notif: Notification;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  setSelected: (notif: Notification) => void;
  setIsSelectionMode: (v: boolean) => void;
  setSelectedIds: (fn: (prev: Set<string>) => Set<string>) => void;
  name: string;
  time: string;
  services: string;
  extra: number;
}) {
  const longPressProps = useLongPress(() => {
    setIsSelectionMode(true);
    setSelectedIds(() => new Set([notif.id]));
  });

  return (
    <button
      key={notif.id}
      onClick={() => (isSelectionMode ? toggleSelect(notif.id) : setSelected(notif))}
      {...longPressProps}
      className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition-all active:bg-white/[0.04] ${
        isSelected ? 'bg-[#C5A059]/[0.05]' : ''
      } ${!notif.read ? 'bg-white/[0.01]' : ''}`}
    >
      {isSelectionMode && (
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
            isSelected ? 'bg-[#C5A059] border-[#C5A059]' : 'border-zinc-600'
          }`}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      <div className="relative shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'}`}
        >
          {notif.read ? (
            <Bell size={18} className="text-zinc-500" />
          ) : (
            <span className="text-[13px] font-bold text-[#C5A059]">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {!notif.read && !isSelectionMode && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C5A059] border-2 border-[#0A0A0A]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[14px] font-medium ${notif.read ? 'text-zinc-400' : 'text-white'}`}
          >
            {name}
          </span>
        </div>
        {services && (
          <p className="text-[12px] text-zinc-500 mt-1 truncate">
            {services}
            {extra > 0 ? ` +${extra}` : ''}
          </p>
        )}
        {time && !isSelectionMode && (
          <span className="text-[11px] text-zinc-600 mt-1 block">{time}</span>
        )}
      </div>

      {!isSelectionMode && (
        <div className="shrink-0 mt-1">
          <svg
            className="w-4 h-4 text-zinc-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

/* ─── List Content ─── */
function NotificationListContent({
  notifications,
  unreadCount,
  markAllAsRead,
  onClose,
  hideHeader = false,
  selected: externalSelected,
  onSelect: externalOnSelect,
  variant = 'desktop',
  clearNotification,
  isSelectionMode: externalIsSelectionMode,
  setIsSelectionMode: externalSetIsSelectionMode,
  selectedIds: externalSelectedIds,
  setSelectedIds: externalSetSelectedIds,
}: {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  onClose?: () => void;
  hideHeader?: boolean;
  selected?: Notification | null;
  onSelect?: (notif: Notification | null) => void;
  variant?: 'mobile' | 'desktop';
  clearNotification?: (id: string) => Promise<void>;
  isSelectionMode?: boolean;
  setIsSelectionMode?: (v: boolean) => void;
  selectedIds?: Set<string>;
  setSelectedIds?: (fn: (prev: Set<string>) => Set<string>) => void;
}) {
  const [internalSelected, setInternalSelected] = useState<Notification | null>(null);
  const selected = externalSelected !== undefined ? externalSelected : internalSelected;
  const setSelected = externalOnSelect || setInternalSelected;
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalIsSelectionMode, setInternalIsSelectionMode] = useState(false);

  const selectedIds = externalSelectedIds !== undefined ? externalSelectedIds : internalSelectedIds;
  const setSelectedIds = externalSetSelectedIds || setInternalSelectedIds;
  const isSelectionMode =
    externalIsSelectionMode !== undefined ? externalIsSelectionMode : internalIsSelectionMode;
  const setIsSelectionMode = externalSetIsSelectionMode || setInternalIsSelectionMode;

  const [activeFilter, setActiveFilter] = useState<'all' | 'bookings' | 'reminders' | 'system'>(
    'all'
  );

  const filterNotifications = (notifs: Notification[]) => {
    if (activeFilter === 'all') return notifs;
    return notifs.filter((n) => {
      if (activeFilter === 'bookings') return n.tag?.startsWith('booking-');
      if (activeFilter === 'reminders') return n.tag?.startsWith('reminder-');
      if (activeFilter === 'system') {
        return !n.tag?.startsWith('booking-') && !n.tag?.startsWith('reminder-');
      }
      return true;
    });
  };

  const filteredNotifications = filterNotifications(notifications);

  const filterTabs = [
    { key: 'all' as const, label: 'Tudo', count: notifications.length },
    {
      key: 'bookings' as const,
      label: 'Agendamentos',
      count: notifications.filter((n) => n.tag?.startsWith('booking-')).length,
    },
    {
      key: 'reminders' as const,
      label: 'Lembretes',
      count: notifications.filter((n) => n.tag?.startsWith('reminder-')).length,
    },
    {
      key: 'system' as const,
      label: 'Sistema',
      count: notifications.filter(
        (n) => !n.tag?.startsWith('booking-') && !n.tag?.startsWith('reminder-')
      ).length,
    },
  ];

  if (selected) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-full"
      >
        <NotificationDetail notif={selected} onBack={() => setSelected(null)} />
      </motion.div>
    );
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(() => new Set(notifications.map((n) => n.id)));
  };

  const deleteSelected = async () => {
    if (!clearNotification) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => clearNotification(id)));
    } catch {
      // Notificações já foram removidas do estado (clearNotification faz update otimista)
    }
    setSelectedIds(() => new Set());
    setIsSelectionMode(false);
  };

  const groupByDate = (notifs: Notification[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: Notification[] }[] = [];
    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const olderItems: Notification[] = [];

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      if (notifDate.toDateString() === today.toDateString()) {
        todayItems.push(notif);
      } else if (notifDate.toDateString() === yesterday.toDateString()) {
        yesterdayItems.push(notif);
      } else {
        olderItems.push(notif);
      }
    });

    if (todayItems.length > 0) groups.push({ label: 'Hoje', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Ontem', items: yesterdayItems });
    if (olderItems.length > 0) groups.push({ label: 'Anteriores', items: olderItems });

    return groups;
  };

  const renderNotifItem = (notif: Notification) => {
    const data = parseNotifBody(notif.body);
    const name = data ? data.clientName : notif.title;
    const time = data ? data.dateTime.split(' às ')[1] : '';
    const services = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
    const extra = data ? data.services.split(', ').length - 2 : 0;
    const isSelected = selectedIds.has(notif.id);

    if (variant === 'mobile') {
      return (
        <MobileNotifItem
          key={notif.id}
          notif={notif}
          isSelected={isSelected}
          isSelectionMode={isSelectionMode}
          toggleSelect={toggleSelect}
          setSelected={setSelected}
          setIsSelectionMode={setIsSelectionMode}
          setSelectedIds={setSelectedIds}
          name={name}
          time={time}
          services={services}
          extra={extra}
        />
      );
    }

    return (
      <button
        key={notif.id}
        onClick={() => (isSelectionMode ? toggleSelect(notif.id) : setSelected(notif))}
        onDoubleClick={() => {
          setIsSelectionMode(true);
          setSelectedIds(() => new Set([notif.id]));
        }}
        className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-all hover:bg-white/[0.02] active:bg-white/[0.04] ${
          isSelected ? 'bg-[#C5A059]/[0.05]' : ''
        } ${!notif.read ? 'bg-white/[0.01]' : ''}`}
      >
        {isSelectionMode && (
          <div
            className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              isSelected ? 'bg-[#C5A059] border-[#C5A059]' : 'border-zinc-600'
            }`}
          >
            {isSelected && (
              <svg
                className="w-2.5 h-2.5 text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        <div className="relative shrink-0">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'}`}
          >
            {notif.read ? (
              <Bell size={16} className="text-zinc-500" />
            ) : (
              <span className="text-[12px] font-bold text-[#C5A059]">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!notif.read && !isSelectionMode && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C5A059] border-2 border-[#0E0E0E]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[13px] font-medium ${notif.read ? 'text-zinc-400' : 'text-white'}`}
            >
              {name}
            </span>
          </div>
          {services && (
            <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
              {services}
              {extra > 0 ? ` +${extra}` : ''}
            </p>
          )}
          {time && !isSelectionMode && (
            <span className="text-[11px] text-zinc-600 mt-1 block">{time}</span>
          )}
        </div>

        {!isSelectionMode && (
          <div className="shrink-0 mt-1">
            <svg
              className="w-4 h-4 text-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </button>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selected ? 'detail' : 'list'}
        initial={{ opacity: 0, x: selected ? 20 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: selected ? -20 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full"
      >
        {!hideHeader && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
            {isSelectionMode ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedIds(() => new Set());
                    }}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                  <span className="text-[13px] text-white font-medium">
                    {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Todas
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={selectedIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-30"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Excluir
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-[15px] font-bold text-white">Notificações</h2>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#C5A059] hover:text-[#A68233] transition-colors cursor-pointer"
                    >
                      <span className="text-[10px]">✓</span>
                      Marcar todas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Selecionar
                    </button>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                      aria-label="Fechar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Filter Tabs - Desktop only */}
        {variant === 'desktop' && !isSelectionMode && notifications.length > 0 && (
          <div className="flex gap-1 px-4 py-3 border-b border-white/[0.04] overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                  activeFilter === tab.key
                    ? 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      activeFilter === tab.key
                        ? 'bg-[#C5A059]/20 text-[#C5A059]'
                        : 'bg-white/[0.06] text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                <Bell size={24} className="text-zinc-700" />
              </div>
              <p className="text-[13px] text-zinc-400 font-medium mb-1">Nenhuma notificação</p>
              <p className="text-[11px] text-zinc-600">
                {activeFilter === 'all'
                  ? 'Quando houver novidades, elas aparecerão aqui.'
                  : 'Nenhuma notificação nesta categoria.'}
              </p>
            </div>
          ) : (
            <div>
              {groupByDate(filteredNotifications).map((group) => (
                <div key={group.label}>
                  <div className="px-5 py-3">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map(renderNotifItem)}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Bell Component ─── */
const NotificationBell: FC<{ variant: 'mobile' | 'desktop' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, clearNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (variant !== 'desktop' || !isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, variant]);

  return (
    <>
      {variant === 'desktop' ? (
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-left text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] hover:shadow-[0_0_15px_rgba(197,160,89,0.05)]"
        >
          <div className="relative shrink-0">
            <Bell size={16} className="text-zinc-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C5A059] text-black text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold tracking-wide flex-1">Notificações</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/admin/notificacoes')}
          className="relative w-10 h-10 rounded-full hover:bg-white/[0.06] text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C5A059] text-black text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {variant === 'desktop' && (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[190] bg-black/50"
              />
              <motion.div
                ref={panelRef}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 z-[200] w-[420px] bg-[#0E0E0E] border-r border-white/[0.06] shadow-2xl"
              >
                <NotificationListContent
                  notifications={notifications}
                  unreadCount={unreadCount}
                  markAllAsRead={markAllAsRead}
                  onClose={() => setIsOpen(false)}
                  variant="desktop"
                  clearNotification={clearNotification}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export { NotificationListContent };
export default NotificationBell;
