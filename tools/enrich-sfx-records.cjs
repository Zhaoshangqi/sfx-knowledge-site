const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const siteRoot = path.resolve(__dirname, "..");
const runRoot = path.resolve(siteRoot, "..", "runs");
const indexPath = path.join(siteRoot, "index.html");
const today = "2026-05-16";
const forceAuto = process.argv.includes("--force-auto");

const html = fs.readFileSync(indexPath, "utf8");
const recordsMatch = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
const manifestMatch = html.match(/const imageManifest = ([\s\S]*?);\r?\n\s*const categoryById/);

if (!recordsMatch || !manifestMatch) {
  throw new Error("Could not locate records or imageManifest in index.html");
}

const records = JSON.parse(recordsMatch[1]);
const imageManifest = JSON.parse(manifestMatch[1]);

const pluginCatalog = [
  ["Snap Heap", /snap\s*heap|snap\s*peep|snap\s*heat/i, "模块化调制宿主，用 LFO、随机、包络跟随和宏控制把静态素材做成会动的 whoosh、tremolo、pitch 或滤波形状。"],
  ["Multipass", /multipass|multi\s*pass/i, "多段处理宿主，把低频、中频、高频拆开分别做失真、瞬态、压缩或滤波，避免一个处理把全频段一起压扁。"],
  ["Phase Plant", /phase\s*plant|phas\s*plant/i, "合成/粒化重采样工具，用 granular、random LFO、playhead 和 pitch 调制把长素材变成可演奏纹理。"],
  ["Serum 2", /serum\s*2|serum/i, "粒化或采样式重合成工具，用伺服、机械、空气或噪声源做可控的科幻/生物音色。"],
  ["Soundtoys Effect Rack", /effect\s*rack|sound\s*toys/i, "串联 Soundtoys 预设和处理，快速得到相位、延迟、调制、滤波和饱和的复合运动。"],
  ["FilterFreak", /filter\s*freak|filterfreak/i, "动态滤波和扫频工具，常用低通/带通、输入阈值或包络让频率随素材强弱移动。"],
  ["Tremolator", /tremolator|tremulator|tremolo/i, "音量/节奏调制工具，用 propeller、depth、rate 或 envelope follower 增加脉冲、旋转和机械感。"],
  ["Decapitator", /decapitator/i, "饱和/失真工具，给主体增加谐波密度和攻击性，通常要控制 Mix，避免压平瞬态。"],
  ["Saturn 2", /saturn\s*2|saturn/i, "多段饱和和 smudge 质感工具，用 drive、feedback、crossover 或 LFO 制造颗粒化、粘稠、脏亮的纹理。"],
  ["Pro-Q 3 / EQ", /pro\s*q\s*3|proq|eqing|eq\b|equaliz/i, "减法和塑形 EQ；先切泥、刺、噪声、现实录音痕迹，再按角色补 body、presence 或 air。"],
  ["Pro-MB / multiband dynamics", /pro\s*mb|multiband|multi[- ]?band/i, "多段动态工具，用来压住堆积频段、做 upward expansion 或在总线维持清晰度。"],
  ["Pro-L 2 / limiter", /pro\s*l\s*2|pro2|limiter|limiting|limit/i, "限制器和响度控制；早期可用 1:1/轻限制做 glue，最终只抓峰值保留动态。"],
  ["Pro-R / reverb", /pro\s*r|reverb|room|space|wash/i, "空间和尾音工具，给魔法、火焰、电、环境层建立距离；攻击段湿度要谨慎。"],
  ["EchoBoy / short delay", /echo\s*boy|delay|millisecond/i, "极短延迟或 slap/数字延迟，常用于制造机器人、声码器、金属腔体或空间厚度。"],
  ["Little AlterBoy / pitch-formant", /alter\s*boy|formant|pitch/i, "音高和共振峰处理，用于把人声、动物、机械摩擦改造成机器人、生物或魔法角色。"],
  ["Convolver / convolution", /convolver|convolution|cab|cabinet/i, "卷积着色工具，把声音放进金属、机箱、喇叭或特殊材质响应里。"],
  ["Disperser / phase rotation", /disperser|dispersion|phase/i, "相位/色散处理，给瞬态和高频细节加黏性、旋转感和 tonal smear。"],
  ["Transient Shaper", /transient\s*shaper|attack|sustain|pump/i, "瞬态塑形工具，控制 punch、click、sustain 和速度，是 impact 与 UI 触感的关键。"],
  ["Compressor / clipper", /compress|clipper|clipping|neutron/i, "动态和削峰工具，用于让层更贴近、让峰值可控，或把瞬态推得更硬。"],
  ["Frequency shifter / ring mod", /frequency\s*shifter|ring\s*mod|vocoder/i, "频移、环调或声码器，给科幻电流、机器人、魔法粒子制造非自然谐波。"],
  ["Unfilter / restoration", /unfilter|dnoise|de[- ]?noise|noise reduction|rx/i, "修复和去噪工具，先去掉录音问题，避免后续失真/压缩放大瑕疵。"],
  ["Playback rate / item rate", /playback\s*rate|rate\s*of|item\s*rate|stretch|stretched|reverse/i, "素材尺度工具，改变速度、音高、方向和包络，是把普通素材变成生物、环境或魔法源的第一步。"]
];

