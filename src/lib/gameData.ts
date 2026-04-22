import type { BotPersonality, DifficultyLevel } from "./gameTypes";

export const waterSquares = new Set([
  ...Array.from({ length: 14 }, (_, i) => `A${i}`),
  ...Array.from({ length: 14 }, (_, i) => `B${i}`),
  "C0","C1","C2","C3","C6","C7","C8","C9","C10","C11","C12","C13",
  "D0","D1","D2","D3","D6","D7","D8","D9","D10","D11","D12","D13",
  "E2","E3","E7","E8","E9","E10","E11","E12","E13",
  "F3","F10","F11","F12","F13",
  "G3","G4","G5","G8","G9","G10","G11","G12","G13",
  "H5","H6","H7","H8","H9","H10","H11","H12","H13",
  "I4","I5","I6","I7","I8","I9","I10","I11","I12","I13",
  ...Array.from({ length: 10 }, (_, i) => `J${i + 4}`),
  ...Array.from({ length: 10 }, (_, i) => `K${i + 4}`),
  ...Array.from({ length: 10 }, (_, i) => `L${i + 4}`),
  ...Array.from({ length: 10 }, (_, i) => `M${i + 4}`),
  ...Array.from({ length: 9 }, (_, i) => `N${i + 5}`),
  ...Array.from({ length: 10 }, (_, i) => `O${i + 4}`),
  "P3","P4","P5","P6","P7","P8","P10","P11","P12","P13",
  "Q3","Q4","Q5","Q6","Q7","Q8","Q10","Q11","Q12","Q13",
  "R3","R4","R5","R6","R7","R8","R11","R12","R13",
  ...Array.from({ length: 12 }, (_, i) => `S${i + 2}`)
]);

export const restrictedTransitions: Record<string, string[]> = {
  "D1": ["D0"],
  "C1": ["C0", "B1", "C2"],
  "C2": ["C3", "B2", "C1"],
  "D2": ["E2", "D3"],
  "H5": ["G5", "I5"],
  "H6": ["I6", "H7"],
  "K4": ["J4", "K5"],
  "K5": ["K6", "K4", "J5"],
  "L5": ["L4", "M5", "L6"],
  "L4": ["M4", "L5"],
  "M5": ["M4", "L5", "M6"],
  "M7": ["M6", "M8", "L7"],
  "N5": ["N6", "O5"],
  "N7": ["N6", "O7"],
  "P7": ["P6", "O7", "Q7"],
  "P8": ["O8"],
  "Q8": ["Q7", "R8"]
};

export const harvestZones: Record<string, { region: string; countries: string[]; special?: string }> = {
  "C6": { region: "West Africa", countries: ["Liberia", "Côte d'Ivoire", "Cote D'Ivoire", "Cote DIvoire", "Cote Divoire", "Ivory Coast", "Ghana"] },
  "D6": { region: "West Africa", countries: ["Togo", "Benin", "Nigeria", "Cameroon"] },
  "E7": { region: "Central Africa", countries: ["Gabon", "Republic of the Congo", "Democratic Republic of the Congo", "Angola"] },
  "E8": { region: "Central Africa", countries: ["Angola", "Namibia"] },
  "E9": { region: "Southern Africa", countries: ["Namibia", "South Africa"] },
  "E10": { region: "Southern Africa", countries: ["South Africa"], special: "diamonds" },
  "F10": { region: "Southern Africa", countries: ["South Africa"] },
  "G9": { region: "Southern Africa", countries: ["South Africa", "Mozambique"] },
  "G8": { region: "Southern Africa", countries: ["Mozambique"] },
  "H7": { region: "Eastern Africa", countries: ["Kenya"] },
  "H6": { region: "Eastern Africa", countries: ["Somalia", "Kenya"] },
  "I5": { region: "Arabian Peninsula", countries: ["Yemen", "Oman"] },
  "I4": { region: "Arabian Peninsula", countries: ["Oman", "United Arab Emirates", "Qatar", "Bahrain", "Saudi Arabia", "Iran"] },
  "J4": { region: "Indian Subcontinent", countries: ["Iran", "Pakistan", "India"] },
  "K4": { region: "Indian Subcontinent", countries: ["India"] },
  "K5": { region: "Indian Subcontinent", countries: ["India"] },
  "K6": { region: "Indian Subcontinent", countries: ["India"] },
  "L5": { region: "Indian Subcontinent", countries: ["India"] },
  "L4": { region: "Indian Subcontinent", countries: ["India", "Bangladesh"] },
  "M4": { region: "Indian Subcontinent", countries: ["India", "Bangladesh", "Myanmar"] },
  "M5": { region: "Southeast Asia", countries: ["Myanmar"] },
  "N5": { region: "Southeast Asia", countries: ["Thailand", "Cambodia", "Vietnam"] },
  "O4": { region: "China", countries: ["China"] },
  "P4": { region: "China", countries: ["China"] },
  "P3": { region: "China", countries: ["China", "North Korea", "South Korea"] },
  "Q3": { region: "Japan", countries: ["Japan"] },
  "R3": { region: "Japan", countries: ["Japan"] }
};

