import { useMemo, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { AppointmentModal } from "../../components/AppointmentModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Loading } from "../../components/ui/Loading";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { fetchAppointments, listMembers, toErrorMessage, updateAppointmentStatus } from "../../services/api";
import { addDaysISO, endOfDayISO, formatDatePt, startOfDayISO, todayISO, WEEKDAYS_FULL, weekdayOf } from "../../utils/date";
import type { AppointmentStatus, AppointmentWithRelations } from "../../types";

export function AgendaPage() {
  const { activeMembership, role } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [memberId, setMemberId] = useState<string>("all");
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const isOwner = role === "owner" || role === "superadmin";

  const range = useMemo(
    () => ({ from: startOfDayISO(date), to: endOfDayISO(date) }),
    [date]
  );

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [appts, members] = await Promise.all([
      fetchAppointments(shopId, range.from, range.to),
      isOwner ? listMembers(shopId) : Promise.resolve([]),
    ]);
    const filtered = memberId === "all" ? appts : appts.filter((a) => a.member_id === memberId);
    return { appts: filtered, members };
  }, [shopId, range.from, range.to, memberId, isOwner]);

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
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Agenda do dia</h2>
          <p className="text-muted">
            {formatDatePt(date)} · {WEEKDAYS_FULL[weekdayOf(date)]}
            {data?.appts.length ? ` · ${data.appts.length} agendamento(s)` : ""}
          </p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={() => setDate(addDaysISO(date, -1))}>
            <Icon name="chevronLeft" size={14} /> Anterior
          </button>
          <button type="button" className="btn btn--subtle" onClick={() => setDate(today)}>
            Hoje
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setDate(addDaysISO(date, 1))}>
            Próximo <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      {isOwner && activeMembership ? (
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
            {(data?.members ?? []).map((m) => (
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
        <EmptyState
          icon="💈"
          title="Nenhum horário neste dia"
          description="Agendamentos aparecem aqui conforme os clientes marcam na página pública."
        />
      ) : (
        <div className="appt-list">
          {(data?.appts ?? []).map((a) => (
            <AppointmentCard key={a.id} appointment={a} onClick={() => setSelected(a)} />
          ))}
        </div>
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