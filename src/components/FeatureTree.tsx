import React from 'react';
import { CADFeature, ExtrudeFeature, RevolveFeature, ExtrudeCutFeature, UnitType } from '../types/cad';
import { Box, RotateCcw, Scissors, Eye, EyeOff, Trash2, Edit3, Settings } from 'lucide-react';

interface FeatureTreeProps {
  features: CADFeature[];
  units: UnitType;
  onUpdateFeatures: (features: CADFeature[]) => void;
  onEditFeature: (feature: CADFeature) => void;
}

export const FeatureTree: React.FC<FeatureTreeProps> = ({
  features,
  units,
  onUpdateFeatures,
  onEditFeature,
}) => {
  const toggleFeatureVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateFeatures(
      features.map(f => (f.id === id ? { ...f, visible: !f.visible } : f))
    );
  };

  const deleteFeature = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateFeatures(features.filter(f => f.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 w-64 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Feature Tree</span>
        </div>
        <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
          {features.length}
        </span>
      </div>

      {/* Feature list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {features.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No 3D features applied.
            <div className="mt-1 text-[11px] text-slate-600">
              Use Extrude or Revolve below to generate 3D solids.
            </div>
          </div>
        ) : (
          features.map((feature, idx) => {
            const isExtrude = feature.type === 'extrude';
            const isRevolve = feature.type === 'revolve';
            const isCut = feature.type === 'cut';

            return (
              <div
                key={feature.id}
                className="group p-2.5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExtrude && <Box className="w-4 h-4 text-sky-400" />}
                    {isRevolve && <RotateCcw className="w-4 h-4 text-emerald-400" />}
                    {isCut && <Scissors className="w-4 h-4 text-rose-400" />}
                    <span className="text-xs font-semibold text-slate-200">{feature.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={feature.visible ? 'Hide feature' : 'Show feature'}
                      onClick={e => toggleFeatureVisibility(feature.id, e)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      {feature.visible ? (
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Edit feature parameters"
                      onClick={() => onEditFeature(feature)}
                      className="p-1 text-slate-400 hover:text-sky-400 rounded"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete feature"
                      onClick={e => deleteFeature(feature.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Parameters summary */}
                <div className="text-[11px] font-mono text-slate-400 pl-6 flex flex-wrap gap-2">
                  {isExtrude && (
                    <>
                      <span>Depth: {(feature as ExtrudeFeature).depth} {units}</span>
                      {(feature as ExtrudeFeature).bevelEnabled && <span>• Bevel: {(feature as ExtrudeFeature).bevelThickness}</span>}
                    </>
                  )}
                  {isRevolve && (
                    <>
                      <span>Angle: {(feature as RevolveFeature).angle}°</span>
                      <span>• Axis: {(feature as RevolveFeature).axis.toUpperCase()}</span>
                    </>
                  )}
                  {isCut && (
                    <>
                      <span>{(feature as ExtrudeCutFeature).throughAll ? 'Through-All' : `Depth: ${(feature as ExtrudeCutFeature).depth} ${units}`}</span>
                      <span>• Shape: {(feature as ExtrudeCutFeature).shapeType}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
