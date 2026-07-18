"use client";

interface SprocketProps {
  total: number;
  current: number; // 0-indexed
}

export default function Sprocket({ total, current }: SprocketProps) {
  return (
    <div className="w-full">
      <div className="sprocket-track" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <div className="sprocket-hole" key={i}>
            <span style={{ width: i < current ? "100%" : i === current ? "50%" : "0%" }} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs tracking-wide" style={{ color: "var(--md-on-surface-variant)" }}>
        FRAME {current + 1} / {total}
      </p>
    </div>
  );
}
