import { useMemo } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { fetchAppointments, listClients } from "../../services/api";
import { addDaysISO, endOfDayISO, formatDatePt, startOfDayISO, timeFromISO, todayISO } from "../../utils/date";
import { formatCurrency, greeting } from "../../utils/format";
import type { AppointmentWithRelations } from "../../types";

function sumConcluded(appts: AppointmentWithRelations[]): number {
  return appts
    .filter((a) => a.status === "concluido")
    .reduce((acc, a) => acc + Number(a.price), 0);
}

export function DashboardPage() {
  const { activeMembership, profile } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const today = todayISO();

  const range = useMemo(() => {
    const dow = new Date(today + "T00:00:00").getDay();
    const weekStart = addDaysISO(today, -((dow + 6) % 7));
    const monthStart = today.slice(0, 8) + "01";
    return {
      today: { from: startOfDayISO(today), to: endOfDayISO(today) },
      week: { from: startOfDayISO(weekStart), to: endOfDayISO(today) },
      month: { from: startOfDayISO(monthStart), to: endOfDayISO(today) },
    };
  }, [today]);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [todayData, weekData, monthData, clients] = await Promise.all([
      fetchAppointments(shopId, range.today.from, range.today.to),
      fetchAppointments(shopId, range.week.from, range.week.to),
      fetchAppointments(shopId, range.month.from, range.month.to),
      listClients(shopId),
    ]);
    return { todayData, weekData, monthData, clients };
  }, [shopId, range.today.from, range.today.to, range.week.from, range.week.to, range.month.from, range.month.to]);

  if (loading) return <Loading label="Carregando visão geral..." />;

  if (error) {
    return <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />;
  }

  const todayData = data?.todayData ?? [];
  const weekData = data?.weekData ?? [];
  const monthData = data?.monthData ?? [];
  const clientsCount = data?.clients.length ?? 0;

  const upcoming = todayData
    .filter((a) => !["cancelado", "concluido", "faltou"].includes(a.status))
    .slice(0, 5);
  const lostToday = todayData.filter((a) => ["cancelado", "faltou"].includes(a.status)).length;
  const scheduledToday = todayData.filter((a) => ["agendado", "confirmado"].includes(a.status)).length;

  const stats = [
    { label: "Atendimentos hoje", value: String(todayData.filter((a) => a.status !== "cancelado").length) },
    { label: "Faturamento hoje", value: formatCurrency(sumConcluded(todayData)) },
    { label: "Semana", value: formatCurrency(sumConcluded(weekData)) },
    { label: "Mês", value: formatCurrency(sumConcluded(monthData)) },
    { label: "Clientes", value: String(clientsCount) },
    { label: "Cancelamentos/faltas hoje", value: String(lostToday) },
  ];

  return (
    <div className="page">
      <div className="page-heading">
        <h2>
          {greeting(new Date().getHours())}, {profile?.full_name ?? "!"}
        </h2>
        <p className="text-muted">
          Hoje é {formatDatePt(today)} · {scheduledToday} horário(s) confirmados para hoje.
        </p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <strong className="stat-card__value">{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card__head">
            <h3>Próximos horários hoje</h3>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="📅" title="Nada agendado ainda" description="Os próximos horários de hoje aparecem aqui." />
          ) : (
            <div className="appt-list">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} onClick={() => undefined} />
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h3>Agenda de hoje</h3>
          </div>
          {todayData.length === 0 ? (
            <EmptyState icon="💈" title="Dia livre" description="Nenhum agendamento para hoje." />
          ) : (
            <ul className="mini-list">
              {todayData.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <span className="mini-list__time">{timeFromISO(a.start_at)}</span>
                  <strong>{a.client_name}</strong>
                  <span className="muted">{a.service?.name}</span>
                  <span className={`badge badge--${a.status}`}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <button type="button" className="btn btn--ghost" onClick={reload}>
        Atualizar dados
      </button>
    </div>
  );
}