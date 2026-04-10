import { useState } from "react";
import { GameProvider, useGame } from "@/hooks/useGameState";
import CanvasMap from "@/components/game/CanvasMap";
import GameLedger from "@/components/game/GameLedger";
import BattleOverlay from "@/components/game/BattleOverlay";
import BotDealPrompts from "@/components/game/BotDealPrompts";
import NegotiationDialog from "@/components/game/NegotiationDialog";
import GameInstructions from "@/components/game/GameInstructions";
import TutorialMode from "@/components/game/TutorialMode";

function GameContent() {
  const { gameData, currentGameCode, currentPlayerId, botProposals, dismissBotProposal, addGameLog } = useGame();
  const [negotiationBot, setNegotiationBot] = useState<string | null>(null);
  const [negotiationInitialMsg, setNegotiationInitialMsg] = useState<string | undefined>();
  const [negotiationDealType, setNegotiationDealType] = useState<string | undefined>();

  const openNegotiation = (botId: string, initialMsg?: string, dealType?: string) => {
    setNegotiationBot(botId);
    setNegotiationInitialMsg(initialMsg);
    setNegotiationDealType(dealType);
  };

  // Find bot players for the negotiate button list
  const botPlayers = gameData?.players
    ? Object.entries(gameData.players).filter(([id, p]) => p.isBot)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-foreground p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent tracking-tight">
            International Trade
          </h1>
          {gameData?.players && currentPlayerId && gameData.players[currentPlayerId] && (
            <p className="text-sm text-blue-300/70 mt-0.5">
              {currentGameCode && gameData.gameState === "active"
                ? `Captain ${gameData.players[currentPlayerId].name} \u2022 ${gameData.players[currentPlayerId].country}`
                : ""}
            </p>
          )}
        </div>
      </div>

      {/* Negotiate buttons for active game */}
      {currentGameCode && gameData?.gameState === "active" && botPlayers.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {botPlayers.map(([id, bot]) => (
            <button
              key={id}
              onClick={() => openNegotiation(id)}
              className="text-xs px-3 py-1.5 rounded-full bg-blue-800/50 text-blue-200 border border-blue-600/30 hover:bg-blue-700/50 hover:border-blue-500/50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              💬 Negotiate with {bot.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 max-w-[75%]">
          {currentGameCode && gameData?.gameState === "active" && <CanvasMap />}
          {currentGameCode && gameData?.gameState === "active" && <GameInstructions />}
        </div>
        <GameLedger />
      </div>

      <BattleOverlay />
      <BotDealPrompts
        proposals={botProposals}
        onDismiss={dismissBotProposal}
        onAccept={async (p) => {
          await addGameLog(`✅ Player accepted ${p.botName}'s ${p.dealType} proposal`);
          dismissBotProposal(botProposals.indexOf(p));
        }}
        onReject={async (p) => {
          await addGameLog(`❌ Player rejected ${p.botName}'s ${p.dealType} proposal`);
          dismissBotProposal(botProposals.indexOf(p));
        }}
        onNegotiate={(p) => {
          openNegotiation(p.botId, p.message, p.dealType);
          dismissBotProposal(botProposals.indexOf(p));
        }}
      />
      <NegotiationDialog
        open={!!negotiationBot}
        onOpenChange={(open) => { if (!open) setNegotiationBot(null); }}
        botId={negotiationBot}
        initialMessage={negotiationInitialMsg}
        initialDealType={negotiationDealType}
      />
    </div>
  );
}

export default function Index() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
