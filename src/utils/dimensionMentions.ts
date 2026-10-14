import { CADEntity, DimensionEntity, LineEntity, RectangleEntity, CircleEntity, ArcEntity, FreeDrawEntity, Point2D, UnitType } from '../types/cad';
import { distance, lineAngle } from './math2d';

/**
 * Converts a CAD coordinate or distance value to millimeters (mm)
 */
export function toMM(val: number, units: UnitType): number {
  if (units === 'mm') return val;
  if (units === 'cm') return val * 10;
  if (units === 'in') return val * 25.4;
  return val;
}

/**
 * Converts a millimeter (mm) value back to the active CAD units
 */
export function fromMM(valMM: number, units: UnitType): number {
  if (units === 'mm') return valMM;
  if (units === 'cm') return valMM / 10;
  if (units === 'in') return valMM / 25.4;
  return valMM;
}

export interface DimensionItemDetail {
  label: string;
  value: string;
}

export interface EntityDimensionMention {
  entityId: string;
  entityType: string;
  primaryValueMM: number;
  primaryLabel: string;
  unitLabel: string;
  badgePosition: Point2D;
  details: DimensionItemDetail[];
  summary: string;
}

/**
 * Computes exact dimension mentions in millimeters for any CAD entity
 */
export function getEntityDimensionMention(
  entity: CADEntity,
  units: UnitType,
  precision: number = 2
): EntityDimensionMention {
  const p = precision;

  switch (entity.type) {
    case 'line': {
      const cadLen = distance(entity.p1, entity.p2);
      const lenMM = toMM(cadLen, units);
      const dxMM = toMM(Math.abs(entity.p2.x - entity.p1.x), units);
      const dyMM = toMM(Math.abs(entity.p2.y - entity.p1.y), units);
      const angDeg = lineAngle(entity.p1, entity.p2);

      const midPt: Point2D = {
        x: (entity.p1.x + entity.p2.x) / 2,
        y: (entity.p1.y + entity.p2.y) / 2,
      };

      return {
        entityId: entity.id,
        entityType: 'Line',
        primaryValueMM: lenMM,
        primaryLabel: `${lenMM.toFixed(p)} mm`,
        unitLabel: 'mm',
        badgePosition: midPt,
        details: [
          { label: 'Length', value: `${lenMM.toFixed(p)} mm` },
          { label: 'ΔX (Width)', value: `${dxMM.toFixed(p)} mm` },
          { label: 'ΔY (Height)', value: `${dyMM.toFixed(p)} mm` },
          { label: 'Angle', value: `${angDeg.toFixed(1)}°` },
        ],
        summary: `Line Length: ${lenMM.toFixed(p)} mm (ΔX: ${dxMM.toFixed(p)} mm, ΔY: ${dyMM.toFixed(p)} mm, ∠ ${angDeg.toFixed(1)}°)`,
      };
    }

    case 'rectangle': {
      const wCad = Math.abs(entity.p2.x - entity.p1.x);
      const hCad = Math.abs(entity.p2.y - entity.p1.y);
      const wMM = toMM(wCad, units);
      const hMM = toMM(hCad, units);
      const diagMM = toMM(Math.hypot(wCad, hCad), units);
      const perimeterMM = (wMM + hMM) * 2;
      const areaMM2 = wMM * hMM;

      const centerPt: Point2D = {
        x: (entity.p1.x + entity.p2.x) / 2,
        y: (entity.p1.y + entity.p2.y) / 2,
      };

      return {
        entityId: entity.id,
        entityType: 'Rectangle',
        primaryValueMM: wMM,
        primaryLabel: `${wMM.toFixed(p)} mm × ${hMM.toFixed(p)} mm`,
        unitLabel: 'mm',
        badgePosition: centerPt,
        details: [
          { label: 'Width', value: `${wMM.toFixed(p)} mm` },
          { label: 'Height', value: `${hMM.toFixed(p)} mm` },
          { label: 'Diagonal', value: `${diagMM.toFixed(p)} mm` },
          { label: 'Perimeter', value: `${perimeterMM.toFixed(p)} mm` },
          { label: 'Area', value: `${areaMM2.toFixed(p)} mm²` },
        ],
        summary: `Rectangle: ${wMM.toFixed(p)} mm × ${hMM.toFixed(p)} mm (Diag: ${diagMM.toFixed(p)} mm, Area: ${areaMM2.toFixed(p)} mm²)`,
      };
    }

    case 'circle': {
      const rCad = entity.radius;
      const rMM = toMM(rCad, units);
      const dMM = rMM * 2;
      const circMM = 2 * Math.PI * rMM;
      const areaMM2 = Math.PI * rMM * rMM;

      return {
        entityId: entity.id,
        entityType: 'Circle',
        primaryValueMM: dMM,
        primaryLabel: `Ø ${dMM.toFixed(p)} mm (R ${rMM.toFixed(p)} mm)`,
        unitLabel: 'mm',
        badgePosition: entity.center,
        details: [
          { label: 'Diameter (Ø)', value: `Ø ${dMM.toFixed(p)} mm` },
          { label: 'Radius (R)', value: `R ${rMM.toFixed(p)} mm` },
          { label: 'Circumference', value: `${circMM.toFixed(p)} mm` },
          { label: 'Area', value: `${areaMM2.toFixed(p)} mm²` },
        ],
        summary: `Circle: Ø ${dMM.toFixed(p)} mm / R ${rMM.toFixed(p)} mm (Circ: ${circMM.toFixed(p)} mm, Area: ${areaMM2.toFixed(p)} mm²)`,
      };
    }

    case 'arc': {
      const rCad = entity.radius;
      const rMM = toMM(rCad, units);
      let angleDiff = entity.endAngle - entity.startAngle;
      if (entity.counterClockwise && angleDiff > 0) angleDiff -= Math.PI * 2;
      if (!entity.counterClockwise && angleDiff < 0) angleDiff += Math.PI * 2;
      const absDiff = Math.abs(angleDiff);
      const spanDeg = (absDiff * 180) / Math.PI;
      const arcLenMM = rMM * absDiff;

      const midAngle = entity.startAngle + angleDiff / 2;
      const midPt: Point2D = {
        x: entity.center.x + Math.cos(midAngle) * rCad,
        y: entity.center.y + Math.sin(midAngle) * rCad,
      };

      return {
        entityId: entity.id,
        entityType: 'Arc',
        primaryValueMM: rMM,
        primaryLabel: `R ${rMM.toFixed(p)} mm (Arc: ${arcLenMM.toFixed(p)} mm)`,
        unitLabel: 'mm',
        badgePosition: midPt,
        details: [
          { label: 'Radius (R)', value: `R ${rMM.toFixed(p)} mm` },
          { label: 'Arc Length', value: `${arcLenMM.toFixed(p)} mm` },
          { label: 'Span Angle', value: `${spanDeg.toFixed(1)}°` },
          { label: 'Diameter (Ø)', value: `Ø ${(rMM * 2).toFixed(p)} mm` },
        ],
        summary: `Arc: Radius ${rMM.toFixed(p)} mm, Arc Length: ${arcLenMM.toFixed(p)} mm (Span: ${spanDeg.toFixed(1)}°)`,
      };
    }

    case 'freedraw': {
      let totalDistCad = 0;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < entity.points.length; i++) {
        const pt = entity.points[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        if (i > 0) {
          totalDistCad += distance(entity.points[i - 1], pt);
        }
      }
      const lenMM = toMM(totalDistCad, units);
      const wMM = toMM(maxX - minX, units);
      const hMM = toMM(maxY - minY, units);

      return {
        entityId: entity.id,
        entityType: 'Freehand Sketch',
        primaryValueMM: lenMM,
        primaryLabel: `Path: ${lenMM.toFixed(p)} mm`,
        unitLabel: 'mm',
        badgePosition: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        details: [
          { label: 'Total Path Length', value: `${lenMM.toFixed(p)} mm` },
          { label: 'Bounding Width', value: `${wMM.toFixed(p)} mm` },
          { label: 'Bounding Height', value: `${hMM.toFixed(p)} mm` },
        ],
        summary: `Freehand Stroke: Length ${lenMM.toFixed(p)} mm (Box: ${wMM.toFixed(p)} × ${hMM.toFixed(p)} mm)`,
      };
    }

    case 'dimension': {
      const dCad = distance(entity.p1, entity.p2);
      const dMM = toMM(dCad, units);
      return {
        entityId: entity.id,
        entityType: 'Dimension',
        primaryValueMM: dMM,
        primaryLabel: entity.text || `${dMM.toFixed(p)} mm`,
        unitLabel: 'mm',
        badgePosition: {
          x: (entity.p1.x + entity.p2.x) / 2,
          y: (entity.p1.y + entity.p2.y) / 2 + entity.offset,
        },
        details: [
          { label: 'Annotated Distance', value: `${dMM.toFixed(p)} mm` },
          { label: 'Offset Distance', value: `${toMM(entity.offset, units).toFixed(p)} mm` },
        ],
        summary: `Dimension Witness: ${dMM.toFixed(p)} mm`,
      };
    }
  }
}

