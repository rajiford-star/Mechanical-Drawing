import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { CADEntity, CADFeature, ExtrudeFeature, RevolveFeature, ExtrudeCutFeature, MeshDensity } from '../types/cad';
import { extractContours } from './math2d';

export function getSegmentsForDensity(density: MeshDensity): { curveSegments: number; latheSegments: number } {
  switch (density) {
    case 'draft':
      return { curveSegments: 12, latheSegments: 24 };
    case 'standard':
      return { curveSegments: 32, latheSegments: 48 };
    case 'fine':
      return { curveSegments: 64, latheSegments: 72 };
    case 'ultra':
      return { curveSegments: 128, latheSegments: 128 };
  }
}

// Builds Three.js 3D solids from 2D sketch entities and parametric features
export function buildCADSolid(
  entities: CADEntity[],
  features: CADFeature[],
  meshDensity: MeshDensity,
  baseMaterial: THREE.Material
): { rootGroup: THREE.Group; solidMesh: THREE.Mesh | null; edgeGroup: THREE.Group } {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CAD_Root_Assembly';

  const edgeGroup = new THREE.Group();
  edgeGroup.name = 'CAD_Edge_Wireframe';

  const { curveSegments, latheSegments } = getSegmentsForDensity(meshDensity);

  // Group entities by layer or treat visible ones
  const contours = extractContours(entities);

  let accumulatedGeometries: THREE.BufferGeometry[] = [];

  // 1. Process Extrude and Revolve features
  for (const feature of features) {
    if (!feature.visible) continue;

    if (feature.type === 'extrude') {
      const extrudeGeom = createExtrudeGeometry(contours, feature, curveSegments);
      if (extrudeGeom) {
        accumulatedGeometries.push(extrudeGeom);
      }
    } else if (feature.type === 'revolve') {
      const revolveGeom = createRevolveGeometry(contours, feature, latheSegments);
      if (revolveGeom) {
        accumulatedGeometries.push(revolveGeom);
      }
    }
  }

  // If no features are explicitly created yet, create an automatic preview extrusion
  // from the 2D sketch contours so the user immediately sees 3D solid upon entering 3D mode
  if (accumulatedGeometries.length === 0 && contours.length > 0) {
    const defaultExtrude: ExtrudeFeature = {
      id: 'default_extrude',
      type: 'extrude',
      name: 'Base Extrude',
      depth: 25,
      taper: 0,
      bevelEnabled: true,
      bevelThickness: 1.5,
      bevelSize: 1.5,
      bevelSegments: 3,
      visible: true,
      layerIds: [],
    };
    const autoGeom = createExtrudeGeometry(contours, defaultExtrude, curveSegments);
    if (autoGeom) {
      accumulatedGeometries.push(autoGeom);
    }
  }

  // If still nothing (e.g. empty canvas), provide a graceful demo geometry
  if (accumulatedGeometries.length === 0) {
    const fallbackBox = new THREE.BoxGeometry(40, 20, 40);
    accumulatedGeometries.push(fallbackBox);
  }

  // Merge accumulated base geometries if multiple
  let baseGeometry = accumulatedGeometries[0];
  if (accumulatedGeometries.length > 1) {
    // For multiple shapes, we can union or keep first
    baseGeometry = accumulatedGeometries[0];
  }

  // 2. Process Extrude-Cut features via CSG Boolean Subtraction
  const cutFeatures = features.filter(f => f.type === 'cut' && f.visible) as ExtrudeCutFeature[];

  let finalGeometry = baseGeometry;

  if (cutFeatures.length > 0) {
    try {
      const evaluator = new Evaluator();
      evaluator.useGroups = false;

      let currentBrush = new Brush(finalGeometry, baseMaterial);
      currentBrush.updateMatrixWorld(true);

      for (const cut of cutFeatures) {
        let cutterGeom: THREE.BufferGeometry;
        const cutDepth = cut.throughAll ? 300 : Math.max(10, cut.depth);

        if (cut.shapeType === 'circle') {
          const radius = cut.cutRadius || 15;
          cutterGeom = new THREE.CylinderGeometry(radius, radius, cutDepth, curveSegments);
          cutterGeom.rotateX(Math.PI / 2); // align with Z extrusion
          cutterGeom.translate(cut.cutPosition.x, cut.cutPosition.y, cutDepth / 2 - 10);
        } else {
          const w = cut.cutWidth || 30;
          const h = cut.cutHeight || 20;
          cutterGeom = new THREE.BoxGeometry(w, h, cutDepth);
          cutterGeom.translate(cut.cutPosition.x, cut.cutPosition.y, cutDepth / 2 - 10);
        }

        const cutBrush = new Brush(cutterGeom, baseMaterial);
        cutBrush.updateMatrixWorld(true);

        const resultBrush = evaluator.evaluate(currentBrush, cutBrush, SUBTRACTION);
        currentBrush = resultBrush;
      }

      if (currentBrush && currentBrush.geometry) {
        finalGeometry = currentBrush.geometry;
      }
    } catch (err) {
      console.warn('CSG Extrude-Cut evaluation fallback:', err);
    }
  }

  finalGeometry.computeVertexNormals();

  const solidMesh = new THREE.Mesh(finalGeometry, baseMaterial);
  solidMesh.castShadow = true;
  solidMesh.receiveShadow = true;
  solidMesh.name = 'CAD_Solid_Part';
  rootGroup.add(solidMesh);

  // Generate sharp CAD outline edges
  try {
    const edgesGeom = new THREE.EdgesGeometry(finalGeometry, 24);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      linewidth: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const edgeLines = new THREE.LineSegments(edgesGeom, edgeMaterial);
    edgeLines.name = 'CAD_Feature_Edges';
    edgeGroup.add(edgeLines);
    rootGroup.add(edgeGroup);
  } catch (err) {
    console.warn('Could not generate feature edges:', err);
  }

  return { rootGroup, solidMesh, edgeGroup };
}