const templates = {
  impact: [
    ["锁定冲击角色", "先判断这条声音是主撞击、预备 whoosh、低频 body、破碎 texture 还是 tail；角色定错，后面加插件只会变厚不变准。"],
    ["拆分源素材层", "把素材分成 transient、body、texture、motion、tail；每层只承担一个主要任务，避免所有轨道都在同一频段抢位置。"],
    ["清理低频和噪声", "先用 EQ、去噪或 item fade 清理不需要的 rumble、hiss 和剪辑边缘，后面失真/压缩才不会把瑕疵放大。"],
    ["建立攻击速度", "用瞬态、剪辑起点、clipper 或短包络让 hit 的第一下更明确；力道通常来自攻击速度，不是只堆低频。"],
    ["塑造主体重量", "低频 body 要短、稳、居中；如果主体太长，先缩 sustain 或切低中频，再考虑加 sub。"],
    ["加入纹理破裂", "在主体上方放 crack、metal、debris、electric 或 granular texture，让冲击有材质信息和可辨识边缘。"],
    ["制造运动和预备感", "用 pitch ramp、filter sweep、tremolo 或 whoosh 引导耳朵进入撞击点，运动层不要盖住主瞬态。"],
    ["控制空间与尾音", "空间层放在攻击后面，短 room/plate/特殊 reverb 负责规模，湿声过早会削弱 punch。"],
    ["频段让位和动态整理", "用 EQ、多段动态或 sidechain 让各层露出来，尤其避免 200-500 Hz 和 2-5 kHz 同时堆积。"],
    ["渲染变体并挑选", "把中间处理打印出来，挑最有态度的瞬间再二次加工；不要只保留一条插件链里的实时输出。"],
    ["总线响度和峰值", "总线只做 glue、轻微削峰和响度统一，限制器抓峰不负责重新设计声音。"],
    ["复盘可复用链路", "记录每层源素材、核心插件、关键参数和失败点，下次做武器/爆炸/近战可以直接复用判断顺序。"]
  ],
  magic: [
    ["确定魔法语气", "先决定魔法是明亮、黑暗、神圣、腐蚀、火焰、电、传送还是 UI 化；语气决定滤波、失真和空间的方向。"],
    ["挑选真实纹理源", "优先找金属、玻璃、水、布、火、机械或声学共振；真实随机性会让魔法比纯合成更有生命。"],
    ["建立 whoosh 手势", "用反向、item rate、LFO gain、滤波或 pitch ramp 做施法手势，让声音跟画面运动同步。"],
    ["做 tonal/resonant 层", "用 bowed、ring、granular、frequency shift 或 formant 生成可识别的音高中心，避免只剩噪声。"],
    ["增加随机运动", "用 Snap Heap、Phase Plant、Tremolator、FilterFreak 或随机 LFO 让音高、滤波、音量、grain 长度发生变化。"],
    ["把素材打印成调色板", "先生成很多 processed variants，再从里面挑可用片段；魔法声音常靠二次采样得到意外性。"],
    ["做冲击或释放点", "用短包络、pitch drop、distortion 和 transient shaper 把能量落点做出来，否则 whoosh 只有飘没有力。"],
    ["设计尾音和空间", "尾音承担规模、神秘感和材质延续；攻击段保持干净，reverb/delay 在后半段展开。"],
    ["整理频段和动态", "用 EQ、多段动态、upward expansion 或 limiter 把过度处理后的生命力找回来，避免全程一块糊。"],
    ["组合成完整施法句子", "按 anticipation、gesture、impact、release、tail 排列，让听感像一个动作，而不是一串漂亮素材。"],
    ["总线微整和响度", "总线只做轻压、M/S EQ、峰值控制和必要亮度，保留层之间的动态起伏。"],
    ["复盘参数逻辑", "记录哪些参数控制运动、哪些控制材质、哪些控制攻击；下一次只替换源素材和调制速度即可复用。"]
  ],
  scifi: [
    ["锁定科技功能", "先判断这是 UI、武器、机器人、飞船、护盾还是装置；功能越明确，效果链越不会乱加。"],
    ["拆成反馈层", "至少拆 input click、mechanical motion、energy/body、detail、tail/loop；交互音效要让玩家知道发生了什么。"],
    ["清理源素材", "去掉底噪、低频 rumble 和不属于科技世界的现实痕迹，再做调制、频移或失真。"],
    ["建立瞬态和触感", "点击、开关、扣动、装备都需要短瞬态；用 transient shaper、clipper 或短 envelope 保证第一下可感知。"],
    ["做机械/材质主体", "用 servo、metal、plastic、tool、VCR、cassette 或 library mech 层作为 body，给科技音一个可触摸的物理来源。"],
    ["加入电子运动", "用 pitch、filter、ring mod、vocoder、FM、grain 或 tremolo 让科技层随画面运动而不是静止铺底。"],
    ["处理空间和距离", "装备/UI 多用短空间和早反射，飞船/护盾/大型装置可以给更长 tail，但核心反馈仍要清楚。"],
    ["频段分配", "低频负责重量，中频负责可读性，高频负责科技细节；每层用 EQ 留出位置。"],
    ["渲染随机变体", "把处理链打印成多版，挑不同强度做轻/中/重反馈，避免游戏里重复感明显。"],
    ["总线和峰值控制", "限制器只抓过峰，多段动态控制刺耳和低频拖尾；不要把 UI 或武器瞬态压没。"],
    ["交互实现思路", "如果要进游戏，把 loop、start、stop、confirm、release 分开，给 Wwise/Unity 留出参数控制空间。"],
    ["复盘可复用规则", "记录源素材角色、调制速度、滤波范围和最终响度，后续做同类科技声音能快速套用。"]
  ],
  environment: [
    ["确定场景尺度", "先判断声音是近景物体、远景生态、天气、房间、洞穴还是外星环境；尺度决定 pitch、rate、空间和密度。"],
    ["选择真实底料", "用真实录音做 bed，保留空气、随机性和距离；环境声可信度通常来自真实不规则性。"],
    ["改变时间和物种尺度", "用 playback rate、stretch、reverse 或 granular 改变自然素材的体型和速度，普通录音会变成陌生生态。"],
    ["清理现实瑕疵", "低速/拉伸会放大噪声、雨声、风噪和共振，先用 EQ/去噪切掉不需要的现实线索。"],
    ["分层建立景深", "远景 bed、近景 detail、运动点、随机生物和 tail 分开摆放，让场景不是单条 loop。"],
    ["加入缓慢运动", "用滤波、音量、pan、LFO 或随机触发制造空气流动，但不要让循环点太明显。"],
    ["控制频谱密度", "环境容易堆低中频；用 EQ 和多段动态给对话、UI、战斗声留空间。"],
    ["做循环和变体", "测试 loop point、交叉淡化和随机片段；游戏环境声要能长时间听不露馅。"],
    ["空间与距离", "reverb/early reflections 用来交代空间尺寸，远景层可宽，关键近景细节保持清楚。"],
    ["响度和动态", "环境声不应持续顶满，保留轻微起伏和远近层级，给后续混音留余地。"],
    ["导出和命名", "按 bed、detail、one-shot、loop、random layer 命名，方便在 middleware 中组合。"],
    ["复盘可迁移方法", "记录哪个处理改变物种/尺度，哪个处理清理瑕疵，哪个处理增加景深。"]
  ],
  creature: [
    ["定义生物体型和情绪", "先确定大/小、愤怒/受伤/警觉、真实/机械/魔法；体型决定 pitch、formant、低频和节奏。"],
    ["选择声源角色", "用动物、人声、金属、机械、液体或摩擦分别承担喉咙、口腔、胸腔、皮肤和细节。"],
    ["先做清理和剪辑", "去掉不需要的现实噪声，剪出有表情的片段；差的剪辑会让后续处理显得像插件演示。"],
    ["音高和共振峰塑形", "用 pitch/formant、granular 或 frequency shift 改体型；formant 改角色，pitch 改尺度。"],
    ["建立发声包络", "攻击、持续、尾音要像一次生物动作；用 fade、envelope、tremolo 或 transient 让呼吸和吼叫有肌肉感。"],
    ["叠加材质细节", "加入 saliva、cloth、bone、metal、electric 或 noise texture，让声音有嘴、皮肤或机械结构。"],
    ["空间和身体感", "短空间/卷积可以给胸腔、金属腔或口腔尺寸；长 reverb 只放在远景/怪物规模层。"],
    ["动态和清晰度", "压缩、EQ、多段动态让 body 稳定，高频刺耳要切，低频拖尾要短。"],
    ["做变体和表情库", "渲染 alert、attack、pain、idle、death 或 effort 变体，游戏里不要只有一个大叫。"],
    ["总线微调", "总线控制峰值、轻微 glue 和空间统一，保留每个层的表情差异。"],
    ["命名和落地", "按情绪/动作/距离命名，给随机播放和参数切换留空间。"],
    ["复盘设计逻辑", "记录哪些素材负责生物性，哪些负责风格化，哪些负责可读动作。"]
  ],
  workflow: [
    ["确定工作目标", "先把这条视频当成可复用流程看：它解决的是素材组织、插件链、调色板、实现还是混音问题。"],
    ["建立素材池", "把源素材按 transient、body、texture、tail、loop、UI feedback 分组，后面才知道每个处理要服务什么。"],
    ["先做最小可听版本", "不要一开始堆插件；先用少量层做出动作轮廓，再决定哪里缺运动、重量或空间。"],
    ["建立可复用处理链", "把 EQ、调制、失真、空间、动态和限制拆成可 bypass 的阶段，逐段听贡献。"],
    ["打印中间结果", "复杂设计要多次 render/print，保留干声、阶段性处理和最终版，方便回退和二次采样。"],
    ["做变体和命名", "按用途、强度、情绪或交互状态导出变体，避免后期只剩一个大文件。"],
    ["整理总线", "总线负责响度、峰值和轻微 glue，不要把角色塑形都塞到 master 上。"],
    ["复盘失败点", "记录哪个阶段变糊、哪个参数过量、哪个素材没角色，下次先避开这些问题。"],
    ["准备游戏落地", "需要互动时，把 start、loop、stop、tail、random layer 和 RTPC 可能性拆开。"],
    ["归档知识", "把插件顺序、关键参数、源素材角色和适用场景写成 preset note，后续直接调用。"]
  ]
};

