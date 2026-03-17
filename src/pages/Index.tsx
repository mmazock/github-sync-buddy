import { GameProvider, useGame } from "@/hooks/useGameState";
import GameMap from "@/components/game/GameMap";
import GameLedger from "@/components/game/GameLedger";
import BattleOverlay from "@/components/game/BattleOverlay";
import BotDealPrompts from "@/components/game/BotDealPrompts";

function GameContent() {
  const { gameData, currentGameCode, botProposals, dismissBotProposal, addGameLog } = useGame();

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <h1 className="text-2xl font-bold mb-1">International Trade</h1>
      {gameData?.players && Object.values(gameData.players).find((_, i) => i === 0) && (
        <h3 className="text-sm text-muted-foreground mb-3">
          {currentGameCode && gameData.gameState === "active" ? `Playing as ${Object.values(gameData.players).find(p => p.name)?.name || ""}` : ""}
        </h3>
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
