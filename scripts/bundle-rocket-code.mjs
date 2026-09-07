import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const outputFile = path.join(rootDir, "rocket-code-bundle.txt");

const filesToInclude = [
  {
    title: "1. ThreeRocketScene.tsx (3D Three.js Rocket, PBR Materials, Internal Fuel Chamber, Flight Physics & Animation Loop)",
    path: path.join(rootDir, "src/components/engine/ThreeRocketScene.tsx"),
  },
  {
    title: "2. ParallaxRocket.tsx (Rocket Wrapper Component, Dynamic SSR-free 3D Loader, 2.5D SVG Fallback)",
    path: path.join(rootDir, "src/components/engine/ParallaxRocket.tsx"),
  },
  {
    title: "3. LaunchOverlay.tsx (Ceremonial Countdown Modal, 3..2..1 Countdown, Flight Stages, Star Birth Sequence)",
    path: path.join(rootDir, "src/components/LaunchOverlay.tsx"),
  },
  {
    title: "4. AtmosphereCanvas.tsx (Background Particle Physics, Launch Exhaust Plume, Speed Streaks, Sparks, Celestial Shaders)",
    path: path.join(rootDir, "src/components/engine/AtmosphereCanvas.tsx"),
  },
  {
    title: "5. HeroSection.tsx (First Viewport Orchestration, Unified Single Clock Counter & Fuel Percentage)",
    path: path.join(rootDir, "src/components/HeroSection.tsx"),
  },
  {
    title: "6. page.tsx (Main App Page, SSE Event Listener, Auto-Launch on Page Visit, Optimistic State)",
    path: path.join(rootDir, "src/app/page.tsx"),
  },
  {
    title: "7. Reference Project: RocketScene.tsx (Alternative Three.js / R3F Rocket Physics & Shader Reference by Claude Fable 5)",
    path: "C:\\Users\\AdakPC\\Downloads\\salawat-rocket-memorial-campaign\\src\\components\\scene\\RocketScene.tsx",
  },
];