export const factoryZones: Record<string, string[]> = {
  "P3": ["Technology", "Automobiles", "Steel"],
  "Q3": ["Technology", "Automobiles"],
  "R3": ["Technology", "Automobiles"],
  "L4": ["Technology", "Clothes"],
  "O4": ["Automobiles", "Steel"],
  "K5": ["Steel"],
  "L5": ["Steel", "Clothes"],
  "P4": ["Steel"],
  "M4": ["Clothes"],
  "M5": ["Clothes"],
  "N5": ["Clothes"],
  "K6": ["Clothes"]
};

export const regionResources: Record<string, string[]> = {
  "West Africa": ["Gold", "Ivory"],
  "Central Africa": ["Gold", "Ivory", "Copper"],
  "Southern Africa": ["Gold", "Ivory", "Copper", "Iron", "Diamonds"],
  "Eastern Africa": ["Spices", "Ivory"],
  "Arabian Peninsula": ["Oil", "Spices"],
  "Indian Subcontinent": ["Spices", "Coal", "Cotton", "Rice"],
  "Southeast Asia": ["Coal", "Rice", "Oil"],
  "China": ["Silk", "Porcelain", "Rice", "Cotton", "Spices", "Iron"],
  "Japan": ["Copper", "Coal"]
};

export const baseResourceValues: Record<string, number> = {
  "Automobiles": 1500,
  "Clothes": 250,
  "Coal": 40,
  "Copper": 20,
  "Cotton": 40,
  "Diamonds": 70,
  "Gold": 20,
  "Iron": 20,
  "Ivory": 20,
  "Oil": 70,
  "Porcelain": 80,
  "Rice": 60,
  "Silk": 80,
  "Spices": 50,
  "Steel": 150,
  "Technology": 200
};

export const manufacturingRecipes: Record<string, { inputs: string[] }> = {
  "Technology": { inputs: ["Copper", "Oil"] },
  "Automobile": { inputs: ["Steel", "Clothes", "Oil", "Copper"] },
  "Steel": { inputs: ["Iron", "Coal"] },
  "Clothes": { inputs: ["Cotton", "Silk"] }
};

export const countryData: Record<string, { home: string; multipliers: Record<string, number> }> = {
  Spain: {
    home: "C2",
    multipliers: { "Automobiles": 1.5, "Clothes": 1.5, "Copper": 2, "Gold": 1.5, "Spices": 0.5 }
  },
  Portugal: {
    home: "C3",
    multipliers: { "Ivory": 0.5, "Rice": 2, "Silk": 1.5, "Steel": 1.5, "Technology": 1.5 }
  },
  England: {
    home: "C1",
    multipliers: { "Copper": 0.5, "Gold": 0.5, "Porcelain": 2, "Silk": 2 }
  },
  France: {
    home: "D2",
    multipliers: { "Cotton": 1.5, "Ivory": 0.5, "Rice": 1.5, "Spices": 0.5 }
  },
  Italy: {
    home: "E2",
    multipliers: { "Copper": 1.5, "Gold": 1.5, "Rice": 1.5, "Silk": 1.5, "Spices": 2, "Technology": 1.5 }
  },
  Germany: {
    home: "D1",
    multipliers: { "Automobiles": 0.5, "Coal": 1.5, "Diamonds": 1.5, "Oil": 1.5, "Rice": 1.5, "Technology": 2 }
  }
};

export const availableColors = ["red", "purple", "yellow", "black", "blue", "green", "orange"];

