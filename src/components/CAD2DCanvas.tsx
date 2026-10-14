import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CADEntity,
  Layer,
  ToolType,
  Point2D,
  UnitType,
  LineEntity,
  RectangleEntity,
  CircleEntity,
  ArcEntity,
  FreeDrawEntity,
  DimensionEntity,
  ObjectSnapConfig,
  DimensionMentionConfig,
  DynamicSnapPoint,
  SnapType,
} from '../types/cad';
import {
  distance,
  trimEntity,
  vectorizeStroke,
  pointToLineDistance,
  lineAngle,
  angleBetweenLines,
  getAllSnapPoints,
  translateEntity,
  getEntityKeyPoints,
} from '../utils/math2d';
import {
  toMM,
  getEntityDimensionMention,
  createDimensionsForEntity,
  EntityDimensionMention,
} from '../utils/dimensionMentions';
import {
  MousePointer,
  Minus,
  Square,
  Circle as CircleIcon,
  RotateCw,
  Pencil,
  Scissors,
  Eraser,
  Ruler,
  Magnet,
  Maximize2,
  Sparkles,
  Crosshair,
  Copy,
  Check,
  X,
  ArrowUpRight,
  CornerDownRight,
  RotateCcw,
  Plus,
  Move,
} from 'lucide-react';

export interface ActiveMeasureData {
  type: 'two-points' | 'edge' | 'two-lines';
  p1: Point2D;
  p2: Point2D;
  dist: number;
  dx: number;
  dy: number;
  angleDeg: number;
  edgeEntity?: LineEntity | null;
  secondEdgeEntity?: LineEntity | null;
  angleBetween?: {
    acuteDeg: number;
    obtuseDeg: number;
    intersection: Point2D | null;
  } | null;
}

export interface DragState {
  type: 'body' | 'p1' | 'p2' | 'corner' | 'center' | 'radius';
  cornerIndex?: number;
  entityId: string;
  startPointerCAD: Point2D;
  originalEntity: CADEntity;
  currentDelta: Point2D;
  snapGuide?: {
    from: Point2D;
    to: Point2D;
    label: string;
    type: SnapType;
  } | null;
}

interface CAD2DCanvasProps {
  entities: CADEntity[];
  layers: Layer[];
  activeLayerId: string;
  activeTool: ToolType;
  units: UnitType;
  gridSnap: boolean;
  orthoMode: boolean;
  objectSnapConfig?: ObjectSnapConfig;
  dimensionMentionConfig?: DimensionMentionConfig;
  selectedEntityId?: string | null;
  onUpdateEntities: (entities: CADEntity[]) => void;
  onSelectEntity?: (entity: CADEntity | null) => void;
  onToolChange: (tool: ToolType) => void;
  onAddDimensionToDrawing?: (dims: DimensionEntity[]) => void;
}

