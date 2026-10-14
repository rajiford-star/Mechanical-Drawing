import {
  Point2D,
  CADEntity,
  LineEntity,
  CircleEntity,
  ArcEntity,
  RectangleEntity,
  FreeDrawEntity,
  DynamicSnapPoint,
} from '../types/cad';

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointToLineDistance(p: Point2D, a: Point2D, b: Point2D): { dist: number; proj: Point2D; t: number } {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return { dist: distance(p, a), proj: a, t: 0 };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return { dist: distance(p, proj), proj, t };
}

// Line-Line segment intersection
export function lineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

  if (t >= -1e-5 && t <= 1 + 1e-5 && u >= -1e-5 && u <= 1 + 1e-5) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }
  return null;
}

// Line segment to circle intersection points
export function lineCircleIntersections(p1: Point2D, p2: Point2D, center: Point2D, radius: number): Point2D[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return [];

  const t = ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lenSq;
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  const distSq = (center.x - projX) ** 2 + (center.y - projY) ** 2;

  if (distSq > radius * radius + 1e-6) return [];

  const halfChord = Math.sqrt(Math.max(0, radius * radius - distSq));
  const dt = halfChord / Math.sqrt(lenSq);

  const t1 = t - dt;
  const t2 = t + dt;
  const results: Point2D[] = [];

  if (t1 >= -1e-4 && t1 <= 1 + 1e-4) {
    results.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
  }
  if (t2 >= -1e-4 && t2 <= 1 + 1e-4 && Math.abs(t2 - t1) > 1e-4) {
    results.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
  }

  return results;
}

// Circle to circle intersection points
export function circleCircleIntersections(c1: Point2D, r1: number, c2: Point2D, r2: number): Point2D[] {
  const d = distance(c1, c2);
  if (d < 1e-6 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

  const p2x = c1.x + (a * (c2.x - c1.x)) / d;
  const p2y = c1.y + (a * (c2.y - c1.y)) / d;

  if (h < 1e-5) {
    return [{ x: p2x, y: p2y }];
  }

  return [
    { x: p2x + (h * (c2.y - c1.y)) / d, y: p2y - (h * (c2.x - c1.x)) / d },
    { x: p2x - (h * (c2.y - c1.y)) / d, y: p2y + (h * (c2.x - c1.x)) / d },
  ];
}

// Intersection of infinite lines
export function unboundedLineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

// Angle of line from p1 to p2 in degrees [0, 360)
export function lineAngle(p1: Point2D, p2: Point2D): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// Angle between two 2D line segments in degrees
export function angleBetweenLines(
  line1: { p1: Point2D; p2: Point2D },
  line2: { p1: Point2D; p2: Point2D }
): { acuteDeg: number; obtuseDeg: number; intersection: Point2D | null } {
  const v1 = { x: line1.p2.x - line1.p1.x, y: line1.p2.y - line1.p1.y };
  const v2 = { x: line2.p2.x - line2.p1.x, y: line2.p2.y - line2.p1.y };

  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 < 1e-9 || mag2 < 1e-9) {
    return { acuteDeg: 0, obtuseDeg: 0, intersection: null };
  }

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  let deg = (Math.acos(cosTheta) * 180) / Math.PI;

  const acuteDeg = deg > 90 ? 180 - deg : deg;
  const obtuseDeg = 180 - acuteDeg;

  const intersection = unboundedLineIntersection(line1.p1, line1.p2, line2.p1, line2.p2);

  return { acuteDeg, obtuseDeg, intersection };
}

// Douglas-Peucker algorithm for vector simplification
export function douglasPeucker(points: Point2D[], tolerance: number): Point2D[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const { dist } = pointToLineDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const rec1 = douglasPeucker(points.slice(0, index + 1), tolerance);
    const rec2 = douglasPeucker(points.slice(index), tolerance);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [start, end];
  }
}

