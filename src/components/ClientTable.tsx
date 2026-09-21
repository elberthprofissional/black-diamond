import type { AppointmentWithRelations, Client } from "../types";
import { formatDatePt } from "../utils/date";
import { Avatar } from "./ui/Avatar";
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
        <div className="client-grid">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              className="client-card"
              onClick={() => onSelect(c)}
            >
              <span
                className={"client-card__dot" + (c.visit_count === 0 ? " is-new" : "")}
                aria-hidden
              />
              <span className="client-card__head">
                <Avatar name={c.name} size="md" />
                <span className="client-card__info">
                  <strong className="client-card__name">{c.name}</strong>
                  <span className="client-card__wa">{c.whatsapp}</span>
                </span>
              </span>
              <span className="client-card__meta">
                <span className="client-card__meta-label">
                  {c.last_visit ? "Último atendimento" : "Visitas"}
                </span>
                <span className="client-card__visit">
                  <strong>
                    {c.last_visit ? formatDatePt(c.last_visit.slice(0, 10)) : "—"}
                  </strong>
                  <span>
                    {c.visit_count} {c.visit_count === 1 ? "visita" : "visitas"}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}