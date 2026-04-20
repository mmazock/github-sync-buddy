import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { gamesRef, child, push, set, update, remove, get, onValue, runTransaction } from "@/lib/firebase";
import type { GameData, PlayerData, Deal, BotProposal } from "@/lib/gameTypes";
import {
  countryData, availableColors, waterSquares, restrictedTransitions,
  harvestZones, factoryZones, regionResources, baseResourceValues,
  manufacturingRecipes, BOT_PERSONALITIES, DIFFICULTY_LEVELS,
  columnPixels, rowPixels, originalWidth, originalHeight
} from "@/lib/gameData";

interface GameContextType {
  gameData: GameData | null;
  currentGameCode: string | null;
  currentPlayerId: string | null;
  pendingDeals: Deal[];
  botProposals: BotProposal[];
  botTrustScores: Record<string, Record<string, number>>;
  botConversationHistories: Record<string, Array<{ role: string; content: string }>>;
  createGame: (name: string, country: string) => Promise<void>;
  joinGame: (code: string, name: string, country: string) => Promise<string | null>;
  leaveGame: () => Promise<void>;
  endPhase: () => Promise<void>;
  rollDice: () => Promise<void>;
  moveToSquare: (target: string) => Promise<void>;
  harvest: (countryGuess: string) => Promise<{ success: boolean; region?: string }>;
  startHarvestSelection: (region: string) => void;
  harvestResource: (resource: string) => Promise<boolean>;
  manufacture: (good: string) => Promise<boolean>;
  giveYes: () => Promise<void>;
  giveNo: () => Promise<void>;
  giveMoney: (recipientId: string, amount: number) => Promise<void>;
  giveResource: (recipientId: string, resource: string, amount: number) => Promise<void>;
  upgradeYes: () => void;
  upgradeNo: () => Promise<void>;
  purchaseUpgrade: (type: string) => Promise<{ success: boolean; message: string }>;
  purchaseSuez: () => Promise<string>;
  purchaseDictatorship: (square: string) => Promise<string>;
  rollAttack: () => Promise<void>;
  rollDefense: () => Promise<void>;
  battleContinue: () => Promise<void>;
  battleDestroy: () => Promise<void>;
  battlePlunder: () => Promise<void>;
  battleMoveOn: () => Promise<void>;
  battleDisplace: (target: string) => Promise<void>;
  grantAccess: () => Promise<void>;
  denyAccess: () => Promise<void>;
  acknowledgePermission: () => Promise<void>;
  readyUp: () => Promise<void>;
  startGame: (victoryConditions: any, bots: any[]) => Promise<void>;
  addGameLog: (message: string) => Promise<void>;
  cashInContinue: () => Promise<void>;
  showingUpgradeMenu: boolean;
  harvestSelectionState: { region: string; remaining: number } | null;
  cashInSummary: string | null;
  dismissBotProposal: (index: number) => void;
  giveSuez: (recipientId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be inside GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [currentGameCode, setCurrentGameCode] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
  const [botProposals, setBotProposals] = useState<BotProposal[]>([]);
  const [botTrustScores, setBotTrustScores] = useState<Record<string, Record<string, number>>>({});
  const [botConversationHistories, setBotConversationHistories] = useState<Record<string, Array<{ role: string; content: string }>>>({});
  const [showingUpgradeMenu, setShowingUpgradeMenu] = useState(false);
  const [harvestSelectionState, setHarvestSelectionState] = useState<{ region: string; remaining: number } | null>(null);
  const [cashInSummary, setCashInSummary] = useState<string | null>(null);
  const latestGameDataRef = useRef<GameData | null>(null);
  const botExecutingRef = useRef(false);
  const recentBattlesRef = useRef<Record<string, number>>({});
  const botProposalCooldownRef = useRef<Record<string, boolean>>({});
  const botNegotiationCooldownRef = useRef<Record<string, boolean>>({});

  // Load saved session
  useEffect(() => {
    const savedCode = localStorage.getItem("gameCode");
    const savedPlayer = localStorage.getItem("playerId");
    if (savedCode && savedPlayer) {
      get(child(gamesRef, savedCode)).then(snapshot => {
        if (snapshot.exists()) {
          setCurrentGameCode(savedCode);
          setCurrentPlayerId(savedPlayer);
        } else {
          localStorage.clear();
        }
      }).catch(() => localStorage.clear());
    }
  }, []);

  // Listen to game data
  useEffect(() => {
    if (!currentGameCode) return;
    const gameRef = child(gamesRef, currentGameCode);
    const unsub = onValue(gameRef, async (snapshot) => {
      const data = snapshot.val() as GameData | null;
      if (!data) return;
      setGameData(data);
      latestGameDataRef.current = data;

      // Init bot trust
      if (data.gameState === "active") {
        initBotTrust(data);
        // Bot automation (only host runs)
        if (data.hostId === currentPlayerId && !botExecutingRef.current) {
          botExecutingRef.current = true;
          try {
            await processBotAutomation(data);
          } finally {
            botExecutingRef.current = false;
          }
        }
      }
    });
    return () => unsub();
  }, [currentGameCode, currentPlayerId]);

  const initBotTrust = useCallback((data: GameData) => {
    const players = data.players || {};
    setBotTrustScores(prev => {
      const next = { ...prev };
      for (const id in players) {
        if (players[id].isBot && !next[id]) {
          next[id] = {};
          for (const pid in players) {
            if (pid !== id) next[id][pid] = 50;
          }
        }
      }
      return next;
    });
  }, []);

  const updateTrust = useCallback((botId: string, playerId: string, delta: number) => {
    setBotTrustScores(prev => {
      const next = { ...prev };
      if (!next[botId]) next[botId] = {};
      const current = next[botId][playerId] || 50;
      next[botId][playerId] = Math.max(-100, Math.min(100, current + delta));
      return next;
    });
  }, []);

  const addGameLog = useCallback(async (message: string) => {
    if (!currentGameCode) return;
    const data = latestGameDataRef.current;
    await push(child(gamesRef, `${currentGameCode}/gameLog`), {
      text: message,
      timestamp: Date.now(),
      round: data?.round || 1
    });
  }, [currentGameCode]);

  const advanceTurn = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    if (!data) return;

    const oldPlayerId = data.turnOrder[data.currentTurnIndex];
    let nextTurn = data.currentTurnIndex + 1;
    let newRound = data.round || 1;
    if (nextTurn >= data.turnOrder.length) {
      nextTurn = 0;
      newRound += 1;
    }
    const nextPlayerId = data.turnOrder[nextTurn];

    await update(child(gamesRef, `${currentGameCode}/players/${oldPlayerId}`), {
      movesRemaining: 0, rollValue: null, givingMode: null
    });
    await update(child(gamesRef, currentGameCode), {
      currentTurnIndex: nextTurn, currentPhase: 0, round: newRound, lastActive: Date.now()
    });

    // Check victory
    const updatedSnap = await get(child(gamesRef, currentGameCode));
    const updatedData = updatedSnap.val() as GameData;
    checkVictoryConditions(updatedData);

    await update(child(gamesRef, `${currentGameCode}/players/${nextPlayerId}`), {
      movesRemaining: 0, rollValue: null
    });
  }, [currentGameCode]);

  const checkVictoryConditions = useCallback((data: GameData) => {
    if (!data || data.gameState !== "active" || !currentGameCode) return;
    const players = data.players || {};
    const vc = data.victoryConditions || {};

    if (vc.money) {
      for (const id in players) {
        if ((players[id].money || 0) >= vc.money) { endGame(id); return; }
      }
    }
    if (vc.rounds && (data.round || 0) >= vc.rounds) {
      let winnerId: string | null = null, highest = -1;
      for (const id in players) {
        if ((players[id].money || 0) > highest) { highest = players[id].money; winnerId = id; }
      }
      if (winnerId) endGame(winnerId);
      return;
    }
    if (vc.autos) {
      for (const id in players) {
        if ((players[id].automobilesCashed || 0) >= vc.autos) { endGame(id); return; }
      }
    }
  }, [currentGameCode]);

  const endGame = useCallback((winnerId: string) => {
    if (!currentGameCode) return;
    update(child(gamesRef, currentGameCode), { gameState: "gameOver", winnerId });
  }, [currentGameCode]);

  // ==================== GAME ACTIONS ====================

  const createGame = useCallback(async (name: string, country: string) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    await set(child(gamesRef, code), {
      players: {}, turnOrder: [], currentTurnIndex: 0, currentPhase: 0,
      round: 1, gameState: "lobby", hostId: null, victoryCondition: "money10k",
      readyPlayers: {}, lastActive: Date.now()
    });

    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();
    const newPlayerRef = push(child(gamesRef, `${code}/players`));
    await set(newPlayerRef, {
      name, country, homePort: countryData[country].home,
      multipliers: countryData[country].multipliers,
      money: 0, bounty: 0,
      upgrades: { transport: 0, navigation: 0, weapons: 0 },
      inventory: {}, shipPosition: countryData[country].home,
      color: availableColors[0], initials, movesRemaining: 0, rollValue: null
    });

    const playerId = newPlayerRef.key!;
    await update(child(gamesRef, code), { turnOrder: [playerId], hostId: playerId });

    localStorage.setItem("gameCode", code);
    localStorage.setItem("playerId", playerId);
    setCurrentGameCode(code);
    setCurrentPlayerId(playerId);
  }, []);

  const joinGame = useCallback(async (code: string, name: string, country: string): Promise<string | null> => {
    const upperCode = code.toUpperCase();
    const snapshot = await get(child(gamesRef, upperCode));
    if (!snapshot.exists()) return "Game not found.";

    const playersSnap = await get(child(gamesRef, `${upperCode}/players`));
    const players = playersSnap.val() || {};
    const usedColors = Object.values(players).map((p: any) => p.color);
    const color = availableColors.find(c => !usedColors.includes(c)) || "black";
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();

    const newPlayerRef = push(child(gamesRef, `${upperCode}/players`));
    await set(newPlayerRef, {
      name, country, homePort: countryData[country].home,
      multipliers: countryData[country].multipliers,
      money: 0, bounty: 0,
      upgrades: { transport: 0, navigation: 0, weapons: 0 },
      inventory: {}, shipPosition: countryData[country].home,
      color, initials, movesRemaining: 0, rollValue: null
    });

    const playerId = newPlayerRef.key!;
    await runTransaction(child(gamesRef, `${upperCode}/turnOrder`), (order: string[] | null) => {
      if (!order) return [playerId];
      return [...order, playerId];
    });

    localStorage.setItem("gameCode", upperCode);
    localStorage.setItem("playerId", playerId);
    setCurrentGameCode(upperCode);
    setCurrentPlayerId(playerId);
    return null;
  }, []);

  const leaveGame = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) { window.location.reload(); return; }
    await remove(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`));
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val();
    if (data?.turnOrder) {
      const updated = data.turnOrder.filter((id: string) => id !== currentPlayerId);
      await update(child(gamesRef, currentGameCode), { turnOrder: updated });
      if (updated.length === 0) await remove(child(gamesRef, currentGameCode));
    }
    localStorage.removeItem("gameCode");
    localStorage.removeItem("playerId");
    window.location.reload();
  }, [currentGameCode, currentPlayerId]);

  const endPhase = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    if (data.turnOrder[data.currentTurnIndex] !== currentPlayerId) return;

    if (data.currentPhase < 2) {
      await update(child(gamesRef, currentGameCode), {
        currentPhase: data.currentPhase + 1, lastActive: Date.now()
      });
    } else {
      await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
        movesRemaining: 0, rollValue: null
      });
      await advanceTurn();
    }
  }, [currentGameCode, currentPlayerId, advanceTurn]);

  const rollDice = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    if (!data || data.currentPhase !== 2) return;
    if (data.turnOrder[data.currentTurnIndex] !== currentPlayerId) return;
    const player = data.players[currentPlayerId];
    if (player.rollValue) return;

    const maxRoll = 6 + ((player.upgrades?.navigation || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;

    await update(child(gamesRef, currentGameCode), { lastActive: Date.now() });
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
      movesRemaining: roll, rollValue: roll
    });
  }, [currentGameCode, currentPlayerId]);

  const moveToSquare = useCallback(async (target: string) => {
    if (!currentGameCode || !currentPlayerId) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    if (!data) return;

    const player = data.players[currentPlayerId];

    // Displacement mode - winner picks where to send the loser
    if (data.battle?.stage === "displacement" && data.battle.winnerId === currentPlayerId) {
      const displacedId = data.battle.displacedPlayerId!;
      const origin = data.battle.originSquare!;
      const colDiff = target.charCodeAt(0) - origin.charCodeAt(0);
      const rowDiff = parseInt(target.slice(1)) - parseInt(origin.slice(1));
      const isAdj = (Math.abs(colDiff) === 1 && rowDiff === 0) || (Math.abs(rowDiff) === 1 && colDiff === 0);
      if (!isAdj || !waterSquares.has(target)) return;

      for (const pid in data.players) {
        if (pid !== displacedId && data.players[pid].shipPosition === target) return;
      }

      await update(child(gamesRef, `${currentGameCode}/players/${displacedId}`), { shipPosition: target });
      await update(child(gamesRef, currentGameCode), { battle: null });
      await addGameLog(`🚢 ${data.players[displacedId]?.name} was displaced to ${target}`);
      await advanceTurn();
      return;
    }

    // Normal movement checks
    if (data.currentPhase !== 2) return;
    if (data.turnOrder[data.currentTurnIndex] !== currentPlayerId) return;
    if (!player.rollValue) return;
    if ((player.movesRemaining || 0) <= 0) return;

    // Adjacency check — only cardinal (no diagonals)
    const currentPos = player.shipPosition;
    const colDiffMove = target.charCodeAt(0) - currentPos.charCodeAt(0);
    const rowDiffMove = parseInt(target.slice(1)) - parseInt(currentPos.slice(1));
    const isAdjacent = (Math.abs(colDiffMove) === 1 && rowDiffMove === 0) || (colDiffMove === 0 && Math.abs(rowDiffMove) === 1);
    if (!isAdjacent) return;

    // Check for battle
    let defenderId: string | null = null;
    for (const id in data.players) {
      if (id !== currentPlayerId && data.players[id].shipPosition === target) {
        defenderId = id;
        break;
      }
    }

    if (defenderId) {
      const defender = data.players[defenderId];
      if (target === defender.homePort) return;

      await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { shipPosition: target });
      await update(child(gamesRef, currentGameCode), {
        battle: {
          attackerId: currentPlayerId, defenderId,
          attackerRoll: null, defenderRoll: null, winnerId: null,
          stage: "awaitingAttackerRoll"
        },
        lastActive: Date.now()
      });
      return;
    }

    if (!waterSquares.has(target)) return;

    // Suez
    if ((currentPos === "G3" && target === "G4") || (currentPos === "G4" && target === "G3")) {
      if (!data.suezOwner) return;
      if (data.suezOwner !== currentPlayerId) {
        await update(child(gamesRef, currentGameCode), {
          permissionRequest: {
            type: "suez", requesterId: currentPlayerId,
            ownerId: data.suezOwner, square: target, round: data.round
          }
        });
        return;
      }
    }

    // Dictatorship check
    const dictOwner = (data.dictatorships || {})[target];
    if (dictOwner && dictOwner !== currentPlayerId) {
      await update(child(gamesRef, currentGameCode), {
        permissionRequest: {
          type: "dictatorship", requesterId: currentPlayerId,
          ownerId: dictOwner, square: target, round: data.round
        }
      });
      return;
    }

    // Malacca
    if (restrictedTransitions[currentPos] && !restrictedTransitions[currentPos].includes(target)) return;

    const newMoves = player.movesRemaining - 1;
    await update(child(gamesRef, currentGameCode), { lastActive: Date.now() });
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
      shipPosition: target, movesRemaining: newMoves
    });

    // Cash in check
    const updatedSnap = await get(child(gamesRef, currentGameCode));
    const updatedData = updatedSnap.val() as GameData;
    const updatedPlayer = updatedData.players[currentPlayerId];

    if (updatedPlayer.shipPosition === updatedPlayer.homePort &&
        updatedPlayer.inventory && Object.keys(updatedPlayer.inventory).length > 0) {
      let totalValue = 0;
      let breakdownHtml = "<h3>Cash In Summary</h3>";
      for (const resource in updatedPlayer.inventory) {
        const qty = updatedPlayer.inventory[resource];
        const baseValue = baseResourceValues[resource] || 0;
        const mult = updatedPlayer.multipliers?.[resource] || 1;
        const resourceTotal = qty * baseValue * mult;
        totalValue += resourceTotal;
        breakdownHtml += `<p>${qty} ${resource} $${baseValue}${mult !== 1 ? ` × ${mult}` : ""} = $${resourceTotal}</p>`;
      }
      breakdownHtml += `<hr/><strong>Total = $${totalValue}</strong>`;

      if (updatedPlayer.inventory["Automobiles"]) {
        await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
          automobilesCashed: (updatedPlayer.automobilesCashed || 0) + updatedPlayer.inventory["Automobiles"]
        });
      }
      await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
        money: (updatedPlayer.money || 0) + totalValue, inventory: {}
      });
      setCashInSummary(breakdownHtml);
      return;
    }

    if (newMoves === 0) await advanceTurn();
  }, [currentGameCode, currentPlayerId, advanceTurn]);

  const cashInContinue = useCallback(async () => {
    setCashInSummary(null);
    await advanceTurn();
  }, [advanceTurn]);

  const harvest = useCallback(async (countryGuess: string): Promise<{ success: boolean; region?: string }> => {
    if (!currentGameCode || !currentPlayerId) return { success: false };
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const player = data.players[currentPlayerId];
    const square = player.shipPosition;
    if (!harvestZones[square]) return { success: false };

    const validCountries = harvestZones[square].countries;
    const normalized = countryGuess.trim().toLowerCase();
    const isValid = validCountries.some(c => c.toLowerCase() === normalized);

    if (!isValid) {
      await addGameLog(`❌ ${player.name} failed geography quiz at ${square}`);
      await advanceTurn();
      return { success: false };
    }

    const region = harvestZones[square].region;
    const capacity = 1 + (player.upgrades?.transport || 0);
    setHarvestSelectionState({ region, remaining: capacity });
    return { success: true, region };
  }, [currentGameCode, currentPlayerId, addGameLog, advanceTurn]);

  const startHarvestSelection = useCallback((region: string) => {
    // Already handled in harvest
  }, []);

  const harvestResource = useCallback(async (resource: string): Promise<boolean> => {
    if (!currentGameCode || !currentPlayerId || !harvestSelectionState) return false;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const inv = data.players[currentPlayerId].inventory || {};

    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
      inventory: { ...inv, [resource]: (inv[resource] || 0) + 1 }
    });

    const remaining = harvestSelectionState.remaining - 1;
    if (remaining <= 0) {
      setHarvestSelectionState(null);
      await advanceTurn();
      return true;
    }
    setHarvestSelectionState({ ...harvestSelectionState, remaining });
    return false;
  }, [currentGameCode, currentPlayerId, harvestSelectionState, advanceTurn]);

  const manufacture = useCallback(async (good: string): Promise<boolean> => {
    if (!currentGameCode || !currentPlayerId) return false;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const player = data.players[currentPlayerId];
    const recipe = manufacturingRecipes[good];
    if (!recipe) return false;

    const inv = { ...player.inventory };
    for (const r of recipe.inputs) {
      if (!inv[r] || inv[r] < 1) return false;
    }
    recipe.inputs.forEach(r => { inv[r] -= 1; if (inv[r] <= 0) delete inv[r]; });
    inv[good] = (inv[good] || 0) + 1;

    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
      inventory: inv, movesRemaining: 0
    });
    await addGameLog(`🏭 ${player.name} manufactured ${good}`);
    await advanceTurn();
    return true;
  }, [currentGameCode, currentPlayerId, addGameLog, advanceTurn]);

  const giveYes = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { givingMode: true });
  }, [currentGameCode, currentPlayerId]);

  const giveNo = useCallback(async () => {
    if (!currentGameCode) return;
    await update(child(gamesRef, currentGameCode), { currentPhase: 1, lastActive: Date.now() });
  }, [currentGameCode]);

  const giveMoney = useCallback(async (recipientId: string, amount: number) => {
    if (!currentGameCode || !currentPlayerId) return;
    if (amount <= 0) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const sender = data.players[currentPlayerId];
    const recipient = data.players[recipientId];

    if (sender.money < amount) {
      alert(`Not enough money. You have $${sender.money}.`);
      return;
    }

    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { money: sender.money - amount });
    await update(child(gamesRef, `${currentGameCode}/players/${recipientId}`), { money: recipient.money + amount });
    await addGameLog(`💰 ${sender.name} gave $${amount} to ${recipient.name}`);
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { givingMode: false });
  }, [currentGameCode, currentPlayerId, addGameLog]);

  const giveResource = useCallback(async (recipientId: string, resource: string, amount: number) => {
    if (!currentGameCode || !currentPlayerId) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const sender = data.players[currentPlayerId];
    const recipient = data.players[recipientId];

    const senderInv = { ...(sender.inventory || {}) };
    if ((senderInv[resource] || 0) < amount) {
      alert(`Not enough ${resource}. You have ${senderInv[resource] || 0}.`);
      return;
    }
    senderInv[resource] -= amount;
    if (senderInv[resource] <= 0) delete senderInv[resource];

    if (recipient.shipPosition === recipient.homePort) {
      const baseValue = baseResourceValues[resource] || 0;
      const mult = recipient.multipliers?.[resource] || 1;
      const totalValue = amount * baseValue * mult;
      await update(child(gamesRef, `${currentGameCode}/players/${recipientId}`), {
        money: (recipient.money || 0) + totalValue
      });
    } else {
      const recipientInv = { ...(recipient.inventory || {}) };
      recipientInv[resource] = (recipientInv[resource] || 0) + amount;
      await update(child(gamesRef, `${currentGameCode}/players/${recipientId}`), { inventory: recipientInv });
    }
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { inventory: senderInv });
    await addGameLog(`📦 ${sender.name} gave ${amount} ${resource} to ${recipient.name}`);
  }, [currentGameCode, currentPlayerId, addGameLog]);

  const giveSuez = useCallback(async (recipientId: string) => {
    if (!currentGameCode) return;
    await update(child(gamesRef, currentGameCode), { suezOwner: recipientId });
  }, [currentGameCode]);

  const upgradeYes = useCallback(() => setShowingUpgradeMenu(true), []);
  const upgradeNo = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    setShowingUpgradeMenu(false);
    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { rollValue: null, movesRemaining: 0 });
    await update(child(gamesRef, currentGameCode), { currentPhase: 2, lastActive: Date.now() });
  }, [currentGameCode, currentPlayerId]);

  const purchaseUpgrade = useCallback(async (type: string): Promise<{ success: boolean; message: string }> => {
    if (!currentGameCode || !currentPlayerId) return { success: false, message: "No game" };
    try {
      const snap = await get(child(gamesRef, currentGameCode));
      const data = snap.val() as GameData;
      const player = data.players?.[currentPlayerId];
      if (!player) return { success: false, message: "Player not found" };

      const level = player.upgrades?.[type as keyof typeof player.upgrades] || 0;
      const cost = type === "transport" ? 150 * (level + 1) : 100 * (level + 1);

      if (type === "navigation" && level >= 3) return { success: false, message: "Max level reached" };
      if ((player.money || 0) < cost) return { success: false, message: `Not enough money. You have $${player.money || 0}, need $${cost}.` };

      await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { money: player.money - cost });

    const success = Math.random() < 0.75;
    if (success) {
      await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), {
        [`upgrades/${type}`]: level + 1
      });
    }
    setShowingUpgradeMenu(false);
    return { success, message: success ? `${type} upgrade successful!` : `${type} upgrade failed. Investment lost.` };
    } catch (err) {
      setShowingUpgradeMenu(false);
      return { success: false, message: "Error processing upgrade." };
    }
  }, [currentGameCode, currentPlayerId]);

  const purchaseSuez = useCallback(async (): Promise<string> => {
    if (!currentGameCode || !currentPlayerId) return "No game";
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    if (data.suezOwner) return "Already constructed";
    const player = data.players[currentPlayerId];
    if (player.money < 150) return "Not enough money ($150)";

    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { money: player.money - 150 });
    await update(child(gamesRef, currentGameCode), { suezOwner: currentPlayerId });
    setShowingUpgradeMenu(false);
    return "Suez Canal constructed!";
  }, [currentGameCode, currentPlayerId]);

  const purchaseDictatorship = useCallback(async (square: string): Promise<string> => {
    if (!currentGameCode || !currentPlayerId) return "No game";
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const player = data.players[currentPlayerId];
    const target = square.toUpperCase();

    if (!waterSquares.has(target) && !harvestZones[target]) return "Invalid square";
    if (player.homePort === target) return "Cannot place on home port";

    const owned = Object.values(data.dictatorships || {}).filter(o => o === currentPlayerId).length;
    const cost = 300 * (owned + 1);
    if (player.money < cost) return `Not enough money ($${cost})`;

    await update(child(gamesRef, `${currentGameCode}/players/${currentPlayerId}`), { money: player.money - cost });
    if (Math.random() >= 0.6) return "Attempt failed. Funds lost.";

    const dicts = { ...(data.dictatorships || {}), [target]: currentPlayerId };
    await update(child(gamesRef, currentGameCode), { dictatorships: dicts });
    setShowingUpgradeMenu(false);
    return `Dictatorship established on ${target}!`;
  }, [currentGameCode, currentPlayerId]);

  // Battle actions
  const rollAttack = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const battle = data.battle!;
    const attacker = data.players[battle.attackerId];
    const maxRoll = 5 + ((attacker.upgrades?.weapons || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;
    await update(child(gamesRef, `${currentGameCode}/battle`), { attackerRoll: roll, stage: "awaitingDefenderRoll" });
  }, [currentGameCode]);

  const rollDefense = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const battle = data.battle!;
    const defender = data.players[battle.defenderId];
    const maxRoll = 5 + ((defender.upgrades?.weapons || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;
    const winnerId = roll > battle.attackerRoll! ? battle.defenderId : roll < battle.attackerRoll! ? battle.attackerId : battle.defenderId;
    await update(child(gamesRef, `${currentGameCode}/battle`), { defenderRoll: roll, winnerId, stage: "result" });
  }, [currentGameCode]);

  const battleContinue = useCallback(async () => {
    if (!currentGameCode) return;
    await update(child(gamesRef, `${currentGameCode}/battle`), { stage: "decision" });
  }, [currentGameCode]);

  const battleDestroy = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const battle = data.battle!;
    const loserId = battle.winnerId === battle.attackerId ? battle.defenderId : battle.attackerId;
    const loser = data.players[loserId];
    const winner = data.players[battle.winnerId!];

    await update(child(gamesRef, `${currentGameCode}/players/${loserId}`), {
      shipPosition: loser.homePort, inventory: {}, movesRemaining: 0
    });
    await update(child(gamesRef, currentGameCode), { battle: null });
    await addGameLog(`⚔️ ${winner.name} destroyed ${loser.name}'s ship!`);
    await advanceTurn();
  }, [currentGameCode, addGameLog, advanceTurn]);

  const battlePlunder = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const battle = data.battle!;
    const winnerId = battle.winnerId!;
    const loserId = winnerId === battle.attackerId ? battle.defenderId : battle.attackerId;
    const winner = data.players[winnerId];
    const loser = data.players[loserId];

    const winnerInv = { ...(winner.inventory || {}) };
    for (const r in loser.inventory) {
      winnerInv[r] = (winnerInv[r] || 0) + loser.inventory[r];
    }
    await update(child(gamesRef, `${currentGameCode}/players/${winnerId}`), { inventory: winnerInv });
    await update(child(gamesRef, `${currentGameCode}/players/${loserId}`), { inventory: {} });
    await update(child(gamesRef, currentGameCode), {
      battle: { ...battle, stage: "displacement", displacedPlayerId: loserId, originSquare: winner.shipPosition }
    });
    await addGameLog(`🏴‍☠️ ${winner.name} plundered ${loser.name}'s cargo!`);
  }, [currentGameCode, addGameLog]);

  const battleMoveOn = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const battle = data.battle!;
    const loserId = battle.winnerId === battle.attackerId ? battle.defenderId : battle.attackerId;
    await update(child(gamesRef, currentGameCode), {
      battle: { stage: "displacement", winnerId: battle.winnerId, displacedPlayerId: loserId, originSquare: data.players[battle.winnerId!].shipPosition }
    });
  }, [currentGameCode]);

  const battleDisplace = useCallback(async (target: string) => {
    await moveToSquare(target);
  }, [moveToSquare]);

  const grantAccess = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const request = data.permissionRequest;
    if (!request) return;
    const requester = data.players[request.requesterId];
    await update(child(gamesRef, `${currentGameCode}/players/${request.requesterId}`), {
      shipPosition: request.square, movesRemaining: requester.movesRemaining - 1
    });
    await update(child(gamesRef, currentGameCode), {
      permissionResult: { requesterId: request.requesterId, message: "Access Approved!" },
      permissionRequest: null
    });
  }, [currentGameCode]);

  const denyAccess = useCallback(async () => {
    if (!currentGameCode) return;
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const request = data.permissionRequest;
    if (!request) return;
    await update(child(gamesRef, currentGameCode), {
      permissionResult: { requesterId: request.requesterId, message: "Access Denied." },
      permissionRequest: null
    });
  }, [currentGameCode]);

  const acknowledgePermission = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    await update(child(gamesRef, currentGameCode), { permissionResult: null });
    const snap = await get(child(gamesRef, currentGameCode));
    const data = snap.val() as GameData;
    const player = data.players[currentPlayerId];
    if (player && player.movesRemaining <= 0) await advanceTurn();
  }, [currentGameCode, currentPlayerId, advanceTurn]);

  const readyUp = useCallback(async () => {
    if (!currentGameCode || !currentPlayerId) return;
    await update(child(gamesRef, `${currentGameCode}/readyPlayers`), { [currentPlayerId]: true });
  }, [currentGameCode, currentPlayerId]);

  const startGame = useCallback(async (victoryConditions: any, bots: any[]) => {
    if (!currentGameCode) return;
    const snapshot = await get(child(gamesRef, currentGameCode));
    const currentData = snapshot.val();
    let turnOrder = currentData.turnOrder || [];

    const usedCountries = Object.values(currentData.players || {}).map((p: any) => p.country);
    const usedColors = Object.values(currentData.players || {}).map((p: any) => p.color);
    const allCountries = ["Spain", "Portugal", "England", "France", "Italy", "Germany"];

    const personalityCounts: Record<string, number> = {};

    for (const bot of bots) {
      const personalityId = BOT_PERSONALITIES[bot.personality] ? bot.personality : "putin";
      const difficultyId = DIFFICULTY_LEVELS[bot.difficulty] ? bot.difficulty : "medium";
      const persona = BOT_PERSONALITIES[personalityId];

      personalityCounts[personalityId] = (personalityCounts[personalityId] || 0) + 1;
      const nameCount = personalityCounts[personalityId];

      const availableCountries = allCountries.filter(c => !usedCountries.includes(c));
      if (availableCountries.length === 0) break;

      let bestCountry = availableCountries[0];
      let bestScore = -1;
      for (const country of availableCountries) {
        const cData = countryData[country];
        let score = Math.random() * 2;
        for (const r in cData.multipliers) {
          score += (baseResourceValues[r] || 0) * cData.multipliers[r] * persona.economyPriority * 0.01;
        }
        if (score > bestScore) { bestScore = score; bestCountry = country; }
      }

      usedCountries.push(bestCountry);
      const color = availableColors.find(c => !usedColors.includes(c)) || "gray";
      usedColors.push(color);

      const botName = nameCount > 1 ? `${persona.name} ${nameCount} ${persona.emoji}` : `${persona.name} ${persona.emoji}`;
      const botRef = push(child(gamesRef, `${currentGameCode}/players`));
      await set(botRef, {
        name: botName, country: bestCountry, homePort: countryData[bestCountry].home,
        multipliers: countryData[bestCountry].multipliers,
        money: 0, bounty: 0,
        upgrades: { transport: 0, navigation: 0, weapons: 0 },
        inventory: {}, shipPosition: countryData[bestCountry].home,
        color, initials: persona.name.substring(0, 2).toUpperCase(),
        movesRemaining: 0, rollValue: null, isBot: true,
        personality: personalityId, difficulty: difficultyId
      });
      turnOrder.push(botRef.key);
    }

    await update(child(gamesRef, currentGameCode), {
      gameState: "active", currentPhase: 0, round: 1,
      victoryConditions, turnOrder
    });
  }, [currentGameCode]);

  // ==================== BOT AUTOMATION ====================
  // (Simplified for now — full bot AI ported)

  const processBotAutomation = useCallback(async (initialData: GameData) => {
    let data = initialData;
    let safety = 0;

    while (safety < 50) {
      safety++;
      const turnOrder = data.turnOrder || [];
      const currentTurnIndex = data.currentTurnIndex || 0;
      const activePlayerId = turnOrder[currentTurnIndex];
      if (!activePlayerId) return;
      const activePlayer = data.players?.[activePlayerId];

      if (!activePlayer?.isBot) {
        // Handle bot battle responses when it's a human's turn but bot is in battle
        if (data.battle) {
          const battle = data.battle;
          if (battle.stage === "awaitingDefenderRoll" && data.players[battle.defenderId]?.isBot) {
            await new Promise(r => setTimeout(r, 1500));
            await botRollDefenseAction(battle.defenderId, data);
          } else if (battle.stage === "awaitingAttackerRoll" && data.players[battle.attackerId]?.isBot) {
            await new Promise(r => setTimeout(r, 1500));
            await botRollAttackAction(battle.attackerId, data);
          } else if ((battle.stage === "result" || battle.stage === "decision") && battle.winnerId && data.players[battle.winnerId]?.isBot) {
            await new Promise(r => setTimeout(r, 1500));
            await botHandleBattleDecisionAction(battle.winnerId, data);
          } else {
            return;
          }
          const freshSnap = await get(child(gamesRef, currentGameCode!));
          const freshData = freshSnap.val() as GameData;
          if (!freshData || freshData.hostId !== currentPlayerId || freshData.gameState !== "active") return;
          data = freshData;
          continue;
        }
        return;
      }

      // Handle ANY bot in battle (not just the active player)
      if (data.battle) {
        const battle = data.battle;
        const attackerIsBot = data.players[battle.attackerId]?.isBot;
        const defenderIsBot = data.players[battle.defenderId]?.isBot;
        const winnerIsBot = battle.winnerId ? data.players[battle.winnerId]?.isBot : false;

        if (battle.stage === "awaitingAttackerRoll" && attackerIsBot) {
          await new Promise(r => setTimeout(r, 1000));
          await botRollAttackAction(battle.attackerId, data);
        } else if (battle.stage === "awaitingDefenderRoll" && defenderIsBot) {
          await new Promise(r => setTimeout(r, 1000));
          await botRollDefenseAction(battle.defenderId, data);
        } else if ((battle.stage === "result" || battle.stage === "decision") && battle.winnerId && winnerIsBot) {
          await new Promise(r => setTimeout(r, 1000));
          await botHandleBattleDecisionAction(battle.winnerId, data);
        } else if (battle.stage === "displacement" && battle.winnerId && winnerIsBot) {
          await new Promise(r => setTimeout(r, 1000));
          const displacedId = battle.displacedPlayerId!;
          const origin = battle.originSquare!;
          const adj = getValidAdjacentSquares(origin, data);
          const validAdj = adj.filter(sq => {
            for (const pid in data.players) {
              if (pid !== displacedId && data.players[pid].shipPosition === sq) return false;
            }
            return true;
          });
          if (validAdj.length > 0) {
            await update(child(gamesRef, `${currentGameCode}/players/${displacedId}`), { shipPosition: validAdj[0] });
          }
          await update(child(gamesRef, currentGameCode!), { battle: null });
          await addGameLog(`🚢 ${data.players[displacedId]?.name} was displaced to ${validAdj[0] || "unknown"}`);
          await advanceTurn();
        } else {
          // Battle exists but needs human input — wait
          return;
        }
        const freshSnap = await get(child(gamesRef, currentGameCode!));
        const freshData = freshSnap.val() as GameData;
        if (!freshData || freshData.hostId !== currentPlayerId || freshData.gameState !== "active") return;
        data = freshData;
        continue;
      }

      // Execute bot turn
      try {
        await executeBotTurnAction(activePlayerId, data);
      } catch (err) {
        console.error("Bot turn error:", err);
        // Force advance turn on error to prevent freezing
        try { await advanceTurn(); } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 500));

      const refreshedSnap = await get(child(gamesRef, currentGameCode!));
      const refreshedData = refreshedSnap.val() as GameData;
      if (!refreshedData || refreshedData.hostId !== currentPlayerId || refreshedData.gameState !== "active") return;
      data = refreshedData;
    }
  }, [currentGameCode, currentPlayerId]);

  const executeBotTurnAction = useCallback(async (botId: string, data: GameData) => {
    if (!currentGameCode) return;
    const bot = data.players[botId];
    if (!bot?.isBot) return;

    const personalityId = BOT_PERSONALITIES[bot.personality!] ? bot.personality! : "putin";
    const difficultyId = DIFFICULTY_LEVELS[bot.difficulty!] ? bot.difficulty! : "medium";
    const personality = BOT_PERSONALITIES[personalityId];
    const difficulty = DIFFICULTY_LEVELS[difficultyId];
    const phase = data.currentPhase ?? 0;

    await new Promise(r => setTimeout(r, 800 + Math.random() * 500));

    if (phase === 0) {
      // Bot give phase — fulfill deals by giving resources/money
      const humanPlayers = Object.keys(data.players).filter(id => !data.players[id].isBot);
      const trust = botTrustScores[botId] || {};
      
      // Check if bot should give to a trusted player
      for (const targetId of humanPlayers) {
        const trustLevel = trust[targetId] || 50;
        if (trustLevel > 70 && personality.loyalty > 0.5 && Math.random() < personality.loyalty * 0.3) {
          const botInv = bot.inventory || {};
          const resources = Object.keys(botInv);
          if (resources.length > 0 && Math.random() < 0.4) {
            const resource = resources[Math.floor(Math.random() * resources.length)];
            const amount = 1;
            if ((botInv[resource] || 0) >= amount) {
              const senderInv = { ...botInv };
              senderInv[resource] -= amount;
              if (senderInv[resource] <= 0) delete senderInv[resource];
              const recipient = data.players[targetId];
              const recipientInv = { ...(recipient.inventory || {}) };
              recipientInv[resource] = (recipientInv[resource] || 0) + amount;
              await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { inventory: senderInv });
              await update(child(gamesRef, `${currentGameCode}/players/${targetId}`), { inventory: recipientInv });
              await addGameLog(`📦 ${bot.name} gave ${amount} ${resource} to ${recipient.name}`);
            }
          } else if (bot.money >= 100 && Math.random() < 0.3) {
            const amount = Math.min(Math.floor(bot.money * 0.1), 200);
            if (amount > 0) {
              const recipient = data.players[targetId];
              await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { money: bot.money - amount });
              await update(child(gamesRef, `${currentGameCode}/players/${targetId}`), { money: (recipient.money || 0) + amount });
              await addGameLog(`💰 ${bot.name} gave $${amount} to ${recipient.name}`);
            }
          }
          break;
        }
      }

      // Bot propose to player
      await botProposeToPlayerAction(botId, bot, data, personality);

      await update(child(gamesRef, currentGameCode), { currentPhase: 1, lastActive: Date.now() });
    } else if (phase === 1) {
      await botUpgradePhaseAction(botId, bot, data, personality, difficulty);
      await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { rollValue: null, movesRemaining: 0 });
      await update(child(gamesRef, currentGameCode), { currentPhase: 2, lastActive: Date.now() });
    } else if (phase === 2) {
      await botMovementPhaseAction(botId, bot, data, personality, difficulty);
    }
  }, [currentGameCode]);

  const botProposeToPlayerAction = useCallback(async (botId: string, bot: PlayerData, data: GameData, personality: any) => {
    const currentRound = data.round || 1;
    const cooldownKey = `${botId}_${currentRound}`;
    if (botProposalCooldownRef.current[cooldownKey]) return;

    if (Math.random() > (personality.economyPriority * 0.3 + personality.deception * 0.1)) return;

    const humanPlayers = Object.keys(data.players).filter(id => !data.players[id].isBot);
    if (humanPlayers.length === 0) return;

    const targetPlayerId = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
    const targetPlayer = data.players[targetPlayerId];
    const trust = botTrustScores[botId]?.[targetPlayerId] || 50;

    let proposal: string | null = null;
    let dealType = "general";

    if (personality.economyPriority > 0.6 && Object.keys(bot.inventory || {}).length > 0) {
      const resource = Object.keys(bot.inventory!)[0];
      proposal = `I have ${resource} to trade. Would you be interested in a resource swap?`;
      dealType = "resource_trade";
    } else if (personality.aggression < 0.4 && trust > 30) {
      proposal = `I propose a ceasefire between us for ${3 + Math.floor(Math.random() * 4)} rounds. What say you?`;
      dealType = "ceasefire";
    } else if (personality.aggression > 0.7 && trust < 30) {
      proposal = `Stay out of my waters or face the consequences. Consider this a warning.`;
      dealType = "warning";
    } else if (trust > 60) {
      proposal = `Perhaps we should form a mutual defense pact? Together we would be formidable.`;
      dealType = "mutual_defense";
    }

    if (!proposal) return;
    botProposalCooldownRef.current[cooldownKey] = true;

    // Add as bot proposal for UI
    setBotProposals(prev => [...prev.slice(-4), {
      botId, botName: bot.name, message: proposal!, dealType, timestamp: Date.now()
    }]);

    await addGameLog(`💬 ${bot.name} proposes to ${targetPlayer.name}: "${proposal}"`);
  }, [botTrustScores, addGameLog]);

  const botUpgradePhaseAction = useCallback(async (botId: string, bot: PlayerData, _data: GameData, personality: any, difficulty: any) => {
    if (!currentGameCode || bot.money < 100) return;
    const transportLevel = bot.upgrades?.transport || 0;
    const navLevel = bot.upgrades?.navigation || 0;
    const weaponsLevel = bot.upgrades?.weapons || 0;

    const options: Array<{ type: string; score: number; cost: number; level: number }> = [];
    const transportCost = 150 * (transportLevel + 1);
    const navCost = 100 * (navLevel + 1);
    const weaponsCost = 100 * (weaponsLevel + 1);

    if (bot.money >= transportCost) options.push({ type: "transport", score: personality.economyPriority * 0.8, cost: transportCost, level: transportLevel });
    if (bot.money >= navCost && navLevel < 3) options.push({ type: "navigation", score: personality.economyPriority * 0.6 + personality.expansionPriority * 0.4, cost: navCost, level: navLevel });
    if (bot.money >= weaponsCost) options.push({ type: "weapons", score: personality.aggression * 0.9, cost: weaponsCost, level: weaponsLevel });

    if (options.length === 0 || Math.random() < difficulty.mistakeRate) return;
    options.sort((a, b) => b.score - a.score);
    const chosen = options[0];

    await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { money: bot.money - chosen.cost });
    if (Math.random() < 0.75) {
      await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { [`upgrades/${chosen.type}`]: chosen.level + 1 });
    }
  }, [currentGameCode]);

  const botMovementPhaseAction = useCallback(async (botId: string, bot: PlayerData, data: GameData, personality: any, difficulty: any) => {
    if (!currentGameCode) return;
    const maxRoll = 6 + ((bot.upgrades?.navigation || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;

    await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { movesRemaining: roll, rollValue: roll });
    await new Promise(r => setTimeout(r, 500));

    let movesLeft = roll;
    while (movesLeft > 0) {
      const freshSnap = await get(child(gamesRef, currentGameCode));
      const freshData = freshSnap.val() as GameData;
      if (!freshData || freshData.battle) break;
      const freshBot = freshData.players[botId];

      const target = botChooseMove(botId, freshBot, freshData, personality, difficulty);
      if (!target) break;

      // Check for other players
      let defenderId: string | null = null;
      for (const id in freshData.players) {
        if (id !== botId && freshData.players[id].shipPosition === target) { defenderId = id; break; }
      }

      if (defenderId) {
        const defender = freshData.players[defenderId];
        if (target === defender.homePort) break;
        if (Math.random() < personality.aggression) {
          await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { shipPosition: target });
          await update(child(gamesRef, currentGameCode), {
            battle: { attackerId: botId, defenderId, attackerRoll: null, defenderRoll: null, winnerId: null, stage: "awaitingAttackerRoll" },
            lastActive: Date.now()
          });
          await new Promise(r => setTimeout(r, 1000));
          await botRollAttackAction(botId, freshData);
          return;
        }
        break;
      }

      await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { shipPosition: target, movesRemaining: movesLeft - 1 });
      movesLeft--;
      await new Promise(r => setTimeout(r, 400));

      if (harvestZones[target] && Math.random() < difficulty.decisionQuality) {
        await botHarvestAction(botId, target, freshData);
        return;
      }

      if (factoryZones[target] && target !== freshBot.homePort) {
        await botManufactureAction(botId, target, freshData);
        if (movesLeft <= 0) break;
      }

      // Check cash-in
      const updatedSnap = await get(child(gamesRef, currentGameCode));
      const updatedBot = updatedSnap.val()?.players?.[botId];
      if (updatedBot?.shipPosition === updatedBot?.homePort && updatedBot?.inventory && Object.keys(updatedBot.inventory).length > 0) {
        let totalValue = 0;
        for (const resource in updatedBot.inventory) {
          totalValue += updatedBot.inventory[resource] * (baseResourceValues[resource] || 0) * (updatedBot.multipliers?.[resource] || 1);
        }
        if (updatedBot.inventory["Automobiles"]) {
          await update(child(gamesRef, `${currentGameCode}/players/${botId}`), {
            automobilesCashed: (updatedBot.automobilesCashed || 0) + updatedBot.inventory["Automobiles"]
          });
        }
        await update(child(gamesRef, `${currentGameCode}/players/${botId}`), {
          money: (updatedBot.money || 0) + totalValue, inventory: {}
        });
        await addGameLog(`💰 ${updatedBot.name} cashed in for $${totalValue}`);
        await advanceTurn();
        return;
      }
    }
    await advanceTurn();
  }, [currentGameCode, addGameLog, advanceTurn]);

  // BFS pathfinding for bots — routes around foreign dictatorships and unowned/foreign Suez
  const bfsDistance = (from: string, to: string, data: GameData, botId?: string): number => {
    if (from === to) return 0;
    const dicts = data.dictatorships || {};
    const queue: Array<[string, number]> = [[from, 0]];
    const visited = new Set<string>([from]);
    while (queue.length > 0) {
      const [pos, dist] = queue.shift()!;
      const col = pos.charCodeAt(0);
      const row = parseInt(pos.slice(1));
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const next = String.fromCharCode(col + dc) + (row + dr);
        if (visited.has(next)) continue;
        if (!waterSquares.has(next)) continue;
        if (restrictedTransitions[pos] && !restrictedTransitions[pos].includes(next)) continue;
        // Suez canal crossing: must be constructed AND owned by us (else permission is needed; treat as costly)
        if ((pos === "G3" && next === "G4") || (pos === "G4" && next === "G3")) {
          if (!data.suezOwner) continue;
          if (botId && data.suezOwner !== botId) continue;
        }
        // Foreign dictatorship — bots avoid pathing through (permission flow handled separately)
        if (dicts[next] && botId && dicts[next] !== botId) continue;
        if (next === to) return dist + 1;
        visited.add(next);
        queue.push([next, dist + 1]);
      }
    }
    return 9999;
  };

  const getValidAdjacentSquares = (currentPos: string, data: GameData, botId?: string): string[] => {
    const col = currentPos.charCodeAt(0);
    const row = parseInt(currentPos.slice(1));
    const dicts = data.dictatorships || {};
    const adjacent: string[] = [];
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const target = String.fromCharCode(col + dc) + (row + dr);
      if (!waterSquares.has(target)) continue;
      if (restrictedTransitions[currentPos] && !restrictedTransitions[currentPos].includes(target)) continue;
      // Block foreign dictatorships from being chosen as a move target by bots
      if (botId && dicts[target] && dicts[target] !== botId) continue;
      // Suez crossing — needs construction; foreign-owned blocked from bot's normal move list
      if ((currentPos === "G3" && target === "G4") || (currentPos === "G4" && target === "G3")) {
        if (!data.suezOwner) continue;
        if (botId && data.suezOwner !== botId) continue;
      }
      adjacent.push(target);
    }
    return adjacent;
  };

  const botChooseGoal = (botId: string, bot: PlayerData, data: GameData, personality: any, difficulty: any): string => {
    const inv = bot.inventory || {};
    const hasInventory = Object.keys(inv).length > 0;
    const capacity = 1 + (bot.upgrades?.transport || 0);
    const invCount = Object.values(inv).reduce((sum: number, qty: any) => sum + (qty as number), 0);

    // If inventory is full or has high-value goods, go home to cash in
    if (hasInventory && invCount >= capacity) return bot.homePort;

    // If we can manufacture something valuable nearby, check for that
    if (hasInventory) {
      // Check if we have ingredients for any recipe
      for (const [good, recipe] of Object.entries(manufacturingRecipes)) {
        const canMake = recipe.inputs.every(r => (inv[r] || 0) >= 1);
        if (canMake) {
          // Find closest factory that makes this good
          let bestFactory = "";
          let bestDist = 9999;
          for (const [sq, goods] of Object.entries(factoryZones)) {
            if (goods.includes(good)) {
              const d = bfsDistance(bot.shipPosition, sq, data, botId);
              if (d < bestDist) { bestDist = d; bestFactory = sq; }
            }
          }
          if (bestFactory && bestDist < 15) return bestFactory;
        }
      }

      // Check if we're close to getting a recipe — need one more ingredient
      for (const [good, recipe] of Object.entries(manufacturingRecipes)) {
        const missing = recipe.inputs.filter(r => !(inv[r] && inv[r] >= 1));
        if (missing.length === 1) {
          // Find harvest zone with the missing resource
          const needed = missing[0];
          let bestZone = "";
          let bestDist = 9999;
          for (const [sq, zone] of Object.entries(harvestZones)) {
            const resources = regionResources[zone.region] || [];
            if (resources.includes(needed)) {
              const d = bfsDistance(bot.shipPosition, sq, data);
              if (d < bestDist) { bestDist = d; bestZone = sq; }
            }
          }
          if (bestZone && bestDist < 20) return bestZone;
        }
      }

      // Otherwise just head home with what we have
      return bot.homePort;
    }

    // No inventory — find the best harvest zone considering value vs distance
    let bestTarget = bot.homePort;
    let bestScore = -1;
    for (const sq in harvestZones) {
      const region = harvestZones[sq].region;
      const resources = regionResources[region] || [];
      const dist = bfsDistance(bot.shipPosition, sq, data);
      if (dist > 40) continue;

      // Calculate expected value of harvesting here
      let maxValue = 0;
      for (const r of resources) {
        const val = (baseResourceValues[r] || 0) * (bot.multipliers?.[r] || 1);
        maxValue = Math.max(maxValue, val);
      }

      // Distance to home from this zone
      const distHome = bfsDistance(sq, bot.homePort, data);
      const totalDist = dist + distHome;
      if (totalDist === 0) continue;

      // Score: value per total travel distance
      let score = (maxValue * difficulty.decisionQuality) / Math.max(totalDist, 1);

      // Bonus for high-value resources (Diamonds, Oil, Silk, Porcelain)
      if (maxValue >= 70) score *= 1.5;

      // Penalty for very long trips
      if (totalDist > 25) score *= 0.5;

      if (score > bestScore) { bestScore = score; bestTarget = sq; }
    }
    return bestTarget;
  };

  const botChooseMove = (botId: string, bot: PlayerData, data: GameData, personality: any, difficulty: any): string | null => {
    const currentPos = bot.shipPosition;
    const adjacent = getValidAdjacentSquares(currentPos, data);
    if (adjacent.length === 0) return null;

    const goal = botChooseGoal(botId, bot, data, personality, difficulty);

    const scored = adjacent.map(target => {
      const distToGoal = bfsDistance(target, goal, data);
      // Primary: move closer to goal
      let score = 1000 - distToGoal;

      // Bonus: harvest zone when we need resources
      const hasInventory = Object.keys(bot.inventory || {}).length > 0;
      if (harvestZones[target] && !hasInventory) score += 50;

      // Bonus: home port with inventory
      if (target === bot.homePort && hasInventory) score += 200;

      // Bonus: factory zone when we can manufacture
      if (factoryZones[target] && hasInventory) {
        for (const good of factoryZones[target]) {
          const recipe = manufacturingRecipes[good];
          if (recipe && recipe.inputs.every(r => ((bot.inventory || {})[r] || 0) >= 1)) {
            score += 100;
          }
        }
      }

      // Small random noise for variety
      score += Math.random() * 2;

      // Avoid occupied squares (unless aggressive)
      for (const pid in data.players) {
        if (pid !== botId && data.players[pid].shipPosition === target) {
          if (personality.aggression < 0.5) score -= 50;
        }
      }

      return { target, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.target || null;
  };

  const botHarvestAction = useCallback(async (botId: string, square: string, data: GameData) => {
    if (!currentGameCode || !harvestZones[square]) return;
    const bot = data.players[botId];
    const region = harvestZones[square].region;
    const resources = regionResources[region];
    const capacity = 1 + (bot.upgrades?.transport || 0);
    const botInv = { ...(bot.inventory || {}) };

    // Sort resources by value considering multipliers — pick the best ones
    const sortedResources = [...resources].sort((a, b) => {
      const valA = (baseResourceValues[a] || 0) * (bot.multipliers?.[a] || 1);
      const valB = (baseResourceValues[b] || 0) * (bot.multipliers?.[b] || 1);
      return valB - valA;
    });

    // Also consider picking resources needed for manufacturing recipes
    const neededForRecipes = new Set<string>();
    for (const [good, recipe] of Object.entries(manufacturingRecipes)) {
      for (const input of recipe.inputs) {
        if (!(botInv[input] && botInv[input] >= 1)) {
          neededForRecipes.add(input);
        }
      }
    }

    // Prioritize recipe ingredients, then highest value
    const prioritized = sortedResources.sort((a, b) => {
      const aNeeded = neededForRecipes.has(a) ? 1 : 0;
      const bNeeded = neededForRecipes.has(b) ? 1 : 0;
      if (aNeeded !== bNeeded) return bNeeded - aNeeded;
      const valA = (baseResourceValues[a] || 0) * (bot.multipliers?.[a] || 1);
      const valB = (baseResourceValues[b] || 0) * (bot.multipliers?.[b] || 1);
      return valB - valA;
    });

    for (let i = 0; i < capacity && i < prioritized.length; i++) {
      const r = prioritized[i];
      botInv[r] = (botInv[r] || 0) + 1;
    }

    await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { inventory: botInv });
    await addGameLog(`⛏️ ${bot.name} harvested in ${region}`);
    await advanceTurn();
  }, [currentGameCode, addGameLog, advanceTurn]);

  const botManufactureAction = useCallback(async (botId: string, square: string, data: GameData) => {
    if (!currentGameCode || !factoryZones[square]) return;
    const bot = data.players[botId];
    const inv = { ...(bot.inventory || {}) };

    for (const good of factoryZones[square]) {
      const recipe = manufacturingRecipes[good];
      if (!recipe) continue;
      if (recipe.inputs.every(r => (inv[r] || 0) >= 1)) {
        recipe.inputs.forEach(r => { inv[r] -= 1; if (inv[r] <= 0) delete inv[r]; });
        inv[good] = (inv[good] || 0) + 1;
        await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { inventory: inv, movesRemaining: 0 });
        await addGameLog(`🏭 ${bot.name} manufactured ${good}`);
        await advanceTurn();
        return;
      }
    }
  }, [currentGameCode, addGameLog, advanceTurn]);

  const botRollAttackAction = useCallback(async (botId: string, data: GameData) => {
    if (!currentGameCode) return;
    const bot = data.players[botId];
    const maxRoll = 5 + ((bot.upgrades?.weapons || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;
    await update(child(gamesRef, `${currentGameCode}/battle`), { attackerRoll: roll, stage: "awaitingDefenderRoll" });
  }, [currentGameCode]);

  const botRollDefenseAction = useCallback(async (botId: string, data: GameData) => {
    if (!currentGameCode) return;
    const bot = data.players[botId];
    const battle = data.battle!;
    const maxRoll = 5 + ((bot.upgrades?.weapons || 0) * 3);
    const roll = Math.floor(Math.random() * maxRoll) + 1;
    const winnerId = roll > battle.attackerRoll! ? battle.defenderId : roll < battle.attackerRoll! ? battle.attackerId : battle.defenderId;
    await update(child(gamesRef, `${currentGameCode}/battle`), { defenderRoll: roll, winnerId, stage: "result" });
  }, [currentGameCode]);

  const botHandleBattleDecisionAction = useCallback(async (botId: string, data: GameData) => {
    if (!currentGameCode) return;
    const personality = BOT_PERSONALITIES[data.players[botId].personality!];
    const battle = data.battle!;
    const loserId = battle.winnerId === battle.attackerId ? battle.defenderId : battle.attackerId;
    const loser = data.players[loserId];
    const winner = data.players[botId];

    await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { movesRemaining: 0 });

    // If on result stage, advance to decision
    if (battle.stage === "result") {
      await update(child(gamesRef, `${currentGameCode}/battle`), { stage: "decision" });
      return;
    }

    if (personality.aggression > 0.7) {
      // Destroy
      await update(child(gamesRef, `${currentGameCode}/players/${loserId}`), { shipPosition: loser.homePort, inventory: {}, movesRemaining: 0 });
      await update(child(gamesRef, currentGameCode), { battle: null });
      await addGameLog(`⚔️ ${winner.name} destroyed ${loser.name}'s ship!`);
      await advanceTurn();
    } else {
      // Plunder - steal cargo, then set displacement stage (handled by bot loop)
      const winnerInv = { ...(winner.inventory || {}) };
      for (const r in loser.inventory) { winnerInv[r] = (winnerInv[r] || 0) + loser.inventory[r]; }
      await update(child(gamesRef, `${currentGameCode}/players/${botId}`), { inventory: winnerInv });
      await update(child(gamesRef, `${currentGameCode}/players/${loserId}`), { inventory: {} });
      await update(child(gamesRef, currentGameCode), {
        battle: { ...battle, stage: "displacement", displacedPlayerId: loserId, originSquare: winner.shipPosition }
      });
      await addGameLog(`🏴‍☠️ ${winner.name} plundered ${loser.name}!`);
    }
  }, [currentGameCode, addGameLog, advanceTurn]);

  const dismissBotProposal = useCallback((index: number) => {
    setBotProposals(prev => prev.filter((_, i) => i !== index));
  }, []);

  const value: GameContextType = {
    gameData, currentGameCode, currentPlayerId, pendingDeals, botProposals,
    botTrustScores, botConversationHistories,
    createGame, joinGame, leaveGame, endPhase, rollDice, moveToSquare,
    harvest, startHarvestSelection, harvestResource, manufacture,
    giveYes, giveNo, giveMoney, giveResource, giveSuez,
    upgradeYes, upgradeNo, purchaseUpgrade, purchaseSuez, purchaseDictatorship,
    rollAttack, rollDefense, battleContinue, battleDestroy, battlePlunder, battleMoveOn, battleDisplace,
    grantAccess, denyAccess, acknowledgePermission, readyUp, startGame,
    addGameLog, cashInContinue, showingUpgradeMenu, harvestSelectionState, cashInSummary,
    dismissBotProposal
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
