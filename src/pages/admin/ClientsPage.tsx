import { useMemo, useState } from "react";
import { ClientTable } from "../../components/ClientTable";
import type { ClientWithStats } from "../../components/ClientTable";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createClient, fetchAppointments, listClients, toErrorMessage } from "../../services/api";
import { endOfDayISO, formatDatePt, startOfDayISO, timeFromISO, todayISO } from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import { isValidName, isValidWhatsapp } from "../../utils/validation";
import type { AppointmentWithRelations } from "../../types";

export function ClientsPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

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

  const visible = useMemo(
    () => withStats.filter((c) => c.visit_count >= 2 || c.is_manual),
    [withStats]
  );

  const [selected, setSelected] = useState<ClientWithStats | null>(null);
  const [adding, setAdding] = useState(false);

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
      <div className="page-heading page-heading--row">
        <div>
          <span className="eyebrow">Operação</span>
          <h2>Clientes</h2>
          <p className="text-muted">
            {visible.length} cliente(s) nesta lista · {visible.reduce((a, c) => a + c.visit_count, 0)} visita(s) concluída(s)
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Adicionar cliente</Button>
      </div>

      {adding ? (
        <AddClientModal
          shopId={shopId}
          onClose={() => setAdding(false)}
          onCreated={() => {
            showToast("Cliente adicionado.", "success");
            reload();
          }}
        />
      ) : null}

      <ClientTable clients={visible} onSelect={setSelected} onRefresh={reload} />

      {selected ? (
        <ClientHistoryModal client={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function AddClientModal({
  shopId,
  onClose,
  onCreated,
}: {
  shopId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setFormError(null);
    if (!isValidName(name)) return setFormError("Informe o nome do cliente.");
    if (!isValidWhatsapp(whatsapp))
      return setFormError("Telefone inválido. Use o WhatsApp com DDD, ex.: 11 98888-7777.");

    setBusy(true);
    try {
      await createClient(shopId, name, whatsapp);
      onCreated();
      onClose();
    } catch (e) {
      setFormError(toErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar cliente"
      width="sm"
      footer={
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Salvar cliente
          </Button>
        </div>
      }
    >
      <div className="form-stack">
        <Input
          label="Nome"
          name="client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do cliente"
        />
        <Input
          label="WhatsApp"
          name="client-whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="(11) 98888-7777"
        />
      </div>
      {formError ? <p className="form-error">{formError}</p> : null}
    </Modal>
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