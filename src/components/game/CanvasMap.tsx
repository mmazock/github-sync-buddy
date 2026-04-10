import { useCallback, useRef, useEffect, useState } from "react";
import { useGame } from "@/hooks/useGameState";
import {
  columnPixels, rowPixels, originalWidth, originalHeight,
  harvestZones, factoryZones, countryData
} from "@/lib/gameData";

const COL_LETTERS = "ABCDEFGHIJKLMNOPQRS".split("");

// Home port labels
const HOME_PORTS: Record<string, string> = {};
for (const [country, data] of Object.entries(countryData)) {
  HOME_PORTS[data.home] = country;
}

// Player colors for rendering
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

// Convert grid coordinate to pixel position on the original map image
function gridToPixel(col: string, row: number): { x: number; y: number } {
  const colObj = columnPixels.find(c => c.letter === col);
  const rowObj = rowPixels.find(r => r.row === row);
  if (!colObj || !rowObj) return { x: 0, y: 0 };
  return { x: colObj.x, y: rowObj.y };
}

// Approximate cell size from pixel positions
function getCellSize(): { w: number; h: number } {
  const colSpacing = (columnPixels[columnPixels.length - 1].x - columnPixels[0].x) / (columnPixels.length - 1);
  const rowSpacing = (rowPixels[rowPixels.length - 1].y - rowPixels[0].y) / (rowPixels.length - 1);
  return { w: colSpacing, h: rowSpacing };
}

