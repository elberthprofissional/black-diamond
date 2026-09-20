import { useMemo } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { fetchAppointments } from "../../services/api";
import { addDaysISO, endOfDayISO, formatDatePt, startOfDayISO, timeFromISO, todayISO } from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import type { AppointmentWithRelations } from "../../types";

export function FinancePage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const today = todayISO();

  const ranges = useMemo(() => {
    const dow = new Date(today + "T00:00:00").getDay();
    const weekStart = startOfDayISO(addDaysISO(today, -((dow + 6) % 7)));
    const monthStart = startOfDayISO(today.slice(0, 8) + "01");
    return {
      today: { from: startOfDayISO(today), to: endOfDayISO(today) },
      week: { from: weekStart, to: endOfDayISO(today) },
      month: { from: monthStart, to: endOfDayISO(today) },
    };
  }, [today]);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [todayAppts, weekAppts, monthAppts] = await Promise.all([
      fetchAppointments(shopId, ranges.today.from, ranges.today.to),
      fetchAppointments(shopId, ranges.week.from, ranges.week.to),
      fetchAppointments(shopId, ranges.month.from, ranges.month.to),
    ]);
    return { todayAppts, weekAppts, monthAppts };
  }, [shopId, ranges.today.from, ranges.today.to, ranges.week.from, ranges.week.to, ranges.month.from, ranges.month.to]);

  const sums = useMemo(() => {
    const calc = (list: AppointmentWithRelations[]) => ({
      total: list.reduce((acc, a) => acc + Number(a.price), 0),
      concluded: list
        .filter((a) => a.status === "concluido")
        .reduce((acc, a) => acc + Number(a.price), 0),
      count: list.filter((a) => a.status === "concluido").length,
    });
    return {
      today: calc(data?.todayAppts ?? []),
      week: calc(data?.weekAppts ?? []),
      month: calc(data?.monthAppts ?? []),
    };
  }, [data]);

  if (loading) return <Loading label="Carregando financeiro..." />;
  if (error) {
    return (
      <EmptyState
        icon="!"
        title="Erro ao carregar"
        description={error}
        action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>}
      />
    );
  }

  const cards = [
    { label: "Hoje", value: formatCurrency(sums.today.concluded), sub: `${sums.today.count} concluído(s)` },
    { label: "Esta semana", value: formatCurrency(sums.week.concluded), sub: `${sums.week.count} concluído(s)` },
    { label: "Este mês", value: formatCurrency(sums.month.concluded), sub: `${sums.month.count} concluído(s)` },
    { label: "Total agendado (mês)", value: formatCurrency(sums.month.total), sub: "todos os agendamentos do mês" },
  ];

  const concludedThisMonth = (data?.monthAppts ?? []).filter((a) => a.status === "concluido");

  return (
    <div className="page">
      <div className="page-heading">
        <h2>Financeiro</h2>
        <p className="text-muted">
          Calculado a partir dos atendimentos concluídos. Nenhum pagamento é processado aqui.
        </p>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="stat-card__label">{c.label}</span>
            <strong className="stat-card__value">{c.value}</strong>
            <span className="stat-card__sub">{c.sub}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card__head">
          <h3>Concluídos neste mês</h3>
          <span className="muted">{concludedThisMonth.length} registros</span>
        </div>
        {concludedThisMonth.length === 0 ? (
          <EmptyState icon="💰" title="Nada concluído neste mês" description="Quando atendimentos forem concluídos, eles aparecem aqui." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {concludedThisMonth.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDatePt(a.start_at.slice(0, 10))}</td>
                    <td>{timeFromISO(a.start_at)}</td>
                    <td>
                      <strong>{a.client_name}</strong>
                    </td>
                    <td>{a.service?.name ?? "—"}</td>
                    <td className="muted">{a.member?.full_name ?? "—"}</td>
                    <td>{formatCurrency(a.price)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <button type="button" className="btn btn--ghost" onClick={reload}>
        Atualizar
      </button>
    </div>
  );
}