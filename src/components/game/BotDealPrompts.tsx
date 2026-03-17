import type { BotProposal } from "@/lib/gameTypes";

interface BotDealPromptsProps {
  proposals: BotProposal[];
  onDismiss: (index: number) => void;
  onAccept: (proposal: BotProposal) => void;
  onReject: (proposal: BotProposal) => void;
}

export default function BotDealPrompts({ proposals, onDismiss, onAccept, onReject }: BotDealPromptsProps) {
  if (proposals.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {proposals.map((proposal, i) => (
        <div
          key={proposal.timestamp}
          className="bg-card border-2 border-primary/30 rounded-lg p-4 shadow-xl animate-in slide-in-from-right-5"
        >
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">💬</span>
            <div>
              <p className="font-bold text-sm text-primary">{proposal.botName}</p>
              <p className="text-sm text-card-foreground mt-1">{proposal.message}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                {proposal.dealType.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAccept(proposal)}
              className="flex-1 text-xs font-medium py-1.5 px-3 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              ✅ Accept
            </button>
            <button
              onClick={() => onReject(proposal)}
              className="flex-1 text-xs font-medium py-1.5 px-3 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              ❌ Reject
            </button>
            <button
              onClick={() => onDismiss(i)}
              className="text-xs font-medium py-1.5 px-2 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
