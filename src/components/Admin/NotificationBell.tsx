import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { WhatsAppIcon } from '../WhatsAppIcon';

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

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

/* ─── Detail Page ─── */
function NotificationDetail({ notif, onBack }: { notif: Notification; onBack: () => void }) {
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  const [date, time] = data.dateTime.split(' às ');

  const handleRemind = () => {
    const msg = `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`;
    window.open(`https://wa.me/${data.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0E0E]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[14px] font-semibold text-white">Detalhes</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Client */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-sm font-bold text-[#C5A059] shrink-0">
            {data.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white truncate">{data.clientName}</p>
            <p className="text-[12px] text-zinc-500">{formatPhone(data.clientPhone)}</p>
          </div>
        </div>

        {/* Date + Time */}
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-zinc-500">{date}</span>
          <span className="text-[#C5A059] font-bold">{time}</span>
        </div>

        <div className="h-px bg-white/[0.04]" />

        {/* Services */}
        <div className="space-y-3">
          {data.services.split(', ').map((s, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-[13px] text-zinc-500">{s}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
              Total
            </span>
            <span className="text-[15px] font-black text-[#C5A059]">{data.totalPrice}</span>
          </div>
        </div>

        <div className="h-px bg-white/[0.04]" />

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleRemind}
            className="w-full h-11 bg-[#C5A059] text-black hover:bg-[#A68233] font-bold text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Enviar Lembrete
          </button>
          <button
            onClick={() => window.open(data.manageUrl, '_blank')}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.05] hover:text-white rounded-xl transition-all text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Reagendar
          </button>
          <button
            onClick={() => window.open(data.manageUrl, '_blank')}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] text-zinc-400 hover:bg-red-500/[0.02] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer flex items-center justify-center gap-1.5"
          >
            Cancelar Agendamento
          </button>
        </div>
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

  const isBooking = notif.tag?.startsWith('booking-');

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
}) {
  const [internalSelected, setInternalSelected] = useState<Notification | null>(null);
  const selected = externalSelected !== undefined ? externalSelected : internalSelected;
  const setSelected = externalOnSelect || setInternalSelected;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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
    return <NotificationDetail notif={selected} onBack={() => setSelected(null)} />;
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
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const deleteSelected = async () => {
    if (!clearNotification) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => clearNotification(id)));
    } catch {
      // Notificações já foram removidas do estado (clearNotification faz update otimista)
    }
    setSelectedIds(new Set());
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
          setSelectedIds(new Set([notif.id]));
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
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          {isSelectionMode ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
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
    </div>
  );
}

/* ─── Bell Component ─── */
const NotificationBell: React.FC<{ variant: 'mobile' | 'desktop' }> = ({ variant }) => {
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
          <Bell size={16} className="text-zinc-600 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide flex-1">Notificações</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/admin/notificacoes')}
          className="relative w-10 h-10 rounded-full hover:bg-white/[0.06] text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C5A059] text-black text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
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
