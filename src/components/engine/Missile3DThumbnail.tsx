"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MissileModel } from "./missile-catalog";

interface Missile3DThumbnailProps {
  model: MissileModel;
  isSelected?: boolean;
  className?: string;
}

export default function Missile3DThumbnail({
  model,
  isSelected = false,
  className = "w-full h-36",
}: Missile3DThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;
    let isVisible = true;

    const width = container.clientWidth || 180;
    const height = container.clientHeight || 140;

    // ── 1. Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 0.05, 5.4);
    camera.lookAt(0, 0.05, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── 2. Lighting ──
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.65);
    scene.add(ambientLight);

    const dirWarm = new THREE.DirectionalLight(0xfff5e6, 1.8);
    dirWarm.position.set(2.5, 4, 3.5);
    scene.add(dirWarm);

    const dirCool = new THREE.DirectionalLight(0x60a5fa, 0.9);
    dirCool.position.set(-2.5, 1.5, -2);
    scene.add(dirCool);

    // ── 3. Materials ──
    const GOLD_COLOR = new THREE.Color("#f59e0b");
    const NOZZLE_COLOR = new THREE.Color("#1e2430");

    let hullColor = "#d4cec2";
    let hullMetalness = 0.58;
    let hullRoughness = 0.32;

    if (model === "fattah") {
      hullColor = "#222730";
      hullMetalness = 0.52;
      hullRoughness = 0.44;
    } else if (model === "sejjil") {
      hullColor = "#c8c0b0";
      hullMetalness = 0.62;
      hullRoughness = 0.34;
    } else if (model === "khorramshahr") {
      hullColor = "#3c434f";
      hullMetalness = 0.60;
      hullRoughness = 0.35;
    }

    const hullMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hullColor),
      metalness: hullMetalness,
      roughness: hullRoughness,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: GOLD_COLOR,
      emissive: GOLD_COLOR,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.22,
    });

    const nozzleMaterial = new THREE.MeshStandardMaterial({
      color: NOZZLE_COLOR,
      metalness: 0.85,
      roughness: 0.38,
      side: THREE.DoubleSide,
    });

    const fuelMaterial = new THREE.MeshStandardMaterial({
      color: GOLD_COLOR,
      emissive: GOLD_COLOR,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
    });

    const translucentMetalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdde4ec,
      metalness: 0.82,
      roughness: 0.16,
      transparent: true,
      opacity: 0.44,
      transmission: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // ── 4. Rocket Group Hierarchy ──
    const rocketGroup = new THREE.Group();
    scene.add(rocketGroup);

    const baseR = 0.32;
    const noseStart = 0.55;
    const CHAMBER_H = 1.1;
    const CHAMBER_CENTER_Y = 0.0;
    const CHAMBER_BOTTOM_Y = CHAMBER_CENTER_Y - CHAMBER_H / 2;

    // A) Nose Cone according to model
    let noseGeo: THREE.BufferGeometry;
    let beaconY = noseStart + 1.35;

    if (model === "fattah") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const r = baseR * Math.pow(1 - t, 0.72) * (1 + 0.08 * Math.sin(t * Math.PI));
        pts.push(new THREE.Vector2(Math.max(r, 0.001), noseStart + t * 1.45));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.45;
    } else if (model === "sejjil") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = baseR * Math.sqrt(Math.max(0, 1 - t * t));
        pts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.25));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.25;
    } else if (model === "khorramshahr") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = t < 0.2 ? baseR * (1 + 0.05 * (1 - t * 5)) : baseR * (1 - (t - 0.2) * 1.08);
        pts.push(new THREE.Vector2(Math.max(r, 0.035), noseStart + t * 1.15));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.15;
    } else {
      // Kheibar
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t);
        pts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.35));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.35;
    }

    const noseMesh = new THREE.Mesh(noseGeo, hullMaterial);
    rocketGroup.add(noseMesh);

    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), goldMaterial);
    beaconMesh.position.set(0, beaconY, 0);
    rocketGroup.add(beaconMesh);

    const upperCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.016, 10, 36), goldMaterial);
    upperCollar.rotation.x = Math.PI / 2;
    upperCollar.position.y = noseStart;
    rocketGroup.add(upperCollar);

    // B) Model Accessories
    if (model === "kheibar") {
      // 4 mid-fuselage triangular canards
      const canardShape = new THREE.Shape();
      canardShape.moveTo(0, 0);
      canardShape.lineTo(0.22, -0.15);
      canardShape.lineTo(0, -0.20);
      canardShape.closePath();
      const canardGeo = new THREE.ExtrudeGeometry(canardShape, { depth: 0.012, bevelEnabled: false });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        const c = new THREE.Mesh(canardGeo, hullMaterial);
        c.position.set(baseR * 0.95, 0.46, -0.006);
        arm.add(c);
        rocketGroup.add(arm);
      }
    } else if (model === "fattah") {
      // 4 hypersonic maneuvering fins at base of warhead
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0.24, -0.09);
      finShape.lineTo(0.17, -0.20);
      finShape.lineTo(0, -0.20);
      finShape.closePath();
      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.012, bevelEnabled: false });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        const f = new THREE.Mesh(finGeo, hullMaterial);
        f.position.set(baseR * 0.95, noseStart + 0.10, -0.006);
        arm.add(f);
        rocketGroup.add(arm);
      }
    } else if (model === "sejjil") {
      // Dual golden interstage staging rings
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 10, 36), goldMaterial);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = -0.82;
      rocketGroup.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 10, 36), goldMaterial);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = -1.05;
      rocketGroup.add(ring2);
    } else if (model === "khorramshahr") {
      // Heavy payload collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.08, baseR * 1.04, 0.09, 32), goldMaterial);
      collar.position.y = noseStart + 0.05;
      rocketGroup.add(collar);
    }

    // C) Translucent Metallic Fuel Tank
    const tankCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR, baseR, CHAMBER_H, 32, 1, true),
      translucentMetalMaterial
    );
    tankCylinder.position.y = CHAMBER_CENTER_Y;
    rocketGroup.add(tankCylinder);

    // Glowing Golden Salawat Liquid inside
    const fuelMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR * 0.90, baseR * 0.90, CHAMBER_H * 0.65, 24),
      fuelMaterial
    );
    fuelMesh.position.y = CHAMBER_BOTTOM_Y + (CHAMBER_H * 0.65) / 2;
    rocketGroup.add(fuelMesh);

    // 4 longitudinal metallic structural stringers
    const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, CHAMBER_H, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const strut = new THREE.Mesh(strutGeo, hullMaterial);
      strut.position.set(Math.cos(a) * (baseR + 0.003), CHAMBER_CENTER_Y, Math.sin(a) * (baseR + 0.003));
      rocketGroup.add(strut);
    }

    const lowerCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.016, 10, 36), goldMaterial);
    lowerCollar.rotation.x = Math.PI / 2;
    lowerCollar.position.y = CHAMBER_BOTTOM_Y;
    rocketGroup.add(lowerCollar);

    // D) Booster Skirt & Engine Nozzle
    const skirtPts: THREE.Vector2[] = [
      new THREE.Vector2(0.24, -1.25),
      new THREE.Vector2(0.36, -1.15),
      new THREE.Vector2(0.34, -0.85),
      new THREE.Vector2(baseR, CHAMBER_BOTTOM_Y),
    ];
    const skirtGeo = new THREE.LatheGeometry(skirtPts, 32);
    const skirtMesh = new THREE.Mesh(skirtGeo, hullMaterial);
    rocketGroup.add(skirtMesh);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.26, 24, 1, true), nozzleMaterial);
    nozzle.position.set(0, -1.38, 0);
    rocketGroup.add(nozzle);

    // E) 4 Stabilization Base Fins
    const baseFinShape = new THREE.Shape();
    baseFinShape.moveTo(0, 0);
    baseFinShape.lineTo(0.48, -0.35);
    baseFinShape.lineTo(0.48, -0.58);
    baseFinShape.lineTo(0, -0.58);
    baseFinShape.closePath();
    const baseFinGeo = new THREE.ExtrudeGeometry(baseFinShape, { depth: 0.025, bevelEnabled: false });

    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(baseFinGeo, hullMaterial);
      fin.position.set(0.3, -0.62, -0.0125);
      arm.add(fin);
      rocketGroup.add(arm);
    }

    // F) Active Golden Halo Base Pad if selected
    let haloMesh: THREE.Mesh | null = null;
    if (isSelected) {
      const haloGeo = new THREE.RingGeometry(0.65, 0.72, 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: GOLD_COLOR,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = -1.55;
      scene.add(haloMesh);
    }

    // ── 5. Animation Loop ──
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposed || !entries[0]) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    const io = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(container);

    let angle = 0;
    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      angle += 0.014;
      rocketGroup.rotation.y = angle;

      if (haloMesh) {
        (haloMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(angle * 2) * 0.25;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      io.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      scene.clear();
    };
  }, [model, isSelected]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
    />
  );
}