// Freehand stroke to vector primitives (Lines + Arcs)
export function vectorizeStroke(
  points: Point2D[],
  layerId: string,
  tolerance = 4
): CADEntity[] {
  if (points.length < 2) return [];

  const simplified = douglasPeucker(points, tolerance);
  const entities: CADEntity[] = [];

  // Check if closed loop
  const isClosed = distance(simplified[0], simplified[simplified.length - 1]) < tolerance * 3 && simplified.length > 3;
  const pts = isClosed ? [...simplified.slice(0, -1), simplified[0]] : simplified;

  // Check if looks like a circle
  if (isClosed && pts.length >= 6) {
    // calculate centroid and average radius
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      cx += pts[i].x;
      cy += pts[i].y;
    }
    cx /= (pts.length - 1);
    cy /= (pts.length - 1);
    const center = { x: cx, y: cy };

    const radii = pts.slice(0, -1).map(p => distance(p, center));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((sum, r) => sum + Math.abs(r - avgRadius), 0) / radii.length;

    // If radius deviation is small (<18%), treat as true circle
    if (variance / avgRadius < 0.18) {
      return [{
        id: 'circle_' + Math.random().toString(36).substring(2, 9),
        layerId,
        type: 'circle',
        center,
        radius: Math.round(avgRadius * 10) / 10,
      }];
    }
  }

  // Otherwise generate connected line segments
  for (let i = 0; i < pts.length - 1; i++) {
    entities.push({
      id: 'line_' + Math.random().toString(36).substring(2, 9),
      layerId,
      type: 'line',
      p1: { x: Math.round(pts[i].x * 10) / 10, y: Math.round(pts[i].y * 10) / 10 },
      p2: { x: Math.round(pts[i + 1].x * 10) / 10, y: Math.round(pts[i + 1].y * 10) / 10 },
    });
  }

  return entities;
}

// Convert entity into discrete line segments
export function entityToSegments(entity: CADEntity): Array<{ p1: Point2D; p2: Point2D }> {
  switch (entity.type) {
    case 'line':
      return [{ p1: entity.p1, p2: entity.p2 }];
    case 'rectangle': {
      const { p1, p2 } = entity;
      const r1 = { x: p1.x, y: p1.y };
      const r2 = { x: p2.x, y: p1.y };
      const r3 = { x: p2.x, y: p2.y };
      const r4 = { x: p1.x, y: p2.y };
      return [
        { p1: r1, p2: r2 },
        { p1: r2, p2: r3 },
        { p1: r3, p2: r4 },
        { p1: r4, p2: r1 },
      ];
    }
    case 'freedraw': {
      const segs: Array<{ p1: Point2D; p2: Point2D }> = [];
      for (let i = 0; i < entity.points.length - 1; i++) {
        segs.push({ p1: entity.points[i], p2: entity.points[i + 1] });
      }
      return segs;
    }
    case 'circle': {
      // Approximate circle with 32 segments
      const segs: Array<{ p1: Point2D; p2: Point2D }> = [];
      const steps = 32;
      for (let i = 0; i < steps; i++) {
        const a1 = (i / steps) * Math.PI * 2;
        const a2 = ((i + 1) / steps) * Math.PI * 2;
        segs.push({
          p1: { x: entity.center.x + Math.cos(a1) * entity.radius, y: entity.center.y + Math.sin(a1) * entity.radius },
          p2: { x: entity.center.x + Math.cos(a2) * entity.radius, y: entity.center.y + Math.sin(a2) * entity.radius },
        });
      }
      return segs;
    }
    case 'arc': {
      const segs: Array<{ p1: Point2D; p2: Point2D }> = [];
      const steps = 16;
      let diff = entity.endAngle - entity.startAngle;
      if (entity.counterClockwise && diff > 0) diff -= Math.PI * 2;
      if (!entity.counterClockwise && diff < 0) diff += Math.PI * 2;

      for (let i = 0; i < steps; i++) {
        const a1 = entity.startAngle + (i / steps) * diff;
        const a2 = entity.startAngle + ((i + 1) / steps) * diff;
        segs.push({
          p1: { x: entity.center.x + Math.cos(a1) * entity.radius, y: entity.center.y + Math.sin(a1) * entity.radius },
          p2: { x: entity.center.x + Math.cos(a2) * entity.radius, y: entity.center.y + Math.sin(a2) * entity.radius },
        });
      }
      return segs;
    }
    default:
      return [];
  }
}

