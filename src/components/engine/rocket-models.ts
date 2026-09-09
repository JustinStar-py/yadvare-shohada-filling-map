import * as THREE from "three";
/** Artistic silhouettes only: no real dimensions, engineering or performance claims. */
import type { MissileModel } from "./missile-catalog";
export interface RocketModel {
  root: THREE.Group; capsule: THREE.Group; fuel: THREE.Mesh;
  surface: THREE.Mesh; fuelMaterial: THREE.MeshStandardMaterial;
  flame: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  setInscription: (text: string) => void; dispose: () => void;
}
export function buildRocket(id: MissileModel, low: boolean): RocketModel {
  const root = new THREE.Group();
  const capsule = new THREE.Group();
  root.add(capsule);
  const segments = low ? 20 : 40;
  const wide = id === "sejjil" || id === "khorramshahr";
  const radius = wide ? 0.36 : 0.29;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const material = <T extends THREE.Material>(value: T): T => { materials.add(value); return value; };
  const hullColor = id === "reyhaneh" ? "#f472b6" : id === "emad" ? "#e2e8f0" : "#d2ccc1";
  const hull = material(new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: id === "reyhaneh" ? 0.28 : 0.4,
    metalness: id === "reyhaneh" ? 0.38 : 0.62,
  }));
  const carbon = material(new THREE.MeshStandardMaterial({ color: "#27282c", roughness: 0.65, metalness: 0.3 }));
  const brass = material(new THREE.MeshStandardMaterial({ color: "#b88137", roughness: 0.3, metalness: 0.78 }));
  const glass = material(new THREE.MeshStandardMaterial({ color: "#e9d9b6", transparent: true,
    opacity: 0.16, roughness: 0.18, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide }));
  const fuelMaterial = material(new THREE.MeshStandardMaterial({ color: "#d69b2c", emissive: "#d69b2c",
    emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.3 }));
  function mesh<G extends THREE.BufferGeometry, M extends THREE.Material>(geometry: G, mat: M, y: number, parent = root) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, mat); object.position.y = y; parent.add(object); return object;
  }
  const ring = (r: number, y: number, parent = root) => {
    const object = mesh(new THREE.TorusGeometry(r, 0.017, 8, segments), brass, y, parent);
    object.rotation.x = Math.PI / 2; return object;
  };
  mesh(new THREE.CylinderGeometry(radius, radius * 1.06, 0.72, segments), hull, -0.98);
  mesh(new THREE.CylinderGeometry(radius, radius, 1.12, segments, 1, true), glass, -0.04);
  const fuel = mesh(new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, 1, segments), fuelMaterial, -0.6);
  const surface = mesh(new THREE.CircleGeometry(radius * 0.85, segments), brass, -0.6);
  surface.rotation.x = -Math.PI / 2;
  ring(radius, -0.6); ring(radius, 0.52);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const rail = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.12, 6), brass, -0.04);
    rail.position.x = Math.cos(a) * radius; rail.position.z = Math.sin(a) * radius;
  }
  const points = id === "fattah"
    ? [[radius, 0.52], [radius * 0.76, 0.8], [radius * 0.82, 0.98], [0.012, 1.92]]
    : id === "khorramshahr"
    ? [[radius, 0.52], [radius * 1.05, 0.95], [0.012, 1.75]]
    : id === "sejjil"
    ? [[radius, 0.52], [radius * 0.82, 0.76], [radius * 0.72, 1.2], [0.012, 1.87]]
    : id === "emad"
    ? [[radius, 0.52], [radius * 0.88, 0.82], [radius * 0.68, 1.32], [0.012, 1.98]]
    : id === "reyhaneh"
    ? [[radius, 0.52], [radius * 0.92, 0.85], [radius * 0.78, 1.25], [0.012, 1.90]]
    : [[radius, 0.52], [radius * 0.9, 0.9], [0.012, 1.95]];
  mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments),
    id === "fattah" ? carbon : hull, 0, capsule);
  ring(radius, 0.52, capsule);
  if (id === "sejjil") { ring(radius * 1.03, -0.85); ring(radius * 1.03, -1.08); }
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(wide ? 0.48 : 0.36, -0.42);
  finShape.lineTo(0, -0.42); finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: 0.022, bevelEnabled: false });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; root.add(arm);
    const fin = mesh(finGeometry, hull, id === "kheibar" ? -0.5 : -0.94, arm);
    fin.position.x = radius * 0.9; fin.position.z = -0.011;
  }
  mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.7, 0.22, segments, 1, true), carbon, -1.44);
  const flameMat = material(new THREE.MeshBasicMaterial({ color: "#f3ba51", transparent: true,
    opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const flame = mesh(new THREE.ConeGeometry(radius * 0.45, 0.95, 16), flameMat, -1.98);
  flame.rotation.x = Math.PI;
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 192;
  const inscription = new THREE.CanvasTexture(canvas); inscription.colorSpace = THREE.SRGBColorSpace;
  textures.add(inscription);
  const inscriptionMat = material(new THREE.MeshBasicMaterial({ map: inscription, transparent: true,
    depthWrite: false, side: THREE.DoubleSide }));
  const label = mesh(new THREE.PlaneGeometry(0.52, 0.098), inscriptionMat, -0.96);
  label.position.z = radius * 1.06 + 0.008;
  const setInscription = (text: string) => {
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.direction = "rtl";
    ctx.font = '600 82px Shabnam, Vazirmatn, Tahoma, sans-serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#573720";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 32); inscription.needsUpdate = true;
  };
  setInscription("یادواره شهدای شهیدیه");
  return { root, capsule, fuel, surface, fuelMaterial, flame, setInscription,
    dispose: () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose()); root.clear(); } };
}
