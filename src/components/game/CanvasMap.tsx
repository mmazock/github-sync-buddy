import { useCallback, useRef, useEffect, useState } from "react";
import { useGame } from "@/hooks/useGameState";
import {
  columnPixels, rowPixels, waterSquares,
  harvestZones, factoryZones, countryData
} from "@/lib/gameData";

// Grid dimensions
const COLS = 19; // A-S
const ROWS = 14; // 0-13
const CELL_SIZE = 48;
const PADDING = 32;
const MAP_WIDTH = COLS * CELL_SIZE + PADDING * 2;
const MAP_HEIGHT = ROWS * CELL_SIZE + PADDING * 2;

const COL_LETTERS = "ABCDEFGHIJKLMNOPQRS".split("");

// Land squares (derived from non-water squares within bounds)
function isLand(col: string, row: number): boolean {
  const sq = col + row;
  return !waterSquares.has(sq);
}

// Continent/region color mapping for land squares
function getLandColor(col: string, row: number): string {
  const ci = COL_LETTERS.indexOf(col);
  // Europe
  if (ci >= 2 && ci <= 6 && row >= 0 && row <= 5) return "#8FBC8F"; // DarkSeaGreen
  // Africa
  if (ci >= 2 && ci <= 7 && row >= 4 && row <= 10) return "#D2B48C"; // Tan
  // Middle East
  if (ci >= 6 && ci <= 9 && row >= 2 && row <= 5) return "#DEB887"; // BurlyWood
  // India
  if (ci >= 9 && ci <= 13 && row >= 2 && row <= 7) return "#C4A882";
  // Southeast Asia / Indonesia
  if (ci >= 13 && ci <= 17 && row >= 4 && row <= 10) return "#A0C878";
  // China/Japan/Korea
  if (ci >= 14 && ci <= 18 && row >= 0 && row <= 5) return "#B8C8A0";
  // Australia
  if (ci >= 15 && ci <= 18 && row >= 9 && row <= 13) return "#D4A574";
  return "#C0C0A0";
}

// Home port labels
const HOME_PORTS: Record<string, string> = {};
for (const [country, data] of Object.entries(countryData)) {
  HOME_PORTS[data.home] = country;
}

// Get player colors for nice rendering
const PLAYER_COLORS: Record<string, string> = {
  red: "#E53E3E",
  purple: "#805AD5",
  yellow: "#ECC94B",
  black: "#1A202C",
  blue: "#3182CE",
  green: "#38A169",
  orange: "#DD6B20",
  gray: "#718096",
};

