import type { AppointmentWithRelations, Client } from "../types";
import { formatDatePt } from "../utils/date";
import { EmptyState } from "./ui/EmptyState";

export interface ClientWithStats extends Client {
  visit_count: number;
  last_visit: string | null;
  history?: AppointmentWithRelations[];
}

interface ClientTableProps {
  clients: ClientWithStats[];
  onSelect: (client: ClientWithStats) => void;
  onRefresh: () => void;
}

export function ClientTable({ clients, onSelect, onRefresh }: ClientTableProps) {
  return (
    <>
      {clients.length === 0 ? (
        <EmptyState
          icon="◆"
          title="Nenhum cliente ainda"
          description="Os clientes aparecem aqui automaticamente ao marcar horários."
          action={
            <button type="button" className="btn btn--ghost" onClick={onRefresh}>
              Atualizar
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Visitas</th>
                <th>Último atendimento</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} onClick={() => onSelect(c)} className="row-click">
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="muted">{c.whatsapp}</td>
                  <td>{c.visit_count}</td>
                  <td className="muted">
                    {c.last_visit ? formatDatePt(c.last_visit.slice(0, 10)) : "—"}
                  </td>
                  <td className="muted">abrir →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}