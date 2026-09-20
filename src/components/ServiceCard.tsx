import type { Service } from "../types";
import { formatCurrency } from "../utils/format";

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onClick?: () => void;
}

export function ServiceCard({ service, selected = false, onClick }: ServiceCardProps) {
  const content = (
    <>
      <div className="service-card__top">
        <strong className="service-card__name">{service.name}</strong>
        <span className="service-card__price">{formatCurrency(service.price)}</span>
      </div>
      {service.description ? <p className="service-card__desc">{service.description}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`service-card ${selected ? "is-selected" : ""}`}
        onClick={onClick}
        aria-pressed={selected}
      >
        {content}
      </button>
    );
  }

  return <div className={`service-card ${selected ? "is-selected" : ""}`}>{content}</div>;
}