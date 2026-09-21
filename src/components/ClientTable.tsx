import type { AppointmentWithRelations, Client } from "../types";
import { formatDatePt } from "../utils/date";
import { Avatar } from "./ui/Avatar";
import { Icon } from "./ui/Icon";
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
                <th>Visitas</th>
                <th>Último atendimento</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} onClick={() => onSelect(c)} className="row-click">
                  <td>
                    <div className="client-cell">
                      <Avatar name={c.name} size="md" />
                      <div className="client-cell__main">
                        <strong className="client-cell__name">{c.name}</strong>
                        <span className="client-cell__wa">{c.whatsapp}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="visits-count">{c.visit_count}</span>{" "}
                    <span className="muted">{c.visit_count === 1 ? "visita" : "visitas"}</span>
                  </td>
                  <td className="muted">
                    {c.last_visit ? formatDatePt(c.last_visit.slice(0, 10)) : "—"}
                  </td>
                  <td>
                    <span className="row-action">
                      Abrir <Icon name="arrowRight" size={14} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}