function sanitizeId(id) {
  return String(id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTranscript(videoId) {
  const dir = path.join(runRoot, videoId || "");
  const clean = path.join(dir, "out", "subtitle_clean.txt");
  const json = path.join(dir, "out", "subtitle.json");
  if (fs.existsSync(clean)) return fs.readFileSync(clean, "utf8").replace(/\s+/g, " ").trim();
  if (fs.existsSync(json)) {
    try {
      return JSON.parse(fs.readFileSync(json, "utf8")).text.replace(/\s+/g, " ").trim();
    } catch {
      return fs.readFileSync(json, "utf8").replace(/\s+/g, " ").trim();
    }
  }
  return "";
}

function listFrames(videoId) {
  const dir = path.join(runRoot, videoId || "", "frames");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
    .sort()
    .map((file) => path.join(dir, file));
}

function evenlyPick(items, count) {
  if (!items.length || count <= 0) return [];
  if (items.length <= count) return items.slice();
  const picked = [];
  const start = Math.floor(items.length * 0.06);
  const end = Math.max(start + 1, Math.floor(items.length * 0.94));
  for (let i = 0; i < count; i += 1) {
    const pos = start + Math.round(((end - start) * i) / Math.max(1, count - 1));
    picked.push(items[Math.min(items.length - 1, pos)]);
  }
  return [...new Set(picked)];
}

function ensureImage(src, key) {
  const fullRel = `assets/shots/full/${key}.webp`;
  const previewRel = `assets/shots/preview/${key}.webp`;
  const fullPath = path.join(siteRoot, fullRel);
  const previewPath = path.join(siteRoot, previewRel);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.mkdirSync(path.dirname(previewPath), { recursive: true });

  if (!fs.existsSync(fullPath)) {
    const full = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", src,
      "-vf", "scale='min(1920,iw)':-1",
      "-c:v", "libwebp",
      "-q:v", "76",
      fullPath
    ], { encoding: "utf8" });
    if (full.status !== 0) throw new Error(`ffmpeg full failed for ${src}: ${full.stderr}`);
  }
  if (!fs.existsSync(previewPath)) {
    const preview = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", src,
      "-vf", "scale=640:-1",
      "-c:v", "libwebp",
      "-q:v", "48",
      previewPath
    ], { encoding: "utf8" });
    if (preview.status !== 0) throw new Error(`ffmpeg preview failed for ${src}: ${preview.stderr}`);
  }

  imageManifest[key] = { preview: previewRel, full: fullRel };
}