// Find all intersection points of an entity against all other entities
export function findIntersections(target: CADEntity, allEntities: CADEntity[]): Point2D[] {
  const targetSegs = entityToSegments(target);
  const hits: Point2D[] = [];

  for (const other of allEntities) {
    if (other.id === target.id) continue;
    const otherSegs = entityToSegments(other);

    for (const s1 of targetSegs) {
      for (const s2 of otherSegs) {
        const pt = lineIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
        if (pt) {
          // Avoid duplicate points
          if (!hits.some(h => distance(h, pt) < 0.1)) {
            hits.push(pt);
          }
        }
      }
    }
  }

  return hits;
}

// Smart Trim: splits target line at intersections, removes the clicked portion
export function trimEntity(
  target: CADEntity,
  clickPoint: Point2D,
  allEntities: CADEntity[]
): { newEntities: CADEntity[]; removeId: string } | null {
  if (target.type !== 'line') {
    // For circles or other elements, simple remove or circle split
    return { newEntities: [], removeId: target.id };
  }

  const intersections = findIntersections(target, allEntities);
  if (intersections.length === 0) {
    // If no intersections, trim removes the entire line
    return { newEntities: [], removeId: target.id };
  }

  // Project intersections onto line parameter t in [0, 1]
  const l2 = (target.p2.x - target.p1.x) ** 2 + (target.p2.y - target.p1.y) ** 2;
  const tValues: { t: number; pt: Point2D }[] = [
    { t: 0, pt: target.p1 },
    { t: 1, pt: target.p2 },
  ];

  for (const ipt of intersections) {
    const t = ((ipt.x - target.p1.x) * (target.p2.x - target.p1.x) + (ipt.y - target.p1.y) * (target.p2.y - target.p1.y)) / l2;
    if (t > 0.001 && t < 0.999) {
      tValues.push({ t, pt: ipt });
    }
  }

  tValues.sort((a, b) => a.t - b.t);

  // Find which segment contains the click point
  const clickT = ((clickPoint.x - target.p1.x) * (target.p2.x - target.p1.x) + (clickPoint.y - target.p1.y) * (target.p2.y - target.p1.y)) / l2;

  let clickedIndex = -1;
  for (let i = 0; i < tValues.length - 1; i++) {
    if (clickT >= tValues[i].t - 0.02 && clickT <= tValues[i + 1].t + 0.02) {
      clickedIndex = i;
      break;
    }
  }

  if (clickedIndex === -1) {
    // Fallback: closest midpoint
    let minDist = Infinity;
    for (let i = 0; i < tValues.length - 1; i++) {
      const mid = {
        x: (tValues[i].pt.x + tValues[i + 1].pt.x) / 2,
        y: (tValues[i].pt.y + tValues[i + 1].pt.y) / 2,
      };
      const d = distance(clickPoint, mid);
      if (d < minDist) {
        minDist = d;
        clickedIndex = i;
      }
    }
  }

  const remaining: CADEntity[] = [];
  for (let i = 0; i < tValues.length - 1; i++) {
    if (i !== clickedIndex) {
      remaining.push({
        id: 'line_' + Math.random().toString(36).substring(2, 9),
        layerId: target.layerId,
        type: 'line',
        p1: tValues[i].pt,
        p2: tValues[i + 1].pt,
      });
    }
  }

  return {
    newEntities: remaining,
    removeId: target.id,
  };
}

