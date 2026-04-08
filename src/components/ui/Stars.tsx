interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Identity-era replacement for the old star rating.
 * Score is now an internal signal — score >= 4 means "loved".
 * In the UI, we render a small heart for loved items, nothing otherwise.
 */
export default function Stars({ score, size = "sm" }: Props) {
  if (!score || score < 4) return null;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span className={`text-accent ${sizeClasses[size]}`} title="Loved">
      ❤
    </span>
  );
}
