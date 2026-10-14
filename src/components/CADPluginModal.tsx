import React, { useState } from 'react';
import { CADEntity, CADFeature } from '../types/cad';
import { CAD_PLUGINS, CADPluginIntegration } from '../utils/cadPlugins';
import { X, Copy, Check, Terminal, ExternalLink, Code2 } from 'lucide-react';

interface CADPluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: CADEntity[];
  features: CADFeature[];
}

export const CADPluginModal: React.FC<CADPluginModalProps> = ({
  isOpen,
  onClose,
  entities,
  features,
}) => {
  const [selectedPlugin, setSelectedPlugin] = useState<CADPluginIntegration>(CAD_PLUGINS[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatedCode = selectedPlugin.generateScript(entities, features);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <Code2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">CAD Plugins & Workflow Integration</h2>
              <p className="text-xs text-slate-400">Bridge your VeloCAD sketches and 3D features into professional desktop CAD ecosystems</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plugin Selector */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40">
          {CAD_PLUGINS.map(plugin => (
            <button
              key={plugin.id}
              onClick={() => setSelectedPlugin(plugin)}
              className={`p-3 text-center border-b-2 text-xs font-semibold transition ${
                selectedPlugin.id === plugin.id
                  ? 'border-purple-500 text-purple-300 bg-purple-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div>{plugin.software}</div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5">{plugin.fileExt}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl text-xs text-purple-200">
            <strong>How to use with {selectedPlugin.software}:</strong>
            <p className="mt-1 text-slate-300">{selectedPlugin.instructions}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" /> Auto-Generated Script ({selectedPlugin.fileExt})
            </span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Script'}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-72">
            <pre>{generatedCode}</pre>
          </div>
        </div>

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
