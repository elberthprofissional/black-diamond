import { useMemo, useState } from "react";
import { ClientTable } from "../../components/ClientTable";
import type { ClientWithStats } from "../../components/ClientTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { fetchAppointments, listClients } from "../../services/api";
import { endOfDayISO, formatDatePt, startOfDayISO, timeFromISO, todayISO } from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import type { AppointmentWithRelations } from "../../types";

export function ClientsPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [clients, appts] = await Promise.all([
      listClients(shopId),
      fetchAppointments(
        shopId,
        startOfDayISO("1970-01-01"),
        endOfDayISO(addYears(todayISO(), 1))
      ),
    ]);
    return { clients, appts };
  }, [shopId]);

  const withStats = useMemo<ClientWithStats[]>(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const a of data?.appts ?? []) {
      const key = a.client_whatsapp;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return (data?.clients ?? []).map((c) => {
      const history = (map.get(c.whatsapp) ?? []).sort((a, b) =>
        b.start_at.localeCompare(a.start_at)
      );
      return {
        ...c,
        visit_count: history.filter((a) => a.status === "concluido").length,
        last_visit:
          history.find((a) => a.status === "concluido")?.start_at ?? null,
        history,
      };
    });
  }, [data]);

  const [selected, setSelected] = useState<ClientWithStats | null>(null);

  if (loading) return <Loading label="Carregando clientes..." />;
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

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Operação</span>
        <h2>Clientes</h2>
        <p className="text-muted">
          {withStats.length} cliente(s) cadastrado(s) · {withStats.reduce((a, c) => a + c.visit_count, 0)} visita(s) concluída(s)
        </p>
      </div>

      <ClientTable clients={withStats} onSelect={setSelected} onRefresh={reload} />

      {selected ? (
        <ClientHistoryModal client={selected} onClose={() => setSelected(null)} />
      ) : null}

      <p className="muted" style={{ marginTop: 16 }}>
        Clientes são identificados pelo WhatsApp informado no agendamento.
      </p>
    </div>
  );
}

function ClientHistoryModal({ client, onClose }: { client: ClientWithStats; onClose: () => void }) {
  const history = (client.history ?? []) as AppointmentWithRelations[];

  return (
    <Modal open onClose={onClose} title={client.name} width="lg">
      <p className="text-muted">
        WhatsApp: {client.whatsapp} · {history.length} agendamento(s)
      </p>
      {history.length === 0 ? (
        <EmptyState icon="🗓️" title="Sem histórico" description="Nenhum agendamento encontrado para este cliente." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Serviço</th>
                <th>Barbeiro</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id}>
                  <td>{formatDatePt(a.start_at.slice(0, 10))}</td>
                  <td>{timeFromISO(a.start_at)}</td>
                  <td>{a.service?.name ?? "—"}</td>
                  <td>{a.member?.full_name ?? "—"}</td>
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
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}

function addYears(iso: string, years: number): string {
  const [y] = iso.split("-").map(Number);
  return `${y + years}-12-31`;
}