export default function CanvasMap() {
  const { gameData, currentPlayerId, moveToSquare } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // Load the map image
  useEffect(() => {
    const img = new Image();
    img.src = "/map.png";
    img.onload = () => setMapImage(img);
  }, []);

  // Convert pixel click on canvas to grid square
  const getSquareFromPixel = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = originalWidth / rect.width;
    const scaleY = originalHeight / rect.height;
    const mapX = (clientX - rect.left) * scaleX;
    const mapY = (clientY - rect.top) * scaleY;

    // Find closest column
    let closestCol = columnPixels[0];
    let minColDist = Infinity;
    for (const cp of columnPixels) {
      const d = Math.abs(cp.x - mapX);
      if (d < minColDist) { minColDist = d; closestCol = cp; }
    }

    // Find closest row
    let closestRow = rowPixels[0];
    let minRowDist = Infinity;
    for (const rp of rowPixels) {
      const d = Math.abs(rp.y - mapY);
      if (d < minRowDist) { minRowDist = d; closestRow = rp; }
    }

    const cellSize = getCellSize();
    if (minColDist > cellSize.w * 0.7 || minRowDist > cellSize.h * 0.7) return null;
    return closestCol.letter + closestRow.row;
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
    if (!canvas || !mapImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Scale up for crisp rendering
    const scale = 4;
    const displayWidth = originalWidth * scale;
    const displayHeight = originalHeight * scale;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    ctx.scale(dpr, dpr);

    const sx = displayWidth / originalWidth;
    const sy = displayHeight / originalHeight;

    // Draw the actual Eastern Hemisphere map as background
    ctx.drawImage(mapImage, 0, 0, displayWidth, displayHeight);

    const cellSize = getCellSize();
    const cellW = cellSize.w * sx;
    const cellH = cellSize.h * sy;

    // Draw grid lines so players can see individual squares
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.8;

    // Vertical grid lines between columns
    for (let i = 0; i < columnPixels.length; i++) {
      const cx = columnPixels[i].x * sx;
      // Draw line at left and right edges of each column
      const leftEdge = cx - cellW / 2;
      const rightEdge = cx + cellW / 2;
      ctx.beginPath();
      ctx.moveTo(leftEdge, 0);
      ctx.lineTo(leftEdge, displayHeight);
      ctx.stroke();
      if (i === columnPixels.length - 1) {
        ctx.beginPath();
        ctx.moveTo(rightEdge, 0);
        ctx.lineTo(rightEdge, displayHeight);
        ctx.stroke();
      }
    }

    // Horizontal grid lines between rows
    for (let i = 0; i < rowPixels.length; i++) {
      const cy = rowPixels[i].y * sy;
      const topEdge = cy - cellH / 2;
      const bottomEdge = cy + cellH / 2;
      ctx.beginPath();
      ctx.moveTo(0, topEdge);
      ctx.lineTo(displayWidth, topEdge);
      ctx.stroke();
      if (i === rowPixels.length - 1) {
        ctx.beginPath();
        ctx.moveTo(0, bottomEdge);
        ctx.lineTo(displayWidth, bottomEdge);
        ctx.stroke();
      }
    }

    // Draw blue grid labels on canvas
    const labelColor = "rgba(20, 60, 140, 0.85)";
    ctx.fillStyle = labelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Column letters at bottom
    ctx.font = `bold ${Math.round(cellH * 0.35)}px sans-serif`;
    for (const cp of columnPixels) {
      const lx = cp.x * sx;
      const ly = (originalHeight - 3) * sy;
      ctx.fillStyle = labelColor;
      ctx.fillText(cp.letter, lx, ly);
    }

    // Row numbers on left
    ctx.font = `bold ${Math.round(cellH * 0.32)}px sans-serif`;
    for (const rp of rowPixels) {
      const lx = 3 * sx;
      const ly = rp.y * sy;
      ctx.fillStyle = labelColor;
      ctx.fillText(String(rp.row), lx, ly);
    }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Draw zone overlays
    for (const col of COL_LETTERS) {
      for (let row = 0; row <= 13; row++) {
        const sq = col + row;
        const pos = gridToPixel(col, row);
        const cx = pos.x * sx;
        const cy = pos.y * sy;
        const x = cx - cellW / 2;
        const y = cy - cellH / 2;

        // Harvest zone highlight
        if (harvestZones[sq]) {
          ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, cellH);
        }

        // Factory zone highlight (also harvestable - shown with dual color)
        if (factoryZones[sq]) {
          if (harvestZones[sq]) {
            // Dual zone: factory + harvest - use striped/combined indicator
            ctx.fillStyle = "rgba(251, 191, 36, 0.2)";
            ctx.fillRect(x, y, cellW, cellH);
            ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
            ctx.fillRect(x, y, cellW / 2, cellH);
            ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, cellW, cellH);
          } else {
            ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
            ctx.fillRect(x, y, cellW, cellH);
            ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }

        // Home port highlight
        if (HOME_PORTS[sq]) {
          ctx.fillStyle = "rgba(168, 85, 247, 0.3)";
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = "rgba(168, 85, 247, 0.7)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW, cellH);
          // Port name label
          ctx.fillStyle = "rgba(168, 85, 247, 0.95)";
          ctx.font = `bold ${Math.round(cellH * 0.28)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(HOME_PORTS[sq].substring(0, 5), cx, cy + cellH * 0.35);
          ctx.textAlign = "left";
        }

        // Hovered square highlight
        if (sq === hoveredSquare) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
      }
    }

    // Suez Canal marker
    if (gameData?.suezOwner) {
      const owner = gameData.players[gameData.suezOwner];
      if (owner) {
        const g3 = gridToPixel("G", 3);
        const g4 = gridToPixel("G", 4);
        const color = PLAYER_COLORS[owner.color] || owner.color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(g3.x * sx, g3.y * sy + cellH * 0.4);
        ctx.lineTo(g4.x * sx, g4.y * sy - cellH * 0.4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.round(cellH * 0.3)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("SUEZ", g3.x * sx, g3.y * sy + cellH * 0.55);
        ctx.textAlign = "left";
      }
    }

    // Dictatorships
    const dictatorships = gameData?.dictatorships || {};
    for (const [sq, ownerId] of Object.entries(dictatorships)) {
      const owner = gameData?.players[ownerId];
      if (!owner) continue;
      const col = sq[0];
      const ri = parseInt(sq.slice(1));
      const pos = gridToPixel(col, ri);
      const cx = pos.x * sx;
      const cy = pos.y * sy;
      const x = cx - cellW / 2;
      const y = cy - cellH / 2;
      const color = PLAYER_COLORS[owner.color] || owner.color;

      ctx.fillStyle = color + "30";
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.fillStyle = color;
      ctx.font = `${Math.round(cellH * 0.4)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("\uD83D\uDC51", cx, cy + cellH * 0.15);
      ctx.textAlign = "left";
    }

    // Draw ships (players)
    const players = gameData?.players || {};
    const positionGroups: Record<string, string[]> = {};
    for (const [playerId, player] of Object.entries(players)) {
      if (!player.shipPosition) continue;
      if (!positionGroups[player.shipPosition]) positionGroups[player.shipPosition] = [];
      positionGroups[player.shipPosition].push(playerId);
    }

    for (const [position, playerIds] of Object.entries(positionGroups)) {
      const col = position[0];
      const row = parseInt(position.slice(1));
      const pos = gridToPixel(col, row);
      if (pos.x === 0 && pos.y === 0) continue;
      const baseX = pos.x * sx;
      const baseY = pos.y * sy;
      const shipRadius = Math.min(cellW, cellH) * 0.38;

      playerIds.forEach((playerId, idx) => {
        const player = players[playerId];
        const offsetX = idx * (shipRadius * 0.5) - (playerIds.length - 1) * (shipRadius * 0.25);
        const offsetY = idx * (shipRadius * 0.3) - (playerIds.length - 1) * (shipRadius * 0.15);
        const px = baseX + offsetX;
        const py = baseY + offsetY;
        const color = PLAYER_COLORS[player.color] || player.color;
        const isCurrentPlayer = playerId === currentPlayerId;
        const radius = isCurrentPlayer ? shipRadius * 1.1 : shipRadius;

        // Shadow
        ctx.beginPath();
        ctx.arc(px + 1, py + 1, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();

        // Ship circle
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        const shipGrad = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, radius);
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
          ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Ship icon
        ctx.fillStyle = player.color === "yellow" ? "#1A202C" : "#FFFFFF";
        ctx.font = `${Math.round(radius * 1.1)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u26F5", px, py - 1);

        // Initials below ship
        ctx.font = `bold ${Math.round(radius * 0.55)}px sans-serif`;
        ctx.fillText(player.initials, px, py + radius * 0.65);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      });
    }

  }, [gameData, currentPlayerId, hoveredSquare, mapImage]);

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
