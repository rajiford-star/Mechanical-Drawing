import React from 'react';
import { UnitType } from '../types/cad';
import { SAMPLE_MODELS } from '../utils/samples';
import {
  Compass,
  Box,
  Layers,
  Download,
  Cloud,
  Code2,
  Undo2,
  Redo2,
  Magnet,
  Maximize,
  HelpCircle,
  FileBox,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

interface ToolbarProps {
  mode: '2d' | '3d';
  onModeChange: (mode: '2d' | '3d') => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  units: UnitType;
  onUnitsChange: (units: UnitType) => void;
  gridSnap: boolean;
  onToggleGridSnap: () => void;
  orthoMode: boolean;
  onToggleOrthoMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExportModal: () => void;
  onOpenCloudSyncModal: () => void;
  onOpenPluginModal: () => void;
  onLoadSample: (sampleId: string) => void;
  onToggleLayers: () => void;
  onToggleFeatures: () => void;
  showLayers: boolean;
  showFeatures: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onModeChange,
  projectName,
  onProjectNameChange,
  units,
  onUnitsChange,
  gridSnap,
  onToggleGridSnap,
  orthoMode,
  onToggleOrthoMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExportModal,
  onOpenCloudSyncModal,
  onOpenPluginModal,
  onLoadSample,
  onToggleLayers,
  onToggleFeatures,
  showLayers,
  showFeatures,
}) => {
  return (
    <header className="h-13 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-slate-200 select-none shrink-0 z-30">
      {/* Left: Branding & Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              VELOCAD <span className="text-[10px] font-mono font-normal text-sky-400 bg-sky-950/80 px-1 py-0.2 rounded border border-sky-800/80">STUDIO</span>
            </div>
          </div>
        </div>

        {/* 2D / 3D Mode Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 ml-2">
          <button
            onClick={() => onModeChange('2d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === '2d'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            2D Sketch
          </button>
          <button
            onClick={() => onModeChange('3d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === '3d'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Solid Model
          </button>
        </div>

        {/* Project Name editable */}
        <input
          type="text"
          value={projectName}
          onChange={e => onProjectNameChange(e.target.value)}
          className="text-xs font-medium text-slate-300 bg-transparent hover:bg-slate-800/60 focus:bg-slate-950 px-2 py-1 rounded border border-transparent focus:border-slate-700 outline-none w-36 sm:w-48 truncate"
          title="Click to rename project"
        />
      </div>

      {/* Center: Quick Engineering Samples & CAD Toggles */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Sample presets */}
        <div className="relative group">
          <button className="px-2.5 py-1 text-xs bg-slate-800/70 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/60 flex items-center gap-1.5 transition">
            <FileBox className="w-3.5 h-3.5 text-sky-400" />
            <span>Load Sample CAD</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Engineering Blueprints
            </div>
            {SAMPLE_MODELS.map(s => (
              <button
                key={s.id}
                onClick={() => onLoadSample(s.id)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex flex-col"
              >
                <span className="font-medium text-white">{s.name}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1">{s.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snapping & Ortho */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={onToggleGridSnap}
            title="Toggle Grid Snapping"
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition ${
              gridSnap ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Magnet className="w-3 h-3" />
            Snap
          </button>
          <button
            onClick={onToggleOrthoMode}
            title="Toggle Ortho Constraint (Shift)"
            className={`px-2 py-1 text-[11px] font-medium rounded transition ${
              orthoMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ortho
          </button>
        </div>

        {/* Units Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          {(['mm', 'cm', 'in'] as UnitType[]).map(u => (
            <button
              key={u}
              onClick={() => onUnitsChange(u)}
              className={`px-2 py-0.5 rounded uppercase font-mono font-medium transition ${
                units === u ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cloud Sync, Plugins, Layers & Export Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Layers Sidebar */}
        <button
          onClick={onToggleLayers}
          title="Toggle Layers Panel"
          className={`p-1.5 rounded-lg border transition ${
            showLayers ? 'bg-slate-800 text-sky-400 border-sky-500/50' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Toggle Feature Tree Sidebar */}
        {mode === '3d' && (
          <button
            onClick={onToggleFeatures}
            title="Toggle Parametric Feature Tree"
            className={`p-1.5 rounded-lg border transition ${
              showFeatures ? 'bg-slate-800 text-sky-400 border-sky-500/50' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
          </button>
        )}

        {/* CAD Plugins & Ecosystem Hub */}
        <button
          onClick={onOpenPluginModal}
          title="CAD Plugins & Workflow Integration"
          className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl flex items-center gap-1.5 transition"
        >
          <Code2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">CAD Plugins</span>
        </button>

        {/* Cloud Sync & Collaboration */}
        <button
          onClick={onOpenCloudSyncModal}
          title="Cloud Storage Sync & Team Collaboration"
          className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center gap-1.5 transition"
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Cloud Sync</span>
        </button>

        {/* Primary Export Button */}
        <button
          onClick={onOpenExportModal}
          className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl shadow-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CAD</span>
        </button>
      </div>
    </header>
  );
};
