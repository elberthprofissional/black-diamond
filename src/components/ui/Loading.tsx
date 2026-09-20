export function Loading({
  label = "Carregando...",
  full = false,
}: {
  label?: string;
  full?: boolean;
}) {
  return (
    <div className={`loading${full ? " loading--full" : ""}`} role="status">
      <span className="spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}

export function SkeletonLines({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-hidden data-testid="skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton__line" />
      ))}
    </div>
  );
}