export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  putin: {
    name: "Putin", emoji: "VP",
    traits: "Cunning, deceptive, ruthless strategist who uses manipulation to WIN",
    aggression: 0.9, deception: 0.85, riskTolerance: 0.7, loyalty: 0.1,
    expansionPriority: 0.9, economyPriority: 0.5,
    dealResponses: {
      accept: ["Da. We have agreement... for now.", "I accept. Do not test my patience.", "This serves my interests. Agreed."],
      reject: ["Nyet. You insult me with this offer.", "I have no use for your proposal.", "You are not in position to negotiate."],
      betray: ["Agreements are... flexible.", "Circumstances have changed.", "I never promised anything."]
    }
  },
  gandhi: {
    name: "Gandhi", emoji: "MG",
    traits: "Non-violent, tactical, principled pacifist who wins through economic dominance",
    aggression: 0.1, deception: 0.1, riskTolerance: 0.3, loyalty: 0.95,
    expansionPriority: 0.3, economyPriority: 0.9,
    dealResponses: {
      accept: ["In the spirit of cooperation, I agree.", "Peace and trade benefit us all.", "I accept, and I shall honor my word."],
      reject: ["I must respectfully decline.", "This does not align with my principles.", "I cannot accept these terms in good conscience."],
      betray: ["I deeply regret I cannot fulfill this.", "Forgive me, circumstances forced my hand."]
    }
  },
  napoleon: {
    name: "Napoleon", emoji: "🇫🇷",
    traits: "Ambitious, brilliant tactician who fights to WIN through military conquest",
    aggression: 0.85, deception: 0.6, riskTolerance: 0.8, loyalty: 0.3,
    expansionPriority: 0.95, economyPriority: 0.6,
    dealResponses: {
      accept: ["Magnifique! This arrangement suits the Empire.", "I shall permit this alliance... temporarily.", "Victory favors the bold. Agreed."],
      reject: ["You dare offer crumbs to an Emperor?", "France does not beg. Proposal denied.", "I have conquered nations larger than your fleet."],
      betray: ["An emperor answers to no one.", "Strategy demands sacrifice — yours.", "History will judge me kindly regardless."]
    }
  },
  elizabeth: {
    name: "Elizabeth I", emoji: "👑",
    traits: "Shrewd diplomat, calculating queen focused on WINNING through trade wealth",
    aggression: 0.4, deception: 0.7, riskTolerance: 0.4, loyalty: 0.5,
    expansionPriority: 0.6, economyPriority: 0.85,
    dealResponses: {
      accept: ["The Crown finds these terms acceptable.", "England prospers through wise alliances.", "You have my royal assent."],
      reject: ["We are not amused by this proposal.", "England shall not be made a fool.", "Your terms are beneath the dignity of this throne."],
      betray: ["A queen must protect her realm above all.", "Promises to rivals are written in sand.", "The crown's interests supersede sentiment."]
    }
  },
  genghis: {
    name: "Genghis Khan", emoji: "🏹",
    traits: "Brutal, fearless, conquest-driven warlord who fights to WIN through domination",
    aggression: 0.85, deception: 0.3, riskTolerance: 0.9, loyalty: 0.4,
    expansionPriority: 0.85, economyPriority: 0.65,
    dealResponses: {
      accept: ["The Khan accepts. Do not disappoint me.", "Your tribute is noted. We ride together.", "Strength recognizes strength. Agreed."],
      reject: ["Submit or be trampled.", "The horde does not negotiate with the weak.", "I take what I want. I need no deal."],
      betray: ["The strong devour the weak. It is natural.", "Your trust was your undoing.", "I warned you — submit or perish."]
    }
  },
  cleopatra: {
    name: "Cleopatra", emoji: "🐍",
    traits: "Diplomat, cunning, politically brilliant — always scheming to WIN",
    aggression: 0.3, deception: 0.8, riskTolerance: 0.5, loyalty: 0.35,
    expansionPriority: 0.5, economyPriority: 0.9,
    dealResponses: {
      accept: ["Egypt smiles upon this arrangement.", "You are wise to seek my favor. Agreed.", "A most... profitable partnership."],
      reject: ["Do you think the Queen of the Nile so easily swayed?", "Your offer insults the throne of Egypt.", "I have refused emperors. You are no different."],
      betray: ["The Nile's currents shift without warning, darling.", "Power demands difficult choices.", "I do what I must to preserve my dynasty."]
    }
  },
  bismarck: {
    name: "Bismarck", emoji: "🇩🇪",
    traits: "Iron-willed realpolitik master focused on WINNING through balanced strategy",
    aggression: 0.6, deception: 0.5, riskTolerance: 0.5, loyalty: 0.6,
    expansionPriority: 0.7, economyPriority: 0.8,
    dealResponses: {
      accept: ["Blood and iron approve this accord.", "A pragmatic arrangement. Germany accepts.", "This aligns with our strategic interests."],
      reject: ["Realpolitik demands I refuse.", "This deal weakens our position. Declined.", "I did not unite Germany by accepting poor terms."],
      betray: ["Politics is the art of the possible.", "Sentiment has no place in statecraft.", "The balance of power required adjustment."]
    }
  },
  sunTzu: {
    name: "Sun Tzu", emoji: "☯️",
    traits: "Wise strategist who wins by outmaneuvering opponents",
    aggression: 0.3, deception: 0.9, riskTolerance: 0.4, loyalty: 0.5,
    expansionPriority: 0.5, economyPriority: 0.7,
    dealResponses: {
      accept: ["The supreme art of war is to subdue the enemy without fighting. Agreed.", "When the wind is favorable, one must sail. I accept.", "Know your enemy, know yourself. This deal serves both."],
      reject: ["He who knows when he can fight and when he cannot, will be victorious. Not today.", "Appear weak when you are strong. I decline.", "This offer reveals more about you than you intended."],
      betray: ["All warfare is based on deception.", "Let your plans be dark as night.", "Opportunities multiply as they are seized."]
    }
  },
  victoria: {
    name: "Queen Victoria", emoji: "🏰",
    traits: "Imperial empire-builder focused on WINNING through expansion and economic supremacy",
    aggression: 0.5, deception: 0.3, riskTolerance: 0.3, loyalty: 0.7,
    expansionPriority: 0.8, economyPriority: 0.85,
    dealResponses: {
      accept: ["The Empire accepts. See that you honor it.", "For the good of civilization, we agree.", "Proper conduct demands we accept fair terms."],
      reject: ["We are not amused.", "The British Empire does not grovel.", "Quite unacceptable. Good day."],
      betray: ["The Empire's interests must come first.", "We acted for the greater good.", "Regrettable, but necessary for the realm."]
    }
  },
  hardBot1: {
    name: "Admiral Steele", emoji: "⚓",
    traits: "Ruthlessly efficient military strategist driven to WIN",
    aggression: 0.75, deception: 0.4, riskTolerance: 0.6, loyalty: 0.5,
    expansionPriority: 0.7, economyPriority: 0.75,
    dealResponses: {
      accept: ["Tactical advantage confirmed. Deal accepted.", "Efficient. Agreed.", "This serves the fleet. Proceed."],
      reject: ["Negative. Unfavorable terms.", "Denied. Try harder.", "That's a losing play. No deal."],
      betray: ["War is war.", "Nothing personal. Just strategy.", "Adapt or sink."]
    }
  },
  hardBot2: {
    name: "The Merchant", emoji: "💰",
    traits: "Greedy, calculating trader obsessed with WINNING through maximum profit",
    aggression: 0.2, deception: 0.6, riskTolerance: 0.3, loyalty: 0.2,
    expansionPriority: 0.3, economyPriority: 1.0,
    dealResponses: {
      accept: ["Profit margins check out. You have a deal.", "Gold talks. I'm listening. Agreed.", "Smart money says yes."],
      reject: ["The numbers don't add up. Pass.", "I didn't get rich making bad deals.", "Come back when you have a real offer."],
      betray: ["Business is business.", "Nothing personal — just profit margins.", "Every coin counts. Even yours."]
    }
  },
  hardBot3: {
    name: "Iron Maiden", emoji: "⚔️",
    traits: "Aggressive raider who lives to WIN through combat dominance",
    aggression: 0.95, deception: 0.2, riskTolerance: 0.9, loyalty: 0.4,
    expansionPriority: 0.85, economyPriority: 0.4,
    dealResponses: {
      accept: ["Fine. But cross me and I'll sink every ship you own.", "Alliance forged in iron. Don't make it rust.", "Agreed. Now let's find someone to fight."],
      reject: ["I'd rather take it by force.", "Peace is boring. No deal.", "Why negotiate when I can just attack?"],
      betray: ["Should've seen this coming.", "The strong take. The weak complain.", "Consider it a lesson learned."]
    }
  }
};