// Extrude 2D contours into 3D Solid
function createExtrudeGeometry(
  contours: Array<{ points: Array<{ x: number; y: number }>; isClosed: boolean }>,
  feature: ExtrudeFeature,
  curveSegments: number
): THREE.BufferGeometry | null {
  if (contours.length === 0) return null;

  // Separate outer shapes and internal holes
  const closedContours = contours.filter(c => c.isClosed && c.points.length >= 3);
  if (closedContours.length === 0) {
    // If not closed, expand line into a ribbon/profile
    if (contours[0] && contours[0].points.length >= 2) {
      const pts = contours[0].points;
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i].x, pts[i].y);
      }
      // offset back
      for (let i = pts.length - 1; i >= 0; i--) {
        shape.lineTo(pts[i].x + 2, pts[i].y + 2);
      }
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, {
        depth: feature.depth,
        bevelEnabled: feature.bevelEnabled,
        bevelThickness: feature.bevelThickness,
        bevelSize: feature.bevelSize,
        bevelSegments: feature.bevelSegments,
        curveSegments,
      });
    }
    return null;
  }

  // Sort contours by area descending: the largest is the outer boundary, smaller ones inside are holes
  const shapesWithArea = closedContours.map(c => {
    let area = 0;
    const pts = c.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return { contour: c, area: Math.abs(area / 2) };
  });

  shapesWithArea.sort((a, b) => b.area - a.area);

  // Outer primary shape
  const outer = shapesWithArea[0].contour;
  const shape = new THREE.Shape();
  shape.moveTo(outer.points[0].x, outer.points[0].y);
  for (let i = 1; i < outer.points.length; i++) {
    shape.lineTo(outer.points[i].x, outer.points[i].y);
  }
  shape.closePath();

  // Any subsequent closed contours inside outer boundary become cut holes
  for (let k = 1; k < shapesWithArea.length; k++) {
    const holeContour = shapesWithArea[k].contour;
    const holePath = new THREE.Path();
    holePath.moveTo(holeContour.points[0].x, holeContour.points[0].y);
    for (let i = 1; i < holeContour.points.length; i++) {
      holePath.lineTo(holeContour.points[i].x, holeContour.points[i].y);
    }
    holePath.closePath();
    shape.holes.push(holePath);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1, feature.depth),
    bevelEnabled: feature.bevelEnabled,
    bevelThickness: feature.bevelThickness,
    bevelSize: feature.bevelSize,
    bevelSegments: Math.max(1, feature.bevelSegments),
    curveSegments,
  });

  geom.center();
  return geom;
}

// Revolve 2D contour around Axis into 3D Solid
function createRevolveGeometry(
  contours: Array<{ points: Array<{ x: number; y: number }>; isClosed: boolean }>,
  feature: RevolveFeature,
  latheSegments: number
): THREE.BufferGeometry | null {
  if (contours.length === 0) return null;

  // Collect points for profile lathe
  const pts = contours[0].points;
  if (pts.length < 2) return null;

  // Lathe expects points in (x, y) where x >= 0 represents distance from axis of revolution
  const lathePoints: THREE.Vector2[] = [];

  // Determine bounds to center or offset from axis
  const minX = Math.min(...pts.map(p => p.x));
  const shiftX = Math.max(0, -minX + 2) + feature.axisOffset;

  for (const p of pts) {
    if (feature.axis === 'y') {
      const r = Math.max(0.1, p.x + shiftX);
      lathePoints.push(new THREE.Vector2(r, p.y));
    } else {
      // Around X axis
      const r = Math.max(0.1, p.y + shiftX);
      lathePoints.push(new THREE.Vector2(r, p.x));
    }
  }

  const phiLength = (Math.min(360, Math.max(10, feature.angle)) * Math.PI) / 180;
  const geom = new THREE.LatheGeometry(lathePoints, latheSegments, 0, phiLength);
  geom.center();
  return geom;
}