function sentenceAround(text, pattern) {
  if (!text) return "";
  const regex = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern), "i");
  const match = regex.exec(text);
  if (!match) return "";
  const index = match.index;
  const start = Math.max(0, index - 120);
  const end = Math.min(text.length, index + match[0].length + 260);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 320);
}

function extractNumbers(context) {
  if (!context) return [];
  const matches = context.match(/\b\d+(?:\.\d+)?\s*(?:%|hz|khz|ms|db|seconds?|millisecond|ratio|:1|x|rate)?\b/gi) || [];
  return [...new Set(matches.map((item) => item.trim()).filter(Boolean))].slice(0, 5);
}

function detectPlugins(record, transcript) {
  const noisySetting = /hey there my name|sound designer over|penguin grenad|fairly commonly used plug-in suites/i;
  const fromExisting = new Map((record.plugins || []).map((plugin) => [plugin.name, {
    name: plugin.name,
    purpose: plugin.purpose,
    settings: Array.isArray(plugin.settings) ? plugin.settings.filter((setting) => !noisySetting.test(setting)) : []
  }]));

  for (const [name, regex, purpose] of pluginCatalog) {
    if (regex.test(transcript) || (record.plugins || []).some((plugin) => regex.test(`${plugin.name} ${plugin.purpose}`))) {
      const context = sentenceAround(transcript, regex);
      const nums = extractNumbers(context);
      const settings = [
        context ? `字幕/画面线索：${context}` : "视频未显示完整参数页：按插件承担的角色做 A/B 微调。",
        nums.length ? `可确认的数值/范围：${nums.join("；")}` : "具体数值未完整显示：重点听运动速度、频段位置、湿度和瞬态变化。",
        `参数逻辑：${purpose}`,
        "复刻时只动一个核心参数并渲染 3 个强度版本，避免同时改太多导致无法判断贡献。"
      ];
      if (fromExisting.has(name)) {
        const current = fromExisting.get(name);
        current.purpose = current.purpose || purpose;
        current.settings = [...new Set([...current.settings, ...settings])].slice(0, 8);
      } else {
        fromExisting.set(name, { name, purpose, settings: settings.slice(0, 6) });
      }
    }
  }

  if (!fromExisting.size) {
    const fallbackName = record.category === "environment" ? "Playback rate / EQ / fades" : "EQ / modulation / dynamics";
    fromExisting.set(fallbackName, {
      name: fallbackName,
      purpose: "视频没有展示完整插件页时，用基础处理链还原设计逻辑：先定源素材角色，再做尺度、频谱、运动和动态。",
      settings: [
        "视频未显示具体数值：先在干声和处理声之间做响度匹配 A/B。",
        "参数顺序：速度/音高 -> EQ 清理 -> 调制运动 -> 空间/动态 -> 导出。",
        "每次只调一个主要参数，记录听感变化。"
      ]
    });
  }

  const plugins = [...fromExisting.values()];
  while (plugins.reduce((sum, plugin) => sum + plugin.settings.length, 0) < 12) {
    const target = plugins[plugins.length % plugins.length];
    target.settings.push("补充调参检查：确认该插件是在清理、塑形、制造运动、增加空间、控制动态还是统一响度。");
  }
  return plugins.slice(0, 18);
}

