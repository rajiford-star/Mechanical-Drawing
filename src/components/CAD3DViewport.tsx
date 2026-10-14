import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CADEntity,
  CADFeature,
  CameraViewPreset,
  MaterialFinish,
  MeshDensity,
  ShadingMode,
} from '../types/cad';
import { buildCADSolid } from '../utils/solidBuilder';
import { getCADMaterial } from '../utils/materials';
import { OrbitalKnob } from './OrbitalKnob';
import {
  RotateCcw,
  Box,
  Eye,
  Sliders,
  Maximize2,
  Compass,
  Scissors,
  Check,
} from 'lucide-react';

interface CAD3DViewportProps {
  entities: CADEntity[];
  features: CADFeature[];
  meshDensity: MeshDensity;
  materialFinish: MaterialFinish;
  shadingMode: ShadingMode;
  targetView?: CameraViewPreset | null;
  onMeshDensityChange: (density: MeshDensity) => void;
  onMaterialChange: (finish: MaterialFinish) => void;
  onShadingChange: (mode: ShadingMode) => void;
  onAddExtrude: () => void;
  onAddRevolve: () => void;
  onAddExtrudeCut: () => void;
}

export const CAD3DViewport: React.FC<CAD3DViewportProps> = ({
  entities,
  features,
  meshDensity,
  materialFinish,
  shadingMode,
  targetView,
  onMeshDensityChange,
  onMaterialChange,
  onShadingChange,
  onAddExtrude,
  onAddRevolve,
  onAddExtrudeCut,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Section cut clipping plane
  const [sectionCutEnabled, setSectionCutEnabled] = useState(false);
  const [sectionCutOffset, setSectionCutOffset] = useState(0);
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, -1), 100));

  // Camera animation target for smooth transitions
  const cameraTargetPos = useRef<THREE.Vector3 | null>(null);
  const cameraTargetLook = useRef<THREE.Vector3 | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene with pure black background per user request
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(160, 140, 180);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1200;
    controls.minDistance = 10;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Mandatory Studio Environment Reflection (RoomEnvironment) per Three.js skill
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(150, 250, 150);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 800;
    const d = 160;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
    fillLight.position.set(-150, 100, -100);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(0, -100, -150);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Ground Contact Shadow Grounding Plane (per Three.js skill)
    const shadowGeo = new THREE.PlaneGeometry(500, 500);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -40;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Technical CAD Floor Grid on black background
    const gridHelper = new THREE.GridHelper(400, 40, 0x404040, 0x1f1f1f);
    gridHelper.position.y = -39.9;
    scene.add(gridHelper);

    // Root Assembly Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop with smooth exponential damping
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Camera preset smooth transition
      if (cameraTargetPos.current && cameraTargetLook.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetPos.current.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTargetPos.current.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraTargetPos.current.z, 8, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, cameraTargetLook.current.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, cameraTargetLook.current.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, cameraTargetLook.current.z, 8, delta);

        if (camera.position.distanceTo(cameraTargetPos.current) < 0.5) {
          cameraTargetPos.current = null;
          cameraTargetLook.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update clipping plane when section cut toggled or offset adjusted
  useEffect(() => {
    if (sectionCutEnabled) {
      clippingPlaneRef.current.constant = sectionCutOffset;
    } else {
      clippingPlaneRef.current.constant = 1000; // inactive
    }
  }, [sectionCutEnabled, sectionCutOffset]);

  // Rebuild 3D Model when entities, features, density, or material change
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    if (!modelGroup) return;

    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      modelGroup.remove(child);
    }

    const clippingPlanes = sectionCutEnabled ? [clippingPlaneRef.current] : [];
    const mat = getCADMaterial(materialFinish, clippingPlanes);

    if (shadingMode === 'wireframe') {
      (mat as THREE.MeshStandardMaterial).wireframe = true;
    } else if (shadingMode === 'xray') {
      mat.transparent = true;
      mat.opacity = 0.45;
      mat.depthWrite = false;
    }

    const { rootGroup, edgeGroup } = buildCADSolid(entities, features, meshDensity, mat);

    if (shadingMode === 'smooth') {
      edgeGroup.visible = false;
    } else {
      edgeGroup.visible = true;
    }

    modelGroup.add(rootGroup);
  }, [entities, features, meshDensity, materialFinish, shadingMode, sectionCutEnabled]);

  // Set Camera View Preset
  const setCameraView = (view: CameraViewPreset) => {
    const dist = 240;
    const target = new THREE.Vector3(0, 0, 0);
    let pos = new THREE.Vector3(160, 140, 180);

    switch (view) {
      case 'top':
        pos = new THREE.Vector3(0, dist, 0.001);
        break;
      case 'bottom':
        pos = new THREE.Vector3(0, -dist, 0.001);
        break;
      case 'front':
        pos = new THREE.Vector3(0, 0, dist);
        break;
      case 'back':
        pos = new THREE.Vector3(0, 0, -dist);
        break;
      case 'left':
        pos = new THREE.Vector3(-dist, 0, 0);
        break;
      case 'right':
        pos = new THREE.Vector3(dist, 0, 0);
        break;
      case 'isometric':
        pos = new THREE.Vector3(160, 140, 180);
        break;
    }

    cameraTargetPos.current = pos;
    cameraTargetLook.current = target;
  };

  // Sync targetView from parent
  useEffect(() => {
    if (targetView) {
      setCameraView(targetView);
    }
  }, [targetView]);

  const handleResetCamera = () => {
    setCameraView('isometric');
  };

  // 3D Orbital Knob handler: rotates camera around target without touching the 3D model
  const handleOrbitalRotate = (deltaX: number, deltaY: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    // deltaX: yaw around vertical axis
    spherical.theta += deltaX * 0.025;
    // deltaY: pitch around horizontal axis
    spherical.phi = Math.max(0.06, Math.min(Math.PI - 0.06, spherical.phi - deltaY * 0.025));

    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
  };

  const handleStepRotate = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (dir === 'left') handleOrbitalRotate(-10, 0);
    else if (dir === 'right') handleOrbitalRotate(10, 0);
    else if (dir === 'up') handleOrbitalRotate(0, 10);
    else if (dir === 'down') handleOrbitalRotate(0, -10);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-black">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec / Viewport Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur border border-neutral-800 rounded-xl shadow-lg text-xs text-neutral-300">
        <span className="font-semibold text-cyan-400">3D Viewport</span>
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-300 capitalize">{materialFinish}</span>
        <span className="text-neutral-600">|</span>
        <span className="text-cyan-400 uppercase text-[10px] px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded">
          {meshDensity} Mesh
        </span>
      </div>

      {/* 3D ViewCube / Orientation Gizmo (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="p-2 bg-black/90 backdrop-blur border border-neutral-800 rounded-xl shadow-2xl flex flex-col items-center">
          <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1.5 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> ViewCube
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setCameraView('top')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded transition"
            >
              Top
            </button>
            <button
              onClick={() => setCameraView('isometric')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-cyan-600 text-cyan-300 rounded transition"
            >
              ISO
            </button>
            <button
              onClick={() => setCameraView('bottom')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded transition"
            >
              Bot
            </button>
            <button
              onClick={() => setCameraView('left')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded transition"
            >
              Left
            </button>
            <button
              onClick={() => setCameraView('front')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded transition"
            >
              Front
            </button>
            <button
              onClick={() => setCameraView('right')}
              className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded transition"
            >
              Right
            </button>
          </div>
          <button
            onClick={handleResetCamera}
            title="Reset to Isometric Home"
            className="mt-1.5 w-full py-1 text-[10px] text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 rounded flex items-center justify-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* 3D ORBITAL KNOB (Bottom Right / Left per user request) */}
      <div className="absolute bottom-5 right-5 z-20">
        <OrbitalKnob
          onRotate={handleOrbitalRotate}
          onReset={handleResetCamera}
          onStepRotate={handleStepRotate}
        />
      </div>

      {/* Section Cut Floating Inspector (Bottom Center when toggled) */}
      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 p-2 bg-black/80 backdrop-blur border border-neutral-800 rounded-xl text-xs text-neutral-300">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sectionCutEnabled}
            onChange={e => setSectionCutEnabled(e.target.checked)}
            className="rounded bg-neutral-900 border-neutral-700 text-cyan-500 focus:ring-0"
          />
          <span>Section Cut Slice</span>
        </label>

        {sectionCutEnabled && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="range"
              min="-80"
              max="80"
              value={sectionCutOffset}
              onChange={e => setSectionCutOffset(parseFloat(e.target.value))}
              className="w-28 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="font-mono text-cyan-400 text-[10px]">{sectionCutOffset} mm</span>
          </div>
        )}
      </div>
    </div>
  );
};
