interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function Stars({ score, size = "sm" }: Props) {
  const fullStars = Math.floor(score);
  const hasHalf = score % 1 !== 0;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <span className={`text-accent ${sizeClasses[size]}`}>
      {"★".repeat(fullStars)}
      {hasHalf && "½"}
    </span>
  );
}
