"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  fillPercentage: number;
  fuelColor?: string;
  className?: string;
}

export default function ShahedDrone({
  fillPercentage,
  fuelColor = "#22d3ee",
  className = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const colorRef = useRef(fuelColor);

  const percentage = Number.isFinite(fillPercentage)
    ? Math.max(0, Math.min(100, fillPercentage))
    : 0;

  useEffect(() => {
    targetRef.current = percentage / 100;
    colorRef.current = fuelColor;
  }, [percentage, fuelColor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(6, 7, 9);
    camera.lookAt(0, 0, -0.3);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x334155, 3));

    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(4, 8, -3);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x22d3ee, 3);
    rim.position.set(-5, 2, 4);
    scene.add(rim);

    const drone = new THREE.Group();
    scene.add(drone);

    const shell = new THREE.MeshStandardMaterial({
      color: "#b8b4a8",
      metalness: 0.45,
      roughness: 0.38,
    });

    const dark = new THREE.MeshStandardMaterial({
      color: "#1e293b",
      metalness: 0.6,
      roughness: 0.35,
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: "#d8f3ff",
      transparent: true,
      opacity: 0.25,
      metalness: 0.05,
      roughness: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const fuelMaterial = new THREE.MeshStandardMaterial({
      color: colorRef.current,
      emissive: colorRef.current,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.15,
    });

    function add(
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: [number, number, number] = [0, 0, 0],
    ) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      drone.add(mesh);
      return mesh;
    }

    // بال یکپارچه مثلثی؛ هندسه دلتای اختصاصی شاهد با بریدگی ملخ عقب
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -2.7);
    wingShape.lineTo(3.1, 1.65);
    wingShape.lineTo(0.65, 1.25);
    wingShape.lineTo(0, 0.8);
    wingShape.lineTo(-0.65, 1.25);
    wingShape.lineTo(-3.1, 1.65);
    wingShape.closePath();

    const wings = add(
      new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
        steps: 1,
      }),
      shell,
      [0, -0.12, 0],
    );
    wings.rotation.x = Math.PI / 2;

    // پوسته شفاف بالای بال، برای مشاهده مخزن داخلی
    const body = add(
      new THREE.SphereGeometry(1, 40, 24),
      glass,
      [0, 0.3, -0.35],
    );
    body.scale.set(0.53, 0.48, 2.3);
    body.renderOrder = 2;

    // مخزن و سوخت: پرشدن از کف به بالا
    add(
      new THREE.BoxGeometry(0.58, 0.06, 2.55),
      dark,
      [0, 0.04, -0.3],
    );

    const fuel = add(
      new THREE.BoxGeometry(0.48, 0.48, 2.4),
      fuelMaterial,
      [0, 0.07, -0.3],
    );

    // حلقه‌های قاب مخزن
    for (const z of [-1.48, -0.3, 0.88]) {
      const ring = add(
        new THREE.TorusGeometry(0.4, 0.025, 8, 40),
        shell,
        [0, 0.28, z],
      );
      ring.scale.set(1, 0.85, 1);
    }

    // بالک‌های عمودی نوک بال با چراغ‌های ناوبری استاندارد هوانوردی (سبز و قرمز)
    for (const side of [-1, 1]) {
      const finShape = new THREE.Shape();
      finShape.moveTo(-0.5, 0);
      finShape.lineTo(0.45, 0);
      finShape.lineTo(0.2, 0.85);
      finShape.closePath();

      const fin = add(
        new THREE.ExtrudeGeometry(finShape, {
          depth: 0.06,
          bevelEnabled: false,
        }),
        shell,
        [side * 2.85, -0.05, 1.15],
      );
      fin.rotation.y = Math.PI / 2;

      const light = add(
        new THREE.SphereGeometry(0.055, 12, 8),
        new THREE.MeshBasicMaterial({
          color: side < 0 ? "#ef4444" : "#34d399",
        }),
        [side * 3, 0.04, 1.58],
      );
      light.scale.y = 0.7;
    }

    // ملخ عقب تزئینی با هاب کروی و پره‌های متقاطع
    const propeller = new THREE.Group();
    propeller.position.set(0, 0.3, 2.05);
    drone.add(propeller);

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      dark,
    );
    propeller.add(hub);

    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.09, 0.05),
        dark,
      );
      blade.rotation.z = i * Math.PI / 2;
      propeller.add(blade);
    }

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.set(6, 7, 9);
      camera.position.multiplyScalar(
        Math.max(1, 1 / camera.aspect),
      );
      camera.lookAt(0, 0, -0.3);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let frame = 0;
    let previousTime = performance.now();
    let displayedFuel = targetRef.current;
    let currentColor = colorRef.current;

    const animate = (time: number) => {
      const dt = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      displayedFuel = reducedMotion.matches
        ? targetRef.current
        : THREE.MathUtils.lerp(
            displayedFuel,
            targetRef.current,
            1 - Math.exp(-5 * dt),
          );

      fuel.visible = displayedFuel > 0.001;
      fuel.scale.y = Math.max(displayedFuel, 0.001);
      fuel.position.y = 0.07 + displayedFuel * 0.24;

      if (currentColor !== colorRef.current) {
        currentColor = colorRef.current;
        fuelMaterial.color.set(currentColor);
        fuelMaterial.emissive.set(currentColor);
      }

      if (!reducedMotion.matches) {
        drone.position.y = Math.sin(time * 0.001) * 0.08;
        drone.rotation.y = Math.sin(time * 0.0003) * 0.18;
        propeller.rotation.z += dt * 12;
      } else {
        drone.position.y = 0;
        drone.rotation.y = 0;
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();

      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];
        list.forEach((material) => materials.add(material));
      });

      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: 440 }}
      role="img"
      aria-label={`پهپاد نمایشی با ${percentage.toFixed(0)} درصد سوخت`}
    >
      <div
        ref={hostRef}
        style={{ position: "absolute", inset: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          color: fuelColor,
          background: "#0f172acc",
          borderRadius: 16,
          padding: "8px 16px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        سوخت: {percentage.toLocaleString("fa-IR")}٪
      </span>
    </div>
  );
}
