import type { AppointmentWithRelations } from "../types";
import { timeFromISO } from "../utils/date";
import { formatCurrency } from "../utils/format";
import { StatusBadge } from "./ui/StatusBadge";

interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
  onClick: () => void;
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const service = appointment.service;
  const member = appointment.member;

  return (
    <button type="button" className="appt-card" onClick={onClick}>
      <div className="appt-card__time">
        <strong>{timeFromISO(appointment.start_at)}</strong>
        {service ? (
          <span>{timeFromISO(appointment.end_at)} · {service.duration_minutes}min</span>
        ) : null}
      </div>
      <div className="appt-card__body">
        <strong>{appointment.client_name}</strong>
        <span className="appt-card__sub">
          {service?.name ?? "Serviço removido"}
          {member ? ` · ${member.full_name}` : ""}
        </span>
        <span className="appt-card__meta">
          {formatCurrency(appointment.price)}
          {service ? ` · ${service.duration_minutes}min` : ""}
        </span>
      </div>
      <StatusBadge status={appointment.status} />
    </button>
  );
}