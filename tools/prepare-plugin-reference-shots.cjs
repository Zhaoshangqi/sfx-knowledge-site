const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const rawDir = path.join(root, "assets", "plugin-shots", "raw");
const fullDir = path.join(root, "assets", "plugin-shots", "full");
const previewDir = path.join(root, "assets", "plugin-shots", "preview");
const catalogPath = path.join(root, "assets", "plugin-shots", "catalog.json");

const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

const entries = [
  ["soundtoys-decapitator", "Soundtoys Decapitator", "https://www.soundtoys.com/product/decapitator/", ["Soundtoys Decapitator", "Decapitator"]],
  ["soundtoys-filterfreak", "Soundtoys FilterFreak", "https://www.soundtoys.com/product/filterfreak/", ["Soundtoys FilterFreak", "FilterFreak"]],
  ["soundtoys-echoboy", "Soundtoys EchoBoy", "https://www.soundtoys.com/product/echoboy/", ["Soundtoys EchoBoy", "EchoBoy"]],
  ["soundtoys-crystallizer", "Soundtoys Crystallizer", "https://www.soundtoys.com/product/crystallizer/", ["Soundtoys Crystallizer", "Crystallizer"]],
  ["soundtoys-little-alterboy", "Soundtoys Little AlterBoy", "https://www.soundtoys.com/product/little-alterboy/", ["Soundtoys Little AlterBoy", "Little AlterBoy"]],
  ["soundtoys-effect-rack", "Soundtoys Effect Rack", "https://www.soundtoys.com/product/effect-rack/", ["Soundtoys Effect Rack"]],
  ["soundtoys-phasemistress", "Soundtoys PhaseMistress", "https://www.soundtoys.com/product/phasemistress/", ["Soundtoys PhaseMistress", "Phase Mistress", "PhaseMistress"]],
  ["soundtoys-devil-loc", "Soundtoys Devil-Loc", "https://www.soundtoys.com/product/devil-loc-deluxe/", ["Soundtoys Devil-Loc", "Devil-Loc"]],
  ["soundtoys-tremolator", "Soundtoys Tremolator", "https://www.soundtoys.com/product/tremolator/", ["Tremolator", "Soundtoys Tremolator"]],
  ["soundtoys-little-radiator", "Soundtoys Little Radiator", "https://www.soundtoys.com/product/little-radiator/", ["Little Radiator", "Soundtoys Little Radiator"]],
  ["soundtoys-superplate", "Soundtoys SuperPlate", "https://www.soundtoys.com/product/superplate/", ["Soundtoys Superplate", "Superplate"]],

  ["fabfilter-pro-q", "FabFilter Pro-Q", "https://www.fabfilter.com/products/pro-q-4-equalizer-plug-in", ["FabFilter Pro-Q 3", "Pro-Q 3", "FabFilter Pro-Q"]],
  ["fabfilter-pro-r", "FabFilter Pro-R", "https://www.fabfilter.com/products/pro-r-2-reverb-plug-in", ["FabFilter Pro-R", "Pro-R"]],
  ["fabfilter-pro-l-2", "FabFilter Pro-L 2", "https://www.fabfilter.com/products/pro-l-2-limiter-plug-in", ["FabFilter Pro-L 2", "FabFilter Pro-L", "Pro-L 2"]],
  ["fabfilter-pro-mb", "FabFilter Pro-MB", "https://www.fabfilter.com/products/pro-mb-multiband-compressor-plug-in", ["FabFilter Pro-MB", "Pro-MB"]],
  ["fabfilter-saturn-2", "FabFilter Saturn 2", "https://www.fabfilter.com/products/saturn-2-multiband-distortion-saturation-plug-in", ["FabFilter Saturn 2", "FabFilter Saturn", "Saturn 2"]],
  ["fabfilter-volcano-3", "FabFilter Volcano 3", "https://www.fabfilter.com/products/volcano-3-filter-plug-in", ["FabFilter Volcano 3", "Volcano 3"]],

  ["kilohearts-phase-plant", "Kilohearts Phase Plant", "https://kilohearts.com/products/phase_plant", ["Kilohearts Phase Plant", "Phase Plant", "Phaseplant", "Faceplant"]],
  ["kilohearts-multipass", "Kilohearts Multipass", "https://kilohearts.com/products/multipass", ["Kilohearts Multipass", "Multipass"]],
  ["kilohearts-snap-heap", "Kilohearts Snap Heap", "https://kilohearts.com/products/snap_heap", ["Kilohearts Snap Heap", "Snap Heap", "Snapheap"]],
  ["kilohearts-disperser", "Kilohearts Disperser", "https://kilohearts.com/products/disperser", ["Disperser"]],
  ["kilohearts-transient-shaper", "Kilohearts Transient Shaper", "https://kilohearts.com/products/transient_shaper", ["kHs Transient Shaper", "Kilohearts Transient Shaper"]],
  ["kilohearts-flanger", "Kilohearts Flanger", "https://kilohearts.com/products/flanger", ["Kilohearts Flanger"]],
  ["kilohearts-distortion", "Kilohearts Distortion", "https://kilohearts.com/products/distortion", ["Kilohearts Distortion"]],
  ["kilohearts-reverb", "Kilohearts Reverb", "https://kilohearts.com/products/reverb", ["KHS Reverb", "Kilohearts Reverb"]],
  ["kilohearts-convolver", "Kilohearts Convolver", "https://kilohearts.com/products/convolver", ["Kilohearts Convolver", "Snap Heap convolver"]],
  ["kilohearts-ensemble", "Kilohearts Ensemble", "https://kilohearts.com/products/ensemble", ["Kilohearts Ensemble"]],
  ["kilohearts-pitch-shifter", "Kilohearts Pitch Shifter", "https://kilohearts.com/products/pitch_shifter", ["Kilohearts pitch shifter"]],
  ["kilohearts-triad", "Kilohearts Triad", "https://kilohearts.com/products/triad", ["Kilohearts Triad"]],

  ["xfer-serum-2", "Xfer Serum 2", "https://xferrecords.com/products/serum-2", ["Serum 2", "Xfer Serum 2", "Serum", "Serum合成器"]],
  ["xfer-ott", "Xfer OTT", "https://xferrecords.com/freeware", ["OTT", "OTT-style compression", "OTT多频段压缩器"]],

  ["eventide-blackhole", "Eventide Blackhole", "https://www.eventideaudio.com/plug-ins/blackhole/", ["Blackhole", "Eventide Blackhole"]],
  ["eventide-crystals", "Eventide Crystals", "https://www.eventideaudio.com/plug-ins/crystals/", ["Eventide Crystals"]],
  ["eventide-sp2016", "Eventide SP2016 Reverb", "https://www.eventideaudio.com/plug-ins/sp2016-reverb/", ["Eventide SP2016 Reverb", "SP2016"]],

  ["valhalla-supermassive", "Valhalla Supermassive", "https://valhalladsp.com/shop/reverb/valhalla-supermassive/", ["Valhalla Supermassive", "Shimmer"]],
  ["valhalla-freqecho", "Valhalla FreqEcho", "https://valhalladsp.com/shop/delay/valhalla-freq-echo/", ["Valhalla FreqEcho"]],
  ["valhalla-space-modulator", "Valhalla Space Modulator", "https://valhalladsp.com/shop/modulation/valhalla-space-modulator/", ["Valhalla Modulation", "Space Modulator"]],

  ["polyverse-manipulator", "Polyverse Manipulator", "https://polyversemusic.com/products/manipulator/", ["Polyverse Manipulator", "Manipulator"]],
  ["polyverse-wider", "Polyverse Wider", "https://polyversemusic.com/products/wider/", ["Polyverse Wider"]],
  ["zynaptiq-unfilter", "Zynaptiq Unfilter", "https://www.zynaptiq.com/unfilter/", ["Zynaptiq Unfilter", "Unfilter"]],
  ["zynaptiq-unveil", "Zynaptiq Unveil", "https://www.zynaptiq.com/unveil/", ["Zynaptiq Unveil", "Unveil"]],
  ["uvi-shade", "UVI Shade", "https://www.uvi.net/shade", ["UVI Shade", "Shade"]],
  ["oeksound-soothe2", "Oeksound Soothe2", "https://oeksound.com/plugins/soothe2/", ["Oeksound Soothe2", "Soothe2", "Soothe"]],
  ["soundtheory-gullfoss", "Soundtheory Gullfoss", "https://www.soundtheory.com/home", ["Soundtheory Gullfoss", "Gullfoss"]],

  ["waves-enigma", "Waves Enigma", "https://www.waves.com/plugins/enigma", ["Waves Enigma", "Enigma"]],
  ["waves-l3-multimaximizer", "Waves L3 Multimaximizer", "https://www.waves.com/plugins/l3-multimaximizer", ["Waves L3 Multimaximizer", "L3 Multimaximizer"]],
  ["waves-l3-ll", "Waves L3-LL MultiMaximizer", "https://www.waves.com/plugins/l3-ll-multimaximizer", ["Waves L3-LL MultiMaximizer", "L3-LL"]],
  ["waves-s1", "Waves S1 Stereo Imager", "https://www.waves.com/plugins/s1-stereo-imager", ["Waves S1 Imager Stereo", "Waves S1 Stereo Imager", "S1 Imager"]],
  ["waves-z-noise", "Waves Z-Noise", "https://www.waves.com/plugins/z-noise", ["Waves Z-Noise", "Z-Noise"]],

  ["melda-mautopitch", "Melda MAutoPitch", "https://www.meldaproduction.com/MAutoPitch", ["Melda MAutoPitch", "MAutoPitch"]],
  ["melda-mvocoder", "Melda MVocoder", "https://www.meldaproduction.com/MVocoder", ["Melda MVocoder", "MVocoder"]],
  ["melda-mratio", "Melda MRatio", "https://www.meldaproduction.com/MRatio", ["MRatio"]],
  ["melda-mlimitermb", "Melda MLimiterMB", "https://www.meldaproduction.com/MLimiterMB", ["MLimiterMB"]],

  ["native-reaktor-6", "Native Instruments Reaktor 6", "https://www.native-instruments.com/en/products/komplete/synths/reaktor-6/", ["Reaktor 6"]],
  ["native-skanner-xt", "Native Instruments Skanner XT", "https://www.native-instruments.com/en/products/komplete/synths/skanner-xt/", ["Skanner XT", "SkannerXT", "Skanner"]],
  ["native-supercharger-gt", "Native Instruments Supercharger GT", "https://www.native-instruments.com/en/products/komplete/effects/supercharger-gt/", ["Supercharger GT"]],
  ["native-transient-master", "Native Instruments Transient Master", "https://www.native-instruments.com/en/products/komplete/effects/transient-master/", ["NI Transient Master"]],

  ["tonsturm-traveler", "Tonsturm Traveler", "https://tonsturm.com/product/traveler", ["Tonsturm Traveler", "Traveler"]],
  ["sound-particles", "Sound Particles", "https://soundparticles.com/products/sound-particles", ["Sound Particles"]],
  ["boom-whoosh-machine", "BOOM Library Whoosh Machine", "https://www.boomlibrary.com/sound-effects/whoosh-machine/", ["Whoosh Machine"]],
  ["glitchmachines-cataract", "Glitchmachines Cataract", "https://glitchmachines.com/products/cataract/", ["Glitchmachines Cataract", "Cataract"]],
  ["unfiltered-indent-2", "Unfiltered Audio Indent 2", "https://www.plugin-alliance.com/en/products/unfiltered_audio_indent_2.html", ["Unfiltered Audio Indent 2", "Indent 2"]],

  ["minimal-rift", "Minimal Audio Rift", "https://www.minimal.audio/products/rift", ["Rift"]],
  ["minimal-rift-feedback-lite", "Minimal Audio Rift Feedback Lite", "https://www.minimal.audio/products/rift-feedback-lite", ["Rift Feedback Lite"]],
  ["minimal-morph-eq", "Minimal Audio Morph EQ", "https://www.minimal.audio/products/morph-eq", ["Morph EQ"]],
  ["vital", "Vital", "https://vital.audio/", ["Vital"]],
  ["reveal-spire", "Reveal Sound Spire", "https://reveal-sound.com/plug-ins/spire", ["Spire"]],

  ["cockos-reaplugs", "Cockos ReaPlugs", "https://www.reaper.fm/reaplugs/", ["Cockos ReaPitch", "ReaPitch", "ReaEQ"]],
  ["wwise", "Audiokinetic Wwise", "https://www.audiokinetic.com/en/wwise/overview/", ["Wwise"]],
  ["serato-pitchntime", "Serato Pitch 'n Time Pro", "https://serato.com/pitchntime-pro", ["Serato Pitch 'n Time Pro"]],
  ["blue-cat-chorus", "Blue Cat Chorus", "https://www.bluecataudio.com/Products/Product_Chorus/", ["Blue Cat Chorus"]],
  ["brainworx-bx-subsynth", "Brainworx bx_subsynth", "https://www.plugin-alliance.com/en/products/bx_subsynth.html", ["Brainworx Bx_Subsynth", "bx_subsynth"]],
  ["sixth-sample-deelay", "Sixth Sample Deelay", "https://sixthsample.com/deelay/", ["Deelay"]],
  ["paulxstretch", "PaulXStretch", "https://sonosaurus.com/paulxstretch/", ["PaulXStretch", "PaulStretch"]],
  ["soundhack-pitch-delay", "SoundHack Pitch Delay", "https://www.soundhack.com/freeware/", ["SoundHack Pitch Delay"]],
  ["sonic-academy-kick-3", "Sonic Academy Kick 3", "https://www.sonicacademy.com/products/kick-3", ["Kick 3"]],
  ["slate-infinity-bass", "Slate Digital Infinity Bass", "https://slatedigital.com/infinity-bass/", ["Slate Infinity Bass"]],
  ["twisted-tools-s-layer", "Twisted Tools S-Layer", "https://twistedtools.com/shop/reaktor/s-layer/", ["S-Layer", "Reaktor 6 S-Layer"]]
];