// Extract 2D loops/contours for 3D extrusion/revolve
export interface Contour2D {
  points: Point2D[];
  isClosed: boolean;
  isHole?: boolean;
}

export function extractContours(entities: CADEntity[]): Contour2D[] {
  const contours: Contour2D[] = [];

  // Standalone shapes first
  for (const ent of entities) {
    if (ent.type === 'circle') {
      const pts: Point2D[] = [];
      const segs = 48;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push({
          x: ent.center.x + Math.cos(a) * ent.radius,
          y: ent.center.y + Math.sin(a) * ent.radius,
        });
      }
      contours.push({ points: pts, isClosed: true });
    } else if (ent.type === 'rectangle') {
      contours.push({
        points: [
          { x: ent.p1.x, y: ent.p1.y },
          { x: ent.p2.x, y: ent.p1.y },
          { x: ent.p2.x, y: ent.p2.y },
          { x: ent.p1.x, y: ent.p2.y },
        ],
        isClosed: true,
      });
    }
  }

  // Connect lines into chains
  const lines: LineEntity[] = entities.filter(e => e.type === 'line') as LineEntity[];
  const unused = new Set(lines.map(l => l.id));

  while (unused.size > 0) {
    const startLineId = unused.values().next().value;
    if (!startLineId) break;
    unused.delete(startLineId);
    const startLine = lines.find(l => l.id === startLineId)!;

    const chain: Point2D[] = [startLine.p1, startLine.p2];
    let extended = true;

    while (extended) {
      extended = false;
      const tail = chain[chain.length - 1];
      const head = chain[0];

      // Check if closed
      if (chain.length > 2 && distance(tail, head) < 1.0) {
        break;
      }

      for (const id of Array.from(unused)) {
        const candidate = lines.find(l => l.id === id)!;
        if (distance(tail, candidate.p1) < 1.0) {
          chain.push(candidate.p2);
          unused.delete(id);
          extended = true;
          break;
        } else if (distance(tail, candidate.p2) < 1.0) {
          chain.push(candidate.p1);
          unused.delete(id);
          extended = true;
          break;
        } else if (distance(head, candidate.p2) < 1.0) {
          chain.unshift(candidate.p1);
          unused.delete(id);
          extended = true;
          break;
        } else if (distance(head, candidate.p1) < 1.0) {
          chain.unshift(candidate.p2);
          unused.delete(id);
          extended = true;
          break;
        }
      }
    }

    const isClosed = chain.length > 2 && distance(chain[0], chain[chain.length - 1]) < 2.0;
    contours.push({
      points: chain,
      isClosed,
    });
  }

  return contours;
}

/**
 * Extracts all dynamic snapping points (Endpoints, Midpoints, Intersections, Centers, Quadrants)
 * from all active entities on the 2D canvas.
 */
