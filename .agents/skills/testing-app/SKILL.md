# Testing International Trade Game

## Dev Server
```bash
npm install --legacy-peer-deps
npm run dev
# Default port 8080, falls back to 8081 if in use
```

## Creating a Test Game
1. Navigate to localhost:{port}
2. Enter a game code (any string, e.g. "TEST1")
3. Enter player name and select a country (Spain, Portugal, England, France, Italy, Germany)
4. Add bot players (e.g. Putin VP, Gandhi MG) from the bot selection dropdown
5. Click Start Game

## Key Areas to Verify
- **Map**: Canvas renders map.png (Eastern Hemisphere) as background with zone overlays (green=harvest, yellow=factory, purple=home port) and ship icons
- **Negotiate buttons**: Should show speech bubble emoji before bot names, NOT raw Unicode text
- **Negotiation dialog**: Click negotiate button to open dialog with bot personality, quick actions (Propose Trade, Ceasefire, Alliance, Threaten), and message input
- **Game ledger**: Right panel shows player info, round/phase, and game controls
- **Dark theme**: Background should be dark slate-900/blue-950 gradient with amber title text

## Tech Stack
- React 18 + TypeScript + Vite
- Firebase for game state persistence
- Supabase edge functions for AI bot negotiation
- Canvas-based map rendering (CanvasMap.tsx)

## Known Limitations
- AI negotiation requires Supabase function to be deployed and accessible
- Bot automation (movement, Suez Canal permissions) requires active game with multiple rounds
- TypeScript check: `npx tsc --noEmit`
- ESLint not configured in dev environment
