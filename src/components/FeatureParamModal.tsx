import React, { useState } from 'react';
import {
  CADFeature,
  ExtrudeFeature,
  RevolveFeature,
  ExtrudeCutFeature,
  UnitType,
} from '../types/cad';
import { Box, RotateCcw, Scissors, X, Check } from 'lucide-react';

interface FeatureParamModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureType: 'extrude' | 'revolve' | 'cut';
  existingFeature?: CADFeature | null;
  units: UnitType;
  onSaveFeature: (feature: CADFeature) => void;
}

export const FeatureParamModal: React.FC<FeatureParamModalProps> = ({
  isOpen,
  onClose,
  featureType,
  existingFeature,
  units,
  onSaveFeature,
}) => {
  // Extrude form state
  const [extrudeName, setExtrudeName] = useState(
    existingFeature?.name || (featureType === 'extrude' ? 'Solid Extrude 1' : '')
  );
  const [extrudeDepth, setExtrudeDepth] = useState<number>(
    existingFeature?.type === 'extrude' ? existingFeature.depth : 25
  );
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(
    existingFeature?.type === 'extrude' ? existingFeature.bevelEnabled : true
  );
  const [bevelThickness, setBevelThickness] = useState<number>(
    existingFeature?.type === 'extrude' ? existingFeature.bevelThickness : 1.5
  );

  // Revolve form state
  const [revolveName, setRevolveName] = useState(
    existingFeature?.name || (featureType === 'revolve' ? '360° Revolve 1' : '')
  );
  const [revolveAngle, setRevolveAngle] = useState<number>(
    existingFeature?.type === 'revolve' ? existingFeature.angle : 360
  );
  const [revolveAxis, setRevolveAxis] = useState<'x' | 'y'>(
    existingFeature?.type === 'revolve' ? (existingFeature.axis as 'x' | 'y') : 'y'
  );
  const [revolveOffset, setRevolveOffset] = useState<number>(
    existingFeature?.type === 'revolve' ? existingFeature.axisOffset : 0
  );

  // Extrude-Cut form state
  const [cutName, setCutName] = useState(
    existingFeature?.name || (featureType === 'cut' ? 'Pocket Extrude-Cut 1' : '')
  );
  const [cutDepth, setCutDepth] = useState<number>(
    existingFeature?.type === 'cut' ? existingFeature.depth : 20
  );
  const [throughAll, setThroughAll] = useState<boolean>(
    existingFeature?.type === 'cut' ? existingFeature.throughAll : true
  );
  const [cutShape, setCutShape] = useState<'circle' | 'rect'>(
    existingFeature?.type === 'cut' ? existingFeature.shapeType : 'circle'
  );
  const [cutRadius, setCutRadius] = useState<number>(
    existingFeature?.type === 'cut' && existingFeature.cutRadius ? existingFeature.cutRadius : 14
  );
  const [cutWidth, setCutWidth] = useState<number>(
    existingFeature?.type === 'cut' && existingFeature.cutWidth ? existingFeature.cutWidth : 30
  );
  const [cutHeight, setCutHeight] = useState<number>(
    existingFeature?.type === 'cut' && existingFeature.cutHeight ? existingFeature.cutHeight : 20
  );
  const [cutPosX, setCutPosX] = useState<number>(
    existingFeature?.type === 'cut' ? existingFeature.cutPosition.x : 0
  );
  const [cutPosY, setCutPosY] = useState<number>(
    existingFeature?.type === 'cut' ? existingFeature.cutPosition.y : 0
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = existingFeature?.id || 'feat_' + Math.random().toString(36).substring(2, 9);

    if (featureType === 'extrude') {
      const feature: ExtrudeFeature = {
        id,
        type: 'extrude',
        name: extrudeName || 'Solid Extrude',
        depth: Number(extrudeDepth),
        taper: 0,
        bevelEnabled,
        bevelThickness: Number(bevelThickness),
        bevelSize: Number(bevelThickness),
        bevelSegments: 3,
        visible: true,
        layerIds: [],
      };
      onSaveFeature(feature);
    } else if (featureType === 'revolve') {
      const feature: RevolveFeature = {
        id,
        type: 'revolve',
        name: revolveName || 'Revolve Solid',
        angle: Number(revolveAngle),
        axis: revolveAxis,
        axisOffset: Number(revolveOffset),
        segments: 64,
        visible: true,
        layerIds: [],
      };
      onSaveFeature(feature);
    } else if (featureType === 'cut') {
      const feature: ExtrudeCutFeature = {
        id,
        type: 'cut',
        name: cutName || 'Extrude Cut',
        depth: Number(cutDepth),
        throughAll,
        cutPosition: { x: Number(cutPosX), y: Number(cutPosY) },
        cutRadius: Number(cutRadius),
        cutWidth: Number(cutWidth),
        cutHeight: Number(cutHeight),
        shapeType: cutShape,
        visible: true,
      };
      onSaveFeature(feature);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl">
              {featureType === 'extrude' && <Box className="w-5 h-5 text-sky-400" />}
              {featureType === 'revolve' && <RotateCcw className="w-5 h-5 text-emerald-400" />}
              {featureType === 'cut' && <Scissors className="w-5 h-5 text-rose-400" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white capitalize">
                {existingFeature ? 'Edit' : 'Create'} {featureType === 'cut' ? 'Extrude-Cut (CSG)' : featureType} Feature
              </h2>
              <p className="text-xs text-slate-400">Configure parametric dimensions and options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Feature 1: Extrude */}
          {featureType === 'extrude' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Feature Name</label>
                <input
                  type="text"
                  value={extrudeName}
                  onChange={e => setExtrudeName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Extrusion Depth / Length ({units})
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.5"
                  value={extrudeDepth}
                  onChange={e => setExtrudeDepth(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={bevelEnabled}
                    onChange={e => setBevelEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-sky-500"
                  />
                  <span>Add Chamfer / Bevel Edges</span>
                </label>

                {bevelEnabled && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bevel Size ({units})</label>
                    <input
                      type="number"
                      min="0.2"
                      max="10"
                      step="0.2"
                      value={bevelThickness}
                      onChange={e => setBevelThickness(parseFloat(e.target.value) || 0.5)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Feature 2: Revolve */}
          {featureType === 'revolve' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Feature Name</label>
                <input
                  type="text"
                  value={revolveName}
                  onChange={e => setRevolveName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Revolve Angle (Degrees)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="30"
                    max="360"
                    step="5"
                    value={revolveAngle}
                    onChange={e => setRevolveAngle(parseInt(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="font-mono text-xs text-emerald-400 w-12">{revolveAngle}°</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Revolution Axis</label>
                  <select
                    value={revolveAxis}
                    onChange={e => setRevolveAxis(e.target.value as 'x' | 'y')}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="y">Y-Axis (Vertical)</option>
                    <option value="x">X-Axis (Horizontal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Axis Offset ({units})</label>
                  <input
                    type="number"
                    value={revolveOffset}
                    onChange={e => setRevolveOffset(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Feature 3: Extrude-Cut */}
          {featureType === 'cut' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cut Feature Name</label>
                <input
                  type="text"
                  value={cutName}
                  onChange={e => setCutName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cutter Shape</label>
                  <select
                    value={cutShape}
                    onChange={e => setCutShape(e.target.value as 'circle' | 'rect')}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="circle">Hole (Cylindrical)</option>
                    <option value="rect">Pocket (Rectangular)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cut Extent</label>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={throughAll}
                        onChange={e => setThroughAll(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-rose-500"
                      />
                      <span>Through All</span>
                    </label>
                  </div>
                </div>
              </div>

              {!throughAll && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cut Depth ({units})</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={cutDepth}
                    onChange={e => setCutDepth(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {cutShape === 'circle' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bore Radius ({units})</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={cutRadius}
                    onChange={e => setCutRadius(parseFloat(e.target.value) || 5)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Width ({units})</label>
                    <input
                      type="number"
                      min="1"
                      value={cutWidth}
                      onChange={e => setCutWidth(parseFloat(e.target.value) || 5)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Height ({units})</label>
                    <input
                      type="number"
                      min="1"
                      value={cutHeight}
                      onChange={e => setCutHeight(parseFloat(e.target.value) || 5)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Center X ({units})</label>
                  <input
                    type="number"
                    value={cutPosX}
                    onChange={e => setCutPosX(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Center Y ({units})</label>
                  <input
                    type="number"
                    value={cutPosY}
                    onChange={e => setCutPosY(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg flex items-center gap-1.5 transition"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Feature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
