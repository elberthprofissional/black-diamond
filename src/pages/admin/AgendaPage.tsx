import { CalendarX2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { AppointmentModal } from "../../components/AppointmentModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  fetchAppointments,
  listBusinessHours,
  listMembers,
  toErrorMessage,
  updateAppointmentStatus,
} from "../../services/api";
import {
  activeWeekStartISO,
  addDaysISO,
  endOfDayISO,
  formatDatePt,
  startOfDayISO,
  sundayOfWeek,
  todayISO,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  weekdayOf,
} from "../../utils/date";
import type { AppointmentStatus, AppointmentWithRelations } from "../../types";

/**
 * Agenda semanal: mostra sempre a semana em curso (a próxima quando "hoje" cai
 * em dia fechado após o último dia útil). Sem navegação entre semanas.
 */
export function AgendaPage() {
  const { activeMembership, role } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const today = todayISO();
  const [memberId, setMemberId] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const isOwner = role === "owner" || role === "superadmin";

  const hours = useAsyncData(() => listBusinessHours(shopId), [shopId]);

  const openWeekdays = useMemo(
    () =>
      (hours.data ?? [])
        .filter((h) => !h.is_closed && h.open_time && h.close_time)
        .map((h) => h.weekday),
    [hours.data],
  );

  const weekStart = useMemo(() => activeWeekStartISO(today, openWeekdays), [today, openWeekdays]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart],
  );

  const range = useMemo(
    () => ({
      from: startOfDayISO(weekStart),
      to: endOfDayISO(sundayOfWeek(weekStart)),
    }),
    [weekStart],
  );

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [appts, members] = await Promise.all([
      fetchAppointments(shopId, range.from, range.to),
      isOwner ? listMembers(shopId) : Promise.resolve([]),
    ]);
    const filtered = memberId === "all" ? appts : appts.filter((a) => a.member_id === memberId);
    return { appts: filtered, members };
  }, [shopId, range.from, range.to, memberId, isOwner]);

  const apptsByDay = useMemo(() => {
    const map: Record<string, AppointmentWithRelations[]> = {};
    for (const d of weekDays) map[`${d}`] = [];
    for (const a of data?.appts ?? []) {
      const key = `${a.start_at}`.slice(0, 10);
      if (map[key]) map[key].push(a);
    }
    return map;
  }, [weekDays, data?.appts]);

  const handleStatus = async (status: AppointmentStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateAppointmentStatus(selected.id, status);
      showToast("Status atualizado.", "success");
      setSelected(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page agenda-page">
      <div className="page-heading">
        <span className="eyebrow">Operação</span>
        <h2>Agenda da semana</h2>
        <p className="text-muted">
          {formatDatePt(weekDays[0])} – {formatDatePt(weekDays[6])}
          {data?.appts.length ? ` · ${data.appts.length} agendamento(s)` : ""}
        </p>
      </div>

      {isOwner && data?.members?.length ? (
        <div className="agenda-filter">
          <label htmlFor="agenda-member" className="field-label">
            Profissional
          </label>
          <select
            id="agenda-member"
            className="input select agenda-filter__select"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="all">Todos</option>
            {data.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? (
        <Loading label="Carregando agenda..." />
      ) : error ? (
        <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
      ) : (data?.appts ?? []).length === 0 ? (
        <EmptyState icon={<CalendarX2 size={22} strokeWidth={1.5} />} title="Semana sem horários" description="Agendamentos aparecem aqui conforme os clientes marcam na página pública." />
      ) : (
        <>
          <div className="week-filter" role="tablist" aria-label="Filtrar por dia da semana">
            <button
              type="button"
              className={"week-filter__btn" + (dayFilter === null ? " is-active" : "")}
              onClick={() => setDayFilter(null)}
            >
              Todos
            </button>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <button
                key={dow}
                type="button"
                className={
                  "week-filter__btn" +
                  (weekdayOf(today) === dow ? " is-today" : "") +
                  (dayFilter === dow ? " is-active" : "")
                }
                onClick={() => setDayFilter(dow)}
              >
                <span className="week-filter__num">
                  {Number(weekDays[(dow + 6) % 7].slice(8, 10))}
                </span>
                <span className="week-filter__label">{WEEKDAYS_SHORT[dow]}</span>
              </button>
            ))}
          </div>

          <div className={"week" + (dayFilter !== null ? " week--single" : "")}>
            {weekDays
              .filter((day) => dayFilter === null || weekdayOf(day) === dayFilter)
              .map((day) => (
                <section
                  className={"week__day" + (day === today ? " is-today" : "")}
                  key={day}
                >
                  <h3 className="week__day-heading">
                    <span>{WEEKDAYS_FULL[weekdayOf(day)]}</span>
                    <small>{formatDatePt(day)}</small>
                  </h3>
                  <div className="appt-list">
                    {(apptsByDay[`${day}`] ?? []).map((a) => (
                      <AppointmentCard key={a.id} appointment={a} onClick={() => setSelected(a)} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}

      <AppointmentModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onStatus={handleStatus}
        busy={busy}
      />
    </div>
  );
}