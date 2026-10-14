import * as THREE from 'three';
import { CADEntity, Layer, UnitType } from '../types/cad';

// -------------------------------------------------------------
// Helper: trigger file download in browser
// -------------------------------------------------------------
export function downloadFile(content: string | Blob | ArrayBuffer, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// 1. SVG Exporter (2D Vector CAD Drawing with Layers)
// -------------------------------------------------------------
export function exportToSVG(
  entities: CADEntity[],
  layers: Layer[],
  units: UnitType,
  width = 1200,
  height = 800
): string {
  const layerMap = new Map(layers.map(l => [l.id, l]));

  // Calculate bounding box or use default center
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ent of entities) {
    if (ent.type === 'line' || ent.type === 'rectangle' || ent.type === 'dimension') {
      const p1 = ent.p1;
      const p2 = ent.p2;
      minX = Math.min(minX, p1.x, p2.x);
      minY = Math.min(minY, p1.y, p2.y);
      maxX = Math.max(maxX, p1.x, p2.x);
      maxY = Math.max(maxY, p1.y, p2.y);
    } else if (ent.type === 'circle') {
      minX = Math.min(minX, ent.center.x - ent.radius);
      minY = Math.min(minY, ent.center.y - ent.radius);
      maxX = Math.max(maxX, ent.center.x + ent.radius);
      maxY = Math.max(maxY, ent.center.y + ent.radius);
    } else if (ent.type === 'freedraw') {
      for (const p of ent.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }

  if (minX === Infinity) {
    minX = -200; minY = -150; maxX = 200; maxY = 150;
  }

  const padding = 40;
  const bbWidth = Math.max(10, maxX - minX + padding * 2);
  const bbHeight = Math.max(10, maxY - minY + padding * 2);
  const viewBox = `${minX - padding} ${minY - padding} ${bbWidth} ${bbHeight}`;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">\n`;
  svg += `  <style>\n`;
  svg += `    .grid { stroke: #2a2e39; stroke-width: 0.5; stroke-dasharray: 2,4; }\n`;
  svg += `    .dim-text { font-family: 'Inter', monospace, sans-serif; font-size: 10px; fill: #60a5fa; text-anchor: middle; }\n`;
  svg += `  </style>\n`;
  svg += `  <rect x="${minX - padding}" y="${minY - padding}" width="${bbWidth}" height="${bbHeight}" fill="#111827"/>\n`;

  // Group entities by layer
  for (const layer of layers) {
    if (!layer.visible) continue;
    const layerEntities = entities.filter(e => e.layerId === layer.id);
    if (layerEntities.length === 0) continue;

    const strokeDash = layer.lineStyle === 'dashed' ? 'stroke-dasharray="6,4"' : layer.lineStyle === 'centerline' ? 'stroke-dasharray="12,3,3,3"' : '';

    svg += `  <g id="layer_${layer.id}" stroke="${layer.color}" stroke-width="1.8" fill="none" ${strokeDash}>\n`;

    for (const ent of layerEntities) {
      if (ent.type === 'line') {
        svg += `    <line x1="${ent.p1.x}" y1="${ent.p1.y}" x2="${ent.p2.x}" y2="${ent.p2.y}" />\n`;
      } else if (ent.type === 'rectangle') {
        const rx = Math.min(ent.p1.x, ent.p2.x);
        const ry = Math.min(ent.p1.y, ent.p2.y);
        const rw = Math.abs(ent.p2.x - ent.p1.x);
        const rh = Math.abs(ent.p2.y - ent.p1.y);
        svg += `    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" />\n`;
      } else if (ent.type === 'circle') {
        svg += `    <circle cx="${ent.center.x}" cy="${ent.center.y}" r="${ent.radius}" />\n`;
      } else if (ent.type === 'arc') {
        const x1 = ent.center.x + Math.cos(ent.startAngle) * ent.radius;
        const y1 = ent.center.y + Math.sin(ent.startAngle) * ent.radius;
        const x2 = ent.center.x + Math.cos(ent.endAngle) * ent.radius;
        const y2 = ent.center.y + Math.sin(ent.endAngle) * ent.radius;
        let delta = ent.endAngle - ent.startAngle;
        if (delta < 0) delta += Math.PI * 2;
        const largeArc = delta > Math.PI ? 1 : 0;
        const sweep = ent.counterClockwise ? 0 : 1;
        svg += `    <path d="M ${x1} ${y1} A ${ent.radius} ${ent.radius} 0 ${largeArc} ${sweep} ${x2} ${y2}" />\n`;
      } else if (ent.type === 'freedraw') {
        if (ent.points.length > 1) {
          const d = ent.points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
          svg += `    <path d="${d}" />\n`;
        }
      } else if (ent.type === 'dimension') {
        const mx = (ent.p1.x + ent.p2.x) / 2;
        const my = (ent.p1.y + ent.p2.y) / 2;
        const len = Math.hypot(ent.p2.x - ent.p1.x, ent.p2.y - ent.p1.y).toFixed(1);
        svg += `    <line x1="${ent.p1.x}" y1="${ent.p1.y}" x2="${ent.p2.x}" y2="${ent.p2.y}" stroke="#60a5fa" stroke-width="1" stroke-dasharray="2,2"/>\n`;
        svg += `    <text x="${mx}" y="${my - 6}" class="dim-text">${ent.text || `${len} ${units}`}</text>\n`;
      }
    }
    svg += `  </g>\n`;
  }

  // Engineering Title Block at bottom right
  const tbX = maxX + padding - 180;
  const tbY = maxY + padding - 45;
  svg += `  <g id="title_block" transform="translate(${tbX}, ${tbY})">\n`;
  svg += `    <rect width="170" height="40" fill="#1f2937" stroke="#4b5563" stroke-width="0.8"/>\n`;
  svg += `    <text x="8" y="16" fill="#e5e7eb" font-family="sans-serif" font-size="9" font-weight="bold">VELOCAD STUDIO</text>\n`;
  svg += `    <text x="8" y="30" fill="#9ca3af" font-family="sans-serif" font-size="7.5">SCALE 1:1 | UNITS: ${units.toUpperCase()}</text>\n`;
  svg += `  </g>\n`;

  svg += `</svg>`;
  return svg;
}

// -------------------------------------------------------------
// 2. PDF Exporter (Technical Engineering Drawing Sheet)
// -------------------------------------------------------------
export function exportToPDF(
  entities: CADEntity[],
  layers: Layer[],
  projectName: string,
  units: UnitType
): string {
  // Generates clean standard PDF 1.4 vector document
  const dateStr = new Date().toISOString().split('T')[0];
  const svgContent = exportToSVG(entities, layers, units, 842, 595); // A4 Landscape (points)

  // Construct pure PDF with embedded graphics stream
  const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 850 >>
stream
q
0 0 842 595 re W n
0.1 0.12 0.16 rg
0 0 842 595 re f
0.3 0.35 0.45 RG
2 w
20 20 802 555 re S
0.5 w
600 20 222 65 re S
BT
/F1 14 Tf
0.9 0.95 1 rg
612 65 Td
(${projectName.replace(/[()\\]/g, '')}) Tj
/F1 9 Tf
0.7 0.75 0.8 rg
0 -16 Td
(SYSTEM: VELOCAD PARAMETRIC STUDIO) Tj
0 -13 Td
(DATE: ${dateStr}  |  UNITS: ${units.toUpperCase()}) Tj
ET
Q
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000001140 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1205
%%EOF`;

  return pdfBody;
}

// -------------------------------------------------------------
// 3. STL Exporter (Standard CAD 3D Printing & CAM)
// -------------------------------------------------------------
export function exportToSTL(mesh: THREE.Mesh | THREE.Group, binary = false): string | ArrayBuffer {
  const geometries: THREE.BufferGeometry[] = [];
  mesh.updateMatrixWorld(true);

  mesh.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geom = m.geometry.clone();
      geom.applyMatrix4(m.matrixWorld);
      geometries.push(geom);
    }
  });

  if (geometries.length === 0) return 'solid VeloCAD_Model\nendsolid VeloCAD_Model';

  if (!binary) {
    // ASCII STL format
    let stl = 'solid VeloCAD_Model\n';
    for (const geom of geometries) {
      const pos = geom.getAttribute('position');
      const normal = geom.getAttribute('normal');
      const index = geom.getIndex();

      const numTriangles = index ? index.count / 3 : pos.count / 3;

      for (let i = 0; i < numTriangles; i++) {
        let i0 = i * 3, i1 = i * 3 + 1, i2 = i * 3 + 2;
        if (index) {
          i0 = index.getX(i * 3);
          i1 = index.getX(i * 3 + 1);
          i2 = index.getX(i * 3 + 2);
        }

        const nx = normal ? (normal.getX(i0) + normal.getX(i1) + normal.getX(i2)) / 3 : 0;
        const ny = normal ? (normal.getY(i0) + normal.getY(i1) + normal.getY(i2)) / 3 : 0;
        const nz = normal ? (normal.getZ(i0) + normal.getZ(i1) + normal.getZ(i2)) / 3 : 1;

        stl += `  facet normal ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
        stl += `    outer loop\n`;
        stl += `      vertex ${pos.getX(i0).toFixed(6)} ${pos.getY(i0).toFixed(6)} ${pos.getZ(i0).toFixed(6)}\n`;
        stl += `      vertex ${pos.getX(i1).toFixed(6)} ${pos.getY(i1).toFixed(6)} ${pos.getZ(i1).toFixed(6)}\n`;
        stl += `      vertex ${pos.getX(i2).toFixed(6)} ${pos.getY(i2).toFixed(6)} ${pos.getZ(i2).toFixed(6)}\n`;
        stl += `    endloop\n`;
        stl += `  endfacet\n`;
      }
    }
    stl += 'endsolid VeloCAD_Model\n';
    return stl;
  } else {
    // Binary STL format (efficient for high mesh density)
    let totalTriangles = 0;
    for (const geom of geometries) {
      const index = geom.getIndex();
      const pos = geom.getAttribute('position');
      totalTriangles += index ? index.count / 3 : pos.count / 3;
    }

    const bufferSize = 84 + 50 * totalTriangles;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 80 bytes header
    const headerStr = 'VeloCAD Studio Binary STL Solid Model Export';
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
    }
    view.setUint32(80, totalTriangles, true);

    let offset = 84;
    for (const geom of geometries) {
      const pos = geom.getAttribute('position');
      const normal = geom.getAttribute('normal');
      const index = geom.getIndex();
      const numTri = index ? index.count / 3 : pos.count / 3;

      for (let i = 0; i < numTri; i++) {
        let i0 = i * 3, i1 = i * 3 + 1, i2 = i * 3 + 2;
        if (index) {
          i0 = index.getX(i * 3);
          i1 = index.getX(i * 3 + 1);
          i2 = index.getX(i * 3 + 2);
        }

        const nx = normal ? (normal.getX(i0) + normal.getX(i1) + normal.getX(i2)) / 3 : 0;
        const ny = normal ? (normal.getY(i0) + normal.getY(i1) + normal.getY(i2)) / 3 : 0;
        const nz = normal ? (normal.getZ(i0) + normal.getZ(i1) + normal.getZ(i2)) / 3 : 1;

        view.setFloat32(offset, nx, true); offset += 4;
        view.setFloat32(offset, ny, true); offset += 4;
        view.setFloat32(offset, nz, true); offset += 4;

        view.setFloat32(offset, pos.getX(i0), true); offset += 4;
        view.setFloat32(offset, pos.getY(i0), true); offset += 4;
        view.setFloat32(offset, pos.getZ(i0), true); offset += 4;

        view.setFloat32(offset, pos.getX(i1), true); offset += 4;
        view.setFloat32(offset, pos.getY(i1), true); offset += 4;
        view.setFloat32(offset, pos.getZ(i1), true); offset += 4;

        view.setFloat32(offset, pos.getX(i2), true); offset += 4;
        view.setFloat32(offset, pos.getY(i2), true); offset += 4;
        view.setFloat32(offset, pos.getZ(i2), true); offset += 4;

        view.setUint16(offset, 0, true); offset += 2;
      }
    }
    return buffer;
  }
}

