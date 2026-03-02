interface EmptyStateProps {
  label?: string;
  height?: string;
}

export function EmptyState({
  label = "No data yet",
  height = "h-[220px]",
}: EmptyStateProps) {
  return (
    <div className={`flex ${height} items-center justify-center`}>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
