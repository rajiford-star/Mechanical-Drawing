import React, { useRef, useState, useEffect } from 'react';
import { RotateCw, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Compass, Home } from 'lucide-react';

interface OrbitalKnobProps {
  onRotate: (deltaX: number, deltaY: number) => void;
  onReset: () => void;
  onStepRotate: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

export const OrbitalKnob: React.FC<OrbitalKnobProps> = ({
  onRotate,
  onReset,
  onStepRotate,
}) => {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 });

  const maxRadius = 34; // max distance from center

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    setLastPointer({ x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();

    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;

    // Send continuous rotation delta to 3D camera
    onRotate(dx, dy);
    setLastPointer({ x: e.clientX, y: e.clientY });

    // Update physical knob displacement within track
    const newX = Math.max(-maxRadius, Math.min(maxRadius, knobPos.x + dx * 0.8));
    const newY = Math.max(-maxRadius, Math.min(maxRadius, knobPos.y + dy * 0.8));
    setKnobPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    // Smooth spring back to center
    setKnobPos({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 bg-black/90 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl select-none text-neutral-300">
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
          <Compass className="w-3 h-3 text-cyan-400" /> 3D Orbital Knob
        </span>
        <button
          onClick={onReset}
          title="Reset Camera to Isometric View"
          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
        >
          <Home className="w-3 h-3" />
        </button>
      </div>

      {/* Circular Gimbal Track & Knob */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Outer Orbital Bezel */}
        <div className="absolute inset-0 rounded-full border border-neutral-700/80 bg-neutral-950/80 flex items-center justify-center shadow-inner">
          {/* Tick marks on 12, 3, 6, 9 o'clock */}
          <div className="absolute top-1 w-1 h-2 bg-neutral-600 rounded-full" />
          <div className="absolute bottom-1 w-1 h-2 bg-neutral-600 rounded-full" />
          <div className="absolute left-1 w-2 h-1 bg-neutral-600 rounded-full" />
          <div className="absolute right-1 w-2 h-1 bg-neutral-600 rounded-full" />
        </div>

        {/* Step Buttons (Up, Down, Left, Right) */}
        <button
          type="button"
          onClick={() => onStepRotate('up')}
          title="Tilt Up"
          className="absolute top-0.5 z-10 p-1 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800/80 rounded-full transition"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onStepRotate('down')}
          title="Tilt Down"
          className="absolute bottom-0.5 z-10 p-1 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800/80 rounded-full transition"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onStepRotate('left')}
          title="Orbit Left"
          className="absolute left-0.5 z-10 p-1 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800/80 rounded-full transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onStepRotate('right')}
          title="Orbit Right"
          className="absolute right-0.5 z-10 p-1 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800/80 rounded-full transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Center Draggable Knob Handle */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`relative z-20 w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center border transition-shadow duration-75 shadow-lg ${
            isDragging
              ? 'bg-cyan-600 border-cyan-400 shadow-cyan-500/50 scale-105'
              : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 hover:border-neutral-500'
          }`}
        >
          <div className="w-5 h-5 rounded-full border border-neutral-500/40 bg-neutral-900/60 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-cyan-300' : 'bg-neutral-400'}`} />
          </div>
        </div>
      </div>

      <div className="text-[9px] font-mono text-neutral-500 text-center">
        Drag knob to orbit model
      </div>
    </div>
  );
};