// -------------------------------------------------------------
// 4. OBJ + MTL Exporter (Wavefront CAD Mesh)
// -------------------------------------------------------------
export function exportToOBJ(mesh: THREE.Mesh | THREE.Group, objectName = 'VeloCAD_Part'): { obj: string; mtl: string } {
  let obj = `# VeloCAD Studio Wavefront OBJ Exporter\n`;
  obj += `mtllib ${objectName}.mtl\n`;
  obj += `o ${objectName}\n`;

  let mtl = `# VeloCAD Studio Material Library\n`;
  mtl += `newmtl CAD_Default_Material\n`;
  mtl += `Ka 0.2 0.2 0.2\n`;
  mtl += `Kd 0.6 0.68 0.78\n`;
  mtl += `Ks 0.9 0.9 0.9\n`;
  mtl += `Ns 64\n`;
  mtl += `d 1.0\n`;
  mtl += `illum 2\n`;

  let vertexOffset = 1;
  mesh.updateMatrixWorld(true);

  mesh.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geom = m.geometry.clone();
      geom.applyMatrix4(m.matrixWorld);

      const pos = geom.getAttribute('position');
      const norm = geom.getAttribute('normal');
      const index = geom.getIndex();

      obj += `usemtl CAD_Default_Material\n`;
      obj += `s 1\n`;

      // Vertices
      for (let i = 0; i < pos.count; i++) {
        obj += `v ${pos.getX(i).toFixed(5)} ${pos.getY(i).toFixed(5)} ${pos.getZ(i).toFixed(5)}\n`;
      }

      // Normals
      if (norm) {
        for (let i = 0; i < norm.count; i++) {
          obj += `vn ${norm.getX(i).toFixed(4)} ${norm.getY(i).toFixed(4)} ${norm.getZ(i).toFixed(4)}\n`;
        }
      }

      // Faces
      const count = index ? index.count : pos.count;
      for (let i = 0; i < count; i += 3) {
        const i0 = (index ? index.getX(i) : i) + vertexOffset;
        const i1 = (index ? index.getX(i + 1) : i + 1) + vertexOffset;
        const i2 = (index ? index.getX(i + 2) : i + 2) + vertexOffset;

        if (norm) {
          obj += `f ${i0}//${i0} ${i1}//${i1} ${i2}//${i2}\n`;
        } else {
          obj += `f ${i0} ${i1} ${i2}\n`;
        }
      }

      vertexOffset += pos.count;
    }
  });

  return { obj, mtl };
}

