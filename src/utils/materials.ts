import * as THREE from 'three';
import { MaterialFinish } from '../types/cad';

export function getCADMaterial(finish: MaterialFinish, clippingPlanes: THREE.Plane[] = []): THREE.Material {
  const commonOptions = {
    clippingPlanes,
    clipShadows: true,
  };

  switch (finish) {
    case 'aluminum':
      return new THREE.MeshStandardMaterial({
        color: 0xd8dee9,
        metalness: 0.85,
        roughness: 0.28,
        ...commonOptions,
      });

    case 'steel':
      return new THREE.MeshStandardMaterial({
        color: 0x4c566a,
        metalness: 0.95,
        roughness: 0.2,
        ...commonOptions,
      });

    case 'brass':
      return new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.88,
        roughness: 0.22,
        ...commonOptions,
      });

    case 'plastic-blue':
      return new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        metalness: 0.08,
        roughness: 0.4,
        ...commonOptions,
      });

    case 'plastic-orange':
      return new THREE.MeshStandardMaterial({
        color: 0xea580c,
        metalness: 0.05,
        roughness: 0.35,
        ...commonOptions,
      });

    case 'carbon':
      return new THREE.MeshStandardMaterial({
        color: 0x1f242c,
        metalness: 0.4,
        roughness: 0.3,
        ...commonOptions,
      });

    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color: 0xa5f3fc,
        transmission: 0.88,
        opacity: 1,
        transparent: true,
        roughness: 0.12,
        ior: 1.52,
        thickness: 2.0,
        ...commonOptions,
      });

    default:
      return new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.5,
        roughness: 0.3,
        ...commonOptions,
      });
  }
}
