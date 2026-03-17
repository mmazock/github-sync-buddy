import { useCallback, useRef, useEffect, useState } from "react";
import { useGame } from "@/hooks/useGameState";
import { columnPixels, rowPixels, originalWidth, originalHeight, waterSquares } from "@/lib/gameData";

export default function GameMap() {
  const { gameData, currentPlayerId, moveToSquare } = useGame();
  const mapRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleResize = () => forceUpdate(n => n + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getScaledPosition = useCallback((coord: string) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const col = coord[0];
    const row = parseInt(coord.slice(1));
    const colObj = columnPixels.find(c => c.letter === col);
    const rowObj = rowPixels.find(r => r.row === row);
    if (!colObj || !rowObj) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    return {
      x: rect.width * (colObj.x / originalWidth),
      y: rect.height * (rowObj.y / originalHeight)
    };
  }, [mapLoaded]);

  const handleMapClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!mapRef.current || !gameData) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;

    const colObj = columnPixels.reduce((a, b) =>
      Math.abs(b.x / originalWidth - xPercent) < Math.abs(a.x / originalWidth - xPercent) ? b : a
    );
    const rowObj = rowPixels.reduce((a, b) =>
      Math.abs(b.y / originalHeight - yPercent) < Math.abs(a.y / originalHeight - yPercent) ? b : a
    );
    const target = colObj.letter + rowObj.row;
    await moveToSquare(target);
  }, [gameData, moveToSquare]);

  const players = gameData?.players || {};
  const dictatorships = gameData?.dictatorships || {};

  return (
    <div ref={containerRef} className="relative flex-1">
      <img
        ref={mapRef}
        src="/map.png"
        alt="International Trade Map"
        className="w-full h-auto max-h-[85vh] block cursor-crosshair"
        onClick={handleMapClick}
        onLoad={() => { setMapLoaded(true); forceUpdate(n => n + 1); }}
      />

      {/* Ships */}
      {mapLoaded && Object.entries(players).map(([playerId, player]) => {
        if (!player.shipPosition) return null;
        const pos = getScaledPosition(player.shipPosition);
        const rect = mapRef.current?.getBoundingClientRect();
        const scale = rect ? Math.min(rect.width / originalWidth, 1.8) : 1;
        const size = 18 * scale;
        const iconSize = 14 * scale;
        const fontSize = 7 * scale;

        return (
          <div
            key={playerId}
            className="absolute pointer-events-none select-none"
            style={{ left: pos.x, top: pos.y, width: size, height: size, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="rounded-full flex flex-col items-center justify-center"
              style={{ width: size, height: size, backgroundColor: player.color }}
            >
              <img src="/ship.png" alt="" style={{ width: iconSize }} />
              <div style={{ fontSize, fontWeight: "bold", color: player.color === "yellow" ? "black" : "white" }}>
                {player.initials}
              </div>
            </div>
          </div>
        );
      })}

      {/* Dictatorships */}
      {mapLoaded && Object.entries(dictatorships).map(([square, ownerId]) => {
        const owner = players[ownerId];
        if (!owner) return null;
        const pos = getScaledPosition(square);
        return (
          <div
            key={`dict-${square}`}
            className="absolute pointer-events-none"
            style={{
              left: pos.x, top: pos.y, width: 30, height: 30,
              backgroundColor: owner.color, opacity: 0.3,
              transform: "translate(-50%, -50%)"
            }}
          />
        );
      })}

      {/* Suez line */}
      {mapLoaded && gameData?.suezOwner && players[gameData.suezOwner] && (() => {
        const g3 = getScaledPosition("G3");
        const g4 = getScaledPosition("G4");
        const owner = players[gameData.suezOwner];
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: g3.x, top: g3.y, width: 4,
              height: Math.abs(g4.y - g3.y),
              backgroundColor: owner.color,
              transform: "translate(-50%, 0)"
            }}
          />
        );
      })()}
    </div>
  );
}