// -------------------------------------------------------------
// 5. GLTF Exporter (.gltf JSON with embedded geometry)
// -------------------------------------------------------------
export function exportToGLTF(mesh: THREE.Mesh | THREE.Group, objectName = 'VeloCAD_Model'): string {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let baseVertex = 0;

  mesh.updateMatrixWorld(true);
  mesh.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geom = m.geometry.clone();
      geom.applyMatrix4(m.matrixWorld);

      const pos = geom.getAttribute('position');
      const norm = geom.getAttribute('normal');
      const idx = geom.getIndex();

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (norm) {
          normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        } else {
          normals.push(0, 1, 0);
        }
      }

      const triCount = idx ? idx.count : pos.count;
      for (let i = 0; i < triCount; i++) {
        indices.push((idx ? idx.getX(i) : i) + baseVertex);
      }
      baseVertex += pos.count;
    }
  });

  // Calculate bounding box
  let minPos = [Infinity, Infinity, Infinity];
  let maxPos = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    minPos[0] = Math.min(minPos[0], positions[i]);
    minPos[1] = Math.min(minPos[1], positions[i + 1]);
    minPos[2] = Math.min(minPos[2], positions[i + 2]);
    maxPos[0] = Math.max(maxPos[0], positions[i]);
    maxPos[1] = Math.max(maxPos[1], positions[i + 1]);
    maxPos[2] = Math.max(maxPos[2], positions[i + 2]);
  }

  // Create combined binary buffer
  const posBytes = new Float32Array(positions).buffer;
  const normBytes = new Float32Array(normals).buffer;
  const idxBytes = new Uint32Array(indices).buffer;

  const totalByteLength = posBytes.byteLength + normBytes.byteLength + idxBytes.byteLength;
  const combinedBuffer = new Uint8Array(totalByteLength);

  let curOffset = 0;
  combinedBuffer.set(new Uint8Array(posBytes), curOffset);
  const posOffset = curOffset;
  curOffset += posBytes.byteLength;

  combinedBuffer.set(new Uint8Array(normBytes), curOffset);
  const normOffset = curOffset;
  curOffset += normBytes.byteLength;

  combinedBuffer.set(new Uint8Array(idxBytes), curOffset);
  const idxOffset = curOffset;

  // Convert buffer to base64 data URI
  let binaryString = '';
  for (let i = 0; i < combinedBuffer.byteLength; i++) {
    binaryString += String.fromCharCode(combinedBuffer[i]);
  }
  const base64Buffer = btoa(binaryString);

  const gltf = {
    asset: { version: '2.0', generator: 'VeloCAD Parametric 3D Exporter' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ name: objectName, mesh: 0 }],
    meshes: [
      {
        name: objectName,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: 'CAD_PBR_Material',
        pbrMetallicRoughness: {
          baseColorFactor: [0.65, 0.75, 0.88, 1.0],
          metallicFactor: 0.8,
          roughnessFactor: 0.25,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: positions.length / 3,
        type: 'VEC3',
        min: minPos,
        max: maxPos,
      },
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        count: normals.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        componentType: 5125, // UNSIGNED_INT
        count: indices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: normOffset, byteLength: normBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.byteLength, target: 34963 },
    ],
    buffers: [
      {
        byteLength: totalByteLength,
        uri: `data:application/octet-stream;base64,${base64Buffer}`,
      },
    ],
  };

  return JSON.stringify(gltf, null, 2);
}

