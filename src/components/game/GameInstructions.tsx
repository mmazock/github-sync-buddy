import { useState } from "react";
import { ChevronDown, ChevronUp, Anchor, Coins, Swords, Factory, Wheat, Handshake, Crown, Ship } from "lucide-react";

const sections = [
  {
    title: "🎯 Objective",
    icon: Crown,
    content: `Win by reaching the victory condition set at game start — typically accumulating a target amount of money. You earn money by harvesting raw resources around the world, manufacturing goods at factories, and cashing them in at your home port. Negotiate, trade, and fight your way to victory!`
  },
  {
    title: "🚢 Turn Structure",
    icon: Ship,
    content: `Each turn has 3 phases:

**Phase 1 — Give Phase:** Optionally give money or resources to other players. Use this for fulfilling trade deals or bribing opponents.

**Phase 2 — Upgrade Phase:** Spend money to upgrade your ship:
• 🚢 Transport — Carry more goods
• 🧭 Navigation — Roll higher for movement (max +9 at level 3)
• ⚔️ Weapons — Better combat rolls
You can also construct the Suez Canal or fund dictatorships.

**Phase 3 — Movement Phase:** Roll dice and move your ship across the map. Land on harvest zones to gather resources, factories to manufacture goods, or your home port to cash in.`
  },
  {
    title: "⛏️ Harvesting",
    icon: Wheat,
    content: `When you stop on a harvest zone (coastal squares near continents), you can harvest resources. You must correctly name a country at that location to harvest. Each region offers different resources:

• **West Africa** — Gold, Ivory
• **Southern Africa** — Gold, Ivory, Copper, Iron, Diamonds
• **Arabian Peninsula** — Oil, Spices
• **Indian Subcontinent** — Spices, Coal, Cotton, Rice
• **China** — Silk, Porcelain, Rice, Cotton, Spices, Iron
• **Japan** — Copper, Coal`
  },
  {
    title: "🏭 Manufacturing",
    icon: Factory,
    content: `Factories at certain squares let you combine raw resources into valuable manufactured goods:

• **Steel** = Iron + Coal ($150)
• **Clothes** = Cotton + Silk ($250)
• **Technology** = Copper + Oil ($200)
• **Automobile** = Steel + Clothes + Oil + Copper ($1,500)

Automobiles are the most valuable item in the game!`
  },
  {
    title: "💰 Cashing In",
    icon: Coins,
    content: `When you return to your home port with resources, they are automatically sold. Each country has unique **multipliers** that increase the value of certain goods:

• **Spain** — 2× Copper, 1.5× Gold, Automobiles, Clothes
• **England** — 2× Porcelain, Silk
• **Germany** — 2× Technology, 1.5× Diamonds, Oil
• **Italy** — 2× Spices, 1.5× everything else

Strategy tip: Harvest resources your country values most!`
  },
  {
    title: "⚔️ Combat",
    icon: Swords,
    content: `When you move onto a square occupied by another player, a battle begins. Both players roll dice (modified by weapons upgrades). The winner can:

• **Plunder** — Steal resources from the loser
• **Destroy** — Destroy the loser's resources
• **Move On** — Continue without penalty
• **Displace** — Force the loser to an adjacent square

Attacking players at their home port is not allowed.`
  },
  {
    title: "🏗️ Special Purchases",
    icon: Anchor,
    content: `**Suez Canal ($150):** Build the canal to control passage between squares G3 and G4. Other players must request your permission to pass — you can deny them!

**Dictatorships ($300+):** Fund a dictatorship on a harvest square. You control access to that region. Cost increases with each dictatorship owned.`
  },
  {
    title: "🤝 Negotiation & Deals",
    icon: Handshake,
    content: `Use the Negotiate buttons to talk with AI bot players. You can propose:

• **Trade deals** — Exchange resources or money
• **Ceasefires** — Agree not to attack each other
• **Alliances** — Cooperate against common enemies
• **Threats** — Intimidate bots into compliance

Each bot has a unique personality affecting how they respond. Some are loyal, others deceptive. Choose your allies carefully!`
  }
];

export default function GameInstructions() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-sm font-semibold"
      >
        <span>📜 Game Instructions</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {sections.map((section, i) => (
            <div key={i} className="border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors text-xs font-medium"
              >
                <span>{section.title}</span>
                {expandedSection === i ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {expandedSection === i && (
                <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