export const CAD2DCanvas: React.FC<CAD2DCanvasProps> = ({
  entities,
  layers,
  activeLayerId,
  activeTool,
  units,
  gridSnap,
  orthoMode,
  objectSnapConfig = {
    enabled: true,
    endpoints: true,
    midpoints: true,
    intersections: true,
    centers: true,
    quadrants: true,
  },
  dimensionMentionConfig = {
    showOnSelected: true,
    showAll: false,
    forceMM: true,
    precision: 2,
  },
  selectedEntityId: controlledSelectedEntityId,
  onUpdateEntities,
  onSelectEntity,
  onToolChange,
  onAddDimensionToDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation (pan & zoom)
  const [offset, setOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1.8); // 1.8 px per CAD unit
  const [cursorCAD, setCursorCAD] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

  // Drawing state
  const [drawStart, setDrawStart] = useState<Point2D | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<Point2D[]>([]);
  const [internalSelectedEntityId, setInternalSelectedEntityId] = useState<string | null>(null);
  const selectedEntityId = controlledSelectedEntityId !== undefined ? controlledSelectedEntityId : internalSelectedEntityId;

  // Object Snapping State
  const [snapIndicator, setSnapIndicator] = useState<{ point: Point2D; type: SnapType; label: string } | null>(null);

  // Move / Drag State for Selected Entities
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [copiedDimensionText, setCopiedDimensionText] = useState(false);

  // Freehand vectorization toast
  const [vectorizeCandidate, setVectorizeCandidate] = useState<CADEntity | null>(null);

  // Measure Tool state
  const [measureData, setMeasureData] = useState<ActiveMeasureData | null>(null);
  const [hoveredLine, setHoveredLine] = useState<LineEntity | null>(null);
  const [selectedFirstLine, setSelectedFirstLine] = useState<LineEntity | null>(null);
  const [copiedMeasurement, setCopiedMeasurement] = useState<boolean>(false);

  // Center canvas on mount
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setOffset({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // Coordinate transforms
  const screenToCAD = useCallback(
    (screenX: number, screenY: number): Point2D => {
      return {
        x: (screenX - offset.x) / scale,
        y: -(screenY - offset.y) / scale, // invert Y for CAD coordinate standard (Y up)
      };
    },
    [offset, scale]
  );

  const cadToScreen = useCallback(
    (cadX: number, cadY: number): Point2D => {
      return {
        x: offset.x + cadX * scale,
        y: offset.y - cadY * scale,
      };
    },
    [offset, scale]
  );

  // Dynamic Object Snapping & Grid Snapping logic
  const calculateSnap = useCallback(
    (raw: Point2D, excludeEntityId?: string): { point: Point2D; type: SnapType; label: string | null; snapPoint: DynamicSnapPoint | null } => {
      const snapDist = 14 / scale; // within 14 pixels
      let bestPt = { ...raw };
      let snapType: SnapType = null;
      let snapLabel: string | null = null;
      let minDist = snapDist;
      let bestSnapPoint: DynamicSnapPoint | null = null;

      // 1. Dynamic Object Snaps (Endpoints, Midpoints, Intersections, Centers, Quadrants)
      if (objectSnapConfig?.enabled ?? true) {
        const snapPoints = getAllSnapPoints(entities, excludeEntityId, {
          endpoints: objectSnapConfig?.endpoints ?? true,
          midpoints: objectSnapConfig?.midpoints ?? true,
          intersections: objectSnapConfig?.intersections ?? true,
          centers: objectSnapConfig?.centers ?? true,
          quadrants: objectSnapConfig?.quadrants ?? true,
        });

        for (const sp of snapPoints) {
          const d = distance(raw, sp.point);
          // Intersections get slight priority weight for CAD precision
          const effectiveDist = sp.type === 'INTERSECTION' ? d * 0.82 : d;
          if (effectiveDist < minDist) {
            minDist = effectiveDist;
            bestPt = { ...sp.point };
            snapType = sp.type;
            snapLabel = `${sp.label} (${toMM(sp.point.x, units).toFixed(1)}, ${toMM(sp.point.y, units).toFixed(1)} mm)`;
            bestSnapPoint = sp;
          }
        }
      }

      // 2. Grid snap (fallback if no object snap point within range)
      if (!snapType && gridSnap) {
        const gridSize = 10; // 10 mm / units
        const gx = Math.round(raw.x / gridSize) * gridSize;
        const gy = Math.round(raw.y / gridSize) * gridSize;
        const d = distance(raw, { x: gx, y: gy });
        if (d < snapDist) {
          bestPt = { x: gx, y: gy };
          snapType = 'GRID';
          snapLabel = `Grid (${toMM(gx, units).toFixed(0)}, ${toMM(gy, units).toFixed(0)} mm)`;
        }
      }

      // 3. Ortho mode constraint (along horizontal or vertical axis from drawStart)
      if (orthoMode && drawStart) {
        const dx = Math.abs(bestPt.x - drawStart.x);
        const dy = Math.abs(bestPt.y - drawStart.y);
        if (dx > dy) {
          bestPt.y = drawStart.y;
        } else {
          bestPt.x = drawStart.x;
        }
      }

      return { point: bestPt, type: snapType, label: snapLabel, snapPoint: bestSnapPoint };
    },
    [gridSnap, orthoMode, drawStart, entities, scale, objectSnapConfig, units]
  );

  // Render loop for 2D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Pure black technical CAD background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 1. Draw Grid
    const gridSize = 20; // in CAD units
    const screenGrid = gridSize * scale;
    if (screenGrid > 8) {
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#181818';

      const startX = offset.x % screenGrid;
      for (let x = startX; x < rect.width; x += screenGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }

      const startY = offset.y % screenGrid;
      for (let y = startY; y < rect.height; y += screenGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }

      // Major grid (100 units)
      const majorScreenGrid = screenGrid * 5;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#282828';
      const mStartX = offset.x % majorScreenGrid;
      for (let x = mStartX; x < rect.width; x += majorScreenGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      const mStartY = offset.y % majorScreenGrid;
      for (let y = mStartY; y < rect.height; y += majorScreenGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
    }

    // 2. Draw World Origin Axes
    ctx.lineWidth = 1.2;
    // X Axis (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(offset.x, offset.y);
    ctx.lineTo(offset.x + 80, offset.y);
    ctx.stroke();

    // Y Axis (Green)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(offset.x, offset.y);
    ctx.lineTo(offset.x, offset.y - 80);
    ctx.stroke();

    // Axis Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('X', offset.x + 85, offset.y + 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y', offset.x - 4, offset.y - 85);

    // 3. Render CAD Entities by Layer
    const layerMap = new Map(layers.map(l => [l.id, l]));

    for (const ent of entities) {
      const layer = layerMap.get(ent.layerId);
      if (layer && !layer.visible) continue;

      const isSelected = ent.id === selectedEntityId;
      ctx.strokeStyle = isSelected ? '#38bdf8' : layer ? layer.color : '#e2e8f0';
      ctx.lineWidth = isSelected ? 2.5 : 1.8;

      if (layer?.lineStyle === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else if (layer?.lineStyle === 'centerline') {
        ctx.setLineDash([16, 4, 4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      if (ent.type === 'line') {
        const s1 = cadToScreen(ent.p1.x, ent.p1.y);
        const s2 = cadToScreen(ent.p2.x, ent.p2.y);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
      } else if (ent.type === 'rectangle') {
        const s1 = cadToScreen(ent.p1.x, ent.p1.y);
        const s2 = cadToScreen(ent.p2.x, ent.p2.y);
        const rx = Math.min(s1.x, s2.x);
        const ry = Math.min(s1.y, s2.y);
        const rw = Math.abs(s2.x - s1.x);
        const rh = Math.abs(s2.y - s1.y);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (ent.type === 'circle') {
        const sc = cadToScreen(ent.center.x, ent.center.y);
        const sr = ent.radius * scale;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, sr, 0, Math.PI * 2);
        ctx.stroke();

        // Draw small center mark
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(sc.x - 2, sc.y - 2, 4, 4);
      } else if (ent.type === 'arc') {
        const sc = cadToScreen(ent.center.x, ent.center.y);
        const sr = ent.radius * scale;
        ctx.beginPath();
        // Invert angles for inverted Y
        ctx.arc(sc.x, sc.y, sr, -ent.startAngle, -ent.endAngle, !ent.counterClockwise);
        ctx.stroke();
      } else if (ent.type === 'freedraw') {
        if (ent.points.length > 1) {
          ctx.beginPath();
          const first = cadToScreen(ent.points[0].x, ent.points[0].y);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < ent.points.length; i++) {
            const p = cadToScreen(ent.points[i].x, ent.points[i].y);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      } else if (ent.type === 'dimension') {
        const s1 = cadToScreen(ent.p1.x, ent.p1.y);
        const s2 = cadToScreen(ent.p2.x, ent.p2.y);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();

        // Dim text
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        const d = distance(ent.p1, ent.p2).toFixed(1);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(ent.text || `${d} ${units}`, midX + 6, midY - 6);
        ctx.restore();
      }
    }

    ctx.setLineDash([]);

    // 4. Render Live Drawing In-Progress Preview
    if (drawStart && activeTool !== 'select' && activeTool !== 'trim' && activeTool !== 'erase') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      const sStart = cadToScreen(drawStart.x, drawStart.y);
      const sCurrent = cadToScreen(cursorCAD.x, cursorCAD.y);

      if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sStart.x, sStart.y);
        ctx.lineTo(sCurrent.x, sCurrent.y);
        ctx.stroke();

        // Live Dimension readout on preview
        const len = distance(drawStart, cursorCAD).toFixed(1);
        const ang = (((Math.atan2(cursorCAD.y - drawStart.y, cursorCAD.x - drawStart.x) * 180) / Math.PI + 360) % 360).toFixed(1);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`L: ${len} ${units} | ${ang}°`, (sStart.x + sCurrent.x) / 2 + 10, (sStart.y + sCurrent.y) / 2 - 10);
      } else if (activeTool === 'rectangle') {
        const rx = Math.min(sStart.x, sCurrent.x);
        const ry = Math.min(sStart.y, sCurrent.y);
        const rw = Math.abs(sCurrent.x - sStart.x);
        const rh = Math.abs(sCurrent.y - sStart.y);
        ctx.strokeRect(rx, ry, rw, rh);

        const w = Math.abs(cursorCAD.x - drawStart.x).toFixed(1);
        const h = Math.abs(cursorCAD.y - drawStart.y).toFixed(1);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${w} × ${h} ${units}`, rx + rw / 2 - 20, ry + rh / 2);
      } else if (activeTool === 'circle') {
        const r = distance(drawStart, cursorCAD);
        ctx.beginPath();
        ctx.arc(sStart.x, sStart.y, r * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '11px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`R: ${r.toFixed(1)} ${units} (Ø ${(r * 2).toFixed(1)})`, sStart.x + 10, sStart.y - 10);
      } else if (activeTool === 'arc') {
        const r = distance(drawStart, cursorCAD);
        ctx.beginPath();
        ctx.arc(sStart.x, sStart.y, r * scale, 0, Math.PI);
        ctx.stroke();
      } else if (activeTool === 'dimension') {
        ctx.beginPath();
        ctx.moveTo(sStart.x, sStart.y);
        ctx.lineTo(sCurrent.x, sCurrent.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // 5. Render Active Freehand Stroke
    if (activeTool === 'freedraw' && freehandPoints.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const first = cadToScreen(freehandPoints[0].x, freehandPoints[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < freehandPoints.length; i++) {
        const p = cadToScreen(freehandPoints[i].x, freehandPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 6. Render Moving Snap Guide (when dragging an object or handle)
    if (dragState?.snapGuide) {
      const gFrom = cadToScreen(dragState.snapGuide.from.x, dragState.snapGuide.from.y);
      const gTo = cadToScreen(dragState.snapGuide.to.x, dragState.snapGuide.to.y);

      ctx.save();
      // Glowing alignment snap line
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(gFrom.x, gFrom.y);
      ctx.lineTo(gTo.x, gTo.y);
      ctx.stroke();

      // Snap lock target point
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(gTo.x, gTo.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Guide label badge
      ctx.font = 'bold 10px monospace';
      const gw = ctx.measureText(dragState.snapGuide.label).width + 14;
      ctx.fillStyle = '#083344';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.fillRect(gTo.x + 8, gTo.y - 18, gw, 18);
      ctx.strokeRect(gTo.x + 8, gTo.y - 18, gw, 18);
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(dragState.snapGuide.label, gTo.x + 15, gTo.y - 5);
      ctx.restore();
    }

    // 7. Render Dynamic Object Snap Glyphs (Endpoints, Midpoints, Intersections, Centers)
    if (snapIndicator) {
      const sPt = cadToScreen(snapIndicator.point.x, snapIndicator.point.y);
      ctx.save();

      const type = snapIndicator.type;
      if (type === 'ENDPOINT') {
        // Green square box
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(sPt.x - 5, sPt.y - 5, 10, 10);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sPt.x - 1.5, sPt.y - 1.5, 3, 3);
      } else if (type === 'MIDPOINT') {
        // Cyan equilateral triangle
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sPt.x, sPt.y - 6);
        ctx.lineTo(sPt.x + 6, sPt.y + 5);
        ctx.lineTo(sPt.x - 6, sPt.y + 5);
        ctx.closePath();
        ctx.stroke();
      } else if (type === 'INTERSECTION') {
        // Amber 'X' cross
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sPt.x - 6, sPt.y - 6);
        ctx.lineTo(sPt.x + 6, sPt.y + 6);
        ctx.moveTo(sPt.x + 6, sPt.y - 6);
        ctx.lineTo(sPt.x - 6, sPt.y + 6);
        ctx.stroke();
      } else if (type === 'CENTER') {
        // Emerald circle with crosshair (+)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(sPt.x, sPt.y, 5.5, 0, Math.PI * 2);
        ctx.moveTo(sPt.x - 7, sPt.y);
        ctx.lineTo(sPt.x + 7, sPt.y);
        ctx.moveTo(sPt.x, sPt.y - 7);
        ctx.lineTo(sPt.x, sPt.y + 7);
        ctx.stroke();
      } else if (type === 'QUADRANT') {
        // Violet diamond
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sPt.x, sPt.y - 6);
        ctx.lineTo(sPt.x + 6, sPt.y);
        ctx.lineTo(sPt.x, sPt.y + 6);
        ctx.lineTo(sPt.x - 6, sPt.y);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Yellow grid snap dot
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sPt.x, sPt.y, 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // CAD Snap Tooltip Tag
      ctx.font = '10px monospace';
      const textW = ctx.measureText(snapIndicator.label).width;
      const tagW = textW + 14;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.strokeStyle = type === 'INTERSECTION' ? '#f59e0b' : type === 'MIDPOINT' ? '#06b6d4' : type === 'ENDPOINT' ? '#22c55e' : '#a855f7';
      ctx.lineWidth = 1;
      ctx.fillRect(sPt.x + 9, sPt.y - 18, tagW, 16);
      ctx.strokeRect(sPt.x + 9, sPt.y - 18, tagW, 16);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(snapIndicator.label, sPt.x + 16, sPt.y - 6);
      ctx.restore();
    }

    // 8. Render Dynamic Dimension Mentions (mm) on 2D Canvas
    if (dimensionMentionConfig.showAll) {
      // Show dimension badge on every entity
      for (const ent of entities) {
        if (ent.id === selectedEntityId) continue; // Will be rendered with full details below
        const mention = getEntityDimensionMention(ent, units, dimensionMentionConfig.precision);
        const sBadge = cadToScreen(mention.badgePosition.x, mention.badgePosition.y);
        ctx.save();
        ctx.font = '9px monospace';
        const bw = ctx.measureText(mention.primaryLabel).width + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1;
        ctx.fillRect(sBadge.x - bw / 2, sBadge.y - 8, bw, 16);
        ctx.strokeRect(sBadge.x - bw / 2, sBadge.y - 8, bw, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(mention.primaryLabel, sBadge.x - bw / 2 + 5, sBadge.y + 4);
        ctx.restore();
      }
    }

    // Selected Entity Dimension Mention (mm) Callout & Handles
    const selectedEnt = entities.find(e => e.id === selectedEntityId);
    if (selectedEnt) {
      const mention = getEntityDimensionMention(selectedEnt, units, dimensionMentionConfig.precision);

      // A. Draw Selection Grip Handles (Endpoints, Corners, Center)
      ctx.save();
      const keyPoints = getEntityKeyPoints(selectedEnt);
      for (const kp of keyPoints) {
        const skp = cadToScreen(kp.point.x, kp.point.y);
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(skp.x - 3.5, skp.y - 3.5, 7, 7);
        ctx.strokeRect(skp.x - 3.5, skp.y - 3.5, 7, 7);
      }
      ctx.restore();

      // B. Draw Dimension Mention Callout Witness lines in mm
      if (dimensionMentionConfig.showOnSelected !== false) {
        ctx.save();
        if (selectedEnt.type === 'line') {
          const s1 = cadToScreen(selectedEnt.p1.x, selectedEnt.p1.y);
          const s2 = cadToScreen(selectedEnt.p2.x, selectedEnt.p2.y);
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const len = Math.hypot(dx, dy);

          if (len > 10) {
            // Normal perpendicular vector offset by 22 px
            const nx = -dy / len;
            const ny = dx / len;
            const offsetDist = 20;

            const w1x = s1.x + nx * offsetDist;
            const w1y = s1.y + ny * offsetDist;
            const w2x = s2.x + nx * offsetDist;
            const w2y = s2.y + ny * offsetDist;

            // Witness extension lines
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(w1x + nx * 4, w1y + ny * 4);
            ctx.moveTo(s2.x, s2.y);
            ctx.lineTo(w2x + nx * 4, w2y + ny * 4);
            ctx.stroke();

            // Dimension line
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(w1x, w1y);
            ctx.lineTo(w2x, w2y);
            ctx.stroke();

            // Arrowheads at ends
            const arrowAngle = Math.atan2(dy, dx);
            const drawArrow = (x: number, y: number, angle: number) => {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x - 7 * Math.cos(angle - 0.35), y - 7 * Math.sin(angle - 0.35));
              ctx.lineTo(x - 7 * Math.cos(angle + 0.35), y - 7 * Math.sin(angle + 0.35));
              ctx.closePath();
              ctx.fillStyle = '#22d3ee';
              ctx.fill();
            };
            drawArrow(w1x, w1y, arrowAngle + Math.PI);
            drawArrow(w2x, w2y, arrowAngle);

            // Mention badge in mm
            const midX = (w1x + w2x) / 2;
            const midY = (w1y + w2y) / 2;
            ctx.font = 'bold 11px monospace';
            const text = `${mention.primaryLabel}`;
            const tw = ctx.measureText(text).width + 16;

            ctx.fillStyle = '#082f49';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.fillRect(midX - tw / 2, midY - 10, tw, 20);
            ctx.strokeRect(midX - tw / 2, midY - 10, tw, 20);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(text, midX - tw / 2 + 8, midY + 4);
          }
        } else if (selectedEnt.type === 'circle') {
          const sc = cadToScreen(selectedEnt.center.x, selectedEnt.center.y);
          const sr = selectedEnt.radius * scale;

          // Diameter witness line across circle at 45 deg
          const cos45 = Math.cos(Math.PI / 4);
          const sin45 = Math.sin(Math.PI / 4);
          const p1x = sc.x - cos45 * sr;
          const p1y = sc.y + sin45 * sr;
          const p2x = sc.x + cos45 * sr;
          const p2y = sc.y - sin45 * sr;

          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();

          // Badge at center
          ctx.font = 'bold 11px monospace';
          const text = mention.primaryLabel;
          const tw = ctx.measureText(text).width + 16;
          ctx.fillStyle = '#082f49';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.fillRect(sc.x - tw / 2, sc.y - 10, tw, 20);
          ctx.strokeRect(sc.x - tw / 2, sc.y - 10, tw, 20);
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(text, sc.x - tw / 2 + 8, sc.y + 4);
        } else if (selectedEnt.type === 'rectangle') {
          const s1 = cadToScreen(selectedEnt.p1.x, selectedEnt.p1.y);
          const s2 = cadToScreen(selectedEnt.p2.x, selectedEnt.p2.y);
          const minX = Math.min(s1.x, s2.x);
          const maxX = Math.max(s1.x, s2.x);
          const minY = Math.min(s1.y, s2.y);
          const maxY = Math.max(s1.y, s2.y);

          // Top width dimension
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(minX, minY - 14);
          ctx.lineTo(maxX, minY - 14);
          ctx.stroke();

          // Right height dimension
          ctx.beginPath();
          ctx.moveTo(maxX + 14, minY);
          ctx.lineTo(maxX + 14, maxY);
          ctx.stroke();

          // Mention Badge at center
          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;
          ctx.font = 'bold 11px monospace';
          const text = mention.primaryLabel;
          const tw = ctx.measureText(text).width + 16;
          ctx.fillStyle = '#082f49';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.fillRect(midX - tw / 2, midY - 10, tw, 20);
          ctx.strokeRect(midX - tw / 2, midY - 10, tw, 20);
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(text, midX - tw / 2 + 8, midY + 4);
        }
        ctx.restore();
      }
    }

    // 7. Render Measurement Graphics (when measure tool is active)
    if (activeTool === 'measure') {
      // Highlight hovered candidate edge with glowing cyan
      if (hoveredLine) {
        const hs1 = cadToScreen(hoveredLine.p1.x, hoveredLine.p1.y);
        const hs2 = cadToScreen(hoveredLine.p2.x, hoveredLine.p2.y);
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hs1.x, hs1.y);
        ctx.lineTo(hs2.x, hs2.y);
        ctx.stroke();

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hs1.x, hs1.y);
        ctx.lineTo(hs2.x, hs2.y);
        ctx.stroke();

        // Edge length tooltip tag
        const hMidX = (hs1.x + hs2.x) / 2;
        const hMidY = (hs1.y + hs2.y) / 2;
        const hLen = distance(hoveredLine.p1, hoveredLine.p2).toFixed(2);
        ctx.font = '10px monospace';
        const textMetrics = ctx.measureText(`${hLen} ${units}`);
        const tagW = textMetrics.width + 14;
        ctx.fillStyle = '#083344';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.fillRect(hMidX - tagW / 2, hMidY - 22, tagW, 16);
        ctx.strokeRect(hMidX - tagW / 2, hMidY - 22, tagW, 16);
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`${hLen} ${units}`, hMidX - tagW / 2 + 7, hMidY - 10);
        ctx.restore();
      }

      // Highlight selected first line if waiting for second line
      if (selectedFirstLine) {
        const s1 = cadToScreen(selectedFirstLine.p1.x, selectedFirstLine.p1.y);
        const s2 = cadToScreen(selectedFirstLine.p2.x, selectedFirstLine.p2.y);
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();

        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.fillText('Line 1 (Selected)', midX + 8, midY - 8);
        ctx.restore();
      }

      // Draw active measurement visualization
      if (measureData && measureData.dist > 0.01) {
        const s1 = cadToScreen(measureData.p1.x, measureData.p1.y);
        const s2 = cadToScreen(measureData.p2.x, measureData.p2.y);

        ctx.save();

        // If measuring between two lines, also draw angle arc and rays
        if (
          measureData.type === 'two-lines' &&
          measureData.edgeEntity &&
          measureData.secondEdgeEntity &&
          measureData.angleBetween
        ) {
          const l1s1 = cadToScreen(measureData.edgeEntity.p1.x, measureData.edgeEntity.p1.y);
          const l1s2 = cadToScreen(measureData.edgeEntity.p2.x, measureData.edgeEntity.p2.y);
          const l2s1 = cadToScreen(measureData.secondEdgeEntity.p1.x, measureData.secondEdgeEntity.p1.y);
          const l2s2 = cadToScreen(measureData.secondEdgeEntity.p2.x, measureData.secondEdgeEntity.p2.y);

          // Highlight both lines
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(l1s1.x, l1s1.y);
          ctx.lineTo(l1s2.x, l1s2.y);
          ctx.stroke();

          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(l2s1.x, l2s1.y);
          ctx.lineTo(l2s2.x, l2s2.y);
          ctx.stroke();

          // Angle arc at intersection if available
          if (measureData.angleBetween.intersection) {
            const isectScreen = cadToScreen(
              measureData.angleBetween.intersection.x,
              measureData.angleBetween.intersection.y
            );

            // Draw intersection marker
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(isectScreen.x, isectScreen.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Angles of lines in screen space
            const a1 = Math.atan2(l1s2.y - isectScreen.y, l1s2.x - isectScreen.x);
            const a2 = Math.atan2(l2s2.y - isectScreen.y, l2s2.x - isectScreen.x);

            // Draw angle arc
            const arcR = Math.min(45, scale * 25);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.arc(isectScreen.x, isectScreen.y, arcR, a1, a2, false);
            ctx.stroke();
            ctx.setLineDash([]);

            // Angle badge at arc midpoint
            const midAngle = (a1 + a2) / 2;
            const badgeX = isectScreen.x + Math.cos(midAngle) * (arcR + 18);
            const badgeY = isectScreen.y + Math.sin(midAngle) * (arcR + 18);
            const angText = `∠ ${measureData.angleBetween.acuteDeg.toFixed(1)}°`;
            ctx.font = 'bold 11px monospace';
            const aw = ctx.measureText(angText).width + 12;
            ctx.fillStyle = '#1e1b4b';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1;
            ctx.fillRect(badgeX - aw / 2, badgeY - 9, aw, 18);
            ctx.strokeRect(badgeX - aw / 2, badgeY - 9, aw, 18);
            ctx.fillStyle = '#c084fc';
            ctx.fillText(angText, badgeX - aw / 2 + 6, badgeY + 4);
          }
        } else {
          // Standard two-point / single-edge measurement graphics

          // 1. Right-angled Delta Triangle (ΔX & ΔY)
          const cornerScreen = { x: s2.x, y: s1.y };

          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.2;

          // Horizontal ΔX (cyan)
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(cornerScreen.x, cornerScreen.y);
          ctx.stroke();

          // Vertical ΔY (emerald)
          ctx.strokeStyle = '#34d399';
          ctx.beginPath();
          ctx.moveTo(cornerScreen.x, cornerScreen.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();

          // Little right-angle indicator square at corner
          const sqSize = 8;
          const sx = Math.sign(s1.x - cornerScreen.x) * sqSize;
          const sy = Math.sign(s2.y - cornerScreen.y) * sqSize;
          if (Math.abs(s1.x - s2.x) > 16 && Math.abs(s1.y - s2.y) > 16) {
            ctx.setLineDash([]);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(cornerScreen.x + sx, cornerScreen.y);
            ctx.lineTo(cornerScreen.x + sx, cornerScreen.y + sy);
            ctx.lineTo(cornerScreen.x, cornerScreen.y + sy);
            ctx.stroke();
          }

          // Delta labels
          ctx.font = '10px monospace';
          if (Math.abs(measureData.dx) > 0.1) {
            const dxText = `ΔX: ${measureData.dx > 0 ? '+' : ''}${measureData.dx.toFixed(1)}`;
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(dxText, (s1.x + cornerScreen.x) / 2 - 18, cornerScreen.y + (s2.y < s1.y ? 14 : -6));
          }
          if (Math.abs(measureData.dy) > 0.1) {
            const dyText = `ΔY: ${measureData.dy > 0 ? '+' : ''}${measureData.dy.toFixed(1)}`;
            ctx.fillStyle = '#34d399';
            ctx.fillText(dyText, cornerScreen.x + (s2.x > s1.x ? 6 : -52), (cornerScreen.y + s2.y) / 2 + 3);
          }

          // 2. Direct Caliper Line (Cyan)
          ctx.setLineDash([]);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();

          // Witness extension ticks perpendicular to line at s1 and s2
          const tickLen = 8;
          const lineHypot = Math.hypot(s2.x - s1.x, s2.y - s1.y) || 1;
          const nx = -(s2.y - s1.y) / lineHypot;
          const ny = (s2.x - s1.x) / lineHypot;

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#22d3ee';
          ctx.beginPath();
          ctx.moveTo(s1.x - nx * tickLen, s1.y - ny * tickLen);
          ctx.lineTo(s1.x + nx * tickLen, s1.y + ny * tickLen);
          ctx.moveTo(s2.x - nx * tickLen, s2.y - ny * tickLen);
          ctx.lineTo(s2.x + nx * tickLen, s2.y + ny * tickLen);
          ctx.stroke();

          // End points circles
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(s1.x, s1.y, 3.5, 0, Math.PI * 2);
          ctx.arc(s2.x, s2.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // 3. Central Length & Angle Badge
          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;
          const badgeStr = `${measureData.dist.toFixed(2)} ${units} | ${measureData.angleDeg.toFixed(1)}°`;

          ctx.font = 'bold 11px monospace';
          const bw = ctx.measureText(badgeStr).width + 16;
          ctx.fillStyle = 'rgba(8, 51, 68, 0.9)';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.2;
          ctx.fillRect(midX - bw / 2, midY - 11, bw, 22);
          ctx.strokeRect(midX - bw / 2, midY - 11, bw, 22);

          ctx.fillStyle = '#e0f2fe';
          ctx.fillText(badgeStr, midX - bw / 2 + 8, midY + 4);
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    entities,
    layers,
    selectedEntityId,
    offset,
    scale,
    cursorCAD,
    drawStart,
    activeTool,
    freehandPoints,
    snapIndicator,
    units,
    cadToScreen,
    measureData,
    hoveredLine,
    selectedFirstLine,
  ]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Pan with middle mouse button or Space key
    if (e.button === 1 || e.buttons === 4 || e.altKey || (e.button === 0 && e.shiftKey && activeTool === 'select')) {
      setIsPanning(true);
      setPanStart({ x: screenX - offset.x, y: screenY - offset.y });
      return;
    }

    if (e.button !== 0) return; // Only process left click for drawing

    const rawCAD = screenToCAD(screenX, screenY);
    const { point: snappedCAD } = calculateSnap(rawCAD);

    // 1. Select Tool (Click entity or grip handles to move/transform with dynamic snapping)
    if (activeTool === 'select') {
      // A. Check if clicking on resize handles of the currently selected entity
      const selEnt = entities.find(e => e.id === selectedEntityId);
      if (selEnt) {
        if (selEnt.type === 'line') {
          if (distance(rawCAD, selEnt.p1) < 10 / scale) {
            setDragState({
              type: 'p1',
              entityId: selEnt.id,
              startPointerCAD: rawCAD,
              originalEntity: selEnt,
              currentDelta: { x: 0, y: 0 },
            });
            return;
          }
          if (distance(rawCAD, selEnt.p2) < 10 / scale) {
            setDragState({
              type: 'p2',
              entityId: selEnt.id,
              startPointerCAD: rawCAD,
              originalEntity: selEnt,
              currentDelta: { x: 0, y: 0 },
            });
            return;
          }
        } else if (selEnt.type === 'circle') {
          if (distance(rawCAD, selEnt.center) < 10 / scale) {
            setDragState({
              type: 'center',
              entityId: selEnt.id,
              startPointerCAD: rawCAD,
              originalEntity: selEnt,
              currentDelta: { x: 0, y: 0 },
            });
            return;
          }
          const rimPt = { x: selEnt.center.x + selEnt.radius, y: selEnt.center.y };
          if (distance(rawCAD, rimPt) < 10 / scale) {
            setDragState({
              type: 'radius',
              entityId: selEnt.id,
              startPointerCAD: rawCAD,
              originalEntity: selEnt,
              currentDelta: { x: 0, y: 0 },
            });
            return;
          }
        }
      }

      // B. Body Hit Test
      let hit: CADEntity | null = null;
      for (const ent of entities) {
        if (ent.type === 'line') {
          const { dist } = pointToLineDistance(rawCAD, ent.p1, ent.p2);
          if (dist < 8 / scale) {
            hit = ent;
            break;
          }
        } else if (ent.type === 'circle') {
          const d = Math.abs(distance(rawCAD, ent.center) - ent.radius);
          if (d < 8 / scale) {
            hit = ent;
            break;
          }
        } else if (ent.type === 'rectangle') {
          const minX = Math.min(ent.p1.x, ent.p2.x);
          const maxX = Math.max(ent.p1.x, ent.p2.x);
          const minY = Math.min(ent.p1.y, ent.p2.y);
          const maxY = Math.max(ent.p1.y, ent.p2.y);
          if (rawCAD.x >= minX - 4 / scale && rawCAD.x <= maxX + 4 / scale && rawCAD.y >= minY - 4 / scale && rawCAD.y <= maxY + 4 / scale) {
            hit = ent;
            break;
          }
        } else if (ent.type === 'arc') {
          const d = Math.abs(distance(rawCAD, ent.center) - ent.radius);
          if (d < 8 / scale) {
            hit = ent;
            break;
          }
        }
      }

      if (hit) {
        setInternalSelectedEntityId(hit.id);
        if (onSelectEntity) onSelectEntity(hit);
        setDragState({
          type: 'body',
          entityId: hit.id,
          startPointerCAD: rawCAD,
          originalEntity: hit,
          currentDelta: { x: 0, y: 0 },
        });
      } else {
        setInternalSelectedEntityId(null);
        if (onSelectEntity) onSelectEntity(null);
        setDragState(null);
      }
      return;
    }

    // 2. Erase Tool
    if (activeTool === 'erase') {
      const remaining = entities.filter(ent => {
        if (ent.type === 'line') {
          const { dist } = pointToLineDistance(rawCAD, ent.p1, ent.p2);
          return dist >= 10 / scale;
        } else if (ent.type === 'circle') {
          const d = Math.abs(distance(rawCAD, ent.center) - ent.radius);
          return d >= 10 / scale;
        }
        return true;
      });
      if (remaining.length !== entities.length) {
        onUpdateEntities(remaining);
      }
      return;
    }

    // 3. Trim Tool
    if (activeTool === 'trim') {
      for (const ent of entities) {
        if (ent.type === 'line') {
          const { dist } = pointToLineDistance(rawCAD, ent.p1, ent.p2);
          if (dist < 8 / scale) {
            const res = trimEntity(ent, rawCAD, entities);
            if (res) {
              const updated = entities.filter(e => e.id !== res.removeId).concat(res.newEntities);
              onUpdateEntities(updated);
            }
            break;
          }
        }
      }
      return;
    }

    // 4. Free Draw Tool
    if (activeTool === 'freedraw') {
      setFreehandPoints([snappedCAD]);
      return;
    }

    // 5. Measure Tool (Click two points or click edges to measure distance and angles)
    if (activeTool === 'measure') {
      // Check if user clicked an edge / line entity
      let clickedLine: LineEntity | null = null;
      let minLineDist = 14 / scale;
      for (const ent of entities) {
        if (ent.type === 'line') {
          const { dist } = pointToLineDistance(rawCAD, ent.p1, ent.p2);
          if (dist < minLineDist) {
            minLineDist = dist;
            clickedLine = ent;
          }
        }
      }

      if (clickedLine) {
        if (!selectedFirstLine) {
          // Select Edge 1
          setSelectedFirstLine(clickedLine);
          setDrawStart(null);
          const p1 = clickedLine.p1;
          const p2 = clickedLine.p2;
          const d = distance(p1, p2);
          setMeasureData({
            type: 'edge',
            p1,
            p2,
            dist: d,
            dx: p2.x - p1.x,
            dy: p2.y - p1.y,
            angleDeg: lineAngle(p1, p2),
            edgeEntity: clickedLine,
            secondEdgeEntity: null,
            angleBetween: null,
          });
          return;
        } else if (selectedFirstLine.id !== clickedLine.id) {
          // Select Edge 2 -> calculate angle between lines!
          const ab = angleBetweenLines(selectedFirstLine, clickedLine);
          setMeasureData({
            type: 'two-lines',
            p1: selectedFirstLine.p1,
            p2: selectedFirstLine.p2,
            dist: distance(selectedFirstLine.p1, selectedFirstLine.p2),
            dx: selectedFirstLine.p2.x - selectedFirstLine.p1.x,
            dy: selectedFirstLine.p2.y - selectedFirstLine.p1.y,
            angleDeg: lineAngle(selectedFirstLine.p1, selectedFirstLine.p2),
            edgeEntity: selectedFirstLine,
            secondEdgeEntity: clickedLine,
            angleBetween: ab,
          });
          setSelectedFirstLine(null);
          return;
        } else {
          // Clicked same edge again: deselect
          setSelectedFirstLine(null);
          return;
        }
      }

      // Point-to-point measurement
      if (!drawStart) {
        setDrawStart(snappedCAD);
        setSelectedFirstLine(null);
        setMeasureData({
          type: 'two-points',
          p1: snappedCAD,
          p2: snappedCAD,
          dist: 0,
          dx: 0,
          dy: 0,
          angleDeg: 0,
          edgeEntity: null,
          secondEdgeEntity: null,
          angleBetween: null,
        });
      } else {
        const d = distance(drawStart, snappedCAD);
        setMeasureData({
          type: 'two-points',
          p1: drawStart,
          p2: snappedCAD,
          dist: d,
          dx: snappedCAD.x - drawStart.x,
          dy: snappedCAD.y - drawStart.y,
          angleDeg: lineAngle(drawStart, snappedCAD),
          edgeEntity: null,
          secondEdgeEntity: null,
          angleBetween: null,
        });
        setDrawStart(null);
      }
      return;
    }

    // 6. Parametric Drawing Tools (Line, Rect, Circle, Arc, Dimension)
    if (!drawStart) {
      setDrawStart(snappedCAD);
    } else {
      // Complete shape
      const newEntities = [...entities];
      const genId = 'ent_' + Math.random().toString(36).substring(2, 9);

      if (activeTool === 'line') {
        const lineEnt: LineEntity = {
          id: genId,
          layerId: activeLayerId,
          type: 'line',
          p1: drawStart,
          p2: snappedCAD,
        };
        newEntities.push(lineEnt);
        // Continue chain if desired, or finish
        setDrawStart(snappedCAD);
      } else if (activeTool === 'rectangle') {
        const rectEnt: RectangleEntity = {
          id: genId,
          layerId: activeLayerId,
          type: 'rectangle',
          p1: drawStart,
          p2: snappedCAD,
        };
        newEntities.push(rectEnt);
        setDrawStart(null);
      } else if (activeTool === 'circle') {
        const r = distance(drawStart, snappedCAD);
        if (r > 0.5) {
          const circEnt: CircleEntity = {
            id: genId,
            layerId: activeLayerId,
            type: 'circle',
            center: drawStart,
            radius: Math.round(r * 10) / 10,
          };
          newEntities.push(circEnt);
        }
        setDrawStart(null);
      } else if (activeTool === 'arc') {
        const r = distance(drawStart, snappedCAD);
        const arcEnt: ArcEntity = {
          id: genId,
          layerId: activeLayerId,
          type: 'arc',
          center: drawStart,
          radius: r,
          startAngle: 0,
          endAngle: Math.PI,
        };
        newEntities.push(arcEnt);
        setDrawStart(null);
      } else if (activeTool === 'dimension') {
        const dimEnt: DimensionEntity = {
          id: genId,
          layerId: activeLayerId,
          type: 'dimension',
          p1: drawStart,
          p2: snappedCAD,
          offset: 15,
        };
        newEntities.push(dimEnt);
        setDrawStart(null);
      }

      onUpdateEntities(newEntities);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning) {
      setOffset({
        x: screenX - panStart.x,
        y: screenY - panStart.y,
      });
      return;
    }

    const rawCAD = screenToCAD(screenX, screenY);

    // Entity dragging & moving with Dynamic Object Snapping
    if (dragState) {
      if (dragState.type === 'body') {
        const rawDx = rawCAD.x - dragState.startPointerCAD.x;
        const rawDy = rawCAD.y - dragState.startPointerCAD.y;

        // Dynamic Snapping when moving:
        // Check if any key point of the moving entity aligns with any snap point of other entities!
        const keyPoints = getEntityKeyPoints(dragState.originalEntity);
        const otherSnapPoints = getAllSnapPoints(entities, dragState.entityId, objectSnapConfig);

        let bestAdjustedDx = rawDx;
        let bestAdjustedDy = rawDy;
        let minKeySnapDist = 14 / scale;
        let activeGuide: { from: Point2D; to: Point2D; label: string; type: SnapType } | null = null;

        for (const kp of keyPoints) {
          const curKp = { x: kp.point.x + rawDx, y: kp.point.y + rawDy };
          for (const sp of otherSnapPoints) {
            const d = distance(curKp, sp.point);
            if (d < minKeySnapDist) {
              minKeySnapDist = d;
              bestAdjustedDx = rawDx + (sp.point.x - curKp.x);
              bestAdjustedDy = rawDy + (sp.point.y - curKp.y);
              activeGuide = {
                from: curKp,
                to: sp.point,
                label: `Snapped ${kp.label} to ${sp.label}`,
                type: sp.type,
              };
            }
          }
        }

        if (!activeGuide && gridSnap) {
          const gridSize = 10;
          bestAdjustedDx = Math.round(bestAdjustedDx / gridSize) * gridSize;
          bestAdjustedDy = Math.round(bestAdjustedDy / gridSize) * gridSize;
        }

        const moved = translateEntity(dragState.originalEntity, bestAdjustedDx, bestAdjustedDy);
        const updated = entities.map(e => (e.id === dragState.entityId ? moved : e));
        onUpdateEntities(updated);
        setDragState(prev =>
          prev
            ? {
                ...prev,
                currentDelta: { x: bestAdjustedDx, y: bestAdjustedDy },
                snapGuide: activeGuide,
              }
            : null
        );
        return;
      } else if (dragState.type === 'p1' || dragState.type === 'p2') {
        const snap = calculateSnap(rawCAD, dragState.entityId);
        const pt = snap.point;
        const lineEnt = dragState.originalEntity as LineEntity;
        const updatedLine: LineEntity = {
          ...lineEnt,
          p1: dragState.type === 'p1' ? pt : lineEnt.p1,
          p2: dragState.type === 'p2' ? pt : lineEnt.p2,
        };
        const updated = entities.map(e => (e.id === dragState.entityId ? updatedLine : e));
        onUpdateEntities(updated);
        if (snap.type) {
          setSnapIndicator({ point: snap.point, type: snap.type, label: snap.label || snap.type });
        }
        return;
      } else if (dragState.type === 'center') {
        const snap = calculateSnap(rawCAD, dragState.entityId);
        const circEnt = dragState.originalEntity as CircleEntity;
        const updatedCirc: CircleEntity = {
          ...circEnt,
          center: snap.point,
        };
        const updated = entities.map(e => (e.id === dragState.entityId ? updatedCirc : e));
        onUpdateEntities(updated);
        return;
      } else if (dragState.type === 'radius') {
        const circEnt = dragState.originalEntity as CircleEntity;
        const r = Math.max(1, distance(circEnt.center, rawCAD));
        const updatedCirc: CircleEntity = {
          ...circEnt,
          radius: Math.round(r * 10) / 10,
        };
        const updated = entities.map(e => (e.id === dragState.entityId ? updatedCirc : e));
        onUpdateEntities(updated);
        return;
      }
    }

    const snap = calculateSnap(rawCAD);
    const activeCAD = snap.point;

    setCursorCAD(activeCAD);
    if (snap.type) {
      setSnapIndicator({ point: snap.point, type: snap.type, label: snap.label || snap.type });
    } else {
      setSnapIndicator(null);
    }

    if (activeTool === 'freedraw' && freehandPoints.length > 0) {
      setFreehandPoints(prev => [...prev, activeCAD]);
    }

    // Edge detection & live measurement preview for Measure tool
    if (activeTool === 'measure') {
      let candidateLine: LineEntity | null = null;
      let closestDist = 14 / scale;

      for (const ent of entities) {
        if (ent.type === 'line') {
          const { dist } = pointToLineDistance(rawCAD, ent.p1, ent.p2);
          if (dist < closestDist) {
            closestDist = dist;
            candidateLine = ent;
          }
        }
      }
      setHoveredLine(candidateLine);

      if (drawStart) {
        const d = distance(drawStart, activeCAD);
        const dx = activeCAD.x - drawStart.x;
        const dy = activeCAD.y - drawStart.y;
        const ang = lineAngle(drawStart, activeCAD);
        setMeasureData({
          type: 'two-points',
          p1: drawStart,
          p2: activeCAD,
          dist: d,
          dx,
          dy,
          angleDeg: ang,
          edgeEntity: null,
          secondEdgeEntity: null,
          angleBetween: null,
        });
      }
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragState) {
      setDragState(null);
      return;
    }

    if (activeTool === 'freedraw' && freehandPoints.length > 1) {
      const freeEnt: FreeDrawEntity = {
        id: 'free_' + Math.random().toString(36).substring(2, 9),
        layerId: activeLayerId,
        type: 'freedraw',
        points: freehandPoints,
      };
      onUpdateEntities([...entities, freeEnt]);
      setVectorizeCandidate(freeEnt);
      setFreehandPoints([]);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.2, Math.min(25, scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on mouse
    setOffset({
      x: mouseX - (mouseX - offset.x) * (newScale / scale),
      y: mouseY - (mouseY - offset.y) * (newScale / scale),
    });
    setScale(newScale);
  };

  // Convert freehand stroke to clean vector geometry
  const handleConvertFreehand = (ent: CADEntity) => {
    if (ent.type !== 'freedraw') return;
    const vectorized = vectorizeStroke(ent.points, ent.layerId, 5);
    const updated = entities.filter(e => e.id !== ent.id).concat(vectorized);
    onUpdateEntities(updated);
    setVectorizeCandidate(null);
  };

  // Reset View / Zoom Extents
  const handleZoomExtents = () => {
    if (entities.length === 0) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setOffset({ x: rect.width / 2, y: rect.height / 2 });
        setScale(1.8);
      }
      return;
    }
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of entities) {
      if (ent.type === 'line' || ent.type === 'rectangle' || ent.type === 'dimension') {
        minX = Math.min(minX, ent.p1.x, ent.p2.x);
        minY = Math.min(minY, ent.p1.y, ent.p2.y);
        maxX = Math.max(maxX, ent.p1.x, ent.p2.x);
        maxY = Math.max(maxY, ent.p1.y, ent.p2.y);
      } else if (ent.type === 'circle') {
        minX = Math.min(minX, ent.center.x - ent.radius);
        minY = Math.min(minY, ent.center.y - ent.radius);
        maxX = Math.max(maxX, ent.center.x + ent.radius);
        maxY = Math.max(maxY, ent.center.y + ent.radius);
      }
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);
    const scaleX = (rect.width * 0.75) / w;
    const scaleY = (rect.height * 0.75) / h;
    const fitScale = Math.min(scaleX, scaleY, 5);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    setScale(fitScale);
    setOffset({
      x: rect.width / 2 - midX * fitScale,
      y: rect.height / 2 + midY * fitScale,
    });
  };

  // Measure tool actions
  const handleSaveMeasurementAsDimension = () => {
    if (!measureData || measureData.dist < 0.01) return;
    const dimEnt: DimensionEntity = {
      id: 'dim_' + Math.random().toString(36).substring(2, 9),
      layerId: activeLayerId,
      type: 'dimension',
      p1: measureData.p1,
      p2: measureData.p2,
      text: `${measureData.dist.toFixed(1)} ${units}`,
      offset: 18,
    };
    onUpdateEntities([...entities, dimEnt]);
  };

  const handleCopyMeasurement = () => {
    if (!measureData) return;
    let text = '';
    if (measureData.type === 'two-lines' && measureData.angleBetween) {
      const acute = measureData.angleBetween.acuteDeg.toFixed(2);
      const obtuse = measureData.angleBetween.obtuseDeg.toFixed(2);
      const l1 = measureData.edgeEntity ? distance(measureData.edgeEntity.p1, measureData.edgeEntity.p2).toFixed(2) : '0';
      const l2 = measureData.secondEdgeEntity ? distance(measureData.secondEdgeEntity.p1, measureData.secondEdgeEntity.p2).toFixed(2) : '0';
      text = `[VeloCAD Measurement]\nAngle Between Lines: ${acute}° (Acute) / ${obtuse}° (Obtuse)\nEdge 1 Length: ${l1} ${units}\nEdge 2 Length: ${l2} ${units}`;
    } else {
      text = `[VeloCAD Measurement]\nDistance: ${measureData.dist.toFixed(2)} ${units}\nΔX: ${measureData.dx.toFixed(2)} ${units}\nΔY: ${measureData.dy.toFixed(2)} ${units}\nAngle: ${measureData.angleDeg.toFixed(1)}°`;
    }
    navigator.clipboard.writeText(text);
    setCopiedMeasurement(true);
    setTimeout(() => setCopiedMeasurement(false), 2000);
  };

  const handleClearMeasurement = () => {
    setMeasureData(null);
    setDrawStart(null);
    setSelectedFirstLine(null);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-black">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Floating Precision Measurement HUD Card */}
      {activeTool === 'measure' && (
        <div className="absolute top-4 right-4 z-20 w-84 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <Crosshair className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  Measure Inspector
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950/80 text-cyan-300 rounded border border-cyan-800/80 uppercase">
                    {measureData?.type === 'two-lines'
                      ? 'Angle'
                      : measureData?.type === 'edge'
                      ? 'Edge'
                      : '2-Point'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClearMeasurement}
              title="Clear Measurement (Esc)"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3.5 space-y-3 text-xs">
            {/* Guide hint when empty */}
            {!measureData || measureData.dist < 0.01 ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-slate-400">
                <p className="text-[11px] font-medium text-cyan-300">
                  {selectedFirstLine
                    ? '✓ Line 1 selected. Click a 2nd line for angular calculation, or click a point.'
                    : 'Click any two points on canvas or click edges to display real-time distances & angles.'}
                </p>
                <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 pt-1">
                  <span>• Hover line: reveals edge length</span>
                  <span>• Click 2 lines: computes angle between them</span>
                  <span>• Click 2 points: shows distance, ΔX, ΔY & angle</span>
                </div>
              </div>
            ) : measureData.type === 'two-lines' && measureData.angleBetween ? (
              /* Display Line-to-Line Angle */
              <div className="space-y-2.5">
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                    Angle Between Lines
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {measureData.angleBetween.acuteDeg.toFixed(2)}°
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Obtuse: {measureData.angleBetween.obtuseDeg.toFixed(2)}°
                    </span>
                  </div>

                  {/* Geometric relation pill */}
                  {Math.abs(measureData.angleBetween.acuteDeg - 90) < 0.2 ? (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-[10px] font-semibold text-emerald-300">
                      ✓ Exactly Perpendicular (90°)
                    </div>
                  ) : Math.abs(measureData.angleBetween.acuteDeg) < 0.2 ? (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/80 text-[10px] font-semibold text-blue-300">
                      ✓ Exactly Parallel (0°)
                    </div>
                  ) : null}
                </div>

                {/* Individual Line lengths */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase">Edge 1 Length</div>
                    <div className="font-semibold text-cyan-300 mt-0.5">
                      {measureData.edgeEntity
                        ? distance(measureData.edgeEntity.p1, measureData.edgeEntity.p2).toFixed(2)
                        : '0.00'}{' '}
                      {units}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase">Edge 2 Length</div>
                    <div className="font-semibold text-purple-300 mt-0.5">
                      {measureData.secondEdgeEntity
                        ? distance(
                            measureData.secondEdgeEntity.p1,
                            measureData.secondEdgeEntity.p2
                          ).toFixed(2)
                        : '0.00'}{' '}
                      {units}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Display Distance & Delta Measurements */
              <div className="space-y-2.5">
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                    {measureData.type === 'edge' ? 'Edge Length' : 'Measured Distance'}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {measureData.dist.toFixed(2)}{' '}
                      <span className="text-sm font-normal text-cyan-300">{units}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ∠ {measureData.angleDeg.toFixed(1)}°
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center">
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase">ΔX (Horizontal)</div>
                    <div className="font-semibold text-sky-400 mt-0.5">
                      {measureData.dx >= 0 ? '+' : ''}
                      {measureData.dx.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase">ΔY (Vertical)</div>
                    <div className="font-semibold text-emerald-400 mt-0.5">
                      {measureData.dy >= 0 ? '+' : ''}
                      {measureData.dy.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    <div className="text-[9px] text-slate-500 uppercase">Angle</div>
                    <div className="font-semibold text-amber-400 mt-0.5">
                      {measureData.angleDeg.toFixed(1)}°
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {measureData && measureData.dist > 0.01 && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={handleSaveMeasurementAsDimension}
                  className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Save as Dimension
                </button>
                <button
                  onClick={handleCopyMeasurement}
                  className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition border border-slate-700"
                >
                  {copiedMeasurement ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {copiedMeasurement ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-Vectorize Banner for Freehand Sketching */}
      {vectorizeCandidate && (
        <div className="absolute top-4 left-20 z-20 flex items-center gap-3 px-4 py-2 bg-amber-500/15 border border-amber-500/40 rounded-xl backdrop-blur-md shadow-xl text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-medium">Freehand stroke recorded. Convert to geometric vector paths?</span>
          <button
            onClick={() => handleConvertFreehand(vectorizeCandidate)}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition shadow"
          >
            Vectorize Now
          </button>
          <button
            onClick={() => setVectorizeCandidate(null)}
            className="text-xs text-amber-400/70 hover:text-amber-200"
          >
            Keep Raw
          </button>
        </div>
      )}

      {/* Dynamic Dimension Mention HUD when entity is selected */}
      {selectedEntityId && entities.some(e => e.id === selectedEntityId) && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 p-3 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-xl shadow-2xl text-xs max-w-xs animate-in fade-in duration-100">
          {(() => {
            const ent = entities.find(e => e.id === selectedEntityId)!;
            const mention = getEntityDimensionMention(ent, units, dimensionMentionConfig.precision);
            return (
              <>
                <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-white">{mention.entityType}</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {mention.primaryLabel}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] font-mono text-neutral-300 py-1">
                  {mention.details.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-neutral-500">{d.label}:</span>
                      <span className="text-neutral-200">{d.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-850">
                  <button
                    onClick={() => {
                      const newDims = createDimensionsForEntity(ent, units, activeLayerId);
                      if (newDims.length > 0) {
                        onUpdateEntities([...entities, ...newDims]);
                        if (onAddDimensionToDrawing) onAddDimensionToDrawing(newDims);
                      }
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Insert permanent CAD dimension witness line to drawing"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Dim (mm)</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mention.primaryLabel);
                      setCopiedDimensionText(true);
                      setTimeout(() => setCopiedDimensionText(false), 2000);
                    }}
                    className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
                    title="Copy dimension value to clipboard"
                  >
                    {copiedDimensionText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setInternalSelectedEntityId(null);
                      if (onSelectEntity) onSelectEntity(null);
                    }}
                    className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
                    title="Deselect"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Real-time Status Overlay: Coordinates & Units */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 px-3 py-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-lg text-xs font-mono text-slate-300 pointer-events-none shadow">
        <span className="text-sky-400 font-semibold">X: {cursorCAD.x.toFixed(1)} {units}</span>
        <span className="text-emerald-400 font-semibold">Y: {cursorCAD.y.toFixed(1)} {units}</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Scale: {(scale * 10).toFixed(0)}%</span>
        {activeTool === 'measure' && measureData && measureData.dist > 0.01 && (
          <>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400 font-semibold">
              Measure: {measureData.dist.toFixed(2)} {units}
            </span>
          </>
        )}
        {drawStart && activeTool !== 'measure' && (
          <>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400">
              Dist: {distance(drawStart, cursorCAD).toFixed(1)} {units}
            </span>
          </>
        )}
      </div>

      {/* Helper Quick Hints */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 backdrop-blur border border-slate-800 rounded-lg text-[11px] text-slate-400">
        {activeTool === 'measure' ? (
          <>
            <span className="text-cyan-400">Click 2 points: Distance</span>
            <span>•</span>
            <span className="text-cyan-400">Click 2 edges: Angle</span>
            <span>•</span>
            <span>Esc: Clear</span>
          </>
        ) : (
          <>
            <span>Middle-Drag: Pan</span>
            <span>•</span>
            <span>Wheel: Zoom</span>
            <span>•</span>
            <span>Shift: Ortho</span>
            <span>•</span>
            <span>M: Measure</span>
          </>
        )}
      </div>
    </div>
  );
};
