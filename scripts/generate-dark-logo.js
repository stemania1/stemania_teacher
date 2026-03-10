/* eslint-disable @typescript-eslint/no-require-imports -- Node script */
const sharp = require("sharp");
const path = require("path");

const logoPath = path.join(__dirname, "../public/logo/stemania-logo.png");
const outputPath = path.join(__dirname, "../public/logo/stemania-logo-dark.png");

const DARK_THRESHOLD = 60;

async function generateDarkLogo() {
  try {
    const image = sharp(logoPath);
    const metadata = await image.metadata();
    const { width, height, channels } = metadata;

    console.log(
      `Source: ${width}x${height}, ${channels} channels (${channels === 4 ? "RGBA" : "RGB"})`,
    );

    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = Buffer.from(data);

    let converted = 0;
    let skipped = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a === 0) continue;

      if (r < DARK_THRESHOLD && g < DARK_THRESHOLD && b < DARK_THRESHOLD) {
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        converted++;
      } else {
        skipped++;
      }
    }

    console.log(
      `Pixels: ${converted} dark→white, ${skipped} colored (kept), ${(pixels.length / 4 - converted - skipped)} transparent (kept)`,
    );

    await sharp(pixels, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toFile(outputPath);

    console.log(`Saved: ${outputPath}`);
  } catch (error) {
    console.error("Error generating dark logo:", error);
    process.exit(1);
  }
}

generateDarkLogo();
