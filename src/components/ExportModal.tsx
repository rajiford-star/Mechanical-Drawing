import React, { useState } from 'react';
import * as THREE from 'three';
import { CADEntity, CADFeature, Layer, MeshDensity, UnitType } from '../types/cad';
import {
  exportToSVG,
  exportToPDF,
  exportToSTL,
  exportToOBJ,
  exportToGLTF,
  exportToFBX,
  exportToSTEP,
  exportToDXF,
  downloadFile,
} from '../utils/exporters';
import { buildCADSolid } from '../utils/solidBuilder';
import { getCADMaterial } from '../utils/materials';
import { X, Download, FileCode, CheckCircle2, Sliders, Layers, Smartphone } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: CADEntity[];
  features: CADFeature[];
  layers: Layer[];
  projectName: string;
  units: UnitType;
  currentMeshDensity: MeshDensity;
  onOpenAndroidExportModal?: () => void;
}

export type ExportFormat =
  | 'PNG'
  | 'JPEG'
  | 'PDF'
  | 'SVG'
  | 'STL'
  | 'OBJ'
  | 'GLTF'
  | 'FBX'
  | 'STEP'
  | 'DXF';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entities,
  features,
  layers,
  projectName,
  units,
  currentMeshDensity,
  onOpenAndroidExportModal,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('STL');
  const [meshDensity, setMeshDensity] = useState<MeshDensity>(currentMeshDensity);
  const [stlBinary, setStlBinary] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const sanitizedName = (projectName || 'VeloCAD_Model').replace(/\s+/g, '_');

      if (selectedFormat === 'SVG') {
        const svgStr = exportToSVG(entities, layers, units);
        downloadFile(svgStr, `${sanitizedName}.svg`, 'image/svg+xml');
      } else if (selectedFormat === 'PDF') {
        const pdfStr = exportToPDF(entities, layers, projectName, units);
        downloadFile(pdfStr, `${sanitizedName}.pdf`, 'application/pdf');
      } else if (selectedFormat === 'DXF') {
        const dxfStr = exportToDXF(entities, layers, units);
        downloadFile(dxfStr, `${sanitizedName}.dxf`, 'application/dxf');
      } else if (selectedFormat === 'PNG' || selectedFormat === 'JPEG') {
        // Find existing canvas in document
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const mime = selectedFormat === 'PNG' ? 'image/png' : 'image/jpeg';
          const ext = selectedFormat.toLowerCase();
          canvas.toBlob(blob => {
            if (blob) {
              downloadFile(blob, `${sanitizedName}.${ext}`, mime);
            }
          }, mime, 0.95);
        }
      } else {
        // 3D Solids: STL, OBJ, GLTF, FBX, STEP
        const dummyMat = getCADMaterial('aluminum');
        const { rootGroup } = buildCADSolid(entities, features, meshDensity, dummyMat);

        if (selectedFormat === 'STL') {
          const stlData = exportToSTL(rootGroup, stlBinary);
          const mime = stlBinary ? 'application/octet-stream' : 'text/plain';
          downloadFile(stlData, `${sanitizedName}.stl`, mime);
        } else if (selectedFormat === 'OBJ') {
          const { obj, mtl } = exportToOBJ(rootGroup, sanitizedName);
          downloadFile(obj, `${sanitizedName}.obj`, 'text/plain');
          downloadFile(mtl, `${sanitizedName}.mtl`, 'text/plain');
        } else if (selectedFormat === 'GLTF') {
          const gltfJson = exportToGLTF(rootGroup, sanitizedName);
          downloadFile(gltfJson, `${sanitizedName}.gltf`, 'model/gltf+json');
        } else if (selectedFormat === 'FBX') {
          const fbxStr = exportToFBX(rootGroup, sanitizedName);
          downloadFile(fbxStr, `${sanitizedName}.fbx`, 'text/plain');
        } else if (selectedFormat === 'STEP') {
          const stepStr = exportToSTEP(rootGroup, sanitizedName);
          downloadFile(stepStr, `${sanitizedName}.stp`, 'application/step');
        }
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const FORMATS: Array<{
    id: ExportFormat;
    name: string;
    type: '2D Drawing' | '3D Solid Model' | 'Raster Image';
    desc: string;
    badge: string;
  }> = [
    { id: 'STL', name: 'STL (.stl)', type: '3D Solid Model', desc: 'Standard Stereolithography for 3D printing & CAM', badge: 'Standard 3D' },
    { id: 'STEP', name: 'STEP (.stp / .step)', type: '3D Solid Model', desc: 'ISO 10303-21 AP203/214 B-Rep for SolidWorks/Fusion', badge: 'Pro CAD' },
    { id: 'OBJ', name: 'Wavefront OBJ (.obj)', type: '3D Solid Model', desc: 'Geometry & Material definition (.obj + .mtl)', badge: 'Universal' },
    { id: 'GLTF', name: 'glTF 2.0 (.gltf)', type: '3D Solid Model', desc: 'Modern Web3D transmission with PBR parameters', badge: 'Modern 3D' },
    { id: 'FBX', name: 'Autodesk FBX (.fbx)', type: '3D Solid Model', desc: 'Autodesk interchange format for animation/VR', badge: 'Autodesk' },
    { id: 'SVG', name: 'Scalable Vector (.svg)', type: '2D Drawing', desc: 'Layered vector drawing with stroke styles', badge: 'Vector' },
    { id: 'PDF', name: 'Technical PDF (.pdf)', type: '2D Drawing', desc: 'Engineering specification sheet with title block', badge: 'Print' },
    { id: 'DXF', name: 'AutoCAD DXF (.dxf)', type: '2D Drawing', desc: 'AutoCAD drawing exchange format with layers', badge: 'AutoCAD' },
    { id: 'PNG', name: 'PNG Image (.png)', type: 'Raster Image', desc: 'Lossless raster snapshot of current canvas', badge: 'Image' },
    { id: 'JPEG', name: 'JPEG Image (.jpeg)', type: 'Raster Image', desc: 'High quality compressed photo capture', badge: 'Image' },
  ];

  const is3DFormat = ['STL', 'STEP', 'OBJ', 'GLTF', 'FBX'].includes(selectedFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl">
              <Download className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Export CAD Design</h2>
              <p className="text-xs text-slate-400">Export layered 2D sketches or solid 3D models into industry standards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Android Package Callout */}
          {onOpenAndroidExportModal && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-neutral-900 border border-emerald-600/40 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950 rounded-lg text-emerald-400 border border-emerald-700/50">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Android Application Package</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-bold">
                      .APK & .AAB
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Looking to install on mobile or publish to Google Play Store?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAndroidExportModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs transition cursor-pointer shrink-0"
              >
                Export APK / AAB...
              </button>
            </div>
          )}

          {/* Format selection grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Select Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {FORMATS.map(f => {
                const isSelected = selectedFormat === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormat(f.id)}
                    className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono">{f.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                      {f.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D Mesh Density Settings */}
          {is3DFormat && (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200">Mesh Tessellation Density</span>
                </div>
                <span className="text-[11px] font-mono text-sky-400 capitalize">
                  {meshDensity} ({meshDensity === 'draft' ? '12-24' : meshDensity === 'standard' ? '32-48' : meshDensity === 'fine' ? '64-72' : '128'} Segments)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['draft', 'standard', 'fine', 'ultra'] as MeshDensity[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setMeshDensity(d)}
                    className={`py-1.5 text-xs font-medium rounded-lg capitalize transition border ${
                      meshDensity === d
                        ? 'bg-sky-600 border-sky-400 text-white font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {selectedFormat === 'STL' && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <span>STL Format Type:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStlBinary(true)}
                      className={`px-2 py-0.5 rounded text-[11px] ${stlBinary ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Binary (Compact)
                    </button>
                    <button
                      onClick={() => setStlBinary(false)}
                      className={`px-2 py-0.5 rounded text-[11px] ${!stlBinary ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      ASCII
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Details */}
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Project: <strong className="text-slate-200">{projectName}</strong></span>
              <span>•</span>
              <span>Units: <strong className="text-slate-200">{units.toUpperCase()}</strong></span>
              <span>•</span>
              <span>Entities: <strong className="text-slate-200">{entities.length}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500">
              ISO / ASME Compliant
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {exportSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Exported successfully!
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Generating...' : `Export ${selectedFormat}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