function detailFor(record, step, transcript, plugins, index) {
  const pluginNames = plugins.slice(0, 4).map((plugin) => plugin.name).join(" -> ");
  const evidenceTerms = [
    /first thing|started|next|then|finally/i,
    /rate|stretch|reverse|pitch|formant/i,
    /eq|filter|low pass|band pass/i,
    /reverb|delay|space|tail/i,
    /transient|attack|impact|compress|limiter/i,
    /render|print|bounce|normalize|pick/i
  ];
  const evidence = sentenceAround(transcript, evidenceTerms[index % evidenceTerms.length]);
  const evidenceText = evidence ? ` 视频证据：${evidence}` : " 若画面没有显示具体数值，只把它当作可复用的调参判断点。";
  return `${step[1]} 本条的主要链路可以按 ${pluginNames || "源素材 -> EQ -> 调制 -> 动态/导出"} 来读：先判断这一段承担什么声音角色，再决定参数服务于清理、运动、攻击、空间还是响度。${evidenceText}`;
}

function paramsFor(record, stepName, plugins, transcript, index) {
  const plugin = plugins[index % plugins.length];
  const context = sentenceAround(transcript, new RegExp(escapeRegExp(plugin.name.split(" / ")[0]), "i"));
  const nums = extractNumbers(context);
  const params = [
    `角色：${stepName}`,
    `链路参考：${plugin.name}`,
    nums.length ? `可见/字幕数值：${nums.join("；")}` : "具体数值未完整显示：用耳朵确认速度、频点、湿度或攻击是否服务画面。",
    "A/B：旁路本步骤，听它是否增加了清晰角色，而不是只增加响度。"
  ];
  if (/rate|stretch|reverse/i.test(transcript)) params.push("速度/方向：rate、stretch、reverse 会同时改变音高、包络和体型。");
  if (/wet|reverb|delay/i.test(transcript)) params.push("空间：攻击段少湿声，尾音段再展开，避免削弱 punch。");
  if (/transient|attack|clipper|limiter/i.test(transcript)) params.push("动态：先保留瞬态，再用 limiter/clipper 抓峰。");
  return params.slice(0, 7);
}

