import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, X, Lightbulb, Target, Ship, Wheat, Factory, Coins, Swords, Handshake, Crown } from "lucide-react";

interface TutorialStep {
  title: string;
  icon: React.ReactNode;
  content: string;
  tip?: string;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome, Captain!",
    icon: <Ship className="h-8 w-8 text-primary" />,
    content: "You're about to command a trading ship across the world's oceans. Your goal is simple: become the wealthiest trader by harvesting resources, manufacturing goods, and outsmarting your rivals.\n\nThis tutorial will walk you through everything you need to know. Let's set sail!",
    tip: "The game is inspired by historical maritime trade routes — geography matters!"
  },
  {
    title: "Choose Your Nation",
    icon: <Crown className="h-8 w-8 text-primary" />,
    content: "When you create or join a game, you'll pick one of six European nations: Spain, Portugal, England, France, Italy, or Germany.\n\nEach nation has a unique HOME PORT on the map where your ship starts and returns to sell goods. They also have MULTIPLIERS that make certain resources worth more.",
    tip: "Germany gets 2× Technology value, Italy gets 2× Spices. Pick a nation that matches your strategy!"
  },
  {
    title: "The Map",
    icon: <Target className="h-8 w-8 text-primary" />,
    content: "The map shows ocean squares where ships can sail. You'll see:\n\n• Your ship (colored circle with initials)\n• Other players' ships\n• Harvest zones near coastlines\n• Factory squares in Asia\n• The Suez Canal passage\n\nClick any ocean square during your movement phase to sail there.",
    highlight: "map"
  },
  {
    title: "Turn Phases",
    icon: <ChevronRight className="h-8 w-8 text-primary" />,
    content: "Each turn has THREE phases, shown in the game panel:\n\n1️⃣ GIVE PHASE — Gift money or resources to other players (optional). This is how you fulfill trade deals.\n\n2️⃣ UPGRADE PHASE — Spend money to improve your ship's Transport, Navigation, or Weapons.\n\n3️⃣ MOVEMENT PHASE — Roll dice and move your ship across the map.",
    tip: "You can click 'End Phase' to skip any phase you don't need."
  },
  {
    title: "Rolling & Moving",
    icon: <Ship className="h-8 w-8 text-primary" />,
    content: "In the Movement Phase, click '🎲 Roll Dice' to see how far you can move. Your base range is 1-6, but Navigation upgrades increase your maximum roll.\n\nEach click on the map moves you one square and costs one move. Plan your route carefully — you can stop at any point to harvest or manufacture.",
    tip: "Navigation Level 1 = roll up to 9, Level 2 = up to 12, Level 3 = up to 15!"
  },
  {
    title: "Harvesting Resources",
    icon: <Wheat className="h-8 w-8 text-primary" />,
    content: "When your ship is on a harvest zone (near a coastline), the '⛏️ Harvest' button appears. You'll need to name a country at that location correctly.\n\nSuccess! You'll choose which resources to collect from that region. Different regions offer different goods:\n\n• Africa: Gold, Ivory, Copper, Diamonds\n• Arabia: Oil, Spices\n• India: Spices, Cotton, Rice, Coal\n• China: Silk, Porcelain, Iron\n• Japan: Copper, Coal",
    tip: "Study the map! Knowing which countries border each sea zone is key to successful harvesting."
  },
  {
    title: "Manufacturing",
    icon: <Factory className="h-8 w-8 text-primary" />,
    content: "Factory squares (mainly in East Asia) let you combine raw resources into manufactured goods:\n\n⚙️ Steel = Iron + Coal → $150\n👕 Clothes = Cotton + Silk → $250\n💻 Technology = Copper + Oil → $200\n🚗 Automobile = Steel + Clothes + Oil + Copper → $1,500!\n\nAutomobiles require the most ingredients but are worth a fortune!",
    tip: "Collect Iron + Coal first, manufacture Steel, then combine with other resources for Automobiles."
  },
  {
    title: "Cashing In at Home",
    icon: <Coins className="h-8 w-8 text-primary" />,
    content: "When you return to your HOME PORT with resources in your inventory, they're automatically sold!\n\nYour nation's multipliers boost the sale price of specific goods. For example, if you're Italy with 2× Spices multiplier, Spices worth $50 become $100 each.\n\nThis is how you earn money toward victory!",
    tip: "The most profitable strategy: harvest resources your nation values most, manufacture them into goods, then cash in."
  },
  {
    title: "Ship Upgrades",
    icon: <Target className="h-8 w-8 text-primary" />,
    content: "During the Upgrade Phase, spend money to improve your ship:\n\n🚢 TRANSPORT — Carry more resources (higher levels = more cargo space)\n🧭 NAVIGATION — Move further each turn (max level 3)\n⚔️ WEAPONS — Better odds in combat\n\nUpgrade costs increase with each level. There's a 75% success chance — failure still costs money!",
    tip: "Navigation is usually the best early investment — moving further means more harvesting per turn."
  },
  {
    title: "Combat",
    icon: <Swords className="h-8 w-8 text-primary" />,
    content: "Move onto another player's square to initiate combat! Both players roll dice, modified by Weapons upgrades.\n\nThe winner can choose to:\n🏴‍☠️ Plunder — Steal resources\n💥 Destroy — Eliminate their cargo\n➡️ Move On — Leave peacefully\n↗️ Displace — Force them to an adjacent square\n\nYou can't attack players at their home port.",
    tip: "Pirates beware: attacking generates a BOUNTY on your head that other players can collect!"
  },
  {
    title: "Negotiating with Bots",
    icon: <Handshake className="h-8 w-8 text-primary" />,
    content: "AI bot players have unique personalities based on historical figures. Use the 💬 Negotiate buttons to:\n\n• Propose trade deals\n• Request ceasefires\n• Form alliances\n• Make threats\n\nEach bot responds in character — Gandhi values peace, Putin is deceptive, Napoleon is aggressive. Pay attention to their personality when making deals!",
    tip: "Bots remember broken deals and adjust their trust. Keep your promises to maintain good relations!"
  },
  {
    title: "Special Structures",
    icon: <Crown className="h-8 w-8 text-primary" />,
    content: "Two powerful structures you can build:\n\n🏗️ SUEZ CANAL ($150) — Control the passage between G3↔G4. Other players must ask permission to cross!\n\n👑 DICTATORSHIPS ($300+) — Claim a harvest zone. You control who can harvest there. Cost increases with each one you own.\n\nThese are powerful strategic tools for controlling the map.",
    tip: "The Suez Canal is a chokepoint — controlling it can earn you money through tolls or deny rivals passage."
  },
  {
    title: "Winning the Game",
    icon: <Crown className="h-8 w-8 text-primary" />,
    content: "Victory conditions are set when the game is created:\n\n💰 Reach a money target (default: $10,000)\n🔄 Most money after X rounds\n🚗 Cash in X automobiles\n\nMultiple conditions can be active — first player to meet ANY condition wins!\n\nNow you're ready to play. Create a game, add some bots, and start trading!",
    tip: "A balanced strategy works best: harvest efficiently, upgrade wisely, and know when to fight or negotiate."
  }
];

interface TutorialModeProps {
  onClose: () => void;
}

export default function TutorialMode({ onClose }: TutorialModeProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const next = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) setCurrentStep(s => s + 1);
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl mx-4 bg-card border-2 border-primary/20 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-primary/5 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep + 1} of {tutorialSteps.length}
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-1 rounded-none" />

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {step.icon}
            <h2 className="text-xl font-bold">{step.title}</h2>
          </div>

          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line min-h-[180px]">
            {step.content.split(/(\*\*.*?\*\*)/g).map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </div>

          {step.tip && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{step.tip}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex gap-1">
            {tutorialSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-border"
                }`}
              />
            ))}
          </div>

          {currentStep < tutorialSteps.length - 1 ? (
            <Button size="sm" onClick={next} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClose} className="gap-1">
              Start Playing! 🚀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