/**
 * Creates persistent CAD Dimension annotations in mm for the given entity
 */
export function createDimensionsForEntity(
  entity: CADEntity,
  units: UnitType,
  layerId?: string
): DimensionEntity[] {
  const targetLayer = layerId || entity.layerId;
  const genId = () => 'dim_' + Math.random().toString(36).substring(2, 9);

  switch (entity.type) {
    case 'line': {
      const lenMM = toMM(distance(entity.p1, entity.p2), units);
      return [
        {
          id: genId(),
          layerId: targetLayer,
          type: 'dimension',
          p1: entity.p1,
          p2: entity.p2,
          text: `${lenMM.toFixed(2)} mm`,
          offset: 14,
        },
      ];
    }

    case 'rectangle': {
      const minX = Math.min(entity.p1.x, entity.p2.x);
      const maxX = Math.max(entity.p1.x, entity.p2.x);
      const minY = Math.min(entity.p1.y, entity.p2.y);
      const maxY = Math.max(entity.p1.y, entity.p2.y);

      const wMM = toMM(maxX - minX, units);
      const hMM = toMM(maxY - minY, units);

      return [
        // Top horizontal dimension (Width in mm)
        {
          id: genId(),
          layerId: targetLayer,
          type: 'dimension',
          p1: { x: minX, y: maxY },
          p2: { x: maxX, y: maxY },
          text: `W: ${wMM.toFixed(2)} mm`,
          offset: 12,
        },
        // Right vertical dimension (Height in mm)
        {
          id: genId(),
          layerId: targetLayer,
          type: 'dimension',
          p1: { x: maxX, y: minY },
          p2: { x: maxX, y: maxY },
          text: `H: ${hMM.toFixed(2)} mm`,
          offset: 12,
        },
      ];
    }

    case 'circle': {
      const dMM = toMM(entity.radius * 2, units);
      const rMM = toMM(entity.radius, units);
      // Horizontal diameter dimension
      return [
        {
          id: genId(),
          layerId: targetLayer,
          type: 'dimension',
          p1: { x: entity.center.x - entity.radius, y: entity.center.y },
          p2: { x: entity.center.x + entity.radius, y: entity.center.y },
          text: `Ø ${dMM.toFixed(2)} mm (R ${rMM.toFixed(2)} mm)`,
          offset: 0,
        },
      ];
    }

    case 'arc': {
      const rMM = toMM(entity.radius, units);
      let angleDiff = entity.endAngle - entity.startAngle;
      if (entity.counterClockwise && angleDiff > 0) angleDiff -= Math.PI * 2;
      if (!entity.counterClockwise && angleDiff < 0) angleDiff += Math.PI * 2;
      const midAngle = entity.startAngle + angleDiff / 2;
      const arcMidPt: Point2D = {
        x: entity.center.x + Math.cos(midAngle) * entity.radius,
        y: entity.center.y + Math.sin(midAngle) * entity.radius,
      };

      return [
        {
          id: genId(),
          layerId: targetLayer,
          type: 'dimension',
          p1: entity.center,
          p2: arcMidPt,
          text: `R ${rMM.toFixed(2)} mm`,
          offset: 0,
        },
      ];
    }

    default:
      return [];
  }
}
