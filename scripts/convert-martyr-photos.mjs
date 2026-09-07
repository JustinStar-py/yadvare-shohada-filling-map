import fs from "fs";
import path from "path";
import sharp from "sharp";

// Configuration with sensible defaults
const SOURCE_DIR = process.argv[2] || process.env.PHOTOS_DIR || "F:/نقاشی دیجیتال شهدا";
const OUTPUT_DIR = process.argv[3] || path.join(process.cwd(), "public", "images", "shohada");
const TARGET_WIDTH = 900; // Optimal for Retina mobile & desktop martyr card displays
const WEBP_QUALITY = 82;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function run() {
  console.log("==================================================");
  console.log(" 🌟 Shohada Digital Paintings Conversion & Compression");
  console.log("==================================================");
  console.log(`📁 Source Directory: ${SOURCE_DIR}`);
  console.log(`📂 Target Directory: ${OUTPUT_DIR}`);
  console.log(`⚙️  Settings: Max Width ${TARGET_WIDTH}px, WebP Quality ${WEBP_QUALITY}%`);
  console.log("--------------------------------------------------");

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read all files from source
  const allEntries = fs.readdirSync(SOURCE_DIR);
  const imageFiles = allEntries.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".bmp", ".tiff"].includes(ext);
  });

  if (imageFiles.length === 0) {
    console.warn("⚠️ No image files found in the source directory.");
    process.exit(0);
  }

  console.log(`Found ${imageFiles.length} images to process.\n`);

  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  let successCount = 0;
  let errorCount = 0;
  const manifest = [];

  const startTime = Date.now();

  // Read existing manifest if available to enable fast incremental updates
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  let existingMap = new Map();
  const force = process.argv.includes("--force");

  if (!force && fs.existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(prev.items)) {
        for (const item of prev.items) {
          existingMap.set(item.originalFile, item);
        }
      }
    } catch {
      // ignore
    }
  }

  for (let i = 0; i < imageFiles.length; i++) {
    const fileName = imageFiles[i];
    const sourceFilePath = path.join(SOURCE_DIR, fileName);
    const baseName = path.parse(fileName).name;
    const webpFileName = `${baseName}.webp`;
    const targetFilePath = path.join(OUTPUT_DIR, webpFileName);

    try {
      const originalStat = fs.statSync(sourceFilePath);

      // Check if already processed
      if (!force && existingMap.has(fileName) && fs.existsSync(targetFilePath)) {
        const cachedItem = existingMap.get(fileName);
        const webpStat = fs.statSync(targetFilePath);
        totalOriginalSize += originalStat.size;
        totalWebpSize += webpStat.size;
        successCount++;
        manifest.push({
          ...cachedItem,
          id: `shohada-${i + 1}`,
          originalSize: originalStat.size,
          webpSize: webpStat.size,
        });
        continue;
      }

      process.stdout.write(`[${i + 1}/${imageFiles.length}] Processing: ${fileName}... `);
      totalOriginalSize += originalStat.size;

      // Sharp transformation:
      // 1. Auto-orient according to EXIF
      // 2. Resize maintaining aspect ratio (without enlargement)
      // 3. WebP compression with optimal effort & quality
      const pipeline = sharp(sourceFilePath)
        .rotate()
        .resize({
          width: TARGET_WIDTH,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({
          quality: WEBP_QUALITY,
          effort: 4,
          smartSubsample: true,
        });

      const info = await pipeline.toFile(targetFilePath);

      totalWebpSize += info.size;
      successCount++;

      const savingPercent = (((originalStat.size - info.size) / originalStat.size) * 100).toFixed(1);
      console.log(`✅ Done (${formatBytes(originalStat.size)} → ${formatBytes(info.size)}, -${savingPercent}%)`);

      manifest.push({
        id: `shohada-${i + 1}`,
        name: baseName,
        originalFile: fileName,
        webpFile: webpFileName,
        url: `/images/shohada/${encodeURIComponent(webpFileName)}`,
        width: info.width,
        height: info.height,
        originalSize: originalStat.size,
        webpSize: info.size,
      });
    } catch (err) {
      errorCount++;
      console.log(`❌ Error: ${err.message}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalSavedBytes = totalOriginalSize - totalWebpSize;
  const totalSavedPercent = totalOriginalSize > 0
    ? (((totalSavedBytes) / totalOriginalSize) * 100).toFixed(1)
    : 0;

  // Save manifest.json in output directory
  const manifestData = {
    generatedAt: new Date().toISOString(),
    totalCount: successCount,
    sourceDirectory: SOURCE_DIR,
    outputDirectory: OUTPUT_DIR,
    totalOriginalSize: formatBytes(totalOriginalSize),
    totalWebpSize: formatBytes(totalWebpSize),
    totalSaved: `${formatBytes(totalSavedBytes)} (${totalSavedPercent}%)`,
    durationSeconds: parseFloat(durationSec),
    items: manifest,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

  console.log("\n==================================================");
  console.log(" 🎉 Conversion Summary");
  console.log("==================================================");
  console.log(`✅ Successfully Converted: ${successCount} images`);
  if (errorCount > 0) {
    console.log(`⚠️ Failed: ${errorCount} images`);
  }
  console.log(`⏱️  Duration: ${durationSec} seconds`);
  console.log(`📦 Original Size: ${formatBytes(totalOriginalSize)}`);
  console.log(`⚡ New WebP Size: ${formatBytes(totalWebpSize)}`);
  console.log(`📉 Space Saved: ${formatBytes(totalSavedBytes)} (${totalSavedPercent}% reduction)`);
  console.log(`📄 Manifest created at: ${manifestPath}`);
  console.log(`🖼️  Photos ready in: ${OUTPUT_DIR}`);
  console.log("==================================================\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