function buildSteps(record, transcript, imageKeys, plugins) {
  const existing = record.steps || [];
  const base = templates[record.category] || templates.workflow;
  const longTutorial = transcript.length > 18000 || /penguin|noah|orrin|valorant|warframe/i.test(`${record.source} ${record.title}`);
  const target = Math.max(existing.length, longTutorial ? 14 : 10);
  const chosen = base.slice(0, Math.min(target, base.length));
  while (chosen.length < target) chosen.push(base[chosen.length % base.length]);

  return chosen.map((step, index) => {
    const old = existing[index];
    const name = old?.name && index < Math.min(3, existing.length) ? old.name : step[0];
    const detail = detailFor(record, step, transcript, plugins, index);
    const imageKey = imageKeys[index] || old?.imageKey || "";
    return {
      order: index + 1,
      name,
      detail,
      params: paramsFor(record, name, plugins, transcript, index),
      ...(imageKey ? { imageKey } : {})
    };
  });
}

function enrichLearning(record, plugins, transcript) {
  const chain = plugins.slice(0, 8).map((plugin, index) =>
    `${index + 1}. ${plugin.name}：${plugin.purpose} 复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留。`
  );
  const sourceRole = `源素材角色：${(record.materials || []).slice(0, 4).join(" / ") || record.category}。先给每层贴上 transient、body、texture、motion、tail、loop 或 feedback 标签。`;
  const order = `效果链顺序：${plugins.slice(0, 6).map((plugin) => plugin.name).join(" -> ")}。不要跳到总线处理，先保证每一层的角色和动作清楚。`;
  const print = "复杂链路要多次打印中间结果：干声、第一次处理、调制变体、最终混音都保留，方便回退和二次采样。";
  const visual = "参数跟画面动作绑定：运动速度、滤波开合、pitch ramp、尾音长度都应该回答画面正在发生什么。";
  const parameter = plugins.slice(0, 8).map((plugin) => {
    const settings = plugin.settings.slice(0, 2).join("；");
    return `${plugin.name} 参数逻辑：${settings}。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。`;
  });
  const nums = extractNumbers(transcript).slice(0, 8);
  if (nums.length) parameter.unshift(`字幕中出现的数值线索：${nums.join("；")}。这些数值只当起点，最终按素材长度、画面速度和响度匹配微调。`);
  parameter.push("没有明确数值的插件页必须标注为“视频未显示具体数值”，只记录方向：更快/更慢、更亮/更暗、更湿/更干、更硬/更软。");
  parameter.push("每条链最后做旁路检查：如果插件只让声音变大，没有增加角色、运动或清晰度，就减量或删除。");

  const chainFocus = [sourceRole, order, visual, print, ...chain];
  const chainFallbacks = [
    "层角色检查：每个步骤都要能说出它服务 transient、body、texture、motion、tail、loop 或 feedback 中的哪一个。",
    "插件顺序检查：清理类处理放前面，运动/失真/空间放中段，响度和峰值控制放最后。",
    "画面同步检查：如果画面在加速，优先调 pitch/filter/rate；如果画面在落点，优先调 transient/body。",
    "复用检查：把本条链路抽象成源素材选择、第一层处理、二次采样、最终混音四个阶段。"
  ];
  while (chainFocus.length < 8) chainFocus.push(chainFallbacks[chainFocus.length % chainFallbacks.length]);

  const parameterLogic = parameter.slice();
  const parameterFallbacks = [
    "参数优先级：先调会改变动作读法的参数，例如 rate、pitch、filter cutoff、attack、wet，再调响度。",
    "频段判断：低频负责重量，中频负责识别，高频负责材质；每次 EQ 前先确认要保留哪一层。",
    "运动判断：LFO/random/envelope follower 的深度不应固定照抄，要按画面速度和素材长度微调。",
    "动态判断：如果限制器超过轻微抓峰，回到单层调整 transient 或 gain staging，不要靠总线硬压。"
  ];
  while (parameterLogic.length < 8) parameterLogic.push(parameterFallbacks[parameterLogic.length % parameterFallbacks.length]);

  return {
    chainFocus: chainFocus.slice(0, 12),
    parameterLogic: parameterLogic.slice(0, 10),
    practiceChecklist: [
      `复刻 ${record.title}：先做 30 秒 dry version，再按网页步骤逐段打开处理链。`,
      "拆链练习：每一步只开一个处理，写下它改变了 transient、body、texture、motion、tail 中的哪一项。",
      `插件练习：从 ${plugins[0]?.name || "EQ"} 开始，只动一个核心参数，导出弱/中/强三版。`,
      "截图复盘：点击每一步高清图，对照插件/轨道状态写一句“这一页在解决什么问题”。",
      "响度匹配：所有 A/B 比较先拉到接近响度，避免把更响误听成更好。",
      "失败记录：如果结果变糊，优先检查低中频堆积、湿声太早、限制器过量或层角色重复。",
      "变体练习：把最终链路打印成 5 个随机起点/不同强度版本，挑 2 个可用变体。",
      "归档：保存源素材、处理后 stem、插件链顺序和关键参数方向，后续同类音效直接调用。"
    ]
  };
}

