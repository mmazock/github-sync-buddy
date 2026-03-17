import { useRef, useEffect } from "react";
import type { GameLogEntry } from "@/lib/gameTypes";

interface GameLogProps {
  gameLog: Record<string, GameLogEntry>;
}

function getLogStyle(text: string): string {
  if (text.includes("⚔️") || text.includes("destroyed") || text.includes("BROKE")) return "border-l-4 border-l-red-500 bg-red-500/10";
  if (text.includes("🏴‍☠️") || text.includes("plunder")) return "border-l-4 border-l-orange-500 bg-orange-500/10";
  if (text.includes("🤝") || text.includes("ACCEPTED") || text.includes("deal")) return "border-l-4 border-l-green-500 bg-green-500/10";
  if (text.includes("💰") || text.includes("gave $") || text.includes("cashed in")) return "border-l-4 border-l-yellow-500 bg-yellow-500/10";
  if (text.includes("🏭") || text.includes("manufactured")) return "border-l-4 border-l-blue-500 bg-blue-500/10";
  if (text.includes("💬") || text.includes("proposes")) return "border-l-4 border-l-purple-500 bg-purple-500/10";
  if (text.includes("❌") || text.includes("rejected") || text.includes("BETRAYED")) return "border-l-4 border-l-red-400 bg-red-400/10";
  return "border-l-4 border-l-muted-foreground/30";
}

export default function GameLog({ gameLog }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const entries = Object.values(gameLog || {});
  const recentEntries = entries.slice(-20);

  // Auto-scroll to newest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [recentEntries.length]);

  if (recentEntries.length === 0) return null;

  return (
    <div className="mt-4 border-t-2 border-muted pt-3">
      <h4 className="font-bold text-sm mb-2 flex items-center gap-1">
        📜 Game Log
      </h4>
      <div
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto space-y-1 pr-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {recentEntries.map((entry, i) => {
          const text = entry.message || entry.text || "";
          const styleClass = getLogStyle(text);
          return (
            <div
              key={i}
              className={`text-xs py-1 px-2 rounded-sm transition-all ${styleClass}`}
            >
              <span className="text-muted-foreground font-mono mr-1">
                R{entry.round || "?"}
              </span>
              <span>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
