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
        "relative overflow-hidden w-full text-left rounded-[var(--md-shape-md)] border px-4 py-3.5",
        "flex items-center gap-3 transition-colors duration-150 focus-visible:outline",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        selected
          ? "border-[var(--md-sys-color-primary)]"
          : "border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-outline)]",
      ].join(" ")}
      style={{
        background: selected
          ? "var(--md-sys-color-secondary-container)"
          : "var(--md-sys-color-surface-container-low)",
        color: selected ? "var(--md-sys-color-on-secondary-container)" : "var(--md-sys-color-on-surface)",
      }}
    >
      <md-ripple></md-ripple>
      <div className="shrink-0 flex items-center justify-center pointer-events-none">
        {multi ? (
          <md-checkbox checked={selected} tabIndex={-1} />
        ) : (
          <md-radio checked={selected} tabIndex={-1} />
        )}
      </div>
      <span className="flex flex-col relative z-10">
        <span className="text-[15px] font-medium leading-snug">{label}</span>
        {sublabel && (
          <span className="text-[13px] opacity-75 leading-snug mt-0.5">{sublabel}</span>
        )}
      </span>
    </button>
  );
}