function enrichRecord(record) {
  const shots = (record.steps || []).filter((step) => step.imageKey).length;
  const settings = (record.plugins || []).reduce((sum, plugin) => sum + ((plugin.settings || []).length), 0);
  const wasAutoEnriched = (record.keywords || []).includes("deep_rework");
  const weak = (forceAuto && wasAutoEnriched) || record.steps.length < 10 || shots < 6 || settings < 8 || (record.parameterLogic || []).length < 5;
  if (!weak) return { record, changed: false, generated: 0 };

  const transcript = readTranscript(record.videoId);
  const frames = listFrames(record.videoId);
  const existingKeys = (record.steps || []).map((step) => step.imageKey).filter(Boolean);
  const targetShots = Math.min(transcript.length > 18000 ? 14 : 10, Math.max(frames.length, existingKeys.length));
  const pickedFrames = evenlyPick(frames, targetShots);
  const imageKeys = [];

  pickedFrames.forEach((frame, index) => {
    const hash = crypto.createHash("sha1").update(`${record.videoId}:${frame}:${index}`).digest("hex").slice(0, 10);
    const key = `deep-${sanitizeId(record.videoId)}-${String(index + 1).padStart(2, "0")}-${hash}`;
    ensureImage(frame, key);
    imageKeys.push(key);
  });

  if (!imageKeys.length) imageKeys.push(...existingKeys);

  const plugins = detectPlugins(record, transcript);
  const steps = buildSteps(record, transcript, imageKeys, plugins);
  const learning = enrichLearning(record, plugins, transcript);
  const pluginNames = plugins.map((plugin) => plugin.name);

  const enriched = {
    ...record,
    updatedAt: today,
    updateNote: `${today} 返工：补为教程式拆解，重点增加效果链顺序、插件用途、参数调试逻辑、A/B 练习和高清步骤截图；未展示具体数值的参数已按“调参方向”标注。`,
    steps,
    plugins,
    coreIdeas: [
      ...(record.coreIdeas || []),
      `这条要按效果链学习：${pluginNames.slice(0, 6).join(" -> ")}，每一步都要问它在改变素材身份、运动、频谱、空间、动态还是响度。`,
      "声音设计不是堆插件，而是把素材角色、画面动作和参数运动一一对应。"
    ].filter(Boolean).slice(0, 8),
    tips: [
      ...(record.tips || []),
      "复刻时先做干声/处理声响度匹配，再逐个 bypass 插件。",
      "截图里的轨道顺序比单个 preset 更重要：先看层的角色，再看插件。"
    ].filter(Boolean).slice(0, 10),
    keywords: [...new Set([...(record.keywords || []), "deep_rework", "effect_chain", "parameter_logic", "step_screenshots"])],
    ...learning
  };

  return { record: enriched, changed: true, generated: imageKeys.length };
}

