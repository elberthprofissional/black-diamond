interface NotificationFiltersProps {
  onlyUnread: boolean;
  unreadCount: number;
  onChange: (onlyUnread: boolean) => void;
}

export default function NotificationFilters({
  onlyUnread,
  unreadCount,
  onChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex gap-2 px-5 py-3 border-b border-white/[0.04]">
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
          !onlyUnread ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Todas
      </button>
      <button
        onClick={() => onChange(true)}
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
  );
}
