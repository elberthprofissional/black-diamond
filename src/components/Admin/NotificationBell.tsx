import { useState, useRef, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X as XIcon,
  ChevronLeft,
  CalendarDays,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Send,
  Trash2,
  Check,
} from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { formatPhone } from '../../lib/utils';
import { parseNotifBody, relativeTime } from '../../lib/notifications';
import ConfirmDeleteModal from './shared/ConfirmDeleteModal';

/* ─── Detail View ─── */
function NotificationDetail({ notif, onBack }: { notif: Notification; onBack: () => void }) {
  const data = parseNotifBody(notif.body);
  if (!data) return null;

  const isCancelled = notif.tag?.startsWith('cancelled-') || data.manageUrl === 'Cancelado';
  const [date, timeRaw] = data.dateTime.split(' às ');
  const services = data.services.split(', ');

  const openWhatsApp = (msg: string) => {
    window.open(`https://wa.me/${data.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          {isCancelled ? 'Cancelado' : 'Agendamento'}
        </span>
        <button
          onClick={onBack}
          className="ml-auto text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-red-400">Agendamento Cancelado</p>
              <p className="text-[11px] text-red-400/60">Este agendamento não está mais ativo.</p>
            </div>
          </div>
        )}

        {/* Client */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
              {data.clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{data.clientName}</p>
              <p className="text-[12px] text-zinc-500 tabular-nums">
                {formatPhone(data.clientPhone)}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <CalendarDays size={16} className="text-zinc-500 shrink-0" />
            <span className="text-[13px] text-zinc-300">{date}</span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#C5A059]/[0.06] border border-[#C5A059]/15 rounded-xl">
            <Clock size={16} className="text-[#C5A059] shrink-0" />
            <span className="text-[13px] text-[#C5A059] font-bold">{timeRaw}</span>
          </div>
        </div>

        {/* Services */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">
            Serviços ({services.length})
          </span>
          <div className="space-y-2">
            {services.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]/50 shrink-0" />
                <span className="text-[13px] text-zinc-300">{s}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-white/[0.04] my-3" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-[18px] font-black text-[#C5A059] tabular-nums">
              {data.totalPrice}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isCancelled ? (
          <button
            onClick={() => window.open(`https://wa.me/${data.clientPhone}`, '_blank')}
            className="w-full h-11 bg-white/[0.04] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[11px] font-bold uppercase tracking-[0.12em] cursor-pointer flex items-center justify-center gap-2"
          >
            <Send size={14} /> Falar com Cliente
          </button>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={() =>
                openWhatsApp(
                  `✅ *Agendamento confirmado, ${data.clientName}!*\n\nNa *Black Diamond*\n\n✂️ ${data.services}\n📅 ${data.dateTime}\n💰 ${data.totalPrice}\n\n🔗 *Para cancelar ou reagendar:*\n${data.manageUrl}\n\nAguardamos você! 💈`
                )
              }
              className="w-full h-11 bg-[#C5A059] text-black hover:bg-[#A68233] font-bold text-[11px] uppercase tracking-[0.12em] transition-all cursor-pointer flex items-center justify-center gap-2 rounded-xl active:scale-[0.98]"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Enviar Lembrete
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => window.open(data.manageUrl, '_blank')}
                className="h-10 bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight size={14} /> Reagendar
              </button>
              <button
                onClick={() => window.open(data.manageUrl, '_blank')}
                className="h-10 bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-red-500/[0.03] hover:border-red-500/20 hover:text-red-400 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XIcon size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notification Item ─── */
function NotifItem({
  notif,
  onSelect,
  onDelete,
}: {
  notif: Notification;
  onSelect: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const data = parseNotifBody(notif.body);
  const name = data ? data.clientName : notif.title;
  const desc = data ? data.services.split(', ').slice(0, 2).join(', ') : '';
  const extra = data ? Math.max(0, data.services.split(', ').length - 2) : 0;

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
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${notif.read ? 'bg-white/[0.04]' : 'bg-[#C5A059]/10'}`}
          >
            {notif.read ? (
              <Bell size={16} className="text-zinc-500" />
            ) : (
              <span className="text-[13px] font-bold text-[#C5A059]">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!notif.read && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C5A059] border-2 border-[#0A0A0A]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] ${notif.read ? 'text-zinc-400' : 'text-white font-medium'}`}>
            {name}
          </p>
          {desc && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {desc}
              {extra > 0 ? ` +${extra}` : ''}
            </p>
          )}
        </div>

        <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
          {relativeTime(notif.created_at)}
        </span>
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

/* ─── Notifications Panel (desktop sidebar) ─── */
function NotificationsPanel({
  notifications,
  unreadCount,
  markAllAsRead,
  onClose,
  onDelete,
}: {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Notification | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const displayed = onlyUnread ? notifications.filter((n) => !n.read) : notifications;

  if (selected) {
    return <NotificationDetail notif={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <Bell size={16} className="text-[#C5A059]" />
          <h2 className="text-[14px] font-bold text-white">Notificações</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Marcar lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Filter: Todas / Não lidas */}
      {notifications.length > 0 && (
        <div className="flex gap-2 px-5 py-3 border-b border-white/[0.04]">
          <button
            onClick={() => setOnlyUnread(false)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              !onlyUnread ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setOnlyUnread(true)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              onlyUnread ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Não lidas
            {unreadCount > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
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
            <NotifItem key={n.id} notif={n} onSelect={setSelected} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
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

  if (variant === 'desktop') {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-left text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
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

        {isOpen && (
          <>
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-[2px]"
            />
            <div
              ref={panelRef}
              className="fixed top-0 left-0 bottom-0 z-[200] w-[380px] bg-[#0A0A0A] border-r border-white/[0.06] shadow-2xl flex flex-col animate-slide-in"
            >
              <NotificationsPanel
                notifications={notifications}
                unreadCount={unreadCount}
                markAllAsRead={markAllAsRead}
                onClose={() => setIsOpen(false)}
                onDelete={(id) => clearNotification?.(id)}
              />
            </div>
          </>
        )}
      </>
    );
  }

  // Mobile bell icon (navigates to page)
  return (
    <button
      onClick={() => navigate('/admin/notificacoes')}
      className="relative flex items-center justify-center cursor-pointer"
    >
      <Bell size={20} className="text-zinc-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C5A059] text-black text-[9px] font-bold flex items-center justify-center leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export { NotificationDetail };
export default NotificationBell;