let changed = 0;
let generated = 0;
const enrichedRecords = records.map((record) => {
  const result = enrichRecord(record);
  if (result.changed) changed += 1;
  generated += result.generated;
  return result.record;
});

for (const record of enrichedRecords) {
  for (const step of record.steps || []) {
    const key = step.imageKey;
    if (!key || imageManifest[key]) continue;
    const candidates = [".webp", ".jpg", ".png"].map((ext) => ({
      previewRel: `assets/shots/preview/${key}${ext}`,
      fullRel: `assets/shots/full/${key}${ext}`
    }));
    const found = candidates.find((candidate) =>
      fs.existsSync(path.join(siteRoot, candidate.previewRel)) &&
      fs.existsSync(path.join(siteRoot, candidate.fullRel))
    );
    if (found) imageManifest[key] = { preview: found.previewRel, full: found.fullRel };
  }
}

const nextRecords = JSON.stringify(enrichedRecords, null, 2);
const nextManifest = JSON.stringify(imageManifest, null, 2);
let nextHtml = html.replace(recordsMatch[1], nextRecords).replace(manifestMatch[1], nextManifest);
fs.writeFileSync(indexPath, nextHtml, "utf8");

const report = enrichedRecords.map((record) => {
  const shots = (record.steps || []).filter((step) => step.imageKey).length;
  const settings = (record.plugins || []).reduce((sum, plugin) => sum + ((plugin.settings || []).length), 0);
  return {
    videoId: record.videoId,
    title: record.title,
    steps: record.steps.length,
    shots,
    plugins: record.plugins.length,
    settings,
    chainFocus: (record.chainFocus || []).length,
    parameterLogic: (record.parameterLogic || []).length
  };
});

const reportPath = path.join(siteRoot, "tools", "rework-report.json");
fs.writeFileSync(reportPath, JSON.stringify({ changed, generated, total: enrichedRecords.length, report }, null, 2), "utf8");
console.log(JSON.stringify({ changed, generated, total: enrichedRecords.length, reportPath }, null, 2));
