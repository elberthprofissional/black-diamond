import { initials } from "../../utils/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  if (src) {
    return (
      <img
        className={`avatar avatar--${size}`}
        src={src}
        alt={name}
        loading="lazy"
      />
    );
  }
  return (
    <span className={`avatar avatar--${size} avatar--fallback`} aria-hidden>
      {initials(name)}
    </span>
  );
}