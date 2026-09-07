"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface Envelope3DCanvasProps {
  isOpen: boolean;
  onLetterEmerged?: () => void;
  className?: string;
}

export default function Envelope3DCanvas({
  isOpen,
  onLetterEmerged,
  className = "",
}: Envelope3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const onLetterEmergedRef = useRef(onLetterEmerged);
  onLetterEmergedRef.current = onLetterEmerged;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // ── 1. Scene, Camera, Renderer ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── 2. Lights ──
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.85);
    scene.add(ambientLight);

    const keySpot = new THREE.SpotLight(0xfffae6, 3.5);
    keySpot.position.set(2.5, 4.0, 4.0);
    keySpot.angle = Math.PI / 4;
    keySpot.penumbra = 0.5;
    scene.add(keySpot);

    const rimPoint = new THREE.PointLight(0xf59e0b, 1.2, 12);
    rimPoint.position.set(-3.0, -1.0, 2.0);
    scene.add(rimPoint);

    const sealGlowLight = new THREE.PointLight(0xf43f5e, 0.4, 4);
    sealGlowLight.position.set(0, 0, 0.6);
    scene.add(sealGlowLight);

    // ── 3. Texture Generators ──
    const createEnvelopeTexture = (isFlap = false): THREE.CanvasTexture => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext("2d")!;

      // Deep celestial crimson-ivory gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, "#2a0d16");
      grad.addColorStop(0.5, "#1e0b12");
      grad.addColorStop(1, "#14060b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Fine golden border filigree
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 488, 488);

      ctx.strokeStyle = "rgba(245, 158, 11, 0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 472, 472);

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const createParchmentTexture = (): THREE.CanvasTexture => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 680;
      const ctx = cvs.getContext("2d")!;

      // Radiant parchment background
      const grad = ctx.createLinearGradient(0, 0, 0, 680);
      grad.addColorStop(0, "#fffcf2");
      grad.addColorStop(0.5, "#faf4e4");
      grad.addColorStop(1, "#f3e8cf");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 680);

      // Delicate gold trim
      ctx.strokeStyle = "rgba(217, 119, 6, 0.45)";
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 480, 648);

      ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(24, 24, 464, 632);

      // Calligraphic header watermark (بسم الله الرحمن الرحیم)
      ctx.font = "bold 26px Shabnam, Tahoma, sans-serif";
      ctx.fillStyle = "rgba(180, 83, 9, 0.55)";
      ctx.textAlign = "center";
      ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 256, 75);

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const createWaxSealTexture = (): THREE.CanvasTexture => {
      const cvs = document.createElement("canvas");
      cvs.width = 256;
      cvs.height = 256;
      const ctx = cvs.getContext("2d")!;

      // Carmine crimson wax base
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, "#f43f5e");
      grad.addColorStop(0.65, "#be123c");
      grad.addColorStop(1, "#881337");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(128, 128, 110, 0, Math.PI * 2);
      ctx.fill();

      // Golden rim on seal
      ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Embossed tulip silhouette in center
      ctx.fillStyle = "#fff1f2";
      ctx.beginPath();
      // Stylized tulip cup
      ctx.moveTo(128, 65);
      ctx.bezierCurveTo(155, 95, 165, 135, 128, 175);
      ctx.bezierCurveTo(91, 135, 101, 95, 128, 65);
      ctx.fill();

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // ── 4. Build 3D Envelope Hierarchies ──
    const envelopeGroup = new THREE.Group();
    scene.add(envelopeGroup);

    const envWidth = 3.2;
    const envHeight = 2.1;
    const envDepth = 0.04;

    // Back plate
    const backGeo = new THREE.BoxGeometry(envWidth, envHeight, envDepth);
    const envMat = new THREE.MeshStandardMaterial({
      map: createEnvelopeTexture(),
      roughness: 0.45,
      metalness: 0.25,
      color: 0x992233,
    });
    const backMesh = new THREE.Mesh(backGeo, envMat);
    envelopeGroup.add(backMesh);

    // Front pocket (bottom and side folds)
    const pocketShape = new THREE.Shape();
    pocketShape.moveTo(-envWidth / 2, -envHeight / 2);
    pocketShape.lineTo(envWidth / 2, -envHeight / 2);
    pocketShape.lineTo(envWidth / 2, 0.1);
    pocketShape.lineTo(0, -0.4);
    pocketShape.lineTo(-envWidth / 2, 0.1);
    pocketShape.closePath();

    const pocketGeo = new THREE.ShapeGeometry(pocketShape);
    const pocketMat = new THREE.MeshStandardMaterial({
      color: 0xaa283d,
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
    pocketMesh.position.z = envDepth / 2 + 0.035;
    envelopeGroup.add(pocketMesh);

    // Parchment Letter (inside pocket, glides up)
    const letterWidth = 2.8;
    const letterHeight = 2.4;
    const letterGeo = new THREE.PlaneGeometry(letterWidth, letterHeight);
    const letterMat = new THREE.MeshStandardMaterial({
      map: createParchmentTexture(),
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const letterMesh = new THREE.Mesh(letterGeo, letterMat);
    letterMesh.position.set(0, -0.25, 0.015);
    envelopeGroup.add(letterMesh);

    // Top Flap with Hinge Pivot
    // The hinge is at Y = +envHeight / 2 (+1.05)
    const flapHinge = new THREE.Group();
    flapHinge.position.set(0, envHeight / 2, envDepth / 2 + 0.02);
    envelopeGroup.add(flapHinge);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-envWidth / 2, 0);
    flapShape.lineTo(envWidth / 2, 0);
    flapShape.lineTo(0, -1.05);
    flapShape.closePath();

    const flapGeo = new THREE.ShapeGeometry(flapShape);
    const flapMat = new THREE.MeshStandardMaterial({
      color: 0xb52b41,
      roughness: 0.4,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const flapMesh = new THREE.Mesh(flapGeo, flapMat);
    flapHinge.add(flapMesh);

    // Wax Seal Medallion attached to flap apex
    const sealGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 32);
    const sealMat = new THREE.MeshStandardMaterial({
      map: createWaxSealTexture(),
      roughness: 0.3,
      metalness: 0.4,
    });
    const sealMesh = new THREE.Mesh(sealGeo, sealMat);
    sealMesh.rotation.x = Math.PI / 2;
    sealMesh.position.set(0, -0.95, 0.03);
    flapHinge.add(sealMesh);

    // Floating Stardust Particles
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 6;
      pPos[i + 1] = (Math.random() - 0.5) * 5;
      pPos[i + 2] = (Math.random() - 0.5) * 3 + 1;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── 5. Animation Variables & States ──
    let flapAngle = 0; // 0 = closed, Math.PI = fully opened
    let letterY = -0.25;
    let targetLetterY = -0.25;
    let hasTriggeredEmerged = false;

    // Interactive pointer parallax tilt
    let targetRotY = 0;
    let targetRotX = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.18;
      targetRotX = -y * 0.14;
    };

    container.addEventListener("pointermove", handlePointerMove);

    // ── 6. Render Loop ──
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Subtle celestial hovering
      const hoverY = Math.sin(elapsed * 1.8) * 0.06;
      envelopeGroup.position.y = hoverY;

      // Smooth pointer tilt interpolation
      envelopeGroup.rotation.y += (targetRotY - envelopeGroup.rotation.y) * 0.08;
      envelopeGroup.rotation.x += (targetRotX - envelopeGroup.rotation.x) * 0.08;

      // Animate flap and letter unsealing
      if (isOpenRef.current) {
        // Flap opens smoothly: rotation around hinge X axis
        if (flapAngle < Math.PI * 0.98) {
          flapAngle += delta * 3.2; // ~1 second to fully fold open
          if (flapAngle > Math.PI * 0.98) flapAngle = Math.PI * 0.98;
          flapHinge.rotation.x = flapAngle;
        }

        // Once flap is half open (~50 deg), letter starts sliding out
        if (flapAngle > 0.8) {
          targetLetterY = 1.35; // Rises out of the envelope
          sealGlowLight.intensity = Math.min(2.0, sealGlowLight.intensity + delta * 3);
        }

        letterY += (targetLetterY - letterY) * 0.07;
        letterMesh.position.y = letterY;
        letterMesh.position.z = 0.08 + (letterY + 0.25) * 0.04;

        // Check if letter has fully emerged to fire callback
        if (!hasTriggeredEmerged && letterY > 1.25) {
          hasTriggeredEmerged = true;
          onLetterEmergedRef.current?.();
        }
      } else {
        // Return to closed state
        flapAngle = Math.max(0, flapAngle - delta * 4);
        flapHinge.rotation.x = flapAngle;
        letterY += (-0.25 - letterY) * 0.1;
        letterMesh.position.y = letterY;
        hasTriggeredEmerged = false;
        sealGlowLight.intensity = Math.max(0.4, sealGlowLight.intensity - delta * 2);
      }

      // Gentle floating stardust animation
      const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += delta * 0.12;
        if (arr[i] > 3) arr[i] = -2.5;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ── 7. Clean Cleanup & Disposal ──
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointermove", handlePointerMove);

      renderer.dispose();
      backGeo.dispose();
      pocketGeo.dispose();
      letterGeo.dispose();
      flapGeo.dispose();
      sealGeo.dispose();
      pGeo.dispose();

      envMat.dispose();
      pocketMat.dispose();
      letterMat.dispose();
      flapMat.dispose();
      sealMat.dispose();
      pMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[380px] sm:min-h-[440px] flex items-center justify-center overflow-hidden select-none pointer-events-auto touch-none ${className}`}
    />
  );
}
