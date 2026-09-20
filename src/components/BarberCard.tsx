import type { Member } from "../types";
import { Avatar } from "./ui/Avatar";

interface BarberCardProps {
  barber: Member;
  selected?: boolean;
  onClick?: () => void;
}

export function BarberCard({ barber, selected = false, onClick }: BarberCardProps) {
  const content = (
    <>
      <Avatar name={barber.full_name} src={barber.avatar_url} size="lg" />
      <strong className="barber-card__name">{barber.full_name}</strong>
      {barber.specialty ? <span className="badge badge--ghost">{barber.specialty}</span> : null}
      {barber.bio ? <p className="barber-card__bio">{barber.bio}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`barber-card ${selected ? "is-selected" : ""}`}
        onClick={onClick}
        aria-pressed={selected}
      >
        {content}
      </button>
    );
  }

  return <div className={`barber-card ${selected ? "is-selected" : ""}`}>{content}</div>;
}