interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function Stars({ score, size = "sm" }: Props) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <span className={`text-accent ${sizeClasses[size]}`}>
      {"★".repeat(Math.round(score))}
      {"☆".repeat(5 - Math.round(score))}
    </span>
  );
}