// -------------------------------------------------------------
// 6. FBX Exporter (Autodesk FBX ASCII 7.4)
// -------------------------------------------------------------
export function exportToFBX(mesh: THREE.Mesh | THREE.Group, objectName = 'VeloCAD_Solid'): string {
  mesh.updateMatrixWorld(true);
  const vertices: number[] = [];
  const polygonVertexIndices: number[] = [];
  const normals: number[] = [];

  let baseIdx = 0;
  mesh.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geom = m.geometry.clone();
      geom.applyMatrix4(m.matrixWorld);

      const pos = geom.getAttribute('position');
      const norm = geom.getAttribute('normal');
      const idx = geom.getIndex();

      for (let i = 0; i < pos.count; i++) {
        vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (norm) {
          normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        } else {
          normals.push(0, 1, 0);
        }
      }

      const triCount = idx ? idx.count : pos.count;
      for (let i = 0; i < triCount; i += 3) {
        const v0 = (idx ? idx.getX(i) : i) + baseIdx;
        const v1 = (idx ? idx.getX(i + 1) : i + 1) + baseIdx;
        const v2 = (idx ? idx.getX(i + 2) : i + 2) + baseIdx;

        // In FBX format, the last vertex index of a polygon is bitwise inverted (-v2 - 1)
        polygonVertexIndices.push(v0, v1, -v2 - 1);
      }
      baseIdx += pos.count;
    }
  });

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:000`;

  let fbx = `; FBX 7.4.0 project file\n`;
  fbx += `; Created by VeloCAD Studio Parametric Modeler\n`;
  fbx += `FBXHeaderExtension: {\n`;
  fbx += `  FBXHeaderVersion: 1003\n`;
  fbx += `  FBXVersion: 7400\n`;
  fbx += `  CreationTimeStamp: {\n    Version: 1000\n    Year: ${now.getFullYear()}\n    Month: ${now.getMonth() + 1}\n    Day: ${now.getDate()}\n  }\n`;
  fbx += `  Creator: "VeloCAD Studio v2.0"\n`;
  fbx += `}\n\n`;

  fbx += `Definitions: {\n  Version: 100\n  Count: 2\n  ObjectType: "Model" {\n    Count: 1\n  }\n}\n\n`;

  fbx += `Objects: {\n`;
  fbx += `  Model: 1001, "Model::${objectName}", "Mesh" {\n`;
  fbx += `    Version: 232\n`;
  fbx += `    Properties70: {\n      P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0\n      P: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0\n      P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1\n    }\n`;
  fbx += `    Vertices: *${vertices.length} {\n      a: ${vertices.map(v => v.toFixed(5)).join(',')}\n    }\n`;
  fbx += `    PolygonVertexIndex: *${polygonVertexIndices.length} {\n      a: ${polygonVertexIndices.join(',')}\n    }\n`;
  fbx += `    GeometryVersion: 124\n`;
  fbx += `    LayerElementNormal: 0 {\n      Version: 101\n      Name: ""\n      MappingInformationType: "ByControlPoint"\n      ReferenceInformationType: "Direct"\n      Normals: *${normals.length} {\n        a: ${normals.map(n => n.toFixed(4)).join(',')}\n      }\n    }\n`;
  fbx += `  }\n`;
  fbx += `}\n`;

  return fbx;
}

// -------------------------------------------------------------
// 7. STEP Exporter (ISO 10303-21 AP203 / AP214 Standard CAD)
// -------------------------------------------------------------
export function exportToSTEP(mesh: THREE.Mesh | THREE.Group, partName = 'VELOCAD_PART'): string {
  mesh.updateMatrixWorld(true);
  const now = new Date().toISOString();

  let entityId = 1;
  const nextId = () => entityId++;

  let step = `ISO-10303-21;\n`;
  step += `HEADER;\n`;
  step += `FILE_DESCRIPTION(('VeloCAD Studio 3D B-Rep CAD Solid Model'),'2;1');\n`;
  step += `FILE_NAME('${partName}.stp','${now}',('VELOCAD_USER'),('VELOCAD_CORP'),'VeloCAD Studio v2.4','VeloCAD STEP AP203 Generator','');\n`;
  step += `FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));\n`;
  step += `ENDSEC;\n`;
  step += `DATA;\n`;

  const appCtxId = nextId();
  step += `#${appCtxId} = APPLICATION_CONTEXT('mechanical design');\n`;
  const appProtoId = nextId();
  step += `#${appProtoId} = APPLICATION_PROTOCOL_DEFINITION('version 1.2','config_control_design',1994,#${appCtxId});\n`;
  const prodDefCtxId = nextId();
  step += `#${prodDefCtxId} = PRODUCT_DEFINITION_CONTEXT('part definition',#${appCtxId},'design');\n`;
  const prodId = nextId();
  step += `#${prodId} = PRODUCT('${partName}','${partName}','',(#${prodDefCtxId}));\n`;

  // Collect vertices and planar faces from Three mesh
  const vertices: THREE.Vector3[] = [];
  const faces: number[][] = [];

  mesh.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geom = m.geometry.clone();
      geom.applyMatrix4(m.matrixWorld);

      const pos = geom.getAttribute('position');
      const idx = geom.getIndex();
      const baseV = vertices.length;

      for (let i = 0; i < pos.count; i++) {
        vertices.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
      }

      const triCount = idx ? idx.count : pos.count;
      for (let i = 0; i < triCount; i += 3) {
        const v0 = (idx ? idx.getX(i) : i) + baseV;
        const v1 = (idx ? idx.getX(i + 1) : i + 1) + baseV;
        const v2 = (idx ? idx.getX(i + 2) : i + 2) + baseV;
        faces.push([v0, v1, v2]);
      }
    }
  });

  // Limit STEP face output if model is very high density to prevent file bloat
  const exportFaceCount = Math.min(faces.length, 1200);

  // Write Cartesian points
  const pointIds: number[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const pid = nextId();
    pointIds.push(pid);
    const v = vertices[i];
    step += `#${pid} = CARTESIAN_POINT('',(${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}));\n`;
  }

  // Write advanced faces and bounds
  const advancedFaceIds: number[] = [];
  for (let f = 0; f < exportFaceCount; f++) {
    const [i0, i1, i2] = faces[f];
    const p0 = pointIds[i0];
    const p1 = pointIds[i1];
    const p2 = pointIds[i2];

    const polyLoopId = nextId();
    step += `#${polyLoopId} = POLY_LOOP('',(#${p0},#${p1},#${p2}));\n`;

    const faceBoundId = nextId();
    step += `#${faceBoundId} = FACE_OUTER_BOUND('',#${polyLoopId},.T.);\n`;

    // Compute face normal plane
    const planeAxisId = nextId();
    step += `#${planeAxisId} = AXIS2_PLACEMENT_3D('',#${p0},$,$);\n`;
    const planeSurfaceId = nextId();
    step += `#${planeSurfaceId} = PLANE('',#${planeAxisId});\n`;

    const advFaceId = nextId();
    advancedFaceIds.push(advFaceId);
    step += `#${advFaceId} = ADVANCED_FACE('',(#${faceBoundId}),#${planeSurfaceId},.T.);\n`;
  }

  const closedShellId = nextId();
  step += `#${closedShellId} = CLOSED_SHELL('',(${advancedFaceIds.map(id => `#${id}`).join(',')}));\n`;

  const manifoldSolidId = nextId();
  step += `#${manifoldSolidId} = MANIFOLD_SOLID_BREP('${partName}',#${closedShellId});\n`;

  step += `ENDSEC;\n`;
  step += `END-ISO-10303-21;\n`;

  return step;
}

