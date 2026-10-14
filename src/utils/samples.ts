import { CADEntity, CADFeature, Layer } from '../types/cad';

export interface SampleCADModel {
  id: string;
  name: string;
  category: 'Mechanical' | 'Turned Parts' | 'Structural' | 'Industrial';
  description: string;
  layers: Layer[];
  entities: CADEntity[];
  features: CADFeature[];
}

export const SAMPLE_MODELS: SampleCADModel[] = [
  {
    id: 'flange_coupling',
    name: 'Mechanical Flange & Bolt Circle',
    category: 'Mechanical',
    description: 'Precision pipe coupling with central drive bore, outer flange, and 6 pitch circle diameter (PCD) bolt holes.',
    layers: [
      { id: 'l_outline', name: 'Geometry Outer', color: '#38bdf8', visible: true, locked: false, lineStyle: 'solid' },
      { id: 'l_holes', name: 'Bolt Holes & Bore', color: '#f59e0b', visible: true, locked: false, lineStyle: 'solid' },
      { id: 'l_construction', name: 'Pitch Circle', color: '#94a3b8', visible: true, locked: false, lineStyle: 'centerline' },
    ],
    entities: [
      // Outer flange circle
      { id: 'flange_outer', layerId: 'l_outline', type: 'circle', center: { x: 0, y: 0 }, radius: 85 },
      // Center bore
      { id: 'bore_center', layerId: 'l_holes', type: 'circle', center: { x: 0, y: 0 }, radius: 26 },
      // Bolt holes at 60 deg intervals on R=60
      { id: 'bolt_1', layerId: 'l_holes', type: 'circle', center: { x: 58, y: 0 }, radius: 6.5 },
      { id: 'bolt_2', layerId: 'l_holes', type: 'circle', center: { x: 29, y: 50.2 }, radius: 6.5 },
      { id: 'bolt_3', layerId: 'l_holes', type: 'circle', center: { x: -29, y: 50.2 }, radius: 6.5 },
      { id: 'bolt_4', layerId: 'l_holes', type: 'circle', center: { x: -58, y: 0 }, radius: 6.5 },
      { id: 'bolt_5', layerId: 'l_holes', type: 'circle', center: { x: -29, y: -50.2 }, radius: 6.5 },
      { id: 'bolt_6', layerId: 'l_holes', type: 'circle', center: { x: 29, y: -50.2 }, radius: 6.5 },
      // Dimension
      { id: 'dim_pcd', layerId: 'l_construction', type: 'dimension', p1: { x: -58, y: 0 }, p2: { x: 58, y: 0 }, text: 'PCD 116.0 mm', offset: 20 },
    ],
    features: [
      {
        id: 'feat_flange_extrude',
        type: 'extrude',
        name: 'Flange Plate Extrude',
        depth: 22,
        taper: 0,
        bevelEnabled: true,
        bevelThickness: 1.8,
        bevelSize: 1.8,
        bevelSegments: 3,
        visible: true,
        layerIds: ['l_outline', 'l_holes'],
      },
      {
        id: 'feat_keyway_cut',
        type: 'cut',
        name: 'Keyway Extrude-Cut',
        depth: 30,
        throughAll: true,
        cutPosition: { x: 0, y: -26 },
        cutWidth: 10,
        cutHeight: 8,
        shapeType: 'rect',
        visible: true,
      },
    ],
  },
  {
    id: 'turned_pulley',
    name: 'Turned V-Belt Pulley & Shaft',
    category: 'Turned Parts',
    description: 'Rotational lathe turned profile with dual V-grooves, hub collar, and bearing shoulder ready for 360° Revolve.',
    layers: [
      { id: 'l_profile', name: 'Lathe Profile', color: '#10b981', visible: true, locked: false, lineStyle: 'solid' },
      { id: 'l_axis', name: 'Centerline Axis', color: '#f43f5e', visible: true, locked: false, lineStyle: 'centerline' },
    ],
    entities: [
      // 2D half profile for Revolve
      { id: 'p1', layerId: 'l_profile', type: 'line', p1: { x: 12, y: -50 }, p2: { x: 30, y: -50 } },
      { id: 'p2', layerId: 'l_profile', type: 'line', p1: { x: 30, y: -50 }, p2: { x: 30, y: -25 } },
      { id: 'p3', layerId: 'l_profile', type: 'line', p1: { x: 30, y: -25 }, p2: { x: 75, y: -25 } },
      // V-Groove 1
      { id: 'p4', layerId: 'l_profile', type: 'line', p1: { x: 75, y: -25 }, p2: { x: 60, y: -10 } },
      { id: 'p5', layerId: 'l_profile', type: 'line', p1: { x: 60, y: -10 }, p2: { x: 75, y: 5 } },
      // V-Groove 2
      { id: 'p6', layerId: 'l_profile', type: 'line', p1: { x: 75, y: 5 }, p2: { x: 60, y: 20 } },
      { id: 'p7', layerId: 'l_profile', type: 'line', p1: { x: 60, y: 20 }, p2: { x: 75, y: 35 } },
      // Top face
      { id: 'p8', layerId: 'l_profile', type: 'line', p1: { x: 75, y: 35 }, p2: { x: 25, y: 35 } },
      { id: 'p9', layerId: 'l_profile', type: 'line', p1: { x: 25, y: 35 }, p2: { x: 25, y: 55 } },
      { id: 'p10', layerId: 'l_profile', type: 'line', p1: { x: 25, y: 55 }, p2: { x: 12, y: 55 } },
      // Inner bore boundary line
      { id: 'p11', layerId: 'l_profile', type: 'line', p1: { x: 12, y: 55 }, p2: { x: 12, y: -50 } },
      // Axis of revolution
      { id: 'axis_line', layerId: 'l_axis', type: 'line', p1: { x: 0, y: -65 }, p2: { x: 0, y: 70 } },
    ],
    features: [
      {
        id: 'feat_revolve_pulley',
        type: 'revolve',
        name: '360° Revolve Lathe',
        angle: 360,
        axis: 'y',
        axisOffset: 0,
        segments: 64,
        visible: true,
        layerIds: ['l_profile'],
      },
    ],
  },
  {
    id: 'bracket',
    name: 'Slotted Angle Bracket with Stiffener',
    category: 'Structural',
    description: 'High-strength structural bracket with dual mounting slots, counterbore holes, and reinforced webbing.',
    layers: [
      { id: 'l_bracket', name: 'Bracket Boundary', color: '#a855f7', visible: true, locked: false, lineStyle: 'solid' },
      { id: 'l_holes', name: 'Mounting Slots', color: '#f59e0b', visible: true, locked: false, lineStyle: 'solid' },
    ],
    entities: [
      // Base plate 120 x 80
      { id: 'b_rect', layerId: 'l_bracket', type: 'rectangle', p1: { x: -60, y: -40 }, p2: { x: 60, y: 40 } },
      // Slot 1
      { id: 's1', layerId: 'l_holes', type: 'circle', center: { x: -38, y: 0 }, radius: 9 },
      // Slot 2
      { id: 's2', layerId: 'l_holes', type: 'circle', center: { x: 38, y: 0 }, radius: 9 },
      // Center indexing hole
      { id: 's3', layerId: 'l_holes', type: 'circle', center: { x: 0, y: 0 }, radius: 14 },
    ],
    features: [
      {
        id: 'feat_bracket_extrude',
        type: 'extrude',
        name: 'Bracket Solid Extrude',
        depth: 24,
        taper: 0,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 2,
        bevelSegments: 4,
        visible: true,
        layerIds: ['l_bracket', 'l_holes'],
      },
      {
        id: 'feat_transverse_pocket',
        type: 'cut',
        name: 'Weight Relief Pocket Cut',
        depth: 14,
        throughAll: false,
        cutPosition: { x: 0, y: 0 },
        cutWidth: 50,
        cutHeight: 22,
        shapeType: 'rect',
        visible: true,
      },
    ],
  },
];