export function getAllSnapPoints(
  entities: CADEntity[],
  excludeEntityId?: string,
  config?: {
    endpoints?: boolean;
    midpoints?: boolean;
    intersections?: boolean;
    centers?: boolean;
    quadrants?: boolean;
  }
): DynamicSnapPoint[] {
  const cfg = {
    endpoints: config?.endpoints ?? true,
    midpoints: config?.midpoints ?? true,
    intersections: config?.intersections ?? true,
    centers: config?.centers ?? true,
    quadrants: config?.quadrants ?? true,
  };

  const activeEntities = excludeEntityId
    ? entities.filter(e => e.id !== excludeEntityId)
    : entities;

  const snapPoints: DynamicSnapPoint[] = [];

  // 1. Endpoints, Midpoints, Centers, Quadrants for each entity
  for (const ent of activeEntities) {
    if (ent.type === 'line') {
      if (cfg.endpoints) {
        snapPoints.push({
          point: ent.p1,
          type: 'ENDPOINT',
          label: 'Endpoint',
          sourceEntityId: ent.id,
        });
        snapPoints.push({
          point: ent.p2,
          type: 'ENDPOINT',
          label: 'Endpoint',
          sourceEntityId: ent.id,
        });
      }
      if (cfg.midpoints) {
        snapPoints.push({
          point: { x: (ent.p1.x + ent.p2.x) / 2, y: (ent.p1.y + ent.p2.y) / 2 },
          type: 'MIDPOINT',
          label: 'Midpoint',
          sourceEntityId: ent.id,
        });
      }
    } else if (ent.type === 'rectangle') {
      const minX = Math.min(ent.p1.x, ent.p2.x);
      const maxX = Math.max(ent.p1.x, ent.p2.x);
      const minY = Math.min(ent.p1.y, ent.p2.y);
      const maxY = Math.max(ent.p1.y, ent.p2.y);

      if (cfg.endpoints) {
        snapPoints.push({ point: { x: minX, y: minY }, type: 'ENDPOINT', label: 'Corner', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: maxX, y: minY }, type: 'ENDPOINT', label: 'Corner', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: maxX, y: maxY }, type: 'ENDPOINT', label: 'Corner', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: minX, y: maxY }, type: 'ENDPOINT', label: 'Corner', sourceEntityId: ent.id });
      }

      if (cfg.midpoints) {
        snapPoints.push({ point: { x: (minX + maxX) / 2, y: minY }, type: 'MIDPOINT', label: 'Midpoint', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: (minX + maxX) / 2, y: maxY }, type: 'MIDPOINT', label: 'Midpoint', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: minX, y: (minY + maxY) / 2 }, type: 'MIDPOINT', label: 'Midpoint', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: maxX, y: (minY + maxY) / 2 }, type: 'MIDPOINT', label: 'Midpoint', sourceEntityId: ent.id });
      }

      if (cfg.centers) {
        snapPoints.push({ point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, type: 'CENTER', label: 'Center', sourceEntityId: ent.id });
      }
    } else if (ent.type === 'circle') {
      if (cfg.centers) {
        snapPoints.push({ point: ent.center, type: 'CENTER', label: 'Center', sourceEntityId: ent.id });
      }
      if (cfg.quadrants) {
        snapPoints.push({ point: { x: ent.center.x + ent.radius, y: ent.center.y }, type: 'QUADRANT', label: 'Quadrant 0°', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: ent.center.x, y: ent.center.y + ent.radius }, type: 'QUADRANT', label: 'Quadrant 90°', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: ent.center.x - ent.radius, y: ent.center.y }, type: 'QUADRANT', label: 'Quadrant 180°', sourceEntityId: ent.id });
        snapPoints.push({ point: { x: ent.center.x, y: ent.center.y - ent.radius }, type: 'QUADRANT', label: 'Quadrant 270°', sourceEntityId: ent.id });
      }
    } else if (ent.type === 'arc') {
      if (cfg.centers) {
        snapPoints.push({ point: ent.center, type: 'CENTER', label: 'Center', sourceEntityId: ent.id });
      }
      if (cfg.endpoints) {
        snapPoints.push({
          point: { x: ent.center.x + Math.cos(ent.startAngle) * ent.radius, y: ent.center.y + Math.sin(ent.startAngle) * ent.radius },
          type: 'ENDPOINT',
          label: 'Arc Start',
          sourceEntityId: ent.id,
        });
        snapPoints.push({
          point: { x: ent.center.x + Math.cos(ent.endAngle) * ent.radius, y: ent.center.y + Math.sin(ent.endAngle) * ent.radius },
          type: 'ENDPOINT',
          label: 'Arc End',
          sourceEntityId: ent.id,
        });
      }
      if (cfg.midpoints) {
        let diff = ent.endAngle - ent.startAngle;
        if (ent.counterClockwise && diff > 0) diff -= Math.PI * 2;
        if (!ent.counterClockwise && diff < 0) diff += Math.PI * 2;
        const midA = ent.startAngle + diff / 2;
        snapPoints.push({
          point: { x: ent.center.x + Math.cos(midA) * ent.radius, y: ent.center.y + Math.sin(midA) * ent.radius },
          type: 'MIDPOINT',
          label: 'Arc Mid',
          sourceEntityId: ent.id,
        });
      }
    } else if (ent.type === 'dimension') {
      if (cfg.endpoints) {
        snapPoints.push({ point: ent.p1, type: 'ENDPOINT', label: 'Witness Pt 1', sourceEntityId: ent.id });
        snapPoints.push({ point: ent.p2, type: 'ENDPOINT', label: 'Witness Pt 2', sourceEntityId: ent.id });
      }
    }
  }

  // 2. Intersections between all entities
  if (cfg.intersections) {
    const rawSegments: Array<{ p1: Point2D; p2: Point2D; entityId: string }> = [];
    const circles: Array<{ center: Point2D; radius: number; entityId: string }> = [];

    for (const ent of activeEntities) {
      if (ent.type === 'line') {
        rawSegments.push({ p1: ent.p1, p2: ent.p2, entityId: ent.id });
      } else if (ent.type === 'rectangle') {
        const minX = Math.min(ent.p1.x, ent.p2.x);
        const maxX = Math.max(ent.p1.x, ent.p2.x);
        const minY = Math.min(ent.p1.y, ent.p2.y);
        const maxY = Math.max(ent.p1.y, ent.p2.y);
        rawSegments.push({ p1: { x: minX, y: minY }, p2: { x: maxX, y: minY }, entityId: ent.id });
        rawSegments.push({ p1: { x: maxX, y: minY }, p2: { x: maxX, y: maxY }, entityId: ent.id });
        rawSegments.push({ p1: { x: maxX, y: maxY }, p2: { x: minX, y: maxY }, entityId: ent.id });
        rawSegments.push({ p1: { x: minX, y: maxY }, p2: { x: minX, y: minY }, entityId: ent.id });
      } else if (ent.type === 'circle') {
        circles.push({ center: ent.center, radius: ent.radius, entityId: ent.id });
      }
    }

    // Segment to Segment intersections
    for (let i = 0; i < rawSegments.length; i++) {
      for (let j = i + 1; j < rawSegments.length; j++) {
        if (rawSegments[i].entityId === rawSegments[j].entityId) continue;
        const pt = lineIntersection(rawSegments[i].p1, rawSegments[i].p2, rawSegments[j].p1, rawSegments[j].p2);
        if (pt) {
          snapPoints.push({
            point: pt,
            type: 'INTERSECTION',
            label: 'Intersection',
            sourceEntityId: `${rawSegments[i].entityId}_${rawSegments[j].entityId}`,
          });
        }
      }
    }

    // Segment to Circle intersections
    for (const seg of rawSegments) {
      for (const circ of circles) {
        if (seg.entityId === circ.entityId) continue;
        const pts = lineCircleIntersections(seg.p1, seg.p2, circ.center, circ.radius);
        for (const pt of pts) {
          snapPoints.push({
            point: pt,
            type: 'INTERSECTION',
            label: 'Intersection',
            sourceEntityId: `${seg.entityId}_${circ.entityId}`,
          });
        }
      }
    }

    // Circle to Circle intersections
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const pts = circleCircleIntersections(circles[i].center, circles[i].radius, circles[j].center, circles[j].radius);
        for (const pt of pts) {
          snapPoints.push({
            point: pt,
            type: 'INTERSECTION',
            label: 'Intersection',
            sourceEntityId: `${circles[i].entityId}_${circles[j].entityId}`,
          });
        }
      }
    }
  }

  // De-duplicate points that are practically identical (within 0.08 units)
  const uniquePoints: DynamicSnapPoint[] = [];
  for (const sp of snapPoints) {
    const existingIndex = uniquePoints.findIndex(u => distance(u.point, sp.point) < 0.08);
    if (existingIndex === -1) {
      uniquePoints.push(sp);
    } else {
      // Prioritize Intersection over Endpoint/Midpoint if overlapping
      if (sp.type === 'INTERSECTION' && uniquePoints[existingIndex].type !== 'INTERSECTION') {
        uniquePoints[existingIndex] = sp;
      }
    }
  }

  return uniquePoints;
}

