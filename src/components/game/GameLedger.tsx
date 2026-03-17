import { useState } from "react";
import { useGame } from "@/hooks/useGameState";
import { harvestZones, factoryZones, regionResources, baseResourceValues, manufacturingRecipes, BOT_PERSONALITIES } from "@/lib/gameData";
import GameLog from "./GameLog";
import TutorialMode from "./TutorialMode";

export default function GameLedger() {
  const {
    gameData, currentPlayerId, currentGameCode,
    endPhase, rollDice, giveYes, giveNo, giveMoney, giveResource, giveSuez,
    upgradeYes, upgradeNo, purchaseUpgrade, purchaseSuez, purchaseDictatorship,
    harvest, harvestResource, manufacture,
    rollAttack, rollDefense, battleContinue, battleDestroy, battlePlunder, battleMoveOn,
    grantAccess, denyAccess, acknowledgePermission, leaveGame,
    readyUp, startGame, cashInContinue,
    showingUpgradeMenu, harvestSelectionState, cashInSummary
  } = useGame();

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [country, setCountry] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostCountry, setHostCountry] = useState("");
  const [showHostSetup, setShowHostSetup] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [botConfigs, setBotConfigs] = useState<Array<{ personality: string; difficulty: string }>>([]);
  const [vcMoney, setVcMoney] = useState(true);
  const [vcMoneyAmount, setVcMoneyAmount] = useState(10000);
  const [vcRounds, setVcRounds] = useState(false);
  const [vcRoundsAmount, setVcRoundsAmount] = useState(200);
  const [vcAutos, setVcAutos] = useState(false);
  const [vcAutosAmount, setVcAutosAmount] = useState(10);

  const { createGame, joinGame } = useGame();

  const countries = ["Spain", "Portugal", "England", "France", "Italy", "Germany"];

  // Setup screen
  if (!currentGameCode) {
    return (
      <div className="w-[300px] border-2 border-foreground p-3 shrink-0 text-sm overflow-y-auto max-h-[85vh]">
        <h2 className="font-bold text-lg mb-3">Game Setup</h2>

        {!showHostSetup ? (
          <button
            onClick={() => setShowHostSetup(true)}
            className="w-full py-2 px-3 bg-primary text-primary-foreground rounded mb-4"
          >
            Create Game (Host)
          </button>
        ) : (
          <div className="mb-4 space-y-2">
            <input className="w-full border rounded px-2 py-1" placeholder="Your Name" value={hostName} onChange={e => setHostName(e.target.value)} />
            <select className="w-full border rounded px-2 py-1" value={hostCountry} onChange={e => setHostCountry(e.target.value)}>
              <option value="">Select Country</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              className="w-full py-2 bg-primary text-primary-foreground rounded"
              onClick={() => hostName && hostCountry && createGame(hostName, hostCountry)}
            >
              Host Game
            </button>
          </div>
        )}

        <hr className="my-3" />
        <div className="space-y-2">
          <input className="w-full border rounded px-2 py-1" placeholder="Join Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <input className="w-full border rounded px-2 py-1" placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          <select className="w-full border rounded px-2 py-1" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="">Select Country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="w-full py-2 bg-primary text-primary-foreground rounded"
            onClick={async () => {
              const err = await joinGame(joinCode, playerName, country);
              if (err) alert(err);
            }}
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (!gameData) return <div className="w-[300px] border-2 border-foreground p-3">Loading...</div>;

  // Lobby
  if (gameData.gameState === "lobby") {
    const players = gameData.players || {};
    return (
      <div className="w-[300px] border-2 border-foreground p-3 shrink-0 text-sm overflow-y-auto max-h-[85vh]">
        <h2 className="font-bold text-lg">Game Lobby</h2>
        <p className="font-mono mt-1">Join Code: <strong>{currentGameCode}</strong></p>
        <hr className="my-2" />
        <strong>Players:</strong>
        {Object.values(players).map((p, i) => <div key={i}>{p.name} ({p.country})</div>)}

        {currentPlayerId !== gameData.hostId && (
          <button className="mt-2 py-1 px-3 bg-primary text-primary-foreground rounded" onClick={readyUp}>Ready</button>
        )}

        {gameData.readyPlayers && (
          <div className="mt-2">
            <strong>Ready:</strong>
            {Object.keys(gameData.readyPlayers).map(id => (
              <div key={id}>{gameData.players[id]?.name} ✓</div>
            ))}
          </div>
        )}

        {currentPlayerId === gameData.hostId && (
          <>
            <hr className="my-2" />
            <strong>Victory Conditions:</strong>
            <label className="flex items-center gap-1 mt-1">
              <input type="checkbox" checked={vcMoney} onChange={e => setVcMoney(e.target.checked)} />
              First to $<input type="number" className="w-16 border rounded px-1" value={vcMoneyAmount} onChange={e => setVcMoneyAmount(+e.target.value)} />
            </label>
            <label className="flex items-center gap-1 mt-1">
              <input type="checkbox" checked={vcRounds} onChange={e => setVcRounds(e.target.checked)} />
              After <input type="number" className="w-12 border rounded px-1" value={vcRoundsAmount} onChange={e => setVcRoundsAmount(+e.target.value)} /> rounds
            </label>
            <label className="flex items-center gap-1 mt-1">
              <input type="checkbox" checked={vcAutos} onChange={e => setVcAutos(e.target.checked)} />
              After <input type="number" className="w-12 border rounded px-1" value={vcAutosAmount} onChange={e => setVcAutosAmount(+e.target.value)} /> autos
            </label>

            <hr className="my-2" />
            <strong>AI Bots:</strong>
            <select className="w-full border rounded px-1 mt-1" value={botCount} onChange={e => {
              const n = +e.target.value;
              setBotCount(n);
              setBotConfigs(Array.from({ length: n }, (_, i) => botConfigs[i] || { personality: "putin", difficulty: "medium" }));
            }}>
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            {botConfigs.map((cfg, i) => (
              <div key={i} className="border rounded p-2 mt-1">
                <strong>Bot {i + 1}</strong>
                <select className="w-full border rounded px-1 mt-1" value={cfg.personality} onChange={e => {
                  const next = [...botConfigs];
                  next[i] = { ...next[i], personality: e.target.value };
                  setBotConfigs(next);
                }}>
                  {Object.entries(BOT_PERSONALITIES).map(([key, p]) => (
                    <option key={key} value={key}>{p.name} {p.emoji}</option>
                  ))}
                </select>
                <select className="w-full border rounded px-1 mt-1" value={cfg.difficulty} onChange={e => {
                  const next = [...botConfigs];
                  next[i] = { ...next[i], difficulty: e.target.value };
                  setBotConfigs(next);
                }}>
                  {["easy", "medium", "hard", "veryHard"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ))}

            <button
              className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded font-bold"
              onClick={() => {
                const vc: any = {};
                if (vcMoney) vc.money = vcMoneyAmount;
                if (vcRounds) vc.rounds = vcRoundsAmount;
                if (vcAutos) vc.autos = vcAutosAmount;
                if (Object.keys(vc).length === 0) { alert("Select at least one victory condition"); return; }
                startGame(vc, botConfigs);
              }}
            >
              Start Game
            </button>
          </>
        )}
      </div>
    );
  }

  // Game Over
  if (gameData.gameState === "gameOver" && gameData.winnerId) {
    const winner = gameData.players[gameData.winnerId];
    return (
      <div className="w-[300px] border-2 border-foreground p-3 shrink-0 text-center">
        <h1 className="text-2xl font-bold text-destructive">GAME OVER</h1>
        <h2 className="text-xl font-bold mt-2">{winner?.name} wins!</h2>
        <button className="mt-4 py-2 px-4 bg-primary text-primary-foreground rounded" onClick={leaveGame}>Leave</button>
      </div>
    );
  }

  // Active game
  const players = gameData.players || {};
  const turnOrder = gameData.turnOrder || [];
  const currentTurnIndex = gameData.currentTurnIndex || 0;
  const currentPhase = gameData.currentPhase || 0;
  const roundNumber = gameData.round || 1;
  const phaseNames = ["Give Phase", "Upgrade Phase", "Movement Phase"];
  const isMyTurn = turnOrder[currentTurnIndex] === currentPlayerId;

  // Permission request
  if (gameData.permissionRequest?.ownerId === currentPlayerId) {
    return (
      <div className="w-[300px] border-2 border-foreground p-3 shrink-0">
        <h2 className="font-bold">Access Request</h2>
        <p className="mt-2">{gameData.players[gameData.permissionRequest.requesterId]?.name} wants access to {gameData.permissionRequest.square}</p>
        <div className="flex gap-2 mt-3">
          <button className="py-2 px-4 bg-primary text-primary-foreground rounded" onClick={grantAccess}>Grant</button>
          <button className="py-2 px-4 bg-destructive text-destructive-foreground rounded" onClick={denyAccess}>Deny</button>
        </div>
      </div>
    );
  }

  if (gameData.permissionResult?.requesterId === currentPlayerId) {
    return (
      <div className="w-[300px] border-2 border-foreground p-3 shrink-0">
        <h2 className="font-bold">{gameData.permissionResult.message}</h2>
        <button className="mt-3 py-2 px-4 bg-primary text-primary-foreground rounded" onClick={acknowledgePermission}>OK</button>
      </div>
    );
  }

  return (
    <div className="w-[300px] border-2 border-foreground p-3 shrink-0 text-sm overflow-y-auto max-h-[85vh]">
      <p className="font-bold">Round {roundNumber} — {phaseNames[currentPhase]}</p>
      <div className="flex gap-2 mt-1">
        <button className="py-1 px-2 bg-primary text-primary-foreground rounded text-xs" onClick={endPhase}>End Phase</button>
        <button className="py-1 px-2 bg-destructive text-destructive-foreground rounded text-xs" onClick={leaveGame}>Leave</button>
      </div>

      {/* Cash in summary */}
      {cashInSummary && (
        <div className="mt-3 p-2 border-2 border-primary rounded bg-primary/5">
          <div dangerouslySetInnerHTML={{ __html: cashInSummary }} />
          <button className="mt-2 py-1 px-3 bg-primary text-primary-foreground rounded text-xs" onClick={cashInContinue}>
            Continue
          </button>
        </div>
      )}

      {/* Harvest selection */}
      {harvestSelectionState && (
        <div className="mt-3 p-2 border-2 border-primary rounded">
          <strong>Harvest {harvestSelectionState.remaining} resource(s):</strong>
          <div className="flex flex-col gap-1 mt-2">
            {regionResources[harvestSelectionState.region]?.map(r => (
              <button key={r} className="py-1 px-2 border rounded hover:bg-accent text-xs" onClick={() => harvestResource(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade menu */}
      {showingUpgradeMenu && isMyTurn && currentPhase === 1 && (
        <div className="mt-3 p-2 border-2 border-primary rounded space-y-2">
          <strong>Select Upgrade:</strong>
          {["transport", "navigation", "weapons"].map(type => {
            const player = players[currentPlayerId!];
            const level = player?.upgrades?.[type as keyof typeof player.upgrades] || 0;
            const cost = type === "transport" ? 150 * (level + 1) : 100 * (level + 1);
            return (
              <button key={type} className="w-full py-1 px-2 border rounded hover:bg-accent text-xs"
                disabled={type === "navigation" && level >= 3}
                onClick={async () => {
                  const result = await purchaseUpgrade(type);
                  alert(result.message);
                }}>
                {type} (Lv{level}→{level + 1}) ${cost} | 75%
              </button>
            );
          })}
          <button className="w-full py-1 px-2 border rounded hover:bg-accent text-xs"
            onClick={async () => alert(await purchaseSuez())}>
            Construct Suez ($150)
          </button>
          <button className="w-full py-1 px-2 border rounded hover:bg-accent text-xs"
            onClick={async () => {
              const sq = prompt("Enter square (e.g. E10):");
              if (sq) alert(await purchaseDictatorship(sq));
            }}>
            Fund Dictatorship (60%, $300×lvl)
          </button>
        </div>
      )}

      {/* Player cards */}
      <div className="mt-3 space-y-2">
        {turnOrder.map((playerId, index) => {
          const player = players[playerId];
          if (!player) return null;
          const isCurrent = index === currentTurnIndex;
          const isMe = playerId === currentPlayerId;
          const onHarvest = harvestZones[player.shipPosition] !== undefined;
          const onFactory = factoryZones[player.shipPosition] && player.shipPosition !== player.homePort;

          return (
            <div key={playerId} className={`border rounded p-2 ${isCurrent ? "bg-primary/10 border-primary" : "border-muted"}`}>
              <div className="font-bold flex items-center gap-1">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: player.color }} />
                {player.name} ({player.country})
                {isCurrent && <span className="text-xs text-primary ml-1">⬅ Turn</span>}
              </div>
              <div className="text-xs mt-1 space-y-0.5">
                <div>💰 ${player.money}</div>
                <div>🚢{player.upgrades?.transport || 0} 🧭{player.upgrades?.navigation || 0} ⚔️{player.upgrades?.weapons || 0}</div>
                {player.bounty > 0 && <div className="text-destructive">⚠️ Bounty: ${player.bounty}</div>}
                {gameData.suezOwner === playerId && <div>🏗️ Suez Owner</div>}
                <div>
                  {!player.inventory || Object.keys(player.inventory).length === 0
                    ? "📦 Empty"
                    : Object.entries(player.inventory).map(([r, q]) => `${r}:${q}`).join(", ")}
                </div>
                {player.movesRemaining > 0 && <div>Moves: {player.movesRemaining}</div>}
              </div>

              {/* Actions for current player on their turn */}
              {isCurrent && isMe && !cashInSummary && !harvestSelectionState && !showingUpgradeMenu && (
                <div className="mt-2 space-y-1">
                  {currentPhase === 0 && !player.givingMode && (
                    <div>
                      <strong className="text-xs">Give anything?</strong>
                      <div className="flex gap-1 mt-1">
                        <button className="py-1 px-2 border rounded text-xs" onClick={giveYes}>Yes</button>
                        <button className="py-1 px-2 border rounded text-xs" onClick={giveNo}>No</button>
                      </div>
                    </div>
                  )}
                  {currentPhase === 0 && player.givingMode && (
                    <div className="space-y-1">
                      <button className="w-full py-1 border rounded text-xs" onClick={() => {
                        const amount = prompt("Amount to give:");
                        if (!amount) return;
                        const recipientId = prompt("Enter recipient player name:");
                        // Simplified — would need recipient selector
                        const recipients = Object.entries(players).filter(([id]) => id !== currentPlayerId);
                        if (recipients.length > 0) giveMoney(recipients[0][0], +amount);
                      }}>Give Money</button>
                      <button className="w-full py-1 border rounded text-xs" onClick={giveNo}>Back</button>
                    </div>
                  )}
                  {currentPhase === 1 && (
                    <div className="flex gap-1">
                      <button className="py-1 px-2 border rounded text-xs" onClick={upgradeYes}>Upgrade</button>
                      <button className="py-1 px-2 border rounded text-xs" onClick={upgradeNo}>Skip</button>
                    </div>
                  )}
                  {currentPhase === 2 && !player.rollValue && (
                    <button className="py-1 px-3 bg-primary text-primary-foreground rounded text-xs" onClick={rollDice}>
                      🎲 Roll Dice
                    </button>
                  )}
                  {currentPhase === 2 && onHarvest && player.rollValue && player.movesRemaining > 0 && (
                    <button className="py-1 px-3 border rounded text-xs" onClick={async () => {
                      const guess = prompt("Name a country at this location:");
                      if (guess) await harvest(guess);
                    }}>⛏️ Harvest</button>
                  )}
                  {currentPhase === 2 && onFactory && player.movesRemaining > 0 && (
                    <button className="py-1 px-3 border rounded text-xs" onClick={async () => {
                      const goods = factoryZones[player.shipPosition];
                      const good = goods[0]; // Simplified
                      await manufacture(good);
                    }}>🏭 Manufacture</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Log */}
      {gameData.gameLog && <GameLog gameLog={gameData.gameLog} />}
    </div>
  );
}
