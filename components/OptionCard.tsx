"use client";

interface OptionCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}

export default function OptionCard({
  label,
  sublabel,
  selected,
  onClick,
  multi = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "state-layer w-full text-left rounded-[var(--md-shape-md)] border px-4 py-3.5",
        "flex items-center gap-3 transition-colors duration-150 focus-visible:outline",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        selected
          ? "border-transparent"
          : "border-[var(--md-outline-variant)] hover:border-[var(--md-outline)]",
      ].join(" ")}
      style={{
        background: selected
          ? "var(--md-secondary-container)"
          : "var(--md-surface-container-low)",
        color: selected ? "var(--md-on-secondary-container)" : "var(--md-on-surface)",
        outlineColor: "var(--md-primary)",
      }}
    >
      <span
        className={
          multi
            ? "shrink-0 h-5 w-5 rounded-[6px] border-2 flex items-center justify-center"
            : "shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center"
        }
        style={{
          borderColor: selected ? "var(--md-primary)" : "var(--md-outline)",
          background: selected ? "var(--md-primary)" : "transparent",
        }}
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path
              d="M3 8.5L6.2 11.5L13 4.5"
              stroke="var(--md-on-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-medium leading-snug">{label}</span>
        {sublabel && (
          <span className="text-[13px] opacity-75 leading-snug mt-0.5">{sublabel}</span>
        )}
      </span>
    </button>
  );
}
