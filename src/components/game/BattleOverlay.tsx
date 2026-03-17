import { useGame } from "@/hooks/useGameState";

export default function BattleOverlay() {
  const { gameData, currentPlayerId, rollAttack, rollDefense, battleContinue, battleDestroy, battlePlunder, battleMoveOn } = useGame();

  if (!gameData?.battle) return null;
  const battle = gameData.battle;
  const attacker = gameData.players[battle.attackerId];
  const defender = gameData.players[battle.defenderId];

  if (battle.stage === "decision" || battle.stage === "displacement") return null;

  return (
    <div className="fixed inset-0 bg-black/85 text-white z-[9999] flex flex-col items-center justify-center font-sans">
      {battle.stage === "awaitingAttackerRoll" && (
        <>
          <h1 className="text-4xl font-bold mb-4">⚔️ BATTLE</h1>
          <h2 className="text-2xl">{attacker?.name} (ATTACK)</h2>
          {currentPlayerId === battle.attackerId ? (
            <button className="mt-4 py-3 px-8 bg-red-600 rounded-lg text-xl font-bold hover:bg-red-700 transition" onClick={rollAttack}>
              ROLL ATTACK
            </button>
          ) : (
            <p className="mt-4 text-lg opacity-70">Waiting for attacker to roll...</p>
          )}
        </>
      )}

      {battle.stage === "awaitingDefenderRoll" && (
        <>
          <h1 className="text-4xl font-bold mb-4">⚔️ BATTLE</h1>
          <h2 className="text-2xl">{attacker?.name}: {battle.attackerRoll}</h2>
          <h2 className="text-2xl mt-2">{defender?.name} (DEFENSE)</h2>
          {currentPlayerId === battle.defenderId ? (
            <button className="mt-4 py-3 px-8 bg-blue-600 rounded-lg text-xl font-bold hover:bg-blue-700 transition" onClick={rollDefense}>
              ROLL DEFENSE
            </button>
          ) : (
            <p className="mt-4 text-lg opacity-70">Waiting for defender to roll...</p>
          )}
        </>
      )}

      {battle.stage === "result" && (
        <>
          <h1 className="text-4xl font-bold mb-4">⚔️ RESULT</h1>
          <h2 className="text-2xl">{attacker?.name}: {battle.attackerRoll}</h2>
          <h2 className="text-2xl mt-1">{defender?.name}: {battle.defenderRoll}</h2>
          <h2 className="text-3xl mt-4 font-bold text-yellow-400">
            {battle.winnerId && gameData.players[battle.winnerId]?.name} WINS!
          </h2>
          {currentPlayerId === battle.winnerId && (
            <button className="mt-6 py-3 px-8 bg-green-600 rounded-lg text-xl font-bold hover:bg-green-700 transition" onClick={battleContinue}>
              Continue
            </button>
          )}
        </>
      )}
    </div>
  );
}