const masterPrompt = `================================================================================
PROMPT FOR QWEN AI MODEL: ADVANCED 3D ROCKET LAUNCH, CINEMATIC FLIGHT & SMOKE DYNAMICS
================================================================================
You are an expert Three.js, WebGL, Next.js 16 (App Router), and React 19 graphics engineer and game physics architect.

### Project Context:
We are developing a spiritual memorial campaign web application (" پویش معنوی یادواره شهدای شهیدیه").
Users recite "Salawat", each contribution fills a 3D missile with luminous golden fuel toward a daily target (\`mission.currentCount >= mission.target\`).
When the target is met, a ceremonial launch sequence takes place.

### Current Tech Stack:
- Next.js 16.3 (Turbopack, App Router, React 19)
- Three.js (vanilla WebGL inside React canvas, high performance, zero SSR friction)
- Tailwind CSS v4

---

### CRITICAL REQUIREMENTS & VISUAL IMPROVEMENTS:

1. **CINEMATIC UNOBSTRUCTED FLIGHT VIEW & UI ANIMATION (NO "BLUE SCREEN" BLOCKING THE ROCKET)**:
   - **Problem in current code**: When the countdown finishes, an opaque/blueish modal overlay (\`LaunchOverlay\`) remains on screen with dark radial gradients and backdrop blur, obscuring the rocket. The user cannot see the missile flying well!
   - **Required Behavior**:
     a. **Count-down Phase**: Show clean, elegant countdown numbers (3... 2... 1...).
     b. **Timer Reaches Zero (T-0 / Liftoff)**:
        - All overlay text, badges, cards, and buttons MUST vanish immediately with an elegant exit animation (\`opacity: 0\`, \`scale: 0.95\`, \`pointer-events: none\` with \`transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1)\`).
        - Remove ANY dark/blue background tint or blur during flight so the entire viewport is crystal clear and unobstructed.
     c. **Dynamic Camera & Rocket Zoom ("Rocket gets bigger")**:
        - As the rocket ignites and lifts off, smoothly scale up the rocket group or dolly the Three.js camera closer (\`scale: 1.0 -> 1.35\` or camera zoom) so the rocket appears substantially larger, majestic, and heroic in the center of the frame.
     d. **Ascent & Flight Return Cycle ("Fly back to its place")**:
        - The rocket launches upward with powerful acceleration, reaches apogee / celestial heights with glowing thrusters and star birth, and then smoothly glides / descends back down (with retro-thruster braking) and docks perfectly back onto its launchpad.
     e. **Smooth UI Reappearance**:
        - Once the rocket has landed safely back on the launchpad, all UI elements (hero titles, Salawat counters, action buttons, "مشاهده دوباره پرواز" replay button, celebratory badge) smoothly animate back in with an elegant fade-in and slide-up transition.

2. **ENGINE SMOKE & THRUSTER EXHAUST IN PERFECT HARMONY**:
   - **Problem in current code**: The smoke/exhaust particles feel disconnected from the rocket engine nozzle, lack realistic physics, and don't match the engine's throttle phases.
   - **Required Particle & Smoke Enhancements**:
     a. **Exact Spatial Anchoring**: The particle emitter origin must stay locked to the exact world position of the engine nozzle base (\`rocketGroup.position.y - 1.45\` with nozzle tilt/gimbal transform applied).
     b. **Dynamic Thrust Phases**:
        - **Pre-liftoff / Ignition (Rumble)**: Low-velocity, high-density billowing radial puffs curling outwards along the launchpad deck.
        - **Liftoff & Acceleration**: High-speed directional exhaust column (\`vy = -12 - speedRatio * 18\`) with simulated aerodynamic turbulence, expanding cone angle, and Mach diamonds flickering in the core.
        - **Descent & Landing**: Controlled retro-puffs cushioning the rocket's touchdown.
        - **Touchdown Shockwave**: Radial dust/smoke ring expanding outwards across the launchpad ring when the rocket settles back down.
     c. **Aesthetic Quality**:
        - Particles start incandescent golden-orange at the nozzle core and diffuse into soft warm smoke gray.
        - Realistic particle size growth over lifetime (\`size * (1 + 2.8 * (1 - lifeRatio))\`) with smooth quadratic alpha fade-out (\`alpha = lifeRatio * lifeRatio\`).
        - Zero lag or GC spikes: use pre-allocated Float32Array buffer geometries and object pooling.

3. **PRESERVE CORE ASSETS & STABILITY**:
   - **Internal Luminous Golden Fuel Chamber**: The mid-body transparent crystal cylinder showing the 3D golden fuel level MUST remain intact.
   - **Deprecation Free**: Use \`performance.now()\` instead of \`THREE.Clock\`.
   - **Production Quality**: Pure TypeScript without errors (\`npm run check-types\` must pass) and React 19 / Next.js 16 compliant.

---

### Attached Source Code:
Review the following components carefully, then provide the complete upgraded code for:
1. \`ThreeRocketScene.tsx\` (rocket flight physics, zoom dynamics, landing loop, and harmonious exhaust particle system)
2. \`LaunchOverlay.tsx\` (clean countdown, instant graceful fade-out on T-0 so the rocket is 100% visible, no blue screen, and completion callback)
3. \`page.tsx\` or \`HeroSection.tsx\` (orchestration of UI fade-out during launch and smooth reappearance upon rocket return)
================================================================================
`;

let output = masterPrompt + "\n\n";

for (const file of filesToInclude) {
  output += `\n${"=".repeat(80)}\n`;
  output += `FILE: ${file.title}\n`;
  output += `PATH: ${file.path}\n`;
  output += `${"=".repeat(80)}\n\n`;

  if (fs.existsSync(file.path)) {
    try {
      const content = fs.readFileSync(file.path, "utf8");
      output += content + "\n\n";
    } catch (err) {
      output += `[Error reading file: ${err.message}]\n\n`;
    }
  } else {
    output += `[File not found at path: ${file.path}]\n\n`;
  }
}

fs.writeFileSync(outputFile, output, "utf8");
console.log(`Successfully generated rocket code bundle at:\n${outputFile}`);
console.log(`Bundle size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);

