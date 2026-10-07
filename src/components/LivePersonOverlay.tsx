import { useRef, type RefObject } from "react";

export type OverlayPlacement = { x: number; y: number; rotation: number; flipped: boolean };

export function LivePersonOverlay({ imageRef, src, name, scale, placement, onMove }: {
  imageRef: RefObject<HTMLImageElement | null>;
  src: string;
  name: string;
  scale: number;
  placement: OverlayPlacement;
  onMove: (x: number, y: number) => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  return (
    <img
      ref={imageRef}
      src={src}
      crossOrigin="anonymous"
      alt={`${name} live overlay`}
      role="img"
      tabIndex={0}
      aria-label={`${name} live overlay, movable`}
      draggable={false}
      className="absolute z-10 max-w-none cursor-move touch-none select-none object-contain focus-visible:outline-2 focus-visible:outline-primary"
      style={{ height: `${scale}%`, left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scaleX(${placement.flipped ? -1 : 1})` }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: placement.x, y: placement.y, startX: event.clientX, startY: event.clientY };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        const frame = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!start || start.id !== event.pointerId || !frame) return;
        onMove(Math.max(0.05, Math.min(0.95, start.x + (event.clientX - start.startX) / frame.width)), Math.max(0.1, Math.min(0.95, start.y + (event.clientY - start.startY) / frame.height)));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={(event) => {
        const offsets: Record<string, [number, number]> = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] };
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        onMove(Math.max(0.05, Math.min(0.95, placement.x + offset[0])), Math.max(0.1, Math.min(0.95, placement.y + offset[1])));
      }}
    />
  );
}