interface Props {
  label?: string | null;
  size?: "sm" | "md" | "lg";
}

/**
 * Small accent mark for verified accounts (legends, critics, artists).
 * Granted by hand by the founder.
 */
export default function VerifiedMark({ label, size = "sm" }: Props) {
  const dim = size === "lg" ? "w-4 h-4" : size === "md" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      title={label ? `Verified — ${label}` : "Verified"}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} text-accent`}
        aria-label="Verified"
      >
        <path
          d="M12 2L14.39 5.42L18.5 4.83L17.91 8.94L21.33 11.33L17.91 13.72L18.5 17.83L14.39 17.24L12 20.66L9.61 17.24L5.5 17.83L6.09 13.72L2.67 11.33L6.09 8.94L5.5 4.83L9.61 5.42L12 2Z"
          fill="currentColor"
        />
        <path
          d="M9.5 12L11 13.5L14.5 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
