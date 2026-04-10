import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/hooks/useGameState";
import { BOT_PERSONALITIES } from "@/lib/gameData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  dealAction?: string | null;
}

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string | null;
  initialMessage?: string;
  initialDealType?: string;
}

export default function NegotiationDialog({
  open,
  onOpenChange,
  botId,
  initialMessage,
  initialDealType,
}: NegotiationDialogProps) {
  const { gameData, currentPlayerId, addGameLog, botConversationHistories, persistConversation, addDealHistory } = useGame();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const bot = botId && gameData?.players?.[botId];
  const player = currentPlayerId && gameData?.players?.[currentPlayerId];
  const personality = bot?.personality ? BOT_PERSONALITIES[bot.personality] : null;

  // Reset when dialog opens with new bot
  useEffect(() => {
    if (open && botId) {
      const existing = botConversationHistories[botId] || [];
      if (existing.length > 0) {
        setMessages(existing.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
      } else if (initialMessage) {
        setMessages([{ role: "assistant", content: initialMessage, dealAction: null }]);
      } else {
        setMessages([]);
      }
      initializedRef.current = true;
    }
  }, [open, botId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const buildGameContext = (): string => {
    if (!gameData || !bot || !player || !currentPlayerId || !botId) return "";
    const lines: string[] = [];
    lines.push(`Round: ${gameData.round}`);
    lines.push(`Your money: $${bot.money} | Your inventory: ${JSON.stringify(bot.inventory || {})}`);
    lines.push(`Player "${player.name}" money: $${player.money} | Inventory: ${JSON.stringify(player.inventory || {})}`);
    lines.push(`Your position: ${bot.shipPosition} | Player position: ${player.shipPosition}`);
    lines.push(`Your home port: ${bot.homePort} | Player home port: ${player.homePort}`);
    if (bot.upgrades) lines.push(`Your upgrades: Transport ${bot.upgrades.transport}, Nav ${bot.upgrades.navigation}, Weapons ${bot.upgrades.weapons}`);
    if (gameData.suezOwner) {
      const ownerName = gameData.players[gameData.suezOwner]?.name || "unknown";
      lines.push(`Suez Canal owner: ${ownerName}`);
    }
    return lines.join("\n");
  };

  const sendMessage = async () => {
    if (!input.trim() || !botId || !personality || !bot) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Build deal history context for AI memory
      const dealHistoryEntries = gameData?.dealHistory ? Object.values(gameData.dealHistory) : [];
      const relevantDeals = dealHistoryEntries
        .filter(d => d.botId === botId || d.playerId === currentPlayerId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-10);
      const dealHistoryContext = relevantDeals.length > 0
        ? "\nPAST DEAL HISTORY:\n" + relevantDeals.map(d =>
          `Round ${d.round}: ${d.action.toUpperCase()} - ${d.summary}`
        ).join("\n")
        : "";

      const { data, error } = await supabase.functions.invoke("bot-negotiate", {
        body: {
          botPersonality: personality,
          botName: bot.name,
          conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content })),
          gameContext: buildGameContext() + dealHistoryContext,
        },
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "Negotiation Error", description: data.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const botMsg: Message = {
        role: "assistant",
        content: data.reply,
        dealAction: data.dealAction,
      };
      const updatedMessages = [...newMessages, botMsg];
      setMessages(updatedMessages);

      // Persist conversation to Firebase so AI remembers across sessions
      if (botId) {
        await persistConversation(botId, updatedMessages.map(m => ({ role: m.role, content: m.content })));
      }

      // Log deal actions and persist deal history
      if (data.dealAction === "accepted") {
        await addGameLog(`\uD83E\uDD1D ${bot.name} accepted a deal with ${player?.name}!`);
        await addDealHistory({
          botId: botId!, botName: bot.name,
          playerId: currentPlayerId!, playerName: player?.name || "",
          dealType: "negotiation", action: "accepted",
          summary: `${bot.name} accepted: ${input.trim().substring(0, 100)}`,
          round: gameData?.round || 1, timestamp: Date.now()
        });
      } else if (data.dealAction === "rejected") {
        await addGameLog(`\uD83D\uDEAB ${bot.name} rejected ${player?.name}'s proposal.`);
        await addDealHistory({
          botId: botId!, botName: bot.name,
          playerId: currentPlayerId!, playerName: player?.name || "",
          dealType: "negotiation", action: "rejected",
          summary: `${bot.name} rejected: ${input.trim().substring(0, 100)}`,
          round: gameData?.round || 1, timestamp: Date.now()
        });
      } else if (data.dealAction === "counter_offer") {
        await addGameLog(`\u21A9\uFE0F ${bot.name} made a counter-offer to ${player?.name}.`);
        await addDealHistory({
          botId: botId!, botName: bot.name,
          playerId: currentPlayerId!, playerName: player?.name || "",
          dealType: "negotiation", action: "counter_offer",
          summary: `${bot.name} counter-offered: ${data.reply.substring(0, 100)}`,
          round: gameData?.round || 1, timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Negotiation error:", e);
      toast({ title: "Error", description: "Failed to get response. Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Propose Trade", msg: "I'd like to propose a resource trade. What do you have and what do you need?" },
    { label: "Ceasefire", msg: "I propose a ceasefire between us for 5 rounds. Do you agree?" },
    { label: "Alliance", msg: "Let's form a mutual defense pact. We'll be stronger together." },
    { label: "Threaten", msg: "Stay away from my trade routes or there will be consequences." },
  ];

  if (!bot || !personality) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{personality.emoji}</span>
            <span>Negotiate with {bot.name}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{personality.traits}</p>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex gap-1.5 px-4 py-2 flex-wrap border-b border-border">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => setInput(qa.msg)}
              className="text-[10px] px-2 py-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
          <div className="py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Start a negotiation with {bot.name}. Use the quick actions above or type your own message.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span className="font-bold text-xs block mb-1">{personality.emoji} {bot.name}</span>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.dealAction && (
                    <span
                      className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        msg.dealAction === "accepted"
                          ? "bg-green-600/20 text-green-400"
                          : msg.dealAction === "rejected"
                          ? "bg-red-600/20 text-red-400"
                          : "bg-yellow-600/20 text-yellow-400"
                      }`}
                    >
                      {msg.dealAction === "accepted"
                        ? "✅ Deal Accepted"
                        : msg.dealAction === "rejected"
                        ? "❌ Deal Rejected"
                        : "↩️ Counter-Offer"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
                  <span className="font-bold text-xs block mb-1">{personality.emoji} {bot.name}</span>
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type your proposal..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="sm">
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
