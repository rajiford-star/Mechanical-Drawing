import React, { useState, useRef, useEffect } from 'react';
import {
  CADEntity,
  ToolType,
  CameraViewPreset,
  MeshDensity,
  MaterialFinish,
  ShadingMode,
  UnitType,
  ObjectSnapConfig,
  DimensionMentionConfig,
} from '../types/cad';
import { SAMPLE_MODELS } from '../utils/samples';
import { getEntityDimensionMention } from '../utils/dimensionMentions';
import {
  Pencil,
  Eye,
  Box,
  Folder,
  MousePointer,
  Minus,
  Square,
  Circle as CircleIcon,
  RotateCw,
  Scissors,
  Eraser,
  Ruler,
  Crosshair,
  Download,
  Upload,
  Cloud,
  Code2,
  Undo2,
  Redo2,
  Magnet,
  Maximize2,
  Compass,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  Sliders,
  Smartphone,
  Copy,
  Plus,
  Save,
  Clock,
  HardDrive,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { AutoSavePayload, formatTimeAgo } from '../utils/autoSave';

interface TechDrawHeaderProps {
  mode: '2d' | '3d';
  onModeChange: (mode: '2d' | '3d') => void;
  activeTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  units: UnitType;
  onUnitsChange: (units: UnitType) => void;
  gridSnap: boolean;
  onToggleGridSnap: () => void;
  orthoMode: boolean;
  onToggleOrthoMode: () => void;
  objectSnapConfig?: ObjectSnapConfig;
  onToggleObjectSnap?: () => void;
  dimensionMentionConfig?: DimensionMentionConfig;
  onToggleDimensionMention?: () => void;
  onToggleShowAllDimensions?: () => void;
  selectedEntity?: CADEntity | null;
  onAddDimensionToSelected?: () => void;
  onSelectPlane: (view: CameraViewPreset) => void;
  onZoomExtents: () => void;
  onAddExtrude: () => void;
  onAddRevolve: () => void;
  onAddExtrudeCut: () => void;
  shadingMode: ShadingMode;
  onShadingChange: (mode: ShadingMode) => void;
  materialFinish: MaterialFinish;
  onMaterialChange: (material: MaterialFinish) => void;
  meshDensity: MeshDensity;
  onMeshDensityChange: (density: MeshDensity) => void;
  onOpenExportModal: () => void;
  onOpenAndroidExportModal: () => void;
  onOpenCloudSyncModal: () => void;
  onOpenPluginModal: () => void;
  onLoadSample: (sampleId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProjectJSON: () => void;
  onImportProjectJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lastAutoSavedTime?: number | null;
  isAutoSaving?: boolean;
  autoSavePayload?: AutoSavePayload | null;
  onTriggerSaveNow?: () => void;
  onRestoreAutoSave?: () => void;
  onClearAutoSave?: () => void;
}

export const TechDrawHeader: React.FC<TechDrawHeaderProps> = ({
  mode,
  onModeChange,
  activeTool,
  onToolSelect,
  units,
  onUnitsChange,
  gridSnap,
  onToggleGridSnap,
  orthoMode,
  onToggleOrthoMode,
  objectSnapConfig = {
    enabled: true,
    endpoints: true,
    midpoints: true,
    intersections: true,
    centers: true,
    quadrants: true,
  },
  onToggleObjectSnap,
  dimensionMentionConfig = {
    showOnSelected: true,
    showAll: false,
    forceMM: true,
    precision: 2,
  },
  onToggleDimensionMention,
  onToggleShowAllDimensions,
  selectedEntity = null,
  onAddDimensionToSelected,
  onSelectPlane,
  onZoomExtents,
  onAddExtrude,
  onAddRevolve,
  onAddExtrudeCut,
  shadingMode,
  onShadingChange,
  materialFinish,
  onMaterialChange,
  meshDensity,
  onMeshDensityChange,
  onOpenExportModal,
  onOpenAndroidExportModal,
  onOpenCloudSyncModal,
  onOpenPluginModal,
  onLoadSample,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveProjectJSON,
  onImportProjectJSON,
  lastAutoSavedTime = null,
  isAutoSaving = false,
  autoSavePayload = null,
  onTriggerSaveNow,
  onRestoreAutoSave,
  onClearAutoSave,
}) => {
  // Dropdown open states
  const [openMenu, setOpenMenu] = useState<'pencil' | 'view' | '3d' | 'file' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleMenu = (menu: 'pencil' | 'view' | '3d' | 'file') => {
    setOpenMenu(prev => (prev === menu ? null : menu));
  };

  const handleSelect2DTool = (tool: ToolType) => {
    onToolSelect(tool);
    if (mode !== '2d') onModeChange('2d');
    setOpenMenu(null); // Automatically pulls back into draw symbol
  };

  const handleSelect3DAction = (action: () => void) => {
    if (mode !== '3d') onModeChange('3d');
    action();
    setOpenMenu(null); // Automatically pulls back into 3d symbol
  };

  const handleSelectPlaneAction = (view: CameraViewPreset) => {
    onSelectPlane(view);
    setOpenMenu(null); // Automatically pulls back
  };

  const DRAW_TOOLS = [
    { id: 'select', label: 'Select & Transform', icon: MousePointer, key: 'V' },
    { id: 'line', label: 'Line Segment', icon: Minus, key: 'L' },
    { id: 'rectangle', label: 'Rectangle', icon: Square, key: 'R' },
    { id: 'circle', label: 'Circle (Center + Radius)', icon: CircleIcon, key: 'C' },
    { id: 'arc', label: 'Arc / Radius', icon: RotateCw, key: 'A' },
    { id: 'freedraw', label: 'Free Draw (Auto-Vectorize)', icon: Pencil, key: 'P' },
    { id: 'trim', label: 'Trim Intersections', icon: Scissors, key: 'T' },
    { id: 'erase', label: 'Erase Entity', icon: Eraser, key: 'E' },
    { id: 'dimension', label: 'Dimension Annotation', icon: Ruler, key: 'D' },
    { id: 'measure', label: 'Measure Tool (Distance & Angles)', icon: Crosshair, key: 'M' },
  ];

  const currentToolObj = DRAW_TOOLS.find(t => t.id === activeTool) || DRAW_TOOLS[0];
  const ActiveToolIcon = currentToolObj.icon;

  return (
    <header className="bg-black text-white border-b border-neutral-800 select-none shrink-0 z-40">
      {/* 1. App Title Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-neutral-900 bg-black">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center border border-neutral-700">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-neutral-100 uppercase">
            Simple TechDraw
          </h1>
        </div>

        {/* Quick Mode Indicator / Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
            <button
              onClick={() => onModeChange('2d')}
              className={`px-2.5 py-0.5 rounded-md transition ${
                mode === '2d'
                  ? 'bg-neutral-800 text-white font-medium shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              2D Sketch
            </button>
            <button
              onClick={() => onModeChange('3d')}
              className={`px-2.5 py-0.5 rounded-md transition ${
                mode === '3d'
                  ? 'bg-neutral-800 text-cyan-400 font-medium shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              3D Solid
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-neutral-400 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-900">
            <span>UNITS:</span>
            <button
              onClick={() => onUnitsChange(units === 'mm' ? 'cm' : units === 'cm' ? 'in' : 'mm')}
              className="text-cyan-400 font-bold uppercase hover:underline"
            >
              {units}
            </button>
          </div>

          {/* Auto-Save Indicator (every 30s) */}
          <div
            onClick={onTriggerSaveNow}
            title={
              lastAutoSavedTime
                ? `Auto-save runs every 30s to localStorage. Last saved: ${new Date(lastAutoSavedTime).toLocaleTimeString()}. Click to save immediately.`
                : 'Auto-save runs every 30 seconds to browser localStorage. Click to save now.'
            }
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono hover:border-neutral-700 cursor-pointer transition select-none"
          >
            <span className="relative flex h-2 w-2">
              {isAutoSaving && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isAutoSaving
                    ? 'bg-amber-400'
                    : lastAutoSavedTime
                    ? 'bg-emerald-400'
                    : 'bg-emerald-500/70'
                }`}
              ></span>
            </span>
            <span className="text-neutral-400 hidden lg:inline">Auto-Save:</span>
            <span
              className={`font-semibold ${
                isAutoSaving
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {isAutoSaving
                ? 'Saving...'
                : lastAutoSavedTime
                ? formatTimeAgo(lastAutoSavedTime)
                : '30s'}
            </span>
            <Save className="w-3 h-3 text-neutral-500 hover:text-cyan-400 transition ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Dropdown Menus Bar (Pencil, View, 3D, File) */}
      <div ref={menuContainerRef} className="h-10 px-3 flex items-center justify-between bg-black relative">
        <div className="flex items-center gap-1">
          {/* MENU 1: PENCIL (2D DRAW) DROPDOWN */}
          <div className="relative flex items-center">
            <button
              onClick={() => toggleMenu('pencil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                openMenu === 'pencil' || activeTool !== 'select'
                  ? 'bg-neutral-800 text-cyan-400 border border-neutral-700'
                  : 'text-neutral-300 hover:bg-neutral-900 border border-transparent'
              }`}
              title="2D Drawing Options & History"
            >
              <Pencil className="w-3.5 h-3.5 text-cyan-400" />
              <span>Draw</span>
              <span className="text-[10px] text-neutral-400 capitalize">({currentToolObj.label.split(' ')[0]})</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {/* Quick Undo & Redo buttons directly on the Draw menu bar button */}
            <div className="flex items-center bg-neutral-950 rounded-lg border border-neutral-800/80 p-0.5 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUndo();
                }}
                disabled={!canUndo}
                title="Undo last sketch change (Ctrl+Z)"
                className={`p-1.5 rounded-md transition ${
                  canUndo
                    ? 'text-neutral-300 hover:text-cyan-400 hover:bg-neutral-800 cursor-pointer active:scale-95'
                    : 'text-neutral-600 cursor-not-allowed opacity-35'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRedo();
                }}
                disabled={!canRedo}
                title="Redo sketch change (Ctrl+Y)"
                className={`p-1.5 rounded-md transition ${
                  canRedo
                    ? 'text-neutral-300 hover:text-cyan-400 hover:bg-neutral-800 cursor-pointer active:scale-95'
                    : 'text-neutral-600 cursor-not-allowed opacity-35'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu - Auto pulls back on tool selection */}
            {openMenu === 'pencil' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                {/* Dedicated Undo & Redo Action Row on Draw Menu */}
                <div className="p-1.5 bg-neutral-900/90 rounded-lg border border-neutral-800/90 mb-1.5">
                  <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    <span>Draw History</span>
                    <span className="text-[9px] text-neutral-500">
                      {canUndo ? 'Step back / forward' : 'At start'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUndo();
                      }}
                      disabled={!canUndo}
                      title="Undo last drawing stroke or entity (Ctrl+Z)"
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                        canUndo
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-cyan-300 hover:text-white border border-neutral-700/80 active:scale-95 shadow-xs'
                          : 'bg-neutral-950/60 text-neutral-600 border border-neutral-900 cursor-not-allowed opacity-40'
                      }`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                      <span className="text-[9px] font-mono text-neutral-400 bg-neutral-950 px-1 rounded">⌘Z</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRedo();
                      }}
                      disabled={!canRedo}
                      title="Redo drawing stroke or entity (Ctrl+Y)"
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                        canRedo
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-cyan-300 hover:text-white border border-neutral-700/80 active:scale-95 shadow-xs'
                          : 'bg-neutral-950/60 text-neutral-600 border border-neutral-900 cursor-not-allowed opacity-40'
                      }`}
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                      <span>Redo</span>
                      <span className="text-[9px] font-mono text-neutral-400 bg-neutral-950 px-1 rounded">⌘Y</span>
                    </button>
                  </div>
                </div>

                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-900 mb-1 flex items-center justify-between">
                  <span>2D Drawing Tools</span>
                  <span className="text-[9px] text-neutral-600">Auto-collapse on tap</span>
                </div>
                {DRAW_TOOLS.map(t => {
                  const Icon = t.icon;
                  const isSelected = activeTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelect2DTool(t.id as ToolType)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/40'
                          : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-neutral-400'}`} />
                        <span>{t.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1 py-0.5 rounded">
                        {t.key}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* MENU 2: VIEW DROPDOWN (Including Plan Selection) */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                openMenu === 'view'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-300 hover:bg-neutral-900 border border-transparent'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>View</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {openMenu === 'view' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-900 mb-1">
                  Plan Selection (Workplanes)
                </div>

                {/* Plan Selection Buttons */}
                {[
                  { id: 'top', name: 'Top Plan (XY Plane - Z Normal)', label: 'Top' },
                  { id: 'front', name: 'Front Plan (XZ Plane - Y Normal)', label: 'Front' },
                  { id: 'right', name: 'Right Side Plan (YZ Plane - X Normal)', label: 'Right' },
                  { id: 'isometric', name: 'Isometric 3D Projection (ISO)', label: 'ISO' },
                  { id: 'bottom', name: 'Bottom Plan', label: 'Bot' },
                  { id: 'left', name: 'Left Side Plan', label: 'Left' },
                  { id: 'back', name: 'Back Plan', label: 'Back' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlaneAction(p.id as CameraViewPreset)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 hover:text-white transition cursor-pointer"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500">{p.label}</span>
                  </button>
                ))}

                {/* Section 2: Dimension Mentions in Millimeters (mm) */}
                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Dimension Mentions (mm)</span>
                  <span className="text-[9px] text-neutral-500 font-normal">2D Units: {units}</span>
                </div>

                <button
                  onClick={() => {
                    if (onToggleDimensionMention) onToggleDimensionMention();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Show Dimensions on Selected</span>
                  </div>
                  <span className={`text-[10px] font-mono ${dimensionMentionConfig.showOnSelected ? 'text-cyan-400 font-bold' : 'text-neutral-500'}`}>
                    {dimensionMentionConfig.showOnSelected ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (onToggleShowAllDimensions) onToggleShowAllDimensions();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Show All Entity Dimensions</span>
                  </div>
                  <span className={`text-[10px] font-mono ${dimensionMentionConfig.showAll ? 'text-cyan-400 font-bold' : 'text-neutral-500'}`}>
                    {dimensionMentionConfig.showAll ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Selected Entity Dimension Callout Card in View Menu */}
                {selectedEntity ? (
                  (() => {
                    const mention = getEntityDimensionMention(selectedEntity, units, dimensionMentionConfig.precision);
                    return (
                      <div className="mx-1 my-1 p-2 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-200">{mention.entityType}</span>
                          <span className="text-cyan-400 font-mono font-bold text-[11px]">{mention.primaryLabel}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {mention.details.slice(0, 3).map(d => `${d.label}: ${d.value}`).join(' • ')}
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            onClick={() => {
                              if (onAddDimensionToSelected) onAddDimensionToSelected();
                              setOpenMenu(null);
                            }}
                            className="flex-1 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Dim to Drawing</span>
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(mention.primaryLabel);
                            }}
                            className="p-1 hover:bg-cyan-900/50 rounded text-cyan-300 transition cursor-pointer"
                            title="Copy mm value"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="mx-1 my-1 p-2 bg-neutral-900/60 rounded-lg text-[10px] text-neutral-400 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>Select an entity with Select tool (V) to mention its distance in mm</span>
                  </div>
                )}

                {/* Section 3: Dynamic Object Snapping (OSNAP) */}
                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Object Snapping (OSNAP)
                </div>

                <button
                  onClick={() => {
                    if (onToggleObjectSnap) onToggleObjectSnap();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Object Snapping</span>
                  </div>
                  <span className={`text-[10px] font-mono ${objectSnapConfig.enabled ? 'text-emerald-400 font-bold' : 'text-neutral-500'}`}>
                    {objectSnapConfig.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Snapping Target Badges */}
                <div className="px-2.5 py-1 flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                    ■ Endpoint
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                    ▲ Midpoint
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                    ✕ Intersection
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300">
                    ⊕ Center
                  </span>
                </div>

                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Grid & Navigation
                </div>

                <button
                  onClick={() => { onToggleGridSnap(); setOpenMenu(null); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Magnet className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Grid Snapping</span>
                  </div>
                  <span className={`text-[10px] font-mono ${gridSnap ? 'text-cyan-400' : 'text-neutral-500'}`}>
                    {gridSnap ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => { onToggleOrthoMode(); setOpenMenu(null); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <span>Ortho Constraint (Shift)</span>
                  <span className={`text-[10px] font-mono ${orthoMode ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {orthoMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => { onZoomExtents(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Fit All / Zoom Extents</span>
                </button>
              </div>
            )}
          </div>

          {/* MENU 3: 3D OPTIONS DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                openMenu === '3d'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-300 hover:bg-neutral-900 border border-transparent'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-neutral-400" />
              <span>3D</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {openMenu === '3d' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-900 mb-1">
                  Solid Operations
                </div>

                <button
                  onClick={() => handleSelect3DAction(onAddExtrude)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-cyan-300 hover:bg-cyan-950/40 transition cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Extrude Solid Model...</span>
                </button>

                <button
                  onClick={() => handleSelect3DAction(onAddRevolve)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:bg-emerald-950/40 transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Revolve Solid (360°/Custom)...</span>
                </button>

                <button
                  onClick={() => handleSelect3DAction(onAddExtrudeCut)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-rose-400" />
                  <span>+ Extrude-Cut (CSG Pocket/Hole)...</span>
                </button>

                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Shading Style
                </div>

                {[
                  { id: 'shaded-edges', label: 'Shaded with CAD Edges' },
                  { id: 'smooth', label: 'Smooth Surface' },
                  { id: 'wireframe', label: 'Wireframe' },
                  { id: 'xray', label: 'X-Ray Transparent' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onShadingChange(s.id as ShadingMode); setOpenMenu(null); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                      shadingMode === s.id ? 'text-cyan-400 font-semibold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{s.label}</span>
                    {shadingMode === s.id && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                ))}

                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Material Presets
                </div>

                <div className="grid grid-cols-2 gap-1 px-1">
                  {[
                    { id: 'aluminum', label: 'Aluminum' },
                    { id: 'steel', label: 'Steel' },
                    { id: 'brass', label: 'Brass' },
                    { id: 'plastic-blue', label: 'Blue Polymer' },
                    { id: 'plastic-orange', label: 'Resin' },
                    { id: 'glass', label: 'Glass' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onMaterialChange(m.id as MaterialFinish); setOpenMenu(null); }}
                      className={`px-2 py-1 text-left text-xs rounded hover:bg-neutral-900 cursor-pointer ${
                        materialFinish === m.id ? 'text-cyan-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MENU 4: FILE DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                openMenu === 'file'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-300 hover:bg-neutral-900 border border-transparent'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-neutral-400" />
              <span>File</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {openMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider border-b border-neutral-900 mb-1">
                  Export & Storage
                </div>

                {/* Android Package Option (.apk & .aab) */}
                <button
                  onClick={() => { onOpenAndroidExportModal(); setOpenMenu(null); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-700/60 mb-1 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">Android App (.apk & .aab)...</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-900/60 px-1 rounded">
                    APK/AAB
                  </span>
                </button>

                <button
                  onClick={() => { onOpenExportModal(); setOpenMenu(null); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 mb-1 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-cyan-300">Export CAD Formats...</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">STL/STEP</span>
                </button>

                {/* Auto-Save (every 30s) Section */}
                <div className="border-t border-neutral-900 my-1.5" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-neutral-300">
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    Auto-Save (30s)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
                    ACTIVE
                  </span>
                </div>

                <button
                  onClick={() => { onTriggerSaveNow?.(); setOpenMenu(null); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                  title="Save current project to browser localStorage immediately"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to LocalStorage Now</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {lastAutoSavedTime ? formatTimeAgo(lastAutoSavedTime) : 'Ready'}
                  </span>
                </button>

                {autoSavePayload && (
                  <button
                    onClick={() => { onRestoreAutoSave?.(); setOpenMenu(null); }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 border border-amber-900/40 transition cursor-pointer my-0.5"
                    title={`Restore auto-saved session from ${autoSavePayload.savedAtFormatted}`}
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium">Restore Auto-Saved Draft</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {formatTimeAgo(autoSavePayload.savedAt)}
                    </span>
                  </button>
                )}

                <div className="border-t border-neutral-900 my-1.5" />

                <button
                  onClick={() => { onSaveProjectJSON(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Save Project File (.cadproj)</span>
                </button>

                <label className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Load Project File (.cadproj)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".cadproj,.json"
                    onChange={e => { onImportProjectJSON(e); setOpenMenu(null); }}
                    className="hidden"
                  />
                </label>

                <div className="border-t border-neutral-900 my-1" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Sample CAD Models
                </div>

                {SAMPLE_MODELS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onLoadSample(s.id); setOpenMenu(null); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer flex flex-col"
                  >
                    <span className="font-medium text-neutral-200">{s.name}</span>
                    <span className="text-[10px] text-neutral-500 truncate">{s.description}</span>
                  </button>
                ))}

                <div className="border-t border-neutral-900 my-1" />

                <button
                  onClick={() => { onOpenCloudSyncModal(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Storage & Collaboration...</span>
                </button>

                <button
                  onClick={() => { onOpenPluginModal(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>CAD Plugins (Fusion, AutoCAD...)</span>
                </button>

                <div className="border-t border-neutral-900 my-1" />

                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => { onUndo(); setOpenMenu(null); }}
                    disabled={!canUndo}
                    className="flex-1 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 rounded hover:bg-neutral-900 flex items-center justify-center gap-1 transition"
                  >
                    <Undo2 className="w-3 h-3" /> Undo
                  </button>
                  <button
                    onClick={() => { onRedo(); setOpenMenu(null); }}
                    disabled={!canRedo}
                    className="flex-1 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 rounded hover:bg-neutral-900 flex items-center justify-center gap-1 transition"
                  >
                    <Redo2 className="w-3 h-3" /> Redo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Quick Action (Export) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExportModal}
            className="px-3 py-1 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-neutral-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
