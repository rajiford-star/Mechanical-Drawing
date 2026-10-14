import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CADEntity,
  CADFeature,
  CameraViewPreset,
  Layer,
  MaterialFinish,
  MeshDensity,
  ProjectState,
  ShadingMode,
  ToolType,
  UnitType,
  ObjectSnapConfig,
  DimensionMentionConfig,
} from './types/cad';
import { SAMPLE_MODELS } from './utils/samples';
import { createDimensionsForEntity } from './utils/dimensionMentions';
import {
  saveProjectToLocalStorage,
  loadAutoSavedProject,
  clearAutoSavedProject,
  formatTimeAgo,
  AutoSavePayload,
  AUTOSAVE_INTERVAL_MS,
} from './utils/autoSave';
import { RotateCcw, X, HardDrive, CheckCircle2 } from 'lucide-react';
import { TechDrawHeader } from './components/TechDrawHeader';
import { CAD2DCanvas } from './components/CAD2DCanvas';
import { CAD3DViewport } from './components/CAD3DViewport';
import { ExportModal } from './components/ExportModal';
import { AndroidExportModal } from './components/AndroidExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { CADPluginModal } from './components/CADPluginModal';
import { FeatureParamModal } from './components/FeatureParamModal';

export default function App() {
  // Initial default sample
  const initialSample = SAMPLE_MODELS[0];

  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [projectName, setProjectName] = useState<string>(initialSample.name);
  const [units, setUnits] = useState<UnitType>('mm');
  const [layers, setLayers] = useState<Layer[]>(initialSample.layers);
  const [activeLayerId, setActiveLayerId] = useState<string>(initialSample.layers[0].id);
  const [entities, setEntities] = useState<CADEntity[]>(initialSample.entities);
  const [features, setFeatures] = useState<CADFeature[]>(initialSample.features);

  // 2D Tool, Selection, Snapping & Dimension Mention state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [gridSnap, setGridSnap] = useState<boolean>(true);
  const [orthoMode, setOrthoMode] = useState<boolean>(false);

  // Dynamic Object Snapping (OSNAP)
  const [objectSnapConfig, setObjectSnapConfig] = useState<ObjectSnapConfig>({
    enabled: true,
    endpoints: true,
    midpoints: true,
    intersections: true,
    centers: true,
    quadrants: true,
  });

  // Dimension Mention Configuration
  const [dimensionMentionConfig, setDimensionMentionConfig] = useState<DimensionMentionConfig>({
    showOnSelected: true,
    showAll: false,
    forceMM: true,
    precision: 2,
  });

  // 3D Rendering & Plan Selection state
  const [targetView, setTargetView] = useState<CameraViewPreset | null>(null);
  const [meshDensity, setMeshDensity] = useState<MeshDensity>('standard');
  const [materialFinish, setMaterialFinish] = useState<MaterialFinish>('aluminum');
  const [shadingMode, setShadingMode] = useState<ShadingMode>('shaded-edges');

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState<boolean>(false);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState<boolean>(false);

  // Feature Configuration Modal
  const [featureModalConfig, setFeatureModalConfig] = useState<{
    isOpen: boolean;
    type: 'extrude' | 'revolve' | 'cut';
    feature: CADFeature | null;
  }>({
    isOpen: false,
    type: 'extrude',
    feature: null,
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Array<{ entities: CADEntity[]; features: CADFeature[] }>>([
    { entities: initialSample.entities, features: initialSample.features },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback(
    (newEntities: CADEntity[], newFeatures: CADFeature[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ entities: newEntities, features: newFeatures });
      if (newHistory.length > 30) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleUpdateEntities = (newEntities: CADEntity[]) => {
    setEntities(newEntities);
    pushHistory(newEntities, features);
  };

  const handleUpdateFeatures = (newFeatures: CADFeature[]) => {
    setFeatures(newFeatures);
    pushHistory(entities, newFeatures);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setEntities(history[targetIndex].entities);
      setFeatures(history[targetIndex].features);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setEntities(history[targetIndex].entities);
      setFeatures(history[targetIndex].features);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Shift') {
        setOrthoMode(true);
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('line');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rectangle');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('circle');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('arc');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('freedraw');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('trim');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('erase');
      } else if (e.key.toLowerCase() === 'd') {
        setActiveTool('dimension');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTool('measure');
      } else if (e.key === '2') {
        setMode('2d');
      } else if (e.key === '3') {
        setMode('3d');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setOrthoMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [historyIndex, history]);

  // Load sample CAD model
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_MODELS.find(s => s.id === sampleId);
    if (!sample) return;

    setProjectName(sample.name);
    setLayers(sample.layers);
    setActiveLayerId(sample.layers[0].id);
    setEntities(sample.entities);
    setFeatures(sample.features);
    setHistory([{ entities: sample.entities, features: sample.features }]);
    setHistoryIndex(0);
  };

  // Load restored project state (from cloud / .cadproj file)
  const handleLoadProject = (state: ProjectState) => {
    setProjectName(state.name);
    setUnits(state.units);
    setLayers(state.layers);
    setActiveLayerId(state.layers[0]?.id || 'default');
    setEntities(state.entities);
    setFeatures(state.features);
    setMeshDensity(state.meshDensity);
    setMaterialFinish(state.materialFinish);
    setHistory([{ entities: state.entities, features: state.features }]);
    setHistoryIndex(0);
  };

  // Feature modal handlers
  const handleOpenAddFeature = (type: 'extrude' | 'revolve' | 'cut') => {
    setFeatureModalConfig({
      isOpen: true,
      type,
      feature: null,
    });
  };

  const handleEditFeature = (feature: CADFeature) => {
    setFeatureModalConfig({
      isOpen: true,
      type: feature.type,
      feature,
    });
  };

  const handleSaveFeature = (feature: CADFeature) => {
    const existingIndex = features.findIndex(f => f.id === feature.id);
    if (existingIndex >= 0) {
      const updated = [...features];
      updated[existingIndex] = feature;
      handleUpdateFeatures(updated);
    } else {
      handleUpdateFeatures([...features, feature]);
    }
    setMode('3d');
  };

  // Plan Selection Handler
  const handleSelectPlane = (view: CameraViewPreset) => {
    setTargetView(view);
    // If user picks a 3D plan/angle, ensure they are in 3D mode
    if (mode !== '3d') {
      setMode('3d');
    }
  };

  // Save full project JSON (.cadproj)
  const handleSaveProjectJSON = () => {
    const jsonStr = JSON.stringify(currentProjectState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.cadproj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import project JSON (.cadproj)
  const handleImportProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.entities) {
          handleLoadProject(parsed);
        }
      } catch (err) {
        console.error('Invalid CAD project file:', err);
      }
    };
    reader.readAsText(file);
  };

  // Auto-Save to localStorage state (runs every 30 seconds)
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<number | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [autoSavePayload, setAutoSavePayload] = useState<AutoSavePayload | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState<boolean>(false);
  const [autoSaveNotification, setAutoSaveNotification] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  const currentProjectState: ProjectState = {
    id: 'proj_cad_01',
    name: projectName,
    version: 3,
    lastSaved: 'Just now',
    units,
    layers,
    entities,
    features,
    meshDensity,
    materialFinish,
  };

  const currentProjectRef = useRef<ProjectState>(currentProjectState);
  useEffect(() => {
    currentProjectRef.current = currentProjectState;
  }, [currentProjectState]);

  // Check on mount for existing auto-saved draft
  useEffect(() => {
    const saved = loadAutoSavedProject();
    if (saved && saved.project) {
      setAutoSavePayload(saved);
      setLastAutoSavedTime(saved.savedAt);
      if (saved.entityCount > 0 || saved.featureCount > 0) {
        setShowRestoreBanner(true);
      }
    }
  }, []);

  // 30-second automatic background save to localStorage to prevent data loss
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsAutoSaving(true);
      const res = saveProjectToLocalStorage(currentProjectRef.current);
      if (res.success) {
        const now = Date.now();
        setLastAutoSavedTime(now);
        const updated = loadAutoSavedProject();
        if (updated) setAutoSavePayload(updated);
        setAutoSaveNotification('Auto-saved to localStorage');
        setTimeout(() => setAutoSaveNotification(null), 2500);
      }
      setTimeout(() => setIsAutoSaving(false), 500);
    }, AUTOSAVE_INTERVAL_MS);

    // Refresh relative timestamps every 5s
    const tickerId = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);

    // Extra safety: save before tab close / refresh
    const handleBeforeUnload = () => {
      saveProjectToLocalStorage(currentProjectRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      clearInterval(tickerId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleTriggerSaveNow = () => {
    setIsAutoSaving(true);
    const res = saveProjectToLocalStorage(currentProjectRef.current);
    if (res.success) {
      const now = Date.now();
      setLastAutoSavedTime(now);
      const updated = loadAutoSavedProject();
      if (updated) setAutoSavePayload(updated);
      setAutoSaveNotification('Project saved to localStorage');
      setTimeout(() => setAutoSaveNotification(null), 2500);
    }
    setTimeout(() => setIsAutoSaving(false), 400);
  };

  const handleRestoreAutoSave = () => {
    const saved = autoSavePayload || loadAutoSavedProject();
    if (!saved || !saved.project) return;
    handleLoadProject(saved.project);
    setShowRestoreBanner(false);
    setAutoSaveNotification(`Restored project from ${saved.savedAtFormatted}`);
    setTimeout(() => setAutoSaveNotification(null), 3000);
  };

  const handleClearAutoSave = () => {
    clearAutoSavedProject();
    setAutoSavePayload(null);
    setShowRestoreBanner(false);
    setAutoSaveNotification('Auto-save cache cleared');
    setTimeout(() => setAutoSaveNotification(null), 2000);
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId) || null;

  const handleToggleObjectSnap = () => {
    setObjectSnapConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleDimensionMention = () => {
    setDimensionMentionConfig(prev => ({ ...prev, showOnSelected: !prev.showOnSelected }));
  };

  const handleToggleShowAllDimensions = () => {
    setDimensionMentionConfig(prev => ({ ...prev, showAll: !prev.showAll }));
  };

  const handleAddDimensionToSelected = () => {
    if (!selectedEntity) return;
    const newDims = createDimensionsForEntity(selectedEntity, units, activeLayerId);
    if (newDims.length > 0) {
      handleUpdateEntities([...entities, ...newDims]);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-black font-sans text-neutral-100 select-none">
      {/* Simple TechDraw Header with Title on Top and Pencil, View, 3D, and File Dropdowns Below */}
      <TechDrawHeader
        mode={mode}
        onModeChange={setMode}
        activeTool={activeTool}
        onToolSelect={setActiveTool}
        units={units}
        onUnitsChange={setUnits}
        gridSnap={gridSnap}
        onToggleGridSnap={() => setGridSnap(!gridSnap)}
        orthoMode={orthoMode}
        onToggleOrthoMode={() => setOrthoMode(!orthoMode)}
        objectSnapConfig={objectSnapConfig}
        onToggleObjectSnap={handleToggleObjectSnap}
        dimensionMentionConfig={dimensionMentionConfig}
        onToggleDimensionMention={handleToggleDimensionMention}
        onToggleShowAllDimensions={handleToggleShowAllDimensions}
        selectedEntity={selectedEntity}
        onAddDimensionToSelected={handleAddDimensionToSelected}
        onSelectPlane={handleSelectPlane}
        onZoomExtents={() => {}}
        onAddExtrude={() => handleOpenAddFeature('extrude')}
        onAddRevolve={() => handleOpenAddFeature('revolve')}
        onAddExtrudeCut={() => handleOpenAddFeature('cut')}
        shadingMode={shadingMode}
        onShadingChange={setShadingMode}
        materialFinish={materialFinish}
        onMaterialChange={setMaterialFinish}
        meshDensity={meshDensity}
        onMeshDensityChange={setMeshDensity}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenAndroidExportModal={() => setIsAndroidModalOpen(true)}
        onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
        onOpenPluginModal={() => setIsPluginModalOpen(true)}
        onLoadSample={handleLoadSample}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveProjectJSON={handleSaveProjectJSON}
        onImportProjectJSON={handleImportProjectJSON}
        lastAutoSavedTime={lastAutoSavedTime}
        isAutoSaving={isAutoSaving}
        autoSavePayload={autoSavePayload}
        onTriggerSaveNow={handleTriggerSaveNow}
        onRestoreAutoSave={handleRestoreAutoSave}
        onClearAutoSave={handleClearAutoSave}
      />

      {/* Auto-Saved Draft Recovery Banner */}
      {showRestoreBanner && autoSavePayload && (
        <div className="bg-neutral-900/95 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between z-30 shrink-0 text-xs backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <HardDrive className="w-3 h-3" />
            </div>
            <div>
              <span className="text-amber-300 font-semibold">Auto-Saved Session Recovered: </span>
              <span className="text-neutral-300">
                "{autoSavePayload.projectName}" ({autoSavePayload.entityCount} entities, {autoSavePayload.featureCount} 3D features) auto-saved {formatTimeAgo(autoSavePayload.savedAt)} at {autoSavePayload.savedAtFormatted}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreAutoSave}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restore Session
            </button>
            <button
              onClick={() => setShowRestoreBanner(false)}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Auto-Save Subtle Toast Notification */}
      {autoSaveNotification && (
        <div className="absolute bottom-4 right-4 z-50 bg-neutral-900/95 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg shadow-xl text-xs flex items-center gap-2 backdrop-blur-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{autoSaveNotification}</span>
        </div>
      )}

      {/* Main Workspace Area on Pure Black Background */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden bg-black">
        <main className="flex-1 min-w-0 h-full relative bg-black">
          {mode === '2d' ? (
            <CAD2DCanvas
              entities={entities}
              layers={layers}
              activeLayerId={activeLayerId}
              activeTool={activeTool}
              units={units}
              gridSnap={gridSnap}
              orthoMode={orthoMode}
              objectSnapConfig={objectSnapConfig}
              dimensionMentionConfig={dimensionMentionConfig}
              selectedEntityId={selectedEntityId}
              onSelectEntity={ent => setSelectedEntityId(ent ? ent.id : null)}
              onUpdateEntities={handleUpdateEntities}
              onToolChange={setActiveTool}
              onAddDimensionToDrawing={dims => pushHistory([...entities, ...dims], features)}
            />
          ) : (
            <CAD3DViewport
              entities={entities}
              features={features}
              meshDensity={meshDensity}
              materialFinish={materialFinish}
              shadingMode={shadingMode}
              targetView={targetView}
              onMeshDensityChange={setMeshDensity}
              onMaterialChange={setMaterialFinish}
              onShadingChange={setShadingMode}
              onAddExtrude={() => handleOpenAddFeature('extrude')}
              onAddRevolve={() => handleOpenAddFeature('revolve')}
              onAddExtrudeCut={() => handleOpenAddFeature('cut')}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entities={entities}
        features={features}
        layers={layers}
        projectName={projectName}
        units={units}
        currentMeshDensity={meshDensity}
        onOpenAndroidExportModal={() => setIsAndroidModalOpen(true)}
      />

      <AndroidExportModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        entities={entities}
        features={features}
      />

      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        projectState={currentProjectState}
        onLoadProject={handleLoadProject}
      />

      <CADPluginModal
        isOpen={isPluginModalOpen}
        onClose={() => setIsPluginModalOpen(false)}
        entities={entities}
        features={features}
      />

      {featureModalConfig.isOpen && (
        <FeatureParamModal
          isOpen={featureModalConfig.isOpen}
          onClose={() => setFeatureModalConfig({ ...featureModalConfig, isOpen: false })}
          featureType={featureModalConfig.type}
          existingFeature={featureModalConfig.feature}
          units={units}
          onSaveFeature={handleSaveFeature}
        />
      )}
    </div>
  );
}
