import type { AppointmentWithRelations, AppointmentStatus } from "../types";
import { formatDatePt, timeFromISO } from "../utils/date";
import { buildWhatsappLink, formatCurrency } from "../utils/format";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Modal } from "./ui/Modal";
import { StatusBadge } from "./ui/StatusBadge";

interface AppointmentModalProps {
  appointment: AppointmentWithRelations | null;
  onClose: () => void;
  onStatus: (status: AppointmentStatus) => void;
  busy: boolean;
}

const NEXT_STATUS: { status: AppointmentStatus; label: string }[] = [
  { status: "confirmado", label: "Confirmar" },
  { status: "em_atendimento", label: "Iniciar atendimento" },
  { status: "concluido", label: "Concluir" },
  { status: "cancelado", label: "Cancelar" },
  { status: "faltou", label: "Marcar falta" },
];

export function AppointmentModal({ appointment, onClose, onStatus, busy }: AppointmentModalProps) {
  if (!appointment) return null;

  const svc = appointment.service;
  const member = appointment.member;
  const whatsappText = `Olá, ${appointment.client_name}! Sobre seu agendamento de ${timeFromISO(
    appointment.start_at
  )} (${formatDatePt(appointment.start_at.slice(0, 10))}).`;

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={`Agendamento · ${appointment.client_name}`}
      width="md"
      footer={
        <div className="modal-actions">
          <a
            className="btn btn--ghost"
            href={buildWhatsappLink(appointment.client_whatsapp, whatsappText)}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="phone" size={15} />
            WhatsApp
          </a>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="appt-detail">
        <div className="appt-detail__row">
          <StatusBadge status={appointment.status} />
          <span className="appt-detail__price">{formatCurrency(appointment.price)}</span>
        </div>

        <dl className="appt-detail__list">
          <div>
            <dt>Serviço</dt>
            <dd>
              {svc?.name ?? "—"}
              {svc ? <span className="muted"> · {svc.duration_minutes} min</span> : null}
            </dd>
          </div>
          <div>
            <dt>Profissional</dt>
            <dd>
              {member ? (
                <span className="inline-avatar">
                  <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
                  {member.full_name}
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{formatDatePt(appointment.start_at.slice(0, 10))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>
              {timeFromISO(appointment.start_at)} — {timeFromISO(appointment.end_at)}
            </dd>
          </div>
          <div>
            <dt>WhatsApp do cliente</dt>
            <dd>{appointment.client_whatsapp}</dd>
          </div>
        </dl>

        <div className="appt-detail__actions">
          <span className="section-label">Alterar status</span>
          <div className="btn-row">
            {NEXT_STATUS.map((s) => (
              <Button
                key={s.status}
                size="sm"
                variant={s.status === "cancelado" ? "danger" : "subtle"}
                disabled={busy || appointment.status === s.status}
                onClick={() => onStatus(s.status)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}