// Translate entity by (dx, dy)
export function translateEntity<T extends CADEntity>(entity: T, dx: number, dy: number): T {
  const copy = { ...entity };
  if (copy.type === 'line') {
    return {
      ...copy,
      p1: { x: copy.p1.x + dx, y: copy.p1.y + dy },
      p2: { x: copy.p2.x + dx, y: copy.p2.y + dy },
    } as T;
  } else if (copy.type === 'rectangle') {
    return {
      ...copy,
      p1: { x: copy.p1.x + dx, y: copy.p1.y + dy },
      p2: { x: copy.p2.x + dx, y: copy.p2.y + dy },
    } as T;
  } else if (copy.type === 'circle') {
    return {
      ...copy,
      center: { x: copy.center.x + dx, y: copy.center.y + dy },
    } as T;
  } else if (copy.type === 'arc') {
    return {
      ...copy,
      center: { x: copy.center.x + dx, y: copy.center.y + dy },
    } as T;
  } else if (copy.type === 'freedraw') {
    return {
      ...copy,
      points: copy.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })),
    } as T;
  } else if (copy.type === 'dimension') {
    return {
      ...copy,
      p1: { x: copy.p1.x + dx, y: copy.p1.y + dy },
      p2: { x: copy.p2.x + dx, y: copy.p2.y + dy },
    } as T;
  }
  return copy;
}