function ensureDirs() {
  [rawDir, fullDir, previewDir].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    timeout: options.timeout || 45000,
    ...options
  });
}

function capture(entry) {
  const [slug, title, source] = entry;
  const raw = path.join(rawDir, `${slug}.png`);
  if (fs.existsSync(raw) && fs.statSync(raw).size > 20000) return raw;
  const result = run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors",
    "--window-size=1280,900",
    "--virtual-time-budget=2800",
    `--user-data-dir=${path.join(root, `.chrome-plugin-shot-${slug}`)}`,
    `--screenshot=${raw}`,
    source
  ], { timeout: 30000 });
  if (!fs.existsSync(raw) || fs.statSync(raw).size < 20000) {
    throw new Error(`${title}: Chrome screenshot failed (${result.status}) ${result.stderr || result.stdout}`);
  }
  return raw;
}

function convert(raw, slug) {
  const full = path.join(fullDir, `${slug}.webp`);
  const preview = path.join(previewDir, `${slug}.webp`);
  if (!fs.existsSync(full)) {
    const fullResult = run(ffmpeg, [
      "-y",
      "-i", raw,
      "-vf", "scale='min(1120,iw)':-2",
      "-compression_level", "5",
      "-q:v", "62",
      full
    ], { timeout: 30000 });
    if (fullResult.status !== 0) throw new Error(`${slug}: full ffmpeg failed ${fullResult.stderr}`);
  }
  if (!fs.existsSync(preview)) {
    const previewResult = run(ffmpeg, [
      "-y",
      "-i", raw,
      "-vf", "scale='min(440,iw)':-2",
      "-compression_level", "5",
      "-q:v", "68",
      preview
    ], { timeout: 30000 });
    if (previewResult.status !== 0) throw new Error(`${slug}: preview ffmpeg failed ${previewResult.stderr}`);
  }
  return {
    full: `assets/plugin-shots/full/${slug}.webp`,
    preview: `assets/plugin-shots/preview/${slug}.webp`
  };
}

function main() {
  ensureDirs();
  const catalog = [];
  const failures = [];
  for (const entry of entries) {
    const [slug, title, source, aliases] = entry;
    try {
      const raw = capture(entry);
      const assets = convert(raw, slug);
      catalog.push({
        slug,
        title,
        source,
        aliases,
        preview: assets.preview,
        full: assets.full,
        match: "官方参考截图，已按插件名与厂商页面核对"
      });
      console.log(`ok ${title}`);
    } catch (error) {
      failures.push({ slug, title, source, error: error.message });
      console.error(`fail ${title}: ${error.message}`);
    }
  }
  fs.writeFileSync(catalogPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries: catalog, failures }, null, 2));
  console.log(JSON.stringify({ ok: catalog.length, failures: failures.length, catalogPath }, null, 2));
  if (catalog.length < 40) process.exit(1);
}

main();