export default function CanvasMap() {
  const { gameData, currentPlayerId, moveToSquare } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const getSquareFromPixel = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / MAP_WIDTH;
    const x = (clientX - rect.left) / scale - PADDING;
    const y = (clientY - rect.top) / scale - PADDING;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return COL_LETTERS[col] + row;
  }, []);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const square = getSquareFromPixel(e.clientX, e.clientY);
    if (square) await moveToSquare(square);
  }, [getSquareFromPixel, moveToSquare]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const square = getSquareFromPixel(e.clientX, e.clientY);
    setHoveredSquare(square);
  }, [getSquareFromPixel]);

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_WIDTH * dpr;
    canvas.height = MAP_HEIGHT * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    ctx.scale(dpr, dpr);

    // Background - deep ocean
    const bgGrad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    bgGrad.addColorStop(0, "#1a3a5c");
    bgGrad.addColorStop(0.5, "#1e4d7a");
    bgGrad.addColorStop(1, "#1a3a5c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw cells
    for (let ci = 0; ci < COLS; ci++) {
      for (let ri = 0; ri < ROWS; ri++) {
        const col = COL_LETTERS[ci];
        const sq = col + ri;
        const x = PADDING + ci * CELL_SIZE;
        const y = PADDING + ri * CELL_SIZE;

        if (waterSquares.has(sq)) {
          // Water tile
          const waterGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
          waterGrad.addColorStop(0, "#2563EB20");
          waterGrad.addColorStop(1, "#1D4ED820");
          ctx.fillStyle = waterGrad;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

          // Subtle wave pattern
          ctx.strokeStyle = "rgba(96, 165, 250, 0.12)";
          ctx.lineWidth = 0.5;
          for (let wy = 0; wy < CELL_SIZE; wy += 8) {
            ctx.beginPath();
            ctx.moveTo(x, y + wy);
            for (let wx = 0; wx < CELL_SIZE; wx += 4) {
              ctx.lineTo(x + wx, y + wy + Math.sin((wx + ci * 10) * 0.3) * 2);
            }
            ctx.stroke();
          }

          // Harvest zone highlight
          if (harvestZones[sq]) {
            ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            // Small anchor icon indicator
            ctx.fillStyle = "rgba(34, 197, 94, 0.5)";
            ctx.font = "10px sans-serif";
            ctx.fillText("\u2693", x + 2, y + 12);
          }

          // Factory zone highlight
          if (factoryZones[sq]) {
            ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.fillStyle = "rgba(251, 191, 36, 0.6)";
            ctx.font = "10px sans-serif";
            ctx.fillText("\u2699", x + CELL_SIZE - 14, y + 12);
          }

          // Home port highlight
          if (HOME_PORTS[sq]) {
            ctx.fillStyle = "rgba(168, 85, 247, 0.2)";
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            // Port name
            ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
            ctx.font = "bold 7px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(HOME_PORTS[sq].substring(0, 4), x + CELL_SIZE / 2, y + CELL_SIZE - 4);
            ctx.textAlign = "left";
          }

          // Grid border for water
          ctx.strokeStyle = "rgba(96, 165, 250, 0.2)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        } else {
          // Land tile
          const landColor = getLandColor(col, ri);
          ctx.fillStyle = landColor;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

          // Add texture to land
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          for (let tx = 0; tx < CELL_SIZE; tx += 6) {
            for (let ty = 0; ty < CELL_SIZE; ty += 6) {
              if ((tx + ty) % 12 === 0) {
                ctx.fillRect(x + tx, y + ty, 2, 2);
              }
            }
          }

          // Land border
          ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // Coordinate label (small, subtle)
        ctx.fillStyle = waterSquares.has(sq)
          ? "rgba(148, 196, 255, 0.35)"
          : "rgba(0, 0, 0, 0.2)";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(sq, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 3);
        ctx.textAlign = "left";
      }
    }

    // Column headers
    for (let ci = 0; ci < COLS; ci++) {
      const x = PADDING + ci * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = "rgba(148, 196, 255, 0.7)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(COL_LETTERS[ci], x, PADDING - 8);
      ctx.fillText(COL_LETTERS[ci], x, MAP_HEIGHT - 8);
      ctx.textAlign = "left";
    }

    // Row headers
    for (let ri = 0; ri < ROWS; ri++) {
      const y = PADDING + ri * CELL_SIZE + CELL_SIZE / 2 + 4;
      ctx.fillStyle = "rgba(148, 196, 255, 0.7)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(ri), PADDING / 2, y);
      ctx.fillText(String(ri), MAP_WIDTH - PADDING / 2, y);
      ctx.textAlign = "left";
    }

    // Suez Canal marker
    if (gameData?.suezOwner) {
      const owner = gameData.players[gameData.suezOwner];
      if (owner) {
        const g3x = PADDING + COL_LETTERS.indexOf("G") * CELL_SIZE;
        const g3y = PADDING + 3 * CELL_SIZE;
        const g4y = PADDING + 4 * CELL_SIZE;
        ctx.strokeStyle = PLAYER_COLORS[owner.color] || owner.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(g3x + CELL_SIZE / 2, g3y + CELL_SIZE);
        ctx.lineTo(g3x + CELL_SIZE / 2, g4y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = PLAYER_COLORS[owner.color] || owner.color;
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SUEZ", g3x + CELL_SIZE / 2, g3y + CELL_SIZE + 8);
        ctx.textAlign = "left";
      }
    }

    // Dictatorships
    const dictatorships = gameData?.dictatorships || {};
    for (const [sq, ownerId] of Object.entries(dictatorships)) {
      const owner = gameData?.players[ownerId];
      if (!owner) continue;
      const ci = COL_LETTERS.indexOf(sq[0]);
      const ri = parseInt(sq.slice(1));
      const x = PADDING + ci * CELL_SIZE;
      const y = PADDING + ri * CELL_SIZE;
      const color = PLAYER_COLORS[owner.color] || owner.color;

      ctx.fillStyle = color + "30";
      ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      // Crown icon
      ctx.fillStyle = color;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\uD83D\uDC51", x + CELL_SIZE / 2, y + CELL_SIZE - 6);
      ctx.textAlign = "left";
    }

    // Hovered square highlight
    if (hoveredSquare && waterSquares.has(hoveredSquare)) {
      const ci = COL_LETTERS.indexOf(hoveredSquare[0]);
      const ri = parseInt(hoveredSquare.slice(1));
      const x = PADDING + ci * CELL_SIZE;
      const y = PADDING + ri * CELL_SIZE;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // Draw ships (players)
    const players = gameData?.players || {};
    // Group players by position for stacking
    const positionGroups: Record<string, string[]> = {};
    for (const [playerId, player] of Object.entries(players)) {
      if (!player.shipPosition) continue;
      if (!positionGroups[player.shipPosition]) positionGroups[player.shipPosition] = [];
      positionGroups[player.shipPosition].push(playerId);
    }

    for (const [position, playerIds] of Object.entries(positionGroups)) {
      const ci = COL_LETTERS.indexOf(position[0]);
      const ri = parseInt(position.slice(1));
      if (ci < 0) continue;
      const baseX = PADDING + ci * CELL_SIZE + CELL_SIZE / 2;
      const baseY = PADDING + ri * CELL_SIZE + CELL_SIZE / 2;

      playerIds.forEach((playerId, idx) => {
        const player = players[playerId];
        const offsetX = idx * 6 - (playerIds.length - 1) * 3;
        const offsetY = idx * 4 - (playerIds.length - 1) * 2;
        const px = baseX + offsetX;
        const py = baseY + offsetY;
        const color = PLAYER_COLORS[player.color] || player.color;
        const isCurrentPlayer = playerId === currentPlayerId;
        const radius = isCurrentPlayer ? 16 : 14;

        // Shadow
        ctx.beginPath();
        ctx.arc(px + 1, py + 1, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();

        // Ship circle
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        const shipGrad = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, radius);
        shipGrad.addColorStop(0, lightenColor(color, 30));
        shipGrad.addColorStop(1, color);
        ctx.fillStyle = shipGrad;
        ctx.fill();

        // Border
        ctx.strokeStyle = isCurrentPlayer ? "#FFFFFF" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isCurrentPlayer ? 2.5 : 1.5;
        ctx.stroke();

        // Current player glow
        if (isCurrentPlayer) {
          ctx.beginPath();
          ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Ship icon
        ctx.fillStyle = player.color === "yellow" ? "#1A202C" : "#FFFFFF";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u26F5", px, py - 2);

        // Initials below ship
        ctx.font = "bold 7px sans-serif";
        ctx.fillText(player.initials, px, py + 9);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      });
    }

  }, [gameData, currentPlayerId, hoveredSquare]);

  return (
    <div className="relative flex-1">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredSquare(null)}
        className="w-full h-auto max-h-[85vh] cursor-crosshair rounded-lg shadow-xl border border-white/10"
      />
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "rgba(34, 197, 94, 0.3)" }} />
          Harvest Zone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "rgba(251, 191, 36, 0.3)" }} />
          Factory
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "rgba(168, 85, 247, 0.3)" }} />
          Home Port
        </span>
        {hoveredSquare && (
          <span className="ml-auto font-mono text-primary">
            {hoveredSquare}
            {harvestZones[hoveredSquare] && ` - ${harvestZones[hoveredSquare].region}`}
            {factoryZones[hoveredSquare] && ` - Factory`}
            {HOME_PORTS[hoveredSquare] && ` - ${HOME_PORTS[hoveredSquare]} Port`}
          </span>
        )}
      </div>
    </div>
  );
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}
