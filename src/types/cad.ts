export type UnitType = 'mm' | 'cm' | 'in';

export type ToolType =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arc'
  | 'freedraw'
  | 'trim'
  | 'erase'
  | 'dimension'
  | 'measure';

export type CameraViewPreset =
  | 'isometric'
  | 'top'
  | 'bottom'
  | 'front'
  | 'back'
  | 'left'
  | 'right';

export type ShadingMode =
  | 'shaded-edges'
  | 'smooth'
  | 'wireframe'
  | 'xray';

export type MaterialFinish =
  | 'aluminum'
  | 'steel'
  | 'brass'
  | 'plastic-blue'
  | 'plastic-orange'
  | 'carbon'
  | 'glass';

export type MeshDensity = 'draft' | 'standard' | 'fine' | 'ultra';

export type SnapType = 'ENDPOINT' | 'MIDPOINT' | 'INTERSECTION' | 'CENTER' | 'QUADRANT' | 'GRID' | null;

export interface DynamicSnapPoint {
  point: Point2D;
  type: SnapType;
  label: string;
  sourceEntityId?: string;
  description?: string;
}

export interface ObjectSnapConfig {
  enabled: boolean;
  endpoints: boolean;
  midpoints: boolean;
  intersections: boolean;
  centers: boolean;
  quadrants: boolean;
}

export interface DimensionMentionConfig {
  showOnSelected: boolean;
  showAll: boolean;
  forceMM: boolean;
  precision: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineStyle: 'solid' | 'dashed' | 'centerline';
}

export interface BaseEntity {
  id: string;
  layerId: string;
  selected?: boolean;
}

export interface LineEntity extends BaseEntity {
  type: 'line';
  p1: Point2D;
  p2: Point2D;
}

export interface RectangleEntity extends BaseEntity {
  type: 'rectangle';
  p1: Point2D;
  p2: Point2D;
}

export interface CircleEntity extends BaseEntity {
  type: 'circle';
  center: Point2D;
  radius: number;
}

export interface ArcEntity extends BaseEntity {
  type: 'arc';
  center: Point2D;
  radius: number;
  startAngle: number; // in radians
  endAngle: number;
  counterClockwise?: boolean;
}

export interface FreeDrawEntity extends BaseEntity {
  type: 'freedraw';
  points: Point2D[];
  smoothed?: boolean;
}

export interface DimensionEntity extends BaseEntity {
  type: 'dimension';
  p1: Point2D;
  p2: Point2D;
  text?: string;
  offset: number;
}

export type CADEntity =
  | LineEntity
  | RectangleEntity
  | CircleEntity
  | ArcEntity
  | FreeDrawEntity
  | DimensionEntity;

export interface ExtrudeFeature {
  id: string;
  type: 'extrude';
  name: string;
  depth: number;
  taper: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  visible: boolean;
  layerIds: string[];
}

export interface RevolveFeature {
  id: string;
  type: 'revolve';
  name: string;
  angle: number; // 0 - 360 degrees
  axis: 'x' | 'y' | 'custom';
  axisOffset: number;
  segments: number;
  visible: boolean;
  layerIds: string[];
}

export interface ExtrudeCutFeature {
  id: string;
  type: 'cut';
  name: string;
  depth: number;
  throughAll: boolean;
  cutPosition: Point2D;
  cutRadius?: number;
  cutWidth?: number;
  cutHeight?: number;
  shapeType: 'circle' | 'rect';
  visible: boolean;
}

export type CADFeature = ExtrudeFeature | RevolveFeature | ExtrudeCutFeature;

export interface Collaborator {
  id: string;
  name: string;
  role: 'Owner' | 'Mechanical Lead' | 'CAD Engineer' | 'Reviewer';
  color: string;
  activeLayer: string;
  avatar: string;
  lastActive: string;
}

export interface ProjectState {
  id: string;
  name: string;
  version: number;
  lastSaved: string;
  units: UnitType;
  layers: Layer[];
  entities: CADEntity[];
  features: CADFeature[];
  meshDensity: MeshDensity;
  materialFinish: MaterialFinish;
}
