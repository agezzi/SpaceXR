#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const sharp = (() => {
  try {
    return require('sharp');
  } catch (e) {
    console.error('\nMissing dependency: sharp');
    console.error('Run: npm install --save-dev sharp');
    process.exit(2);
  }
})();

const publicModelsDir = path.join(process.cwd(), 'public', 'models');
const manifestPath = path.join(publicModelsDir, 'index.json');

function readManifest() {
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))?.models || [];
  }
  // fallback: scan public/models and public root for .glb/.gltf
  const found = new Set();
  if (fs.existsSync(publicModelsDir)) {
    for (const f of fs.readdirSync(publicModelsDir)) {
      if (/\.glb?$/.test(f)) found.add(f);
    }
  }
  for (const f of fs.readdirSync(path.join(process.cwd(), 'public'))) {
    if (/\.glb?$/.test(f)) found.add(f);
  }
  return Array.from(found);
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

async function makeThumbnail(modelName) {
  const base = modelName.replace(/\.gltf?$|\.glb$/i, '');
  const outDir = publicModelsDir;
  ensureDir(outDir);
  const out = path.join(outDir, `${base}.png`);
  if (fs.existsSync(out)) {
    console.log(`Thumbnail exists: ${out}`);
    return;
  }

  // Create a simple SVG placeholder thumbnail (so you have something right away).
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'>
    <rect width='100%' height='100%' fill='#0b0b0b'/>
    <text x='50%' y='50%' font-size='48' fill='#ffffff' text-anchor='middle' dominant-baseline='middle' font-family='Arial, Helvetica, sans-serif'>${base}</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`Wrote thumbnail: ${out}`);
}

function findConverter(explicitPath) {
  // explicit path from env or arg
  if (explicitPath) {
    try {
      if (fs.existsSync(explicitPath)) return explicitPath;
    } catch (e) {}
  }

  // try known tools on PATH
  const candidates = ['usd_from_gltf', 'usdzconvert', 'usdconvert', 'gltf2usd'];
  for (const cmd of candidates) {
    try {
      const which = spawnSync('which', [cmd], { encoding: 'utf8' });
      if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
    } catch (e) {}
  }
  return null;
}

function convertToUSDZ(modelName, converterPath) {
  const base = modelName.replace(/\.gltf?$|\.glb$/i, '');
  const srcPaths = [path.join(publicModelsDir, modelName), path.join(process.cwd(), 'public', modelName)];
  const src = srcPaths.find(p => fs.existsSync(p));
  if (!src) { console.warn('Source model not found for', modelName); return; }
  const out = path.join(publicModelsDir, `${base}.usdz`);
  if (fs.existsSync(out)) { console.log('USDZ exists:', out); return; }

  console.log(`Attempting USDZ conversion with ${converterPath}`);
  try {
    // best-effort: try calling converter with src and out
    execFileSync(converterPath, [src, out], { stdio: 'inherit' });
    console.log('Wrote USDZ:', out);
  } catch (e) {
    console.warn('USDZ conversion failed (converter may not support args):', e && e.message);
  }
}

(async function main() {
  // parse args / env for explicit converter
  const argv = process.argv.slice(2);
  let explicitConverter = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--converter=')) explicitConverter = a.split('=')[1];
    if (a === '--converter' && argv[i+1]) { explicitConverter = argv[i+1]; i++; }
  }
  if (!explicitConverter && process.env.USDZ_CONVERTER) explicitConverter = process.env.USDZ_CONVERTER;

  const models = readManifest();
  if (models.length === 0) {
    console.log('No models found in public/models/index.json or public folders.');
    process.exit(0);
  }

  ensureDir(publicModelsDir);

  for (const m of models) {
    try { await makeThumbnail(m); } catch (e) { console.warn('Thumbnail failed for', m, e); }
  }

  const converter = findConverter(explicitConverter);
  if (!converter) {
    console.log('\nNo USDZ converter found on PATH. Skipping USDZ generation.');
    console.log('If you want USDZs, install a converter (e.g. `usd_from_gltf`) or run Apple\'s converter on macOS.');
    process.exit(0);
  }

  for (const m of models) {
    try { convertToUSDZ(m, converter); } catch (e) { console.warn('USDZ convert failed for', m, e); }
  }
})();