export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  easy: { decisionQuality: 0.4, mistakeRate: 0.3, planningDepth: 1 },
  medium: { decisionQuality: 0.6, mistakeRate: 0.15, planningDepth: 2 },
  hard: { decisionQuality: 0.85, mistakeRate: 0.05, planningDepth: 3 },
  veryHard: { decisionQuality: 1.0, mistakeRate: 0.0, planningDepth: 4 }
};

export const columnPixels = [
  { letter: "A", x: 10 }, { letter: "B", x: 23 }, { letter: "C", x: 38 },
  { letter: "D", x: 53 }, { letter: "E", x: 67 }, { letter: "F", x: 81 },
  { letter: "G", x: 95 }, { letter: "H", x: 110 }, { letter: "I", x: 124 },
  { letter: "J", x: 138 }, { letter: "K", x: 153 }, { letter: "L", x: 168 },
  { letter: "M", x: 182 }, { letter: "N", x: 196 }, { letter: "O", x: 211 },
  { letter: "P", x: 225 }, { letter: "Q", x: 240 }, { letter: "R", x: 254 },
  { letter: "S", x: 267 }
];

export const rowPixels = [
  { row: 0, y: 7 }, { row: 1, y: 18 }, { row: 2, y: 29 },
  { row: 3, y: 39 }, { row: 4, y: 50 }, { row: 5, y: 60 },
  { row: 6, y: 71 }, { row: 7, y: 83 }, { row: 8, y: 92 },
  { row: 9, y: 102 }, { row: 10, y: 113 }, { row: 11, y: 123 },
  { row: 12, y: 134 }, { row: 13, y: 144 }
];

export const originalWidth = 275;
export const originalHeight = 150;
