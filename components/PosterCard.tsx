import Image from "next/image";
import { Movie } from "@/lib/types";

export default function PosterCard({ movie }: { movie: Movie }) {
  const hue = movie.hue;
  const hasPoster = !!movie.posterPath;

  return (
    <div
      className="relative aspect-[2/3] w-full rounded-[var(--md-shape-lg)] overflow-hidden shrink-0"
      style={{
        background: hasPoster
          ? `hsl(${hue} 20% 8%)`
          : `linear-gradient(160deg, hsl(${hue} 45% 22%) 0%, hsl(${hue} 55% 10%) 60%, hsl(${(hue + 30) % 360} 40% 8%) 100%)`,
      }}
    >
      <md-elevation></md-elevation>
      {hasPoster ? (
        <Image
          src={movie.posterPath!}
          alt={`${movie.title} poster`}
          fill
          sizes="(max-width: 640px) 100vw, 192px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 14px)",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p
              className="font-display text-[11px] uppercase tracking-[0.2em] mb-2"
              style={{ color: `hsl(${hue} 70% 78%)` }}
            >
              {movie.genres[0]}
            </p>
            <h3 className="font-display text-2xl leading-tight text-white">{movie.title}</h3>
            <p className="text-white/60 text-sm mt-1">{movie.year}</p>
          </div>
        </>
      )}
    </div>
  );
}
