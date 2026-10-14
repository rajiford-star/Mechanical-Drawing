import React, { useState } from 'react';
import { ProjectState, Collaborator, CADEntity, Layer, CADFeature, UnitType } from '../types/cad';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  Users,
  History,
  Copy,
  Check,
  Download,
  Upload,
  X,
  Share2,
  Lock,
  Globe,
  Database,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectState: ProjectState;
  onLoadProject: (state: ProjectState) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  projectState,
  onLoadProject,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'team' | 'revisions'>('sync');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [copiedLink, setCopiedLink] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'velocad' | 'gdrive' | 'aws'>('velocad');

  // Simulated live team collaborators
  const [collaborators] = useState<Collaborator[]>([
    {
      id: 'c1',
      name: 'Raji Ford',
      role: 'Owner',
      color: '#38bdf8',
      activeLayer: 'Geometry Outer',
      avatar: 'RF',
      lastActive: 'Active now',
    },
    {
      id: 'c2',
      name: 'Sarah Mitchell',
      role: 'Mechanical Lead',
      color: '#34d399',
      activeLayer: 'Bolt Holes & Bore',
      avatar: 'SM',
      lastActive: '2m ago',
    },
    {
      id: 'c3',
      name: 'David Koenig',
      role: 'CAD Engineer',
      color: '#f59e0b',
      activeLayer: 'Pitch Circle',
      avatar: 'DK',
      lastActive: '12m ago',
    },
  ]);

  // Simulated project snapshots / revisions
  const [revisions, setRevisions] = useState<Array<{ id: string; timestamp: string; author: string; note: string; state: ProjectState }>>([
    {
      id: 'rev_3',
      timestamp: 'Just now',
      author: 'Raji Ford',
      note: 'Added parametric 3D revolve & extrude-cut features',
      state: { ...projectState, version: 3 },
    },
    {
      id: 'rev_2',
      timestamp: '14 minutes ago',
      author: 'Sarah Mitchell',
      note: 'Refined bolt circle pitch diameter and layer styles',
      state: { ...projectState, version: 2 },
    },
    {
      id: 'rev_1',
      timestamp: '1 hour ago',
      author: 'Raji Ford',
      note: 'Initial 2D sketch contours and boundary constraints',
      state: { ...projectState, version: 1 },
    },
  ]);

  if (!isOpen) return null;

  const handleSyncNow = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      const newRev = {
        id: 'rev_' + Date.now(),
        timestamp: 'Just now',
        author: 'Raji Ford',
        note: `Manual Cloud Sync Snapshot (v${projectState.version + 1})`,
        state: { ...projectState, version: projectState.version + 1 },
      };
      setRevisions([newRev, ...revisions]);
    }, 800);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/#project=${projectState.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Export full project JSON (.cadproj)
  const handleExportProjectJSON = () => {
    const jsonStr = JSON.stringify(projectState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectState.name.replace(/\s+/g, '_')}.cadproj`;
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
        if (parsed.layers && parsed.entities) {
          onLoadProject(parsed);
          setSyncStatus('synced');
          onClose();
        }
      } catch (err) {
        console.error('Invalid CAD project file:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Cloud Storage & Collaboration</h2>
              <p className="text-xs text-slate-400">Real-time team synchronization and version-controlled CAD vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sync'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Storage & Sync
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'team'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team ({collaborators.length})
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'revisions'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Version History
          </button>
        </div>

        {/* Tab 1: Storage & Sync */}
        {activeTab === 'sync' && (
          <div className="p-6 space-y-5">
            {/* Sync status card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  {syncStatus === 'syncing' ? (
                    <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  ) : (
                    <CloudCheck className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {syncStatus === 'syncing' ? 'Syncing CAD Changes...' : 'Cloud Vault Synced'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-full">
                      v{projectState.version}.0
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Last automatic snapshot saved: {projectState.lastSaved}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncNow}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            </div>

            {/* Cloud Provider Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Cloud Storage Engine
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'velocad', name: 'VeloCloud Server', desc: 'Real-time WebSocket & CRDTs' },
                  { id: 'gdrive', name: 'Google Workspace', desc: 'Secure Drive CAD repository' },
                  { id: 'aws', name: 'Dedicated Vault', desc: 'Enterprise on-prem / S3 storage' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setCloudProvider(p.id as any)}
                    className={`p-3 text-left rounded-xl border transition ${
                      cloudProvider === p.id
                        ? 'bg-sky-500/15 border-sky-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* File Backup / Migration (.cadproj) */}
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Local CAD Package Backup</span>
                <p className="text-[11px] text-slate-400">Export or restore full project files (.cadproj)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportProjectJSON}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save .cadproj
                </button>
                <label className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Load .cadproj
                  <input
                    type="file"
                    accept=".cadproj,.json"
                    onChange={handleImportProjectJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Team Collaboration */}
        {activeTab === 'team' && (
          <div className="p-6 space-y-5">
            {/* Share Link Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-sky-400" /> Real-time CAD Collaboration Link
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded">
                  Live Editing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://velocad.studio/join/${projectState.id}`}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 font-mono"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Collaborator List */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Active Team Engineers
              </label>
              <div className="space-y-2">
                {collaborators.map(c => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-950"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          {c.name}
                          <span className="text-[10px] font-normal px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                            {c.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Editing Layer: <span className="text-sky-400">{c.activeLayer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {c.lastActive}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Revisions & History */}
        {activeTab === 'revisions' && (
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="text-xs text-slate-400 mb-2">
              All CAD modifications are tracked and timestamped. You can restore any previous design state at any time.
            </div>
            {revisions.map(rev => (
              <div
                key={rev.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>{rev.note}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {rev.author} • {rev.timestamp}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLoadProject(rev.state);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
