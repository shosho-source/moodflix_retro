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
      className={`relative w-full text-left border-2 p-4 flex items-start gap-4 transition-colors duration-100 ${
        selected
          ? "border-[var(--retro-border)] bg-[var(--retro-fg)] text-[var(--retro-surface)]"
          : "border-[var(--retro-border)] bg-[var(--retro-surface)] active:bg-[#e0e0dc] sm:hover:bg-[#e0e0dc]"
      }`}
    >
      <div className="shrink-0 flex items-center justify-center mt-1 pointer-events-none">
        <div className={`w-5 h-5 flex items-center justify-center border-2 border-[currentcolor] ${multi ? '' : 'rounded-full'}`}>
          {selected && (
            <div className={`w-2.5 h-2.5 bg-[currentcolor] ${multi ? '' : 'rounded-full'}`} />
          )}
        </div>
      </div>
      <span className="flex flex-col relative z-10">
        <span className="text-base font-bold uppercase tracking-wide leading-snug">{label}</span>
        {sublabel && (
          <span className="text-sm font-mono mt-1 opacity-80">{sublabel}</span>
        )}
      </span>
    </button>
  );
}
