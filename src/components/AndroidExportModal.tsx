import React, { useState } from 'react';
import { CADEntity, CADFeature } from '../types/cad';
import {
  generateAndDownloadAPK,
  generateAndDownloadAAB,
  generateAndDownloadAndroidStudioProject,
  AndroidPackageMeta,
  DEFAULT_ANDROID_META,
} from '../utils/androidPackageBuilder';
import {
  X,
  Smartphone,
  Download,
  Check,
  FileCode,
  Layers,
  ShieldCheck,
  ExternalLink,
  Settings,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: CADEntity[];
  features: CADFeature[];
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({
  isOpen,
  onClose,
  entities,
  features,
}) => {
  const [meta, setMeta] = useState<AndroidPackageMeta>(DEFAULT_ANDROID_META);
  const [isGeneratingAPK, setIsGeneratingAPK] = useState(false);
  const [isGeneratingAAB, setIsGeneratingAAB] = useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [completedType, setCompletedType] = useState<'apk' | 'aab' | 'project' | null>(null);
  const [activeTab, setActiveTab] = useState<'downloads' | 'settings' | 'guide'>('downloads');

  if (!isOpen) return null;

  const handleDownloadAPK = async () => {
    setIsGeneratingAPK(true);
    setCompletedType(null);
    try {
      await generateAndDownloadAPK(meta, entities, features);
      setCompletedType('apk');
    } catch (err) {
      console.error('Failed to generate APK:', err);
    } finally {
      setIsGeneratingAPK(false);
    }
  };

  const handleDownloadAAB = async () => {
    setIsGeneratingAAB(true);
    setCompletedType(null);
    try {
      await generateAndDownloadAAB(meta, entities, features);
      setCompletedType('aab');
    } catch (err) {
      console.error('Failed to generate AAB:', err);
    } finally {
      setIsGeneratingAAB(false);
    }
  };

  const handleDownloadProject = async () => {
    setIsGeneratingProject(true);
    setCompletedType(null);
    try {
      await generateAndDownloadAndroidStudioProject(meta, entities, features);
      setCompletedType('project');
    } catch (err) {
      console.error('Failed to generate Android project:', err);
    } finally {
      setIsGeneratingProject(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Android Package Export</h2>
                <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 font-mono text-[10px] font-semibold">
                  .APK & .AAB
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Generate signed Android APK installation package & Google Play App Bundle (AAB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2 border-b border-neutral-850 bg-neutral-950">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'downloads'
                ? 'bg-neutral-800 text-cyan-400 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Package Downloads
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-neutral-800 text-cyan-400 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            App Identifier & SDK
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-neutral-800 text-cyan-400 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Installation Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'downloads' && (
            <div className="space-y-4">
              {/* Option 1: APK Download */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-600/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">Android Application Package</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-emerald-400 font-bold">
                        .APK
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Direct standalone installer for Android smartphones & tablets. Ready to sideload or install via adb.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-neutral-400">
                      <span>Target: Android 14 (API 34)</span>
                      <span>•</span>
                      <span>Min: Android 7.0 (API 24)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAPK}
                  disabled={isGeneratingAPK}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isGeneratingAPK ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Building APK...</span>
                    </>
                  ) : completedType === 'apk' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Downloaded .APK</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download .APK</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: AAB Download */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-600/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-600/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">Google Play App Bundle</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-cyan-400 font-bold">
                        .AAB
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Official publishing format required for uploading to the Google Play Store Console.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-neutral-400">
                      <span>Format: Protobuf Bundle</span>
                      <span>•</span>
                      <span>Play Console Ready</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAAB}
                  disabled={isGeneratingAAB}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-900/20 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isGeneratingAAB ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Building AAB...</span>
                    </>
                  ) : completedType === 'aab' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Downloaded .AAB</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download .AAB</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 3: Full Android Studio Project Source */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-600/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">Complete Android Studio Source</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        .ZIP
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Full Kotlin project with Gradle Wrapper, Manifest, WebGL WebView, and build scripts.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-neutral-400">
                      <span>Includes: build.gradle.kts & MainActivity.kt</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadProject}
                  disabled={isGeneratingProject}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shrink-0 border border-neutral-700"
                >
                  {isGeneratingProject ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                      <span>Packaging Source...</span>
                    </>
                  ) : completedType === 'project' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Downloaded Project</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Studio Project</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feature Highlights */}
              <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-850 flex items-center justify-between text-[11px] text-neutral-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hardware-accelerated WebGL 3D solid rendering & touch gestures enabled</span>
                </div>
                <span className="font-mono text-neutral-500">Universal ARM64 / x86_64</span>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={meta.appName}
                    onChange={e => setMeta({ ...meta, appName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Package ID (Namespace)
                  </label>
                  <input
                    type="text"
                    value={meta.packageName}
                    onChange={e => setMeta({ ...meta, packageName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Version Name
                  </label>
                  <input
                    type="text"
                    value={meta.versionName}
                    onChange={e => setMeta({ ...meta, versionName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Version Code
                  </label>
                  <input
                    type="number"
                    value={meta.versionCode}
                    onChange={e => setMeta({ ...meta, versionCode: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Target Android SDK
                  </label>
                  <select
                    value={meta.targetSdkVersion}
                    onChange={e => setMeta({ ...meta, targetSdkVersion: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={34}>Android 14 (API 34) - Latest</option>
                    <option value={33}>Android 13 (API 33)</option>
                    <option value={32}>Android 12L (API 32)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                    Minimum Android SDK
                  </label>
                  <select
                    value={meta.minSdkVersion}
                    onChange={e => setMeta({ ...meta, minSdkVersion: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={24}>Android 7.0 (API 24) - Supports 98%+ Devices</option>
                    <option value={26}>Android 8.0 (API 26)</option>
                    <option value={28}>Android 9.0 (API 28)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                <span className="font-semibold text-cyan-400">Pro Tip: </span>
                Any modifications to the Package ID or version name will automatically update in both the generated{' '}
                <code className="text-emerald-400">.apk</code> and <code className="text-cyan-400">.aab</code> bundles.
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-neutral-300">
              <div className="p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  1. How to Install the .APK on an Android Phone/Tablet
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                  <li>Download the <strong className="text-white">Simple_TechDraw.apk</strong> above.</li>
                  <li>Transfer the file to your phone (via USB, Google Drive, WhatsApp, or email).</li>
                  <li>On your Android device, tap the downloaded APK file.</li>
                  <li>If prompted, allow <strong className="text-white">"Install unknown apps"</strong> in Settings.</li>
                  <li>Tap <strong className="text-emerald-400">Install</strong> to complete installation!</li>
                </ol>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  2. How to Upload the .AAB to Google Play Store Console
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                  <li>Download the <strong className="text-white">Simple_TechDraw.aab</strong> bundle above.</li>
                  <li>Log in to <strong className="text-white">Google Play Console</strong> (<a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-cyan-400 underline">play.google.com/console</a>).</li>
                  <li>Select your app (or create a new one with ID <code className="text-cyan-300">{meta.packageName}</code>).</li>
                  <li>Navigate to <strong className="text-white">Production</strong> or <strong className="text-white">Internal Testing</strong>.</li>
                  <li>Click <strong className="text-white">Create new release</strong> and upload your <strong className="text-cyan-300">.aab</strong> file.</li>
                  <li>Review and rollout release to the Play Store!</li>
                </ol>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  3. Command Line Build via Gradle
                </h4>
                <div className="p-2.5 bg-black rounded-lg border border-neutral-850 font-mono text-[11px] text-cyan-300">
                  ./gradlew assembleRelease &nbsp;# Creates release .APK<br/>
                  ./gradlew bundleRelease &nbsp;&nbsp;&nbsp;# Creates Play Store .AAB
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between bg-black text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Current Drawing:</span>
            <span className="font-mono text-cyan-400 font-semibold">{entities.length} entities</span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-semibold">{features.length} 3D solids</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
