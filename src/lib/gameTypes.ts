export interface PlayerData {
  name: string;
  country: string;
  homePort: string;
  multipliers: Record<string, number>;
  money: number;
  bounty: number;
  upgrades: { transport: number; navigation: number; weapons: number };
  inventory: Record<string, number>;
  shipPosition: string;
  color: string;
  initials: string;
  movesRemaining: number;
  rollValue: number | null;
  isBot?: boolean;
  personality?: string;
  difficulty?: string;
  givingMode?: boolean;
  automobilesCashed?: number;
  bountyCollectedFrom?: Record<string, boolean>;
}

export interface BattleData {
  attackerId: string;
  defenderId: string;
  attackerRoll: number | null;
  defenderRoll: number | null;
  winnerId: string | null;
  stage: "awaitingAttackerRoll" | "awaitingDefenderRoll" | "result" | "decision" | "displacement";
  displacedPlayerId?: string;
  originSquare?: string;
}

export interface VictoryConditions {
  money?: number;
  rounds?: number;
  autos?: number;
}

export interface GameLogEntry {
  round?: number;
  message?: string;
  text?: string;
  timestamp?: number;
}

export interface PermissionRequest {
  type: "suez" | "dictatorship";
  requesterId: string;
  ownerId: string;
  square: string;
  round: number;
}

export interface PermissionResult {
  requesterId: string;
  message: string;
}

export interface GameData {
  players: Record<string, PlayerData>;
  turnOrder: string[];
  currentTurnIndex: number;
  currentPhase: number;
  round: number;
  gameState: "lobby" | "active" | "gameOver";
  hostId: string;
  victoryCondition?: string;
  victoryConditions?: VictoryConditions;
  readyPlayers?: Record<string, boolean>;
  lastActive: number;
  battle?: BattleData | null;
  suezOwner?: string | null;
  dictatorships?: Record<string, string>;
  gameLog?: Record<string, GameLogEntry>;
  permissionRequest?: PermissionRequest | null;
  permissionResult?: PermissionResult | null;
  winnerId?: string;
  pendingResourceTransfer?: {
    resource: string;
    amount: number;
    senderId: string;
  };
  lastSuezRequest?: {
    requesterId: string;
    round: number;
  };
  dealHistory?: Record<string, DealHistoryEntry>;
  conversationHistories?: Record<string, Array<{ role: string; content: string }>>;
}

export interface Deal {
  type: string;
  dealType: string;
  promiserId: string;
  recipientId: string;
  round: number;
  rounds: number;
  createdRound: number;
  expiresRound: number;
  fulfilled: boolean;
  willBetray: boolean;
  dealTerms?: {
    resource?: string | null;
    amount?: number;
    money?: number;
    rounds?: number;
    targetPlayer?: string | null;
  };
  giveType?: string;
  amount?: number;
  resource?: string | null;
  botCommitment?: string;
  playerCommitment?: string;
}

export interface BotPersonality {
  name: string;
  emoji: string;
  traits: string;
  aggression: number;
  deception: number;
  riskTolerance: number;
  loyalty: number;
  expansionPriority: number;
  economyPriority: number;
  dealResponses: {
    accept: string[];
    reject: string[];
    betray: string[];
  };
}

export interface DifficultyLevel {
  decisionQuality: number;
  mistakeRate: number;
  planningDepth: number;
}

export type BotProposal = {
  botId: string;
  botName: string;
  message: string;
  dealType: string;
  timestamp: number;
};

export interface DealHistoryEntry {
  botId: string;
  botName: string;
  playerId: string;
  playerName: string;
  dealType: string;
  action: "accepted" | "rejected" | "counter_offer" | "betrayed";
  summary: string;
  round: number;
  timestamp: number;
}
