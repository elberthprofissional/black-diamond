import { STATUS_LABELS } from "../../types";
import type { AppointmentStatus } from "../../types";

const ORDER: AppointmentStatus[] = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "faltou",
];

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`badge badge--${status}`} title={STATUS_LABELS[status]}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export const STATUS_ORDER = ORDER;