// Get key points of an entity for moving/snapping
export function getEntityKeyPoints(entity: CADEntity): Array<{ point: Point2D; type: 'ENDPOINT' | 'MIDPOINT' | 'CENTER'; label: string }> {
  switch (entity.type) {
    case 'line':
      return [
        { point: entity.p1, type: 'ENDPOINT', label: 'Start Point' },
        { point: entity.p2, type: 'ENDPOINT', label: 'End Point' },
        { point: { x: (entity.p1.x + entity.p2.x) / 2, y: (entity.p1.y + entity.p2.y) / 2 }, type: 'MIDPOINT', label: 'Midpoint' },
      ];
    case 'rectangle': {
      const minX = Math.min(entity.p1.x, entity.p2.x);
      const maxX = Math.max(entity.p1.x, entity.p2.x);
      const minY = Math.min(entity.p1.y, entity.p2.y);
      const maxY = Math.max(entity.p1.y, entity.p2.y);
      return [
        { point: { x: minX, y: minY }, type: 'ENDPOINT', label: 'Corner' },
        { point: { x: maxX, y: minY }, type: 'ENDPOINT', label: 'Corner' },
        { point: { x: maxX, y: maxY }, type: 'ENDPOINT', label: 'Corner' },
        { point: { x: minX, y: maxY }, type: 'ENDPOINT', label: 'Corner' },
        { point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, type: 'CENTER', label: 'Center' },
      ];
    }
    case 'circle':
      return [
        { point: entity.center, type: 'CENTER', label: 'Center' },
        { point: { x: entity.center.x + entity.radius, y: entity.center.y }, type: 'ENDPOINT', label: 'Radius Rim' },
      ];
    case 'arc':
      return [
        { point: entity.center, type: 'CENTER', label: 'Center' },
        { point: { x: entity.center.x + Math.cos(entity.startAngle) * entity.radius, y: entity.center.y + Math.sin(entity.startAngle) * entity.radius }, type: 'ENDPOINT', label: 'Start' },
        { point: { x: entity.center.x + Math.cos(entity.endAngle) * entity.radius, y: entity.center.y + Math.sin(entity.endAngle) * entity.radius }, type: 'ENDPOINT', label: 'End' },
      ];
    default:
      return [];
  }
}

