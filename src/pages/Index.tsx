import { useState } from "react";
import { GameProvider, useGame } from "@/hooks/useGameState";
import GameMap from "@/components/game/GameMap";
import GameLedger from "@/components/game/GameLedger";
import BattleOverlay from "@/components/game/BattleOverlay";
import BotDealPrompts from "@/components/game/BotDealPrompts";
import NegotiationDialog from "@/components/game/NegotiationDialog";

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
    <div className="min-h-screen bg-background text-foreground p-4">
      <h1 className="text-2xl font-bold mb-1">International Trade</h1>
      {gameData?.players && Object.values(gameData.players).find((_, i) => i === 0) && (
        <h3 className="text-sm text-muted-foreground mb-3">
          {currentGameCode && gameData.gameState === "active" ? `Playing as ${Object.values(gameData.players).find(p => p.name)?.name || ""}` : ""}
        </h3>
      )}

      {/* Negotiate buttons for active game */}
      {currentGameCode && gameData?.gameState === "active" && botPlayers.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {botPlayers.map(([id, bot]) => (
            <button
              key={id}
              onClick={() => openNegotiation(id)}
              className="text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center gap-1"
            >
              💬 Negotiate with {bot.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {currentGameCode && gameData?.gameState === "active" && <GameMap />}
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
