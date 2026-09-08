#!/usr/bin/env node

/**
 * ============================================================================
 * EXPORT AI CONTEXT BUNDLER
 * ============================================================================
 * Bundles key project code into a single consolidated .txt file along with
 * a comprehensive master prompt for frontier AI models (GPT-6 Astra, Claude 3.7, etc.)
 * to upgrade:
 *   1. 3D Iranian Ballistic & Hypersonic Missile Models (Fattah, Kheibar, Sejjil, etc.)
 *   2. Emil Kowalski Design Engineering UI/UX & micro-interactions
 *   3. React 19 / Next.js 16 / Three.js performance & clean code architecture
 *
 * Usage:
 *   node scripts/export-ai-context.mjs
 *   npm run export-ai
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse optional output file from CLI: --output <path> or -o <path>
const args = process.argv.slice(2);
let outputFileName = "project-ai-context.txt";
const outIdx = args.findIndex((a) => a === "--output" || a === "-o");
if (outIdx !== -1 && args[outIdx + 1]) {
  outputFileName = args[outIdx + 1];
}
const outputFile = path.isAbsolute(outputFileName)
  ? outputFileName
  : path.join(rootDir, outputFileName);

// Key files to bundle
const keyFiles = [
  // 1. 3D Visual Engine & Missile Graphics
  {
    category: "1. 3D Engine & Rocket Graphics",
    description: "Main 3D WebGL Three.js procedural missile scene, materials, lighting, fuel chamber & flight loop",
    relPath: "src/components/engine/ThreeRocketScene.tsx",
  },
  {
    category: "1. 3D Engine & Rocket Graphics",
    description: "SSR-safe Dynamic Three.js wrapper & responsive canvas viewport container",
    relPath: "src/components/engine/ParallaxRocket.tsx",
  },
  {
    category: "1. 3D Engine & Rocket Graphics",
    description: "Atmospheric particle canvas, launch exhaust plume, speed streaks, sparks & smoke shaders",
    relPath: "src/components/engine/AtmosphereCanvas.tsx",
  },
  {
    category: "1. 3D Engine & Rocket Graphics",
    description: "3D interactive letter/envelope opening animation with wax seal & paper unfolding",
    relPath: "src/components/engine/Envelope3DCanvas.tsx",
  },

  // 2. Interactive UI & User Experience
  // 2. Interactive UI & User Experience (Hero, Modals, Buttons, Live Stats)
  {
    category: "2. UI/UX & Interactive Components",
    description: "Main viewport hero orchestration, title ribbons, live progress & countdown badge",
    relPath: "src/components/HeroSection.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Core tactile Salawat button with batching, haptics, sound triggers & click physics",
    relPath: "src/components/SalawatButton.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Ceremonial launch modal overlay, countdown sequence, star-birth & celebratory transition",
    relPath: "src/components/LaunchOverlay.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Memorial event dialogue modal with live countdown, map navigation & invite text copy",
    relPath: "src/components/MemorialDialogModal.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Standalone live countdown cards component with pulse animation & time formatting",
    relPath: "src/components/MemorialCountdown.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Martyr covenant dedication card with photo, bio, quote & renewed pledge actions",
    relPath: "src/components/DedicationCard.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Top navigation header, audio mute toggle with speaker waves & live stats display",
    relPath: "src/components/Header.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Interactive celestial constellation canvas of martyr stars, meteors, glowing badges & star modals",
    relPath: "src/components/ConstellationView.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Social share card modal with native Web Share API & clipboard copy with feedback",
    relPath: "src/components/ShareCardModal.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Guided onboarding mission tour modal introducing campaign mechanics to new visitors",
    relPath: "src/components/DailyMissionTourModal.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Collective milestone record celebration card for community achievements",
    relPath: "src/components/CollectiveRecord.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Community progress tracker displaying daily & total contributions",
    relPath: "src/components/CommunityProgress.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Campaign spiritual narrative story modal/section",
    relPath: "src/components/CampaignStory.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Memorial event location & date details component",
    relPath: "src/components/MemorialInfo.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Rolling mechanical/digital odometer number component with tabular font metrics",
    relPath: "src/components/ui/OdometerNumber.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Official memorial identity logo with golden halo lighting & eager LCP optimization",
    relPath: "src/components/ui/YadvareLogo.tsx",
  },
  {
    category: "2. UI/UX & Interactive Components",
    description: "Symbolic martyr red tulip emblem with subtle glow filter",
    relPath: "src/components/ui/MartyrTulipIcon.tsx",
  },

  // 3. Application Orchestration & Styling
  {
    category: "3. App Orchestration & Design System",
    description: "Root page coordinating real-time SSE streams, optimistic updates, modals & audio listeners",
    relPath: "src/app/page.tsx",
  },
  {
    category: "3. App Orchestration & Design System",
    description: "Global CSS, Tailwind v4 theme, Emil Kowalski custom easings, glassmorphism & keyframes",
    relPath: "src/app/globals.css",
  },
  {
    category: "3. App Orchestration & Design System",
    description: "Emil Kowalski Design Engineering transition hook for buttery-smooth modal enter/exit states",
    relPath: "src/lib/client/use-modal-transition.ts",
  },
  {
    category: "3. App Orchestration & Design System",
    description: "Zero-dependency procedural Web Audio engine (sacred chimes, salawat tones, ambient music)",
    relPath: "src/lib/client/procedural-audio.ts",
  },
  {
    category: "3. App Orchestration & Design System",
    description: "Core TypeScript interfaces, mission states, martyr profiles & campaign data schemas",
    relPath: "src/types/campaign.ts",
  },
];

const MASTER_AI_PROMPT = `================================================================================
MASTER PROMPT FOR ADVANCED AI (GPT-6 ASTRA / CLAUDE 3.7 / CREATIVE TECHNOLOGIST)
================================================================================
ROLE:
You are a World-Class Principal Creative Technologist, Staff Design Engineer (following
Emil Kowalski / animations.dev standards), Senior Three.js / WebGL Shader Specialist,
ROLE & PERSONA:
You are a World-Class Principal Creative Technologist, Staff Design Engineer (steeped in
Emil Kowalski / animations.dev principles), Senior Three.js / WebGL Shader Specialist,
and Lead React 19 / Next.js 16 (Turbopack) Fullstack Architect.

--------------------------------------------------------------------------------
PROJECT OVERVIEW (پویش معنوی یادواره ۷۶ شهید والامقام شهیدیه میبد):
--------------------------------------------------------------------------------
We are developing a high-impact, spiritual, and patriotic Iranian web application
for the Memorial of 76 Honored Martyrs of Shahidieh, Meybod, Iran.

CORE CONCEPT:
1. Every recited "Salawat" (صلوات) by citizens acts as spiritual energy / propellant fuel.
2. The central visual element is a 3D Iranian missile on its launchpad.
3. As salawat are contributed, a luminous, glowing golden fuel core fills up inside the missile.
4. When the daily target is achieved (100% fill), a cinematic ceremonial launch sequence initiates:
   - The countdown plays (3... 2... 1...)
   - The engine ignites with intense thrust, Mach diamonds, volumetric smoke, and pad tremors
   - The missile ascends into the cosmos and places a dedicated star in the celestial constellation
   - The missile docks or smoothly returns for the next day's covenant.
5. High emotional resonance: connection with martyrs, Iranian technological strength, and solemn beauty.

--------------------------------------------------------------------------------
YOUR OBJECTIVES & HIGH-PRIORITY DELIVERABLES:
YOUR CORE MISSIONS & DELIVERABLES:
--------------------------------------------------------------------------------

🎯 1. MULTIPLE IRANIAN BALLISTIC & HYPERSONIC MISSILE 3D MODELS (چندین مدل موشک ایرانی)
🎯 MISSION 1: MULTIPLE IRANIAN BALLISTIC & HYPERSONIC MISSILE 3D MODELS
Currently, \`ThreeRocketScene.tsx\` renders a single procedural 3D rocket.
We want you to architect and provide modular code supporting MULTIPLE distinct Iranian missile models
that can be selected, previewed, or switched (e.g. via a \`missileModel\` prop or selector):

  Model A: "فتاح ۱" (Fattah-1 Hypersonic)
  - Features: Sleek aerodynamic biconic/waisted nose cone, distinct hypersonic glide vehicle (HGV)
    second stage, thrust-vectoring nozzle with titanium gimbal rings, high-speed heat-resistant
    carbon/graphite black nose tip, plasma ionization aura / blue-violet re-entry glow.

  Model B: "خیبرشکن" (Kheibar Shekan - Precision Strike)
  - Features: Slender tactical solid-propellant fuselage, signature triangular mid-body maneuver
    fins for terminal agility, high-contrast desert/military ceramic composite plating, sharp apex.

  Model C: "سجیل" (Sejjil - Heavy Dual-Stage Long-Range)
  - Features: Broad cylindrical dual-stage body with visible interstage separator ring and lattice/grid
    stabilizers, double-cone warhead with gold-embossed holy calligraphy, massive dual-nozzle ignition.

  Model D: "خرمشهر ۴ / خیبر" (Khorramshahr-4 Heavy Warhead)
  - Features: High-density conical cone with internal guidance radar cone, submerged propulsion
    housing, wide payload fairing, spectacular high-thrust single combustion flame.

  KEY VISUAL REQUIREMENTS FOR ALL MODELS:
  - Transparent/Semi-translucent Golden Fuel Cylinder: Seamlessly integrated along the body so
    the current fill percentage (\`fillPercentage\`) is always visually striking and readable!
  - Calligraphic Inscription: Delicate glowing typography along the hull (e.g. "یا علی بن ابی‌طالب",
    "نصر من الله و فتح قریب", or "یادواره شهدای شهیدیه").
  - Physical Lighting & Materials: MeshStandardMaterial / Custom Shaders with realistic roughness,
    metallic luster, carbon-fiber normal micro-textures, and launchpad ground reflections.

---

🎯 2. EMIL KOWALSKI DESIGN ENGINEERING (UI/UX & MICRO-INTERACTIONS)
Elevate the entire frontend experience following the principles of animations.dev / Emil Kowalski:
  - **Natural Spring & Physics**: Replace generic linear/ease transitions with calibrated bezier curves:
    \`cubic-bezier(0.23, 1, 0.32, 1)\` for dialogs and entrances, and spring-like responsiveness.
  - **Tactile Salawat Button**: Immediate active feedback (\`scale(0.97)\` in 160ms), glowing aura burst
    on click, particle dispersion, rolling odometer counter numbers, and haptic feedback.
  - **Unobstructed Cinematic Launch View**:
    During the countdown and flight, the overlay MUST gracefully fade out without any dark blue tint
    obscuring the rocket. The rocket should be front and center, scaled up heroically in the viewport!
  - **Smooth Modals**: Use \`useModalTransition\` pattern with backdrop-blur, scale-in, and zero layout shift.
🎯 MISSION 2: UI/UX ELEVATION & EMIL KOWALSKI DESIGN ENGINEERING
Apply Emil Kowalski's core philosophy (from animations.dev) across all UI/UX components:

1. **Taste & Invisible Correctness**:
   - The best details users never consciously notice; when features function exactly as expected,
     interfaces feel naturally great.
   - Beauty is leverage. Good defaults and good animations make the experience unforgettable.

2. **Micro-interaction Guidelines**:
   - **No lazy transitions**: Never use \`transition: all\`. Specify exact transition properties (\`transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms ease-out\`).
   - **Nothing appears from nothing**: Never pop elements with \`scale(0)\`. Modals and cards should scale from \`scale(0.95)\` with \`opacity: 0\` to \`scale(1)\` with \`opacity: 1\`.
   - **Custom Curves**: Use calibrated bezier curves:
     - Modals / Entrances: \`cubic-bezier(0.23, 1, 0.32, 1)\` (fast response, smooth settle).
     - Dropdowns / Quick reveals: \`ease-out\` (never sluggish \`ease-in\`).
   - **Tactile Buttons**: Every button MUST have a satisfying tactile \`:active\` state:
     \`active:scale-[0.97] transition-transform duration-160 ease-out\`
   - **Salawat Button Micro-physics**:
     - Fast click feedback (ripple or particle spark burst, immediate counter increment).
     - Rolling digits with \`OdometerNumber\` for an organic mechanical feel.
   - **Unobstructed Launch Overlay**:
     - When the launch countdown reaches 0, the modal overlay MUST gracefully exit completely so
       the user has a clear, unobstructed cinematic view of the rocket lifting off.
   - **Celestial Constellation (\`ConstellationView.tsx\`)**:
     - Smooth hover cards for martyr stars, shimmering twinkle, subtle meteor streaks, and
       frictionless touch dragging on mobile.

3. **Required Review Format**:
   For any UI changes you propose, include a clear markdown table:
   | Before | After | Why |
   | --- | --- | --- |

---

🎯 3. CODE CLEANLINESS, PERFORMANCE & ARCHITECTURE
🎯 MISSION 3: CODE CLEANLINESS, PERFORMANCE & ARCHITECTURE
  - Fully compatible with Next.js 16.3 (Turbopack) & React 19.
  - Zero memory leaks in Three.js: strict disposal of geometries, materials, textures, and requestAnimationFrame.
  - Adaptive resolution: smooth 60fps on mobile devices and low-end GPUs.
  - Pure TypeScript with strict typing, clean props, and modular sub-components.

---

🎯 4. OUTPUT INSTRUCTIONS:
🎯 MISSION 4: OUTPUT INSTRUCTIONS:
Please provide:
1. Complete, drop-in replacement code for the upgraded \`ThreeRocketScene.tsx\` (with multi-missile support).
2. Code for accompanying components that need updating (e.g. \`ParallaxRocket.tsx\`, \`HeroSection.tsx\`, or \`LaunchOverlay.tsx\`).
2. Code for UI/UX components that need upgrading (e.g. \`SalawatButton.tsx\`, \`HeroSection.tsx\`, \`LaunchOverlay.tsx\`, \`ConstellationView.tsx\`, etc.).
3. Clear instructions on how to toggle or select between the different missile models.
Do NOT use lazy placeholders like "// rest of code remains same" for crucial logic. Provide full, working files!

================================================================================
PROJECT FILE TREE & CODE CONTENTS BELOW
================================================================================
`;

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

async function bundleFiles() {
  console.log("\n=======================================================");
  console.log(" 🚀 STARTING AI CONTEXT EXPORT BUNDLER");
  console.log("=======================================================");

  let totalChars = 0;
  let totalLines = 0;
  let includedFilesCount = 0;
  const missingFiles = [];

  const stream = fs.createWriteStream(outputFile, { encoding: "utf8" });

  // Write Master AI Prompt
  stream.write(MASTER_AI_PROMPT);
  stream.write("\n\n");

  // Table of Contents
  stream.write("================================================================================\n");
  stream.write("TABLE OF CONTENTS - INCLUDED CODE FILES:\n");
  stream.write("================================================================================\n");

  keyFiles.forEach((file, index) => {
    const fullPath = path.join(rootDir, file.relPath);
    const exists = fs.existsSync(fullPath);
    const status = exists ? `[OK - ${formatBytes(getFileSize(fullPath))}]` : "[MISSING]";
    stream.write(
      `${String(index + 1).padStart(2, " ")}. [${file.category}] ${file.relPath}\n` +
      `    Description: ${file.description}\n` +
      `    Status: ${status}\n\n`
    );
  });
  stream.write("================================================================================\n\n");

  // Process Each File
  for (let i = 0; i < keyFiles.length; i++) {
    const file = keyFiles[i];
    const fullPath = path.join(rootDir, file.relPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Warning: File not found: ${file.relPath}`);
      missingFiles.push(file.relPath);
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n").length;
      const sizeBytes = Buffer.byteLength(content, "utf8");

      totalChars += content.length;
      totalLines += lines;
      includedFilesCount++;

      console.log(` ✅ [${i + 1}/${keyFiles.length}] Bundled: ${file.relPath} (${lines} lines, ${formatBytes(sizeBytes)})`);

      const fileExt = path.extname(file.relPath).replace(".", "") || "txt";
      const delimiter = "=".repeat(80);

      stream.write(`\n${delimiter}\n`);
      stream.write(`FILE [${i + 1}/${keyFiles.length}]: ${file.relPath}\n`);
      stream.write(`CATEGORY: ${file.category}\n`);
      stream.write(`DESCRIPTION: ${file.description}\n`);
      stream.write(`LINES: ${lines} | SIZE: ${formatBytes(sizeBytes)}\n`);
      stream.write(`${delimiter}\n\n`);
      stream.write(`\`\`\`${fileExt}\n`);
      stream.write(content);
      if (!content.endsWith("\n")) stream.write("\n");
      stream.write("```\n\n");
    } catch (err) {
      console.error(`❌ Error reading ${file.relPath}:`, err.message);
    }
  }

  stream.end();

  // Wait for finish
  await new Promise((resolve) => stream.on("finish", resolve));

  const totalSizeBytes = getFileSize(outputFile);
  const estimatedTokens = Math.round(totalChars / 3.8); // Average ~3.8 chars per token for code

  console.log("\n=======================================================");
  console.log(" 🎉 BUNDLE GENERATION COMPLETE!");
  console.log("=======================================================");
  console.log(`📁 Output File:      ${path.relative(process.cwd(), outputFile)}`);
  console.log(`📄 Files Included:   ${includedFilesCount} / ${keyFiles.length}`);
  console.log(`📏 Total Lines:      ${totalLines.toLocaleString("en-US")}`);
  console.log(`💾 Total File Size:  ${formatBytes(totalSizeBytes)}`);
  console.log(`🧠 Estimated Tokens: ~${estimatedTokens.toLocaleString("en-US")} tokens`);
  console.log("=======================================================");
  console.log("💡 HOW TO USE WITH GPT-6 ASTRA / CLAUDE / CHATGPT:");
  console.log("   1. Open or upload this file ('" + path.basename(outputFile) + "') into GPT-6 Astra / Claude.");
  console.log("   2. Send it directly — the built-in Master Prompt instructs the AI");
  console.log("      to design multiple Iranian missile models and elevate UI/UX!");
  console.log("=======================================================\n");
}

bundleFiles().catch((err) => {
  console.error("Fatal error bundling files:", err);
  process.exit(1);
});