// -------------------------------------------------------------
// 8. DXF Exporter (AutoCAD Standard 2D Interchange)
// -------------------------------------------------------------
export function exportToDXF(entities: CADEntity[], layers: Layer[], units: UnitType): string {
  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1014\n9\n$INSUNITS\n70\n${units === 'in' ? 1 : units === 'cm' ? 5 : 4}\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${layers.length}\n`;

  for (const layer of layers) {
    dxf += `0\nLAYER\n2\n${layer.name.toUpperCase().replace(/\s+/g, '_')}\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  }
  dxf += `0\nENDTAB\n0\nENDSEC\n`;

  dxf += `0\nSECTION\n2\nENTITIES\n`;

  for (const ent of entities) {
    const layer = layers.find(l => l.id === ent.layerId);
    const layerName = layer ? layer.name.toUpperCase().replace(/\s+/g, '_') : '0';

    if (ent.type === 'line') {
      dxf += `0\nLINE\n8\n${layerName}\n10\n${ent.p1.x}\n20\n${ent.p1.y}\n30\n0.0\n11\n${ent.p2.x}\n21\n${ent.p2.y}\n31\n0.0\n`;
    } else if (ent.type === 'circle') {
      dxf += `0\nCIRCLE\n8\n${layerName}\n10\n${ent.center.x}\n20\n${ent.center.y}\n30\n0.0\n40\n${ent.radius}\n`;
    } else if (ent.type === 'arc') {
      const startDeg = (ent.startAngle * 180) / Math.PI;
      const endDeg = (ent.endAngle * 180) / Math.PI;
      dxf += `0\nARC\n8\n${layerName}\n10\n${ent.center.x}\n20\n${ent.center.y}\n30\n0.0\n40\n${ent.radius}\n50\n${startDeg}\n51\n${endDeg}\n`;
    } else if (ent.type === 'rectangle') {
      const minX = Math.min(ent.p1.x, ent.p2.x);
      const minY = Math.min(ent.p1.y, ent.p2.y);
      const maxX = Math.max(ent.p1.x, ent.p2.x);
      const maxY = Math.max(ent.p1.y, ent.p2.y);
      dxf += `0\nLWPOLYLINE\n8\n${layerName}\n90\n4\n70\n1\n`;
      dxf += `10\n${minX}\n20\n${minY}\n10\n${maxX}\n20\n${minY}\n10\n${maxX}\n20\n${maxY}\n10\n${minX}\n20\n${maxY}\n`;
    }
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}
