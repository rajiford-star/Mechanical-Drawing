import { ProjectState } from '../types/cad';

export const AUTOSAVE_STORAGE_KEY = 'simple_techdraw_autosave_state';
export const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds

export interface AutoSavePayload {
  project: ProjectState;
  savedAt: number; // timestamp in milliseconds
  savedAtFormatted: string;
  entityCount: number;
  featureCount: number;
  projectName: string;
}

/**
 * Saves the current project state to browser localStorage
 */
export function saveProjectToLocalStorage(project: ProjectState): { success: boolean; error?: string } {
  try {
    const payload: AutoSavePayload = {
      project: {
        ...project,
        lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
      savedAt: Date.now(),
      savedAtFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      entityCount: project.entities?.length || 0,
      featureCount: project.features?.length || 0,
      projectName: project.name || 'Untitled CAD Project',
    };

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Storage quota exceeded or unavailable';
    console.warn('[AutoSave] Failed to save project state to localStorage:', message);
    return { success: false, error: message };
  }
}

/**
 * Loads the auto-saved project state from localStorage
 */
export function loadAutoSavedProject(): AutoSavePayload | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;

    const parsed: AutoSavePayload = JSON.parse(raw);
    if (parsed && parsed.project && Array.isArray(parsed.project.entities)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('[AutoSave] Error parsing auto-saved project state:', err);
    return null;
  }
}

/**
 * Clears auto-saved project from localStorage
 */
export function clearAutoSavedProject(): void {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch (err) {
    console.error('[AutoSave] Error clearing auto-save:', err);
  }
}

/**
 * Formats time difference as friendly relative string
 */
export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
