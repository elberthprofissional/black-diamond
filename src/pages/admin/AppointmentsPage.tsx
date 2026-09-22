import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { AppointmentModal } from "../../components/AppointmentModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { fetchAppointments, toErrorMessage, updateAppointmentStatus } from "../../services/api";
import { addDaysISO, endOfDayISO, formatDatePt, startOfDayISO, timeFromISO, todayISO } from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import type { AppointmentStatus, AppointmentWithRelations } from "../../types";

const RANGES = [
  { id: "today", label: "Hoje", days: 0 },
  { id: "week", label: "Próximos 7 dias", days: 6 },
  { id: "month", label: "Próximos 30 dias", days: 29 },
];

export function AppointmentsPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const [rangeId, setRangeId] = useState("week");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const range = useMemo(() => {
    const r = RANGES.find((x) => x.id === rangeId) ?? RANGES[1];
    return {
      from: startOfDayISO(todayISO()),
      to: endOfDayISO(addDaysISO(todayISO(), r.days)),
    };
  }, [rangeId]);

  const { data, loading, error, reload } = useAsyncData(
    () => fetchAppointments(shopId, range.from, range.to),
    [shopId, range.from, range.to]
  );

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (status !== "all") list = list.filter((a) => a.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.client_name.toLowerCase().includes(q));
    }
    return list;
  }, [data, status, search]);

  const handleStatus = async (next: AppointmentStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateAppointmentStatus(selected.id, next);
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
      <div className="page-heading">
        <h2>Agendamentos</h2>
        <p className="text-muted">
          {filtered.length} resultado(s) · total {formatCurrency(
            filtered.filter((a) => a.status === "concluido").reduce((acc, a) => acc + Number(a.price), 0)
          )} concluído(s)
        </p>
      </div>

      <div className="table-toolbar">
        <select className="input select toolbar-select" value={rangeId} onChange={(e) => setRangeId(e.target.value)} aria-label="Período">
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select className="input select toolbar-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="confirmado">Confirmado</option>
          <option value="em_atendimento">Em atendimento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="faltou">Faltou</option>
        </select>
        <Input type="search" placeholder="Buscar por cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <Loading label="Carregando agendamentos..." />
      ) : error ? (
        <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CalendarDays size={22} strokeWidth={1.5} />} title="Nada por aqui" description="Nenhum agendamento encontrado com esses filtros." />
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
              {filtered.map((a) => (
                <tr key={a.id} className="row-click" onClick={() => setSelected(a)}>
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

      <AppointmentModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onStatus={handleStatus}
        busy={busy}
      />
    </div>
  );
}