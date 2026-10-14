import React, { useState } from 'react';
import { Layer, CADEntity } from '../types/cad';
import { Layers, Eye, EyeOff, Lock, Unlock, Plus, Trash2, Check } from 'lucide-react';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string;
  entities: CADEntity[];
  onSelectActiveLayer: (layerId: string) => void;
  onUpdateLayers: (layers: Layer[]) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  activeLayerId,
  entities,
  onSelectActiveLayer,
  onUpdateLayers,
}) => {
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#38bdf8');

  const toggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateLayers(
      layers.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateLayers(
      layers.map(l => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleAddLayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerName.trim()) return;

    const newLayer: Layer = {
      id: 'layer_' + Math.random().toString(36).substring(2, 9),
      name: newLayerName.trim(),
      color: newLayerColor,
      visible: true,
      locked: false,
      lineStyle: 'solid',
    };

    onUpdateLayers([...layers, newLayer]);
    onSelectActiveLayer(newLayer.id);
    setNewLayerName('');
  };

  const handleDeleteLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layers.length <= 1) return;
    const remaining = layers.filter(l => l.id !== id);
    onUpdateLayers(remaining);
    if (activeLayerId === id) {
      onSelectActiveLayer(remaining[0].id);
    }
  };

  const PRESET_COLORS = [
    '#38bdf8', '#34d399', '#f59e0b', '#f43f5e', '#a855f7', '#ec4899', '#94a3b8', '#e2e8f0',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">CAD Layers</span>
        </div>
        <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
          {layers.length}
        </span>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map(layer => {
          const count = entities.filter(e => e.layerId === layer.id).length;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectActiveLayer(layer.id)}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition ${
                isActive
                  ? 'bg-slate-800 border border-sky-500/50 shadow-sm'
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-xs"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs truncate font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {layer.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {count} {count === 1 ? 'entity' : 'entities'} • {layer.lineStyle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                <button
                  type="button"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={e => toggleVisibility(layer.id, e)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  {layer.visible ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </button>
                <button
                  type="button"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={e => toggleLock(layer.id, e)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                </button>
                {layers.length > 1 && (
                  <button
                    type="button"
                    title="Delete layer"
                    onClick={e => handleDeleteLayer(layer.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Layer Form */}
      <form onSubmit={handleAddLayer} className="p-3 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-2">
        <input
          type="text"
          placeholder="New layer name..."
          value={newLayerName}
          onChange={e => setNewLayerName(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {PRESET_COLORS.slice(0, 5).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewLayerColor(c)}
                className={`w-4 h-4 rounded-full border transition ${
                  newLayerColor === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={!newLayerName.trim()}
            className="px-2.5 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </form>
    </div>
  );
};
