import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { botPersonality, botName, conversationHistory, gameContext } = await req.json();

    const systemPrompt = `You are ${botName}, a historical figure in a naval trade board game called "International Trade". You are negotiating with a human player.

CHARACTER TRAITS: ${botPersonality.traits}
PERSONALITY STATS:
- Aggression: ${botPersonality.aggression}/1.0
- Deception: ${botPersonality.deception}/1.0  
- Risk Tolerance: ${botPersonality.riskTolerance}/1.0
- Loyalty: ${botPersonality.loyalty}/1.0
- Economy Priority: ${botPersonality.economyPriority}/1.0

GAME CONTEXT:
${gameContext}

NEGOTIATION RULES:
- Stay in character at all times. Speak as ${botName} would speak.
- You can propose deals: resource trades, ceasefires, mutual defense pacts, money exchanges, or warnings.
- You can accept, reject, or counter-offer the player's proposals.
- Consider your personality traits when responding. High deception means you might agree but plan to betray. High loyalty means you honor deals.
- Keep responses concise (2-4 sentences). Be dramatic and in-character.
- If you agree to a deal, end your message with [DEAL_ACCEPTED]. If you reject, end with [DEAL_REJECTED]. If you're making a counter-offer, end with [COUNTER_OFFER].
- If it's just conversation/posturing with no deal action, don't add any tag.

DEAL TYPES YOU CAN PROPOSE OR ACCEPT:
- resource_trade: Exchange resources between players
- ceasefire: Agree not to attack each other for N rounds
- mutual_defense: Agree to not attack and potentially assist each other
- money_trade: Exchange money for resources or favors
- warning: Threaten the player (not a deal, just intimidation)`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          stream: false,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "...";

    // Parse deal action from response
    let dealAction: string | null = null;
    let cleanReply = reply;
    if (reply.includes("[DEAL_ACCEPTED]")) {
      dealAction = "accepted";
      cleanReply = reply.replace("[DEAL_ACCEPTED]", "").trim();
    } else if (reply.includes("[DEAL_REJECTED]")) {
      dealAction = "rejected";
      cleanReply = reply.replace("[DEAL_REJECTED]", "").trim();
    } else if (reply.includes("[COUNTER_OFFER]")) {
      dealAction = "counter_offer";
      cleanReply = reply.replace("[COUNTER_OFFER]", "").trim();
    }

    return new Response(
      JSON.stringify({ reply: cleanReply, dealAction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bot-negotiate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
