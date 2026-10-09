import Link from "next/link";
import { SearchResult } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

export default function SearchResultList({
  results,
}: {
  results: SearchResult[];
}) {
  return (
    <ul className="w-full flex flex-col gap-3">
      {results.map((result) => (
        <li
          key={result.id}
          className="glass glass-border glass-edge rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="text-sm sm:text-base text-slate-100 font-semibold truncate">
              {result.prompt}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {result.category} · by {result.authorName} · added{" "}
              {formatRelativeTime(result.createdAt)}
            </p>
          </div>
          <Link
            href={`/q/${result.id}`}
            className="shrink-0 px-4 py-2 bg-linear-to-r from-neo-mint to-electric-indigo text-deep-space rounded-xl font-black font-heading text-xs whitespace-nowrap"
          >
            Play
          </Link>
        </li>
      ))}
    </ul>
  );
}
