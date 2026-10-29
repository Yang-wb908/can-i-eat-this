// Measures the photo model on your own photos.
// Put photos in tools/eval-photos/<Korean dish name>/*.jpg  (e.g. eval-photos/김치찌개/1.jpg)
// Keep them separate from tools/ref-photos/ (the photos the prototypes are built from).
//   cd tools && npm install && npm run eval
// Scores photos the way the page does (description match + reference-photo match, see photoScores()
// in index.html) and prints first-guess and top-3 accuracy, macro-F1, and the misses.
// Paste the numbers into VISION.test in index.html.
import { AutoProcessor, SiglipVisionModel, RawImage } from "@huggingface/transformers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MODEL = "Xenova/siglip-base-patch16-224";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const EMB = JSON.parse(html.match(/const EMB = (\{.*\});/)[1]);
const PROTO = JSON.parse(html.match(/const PROTO = (\{.*\});/)[1]);
const decode = (b64, scales, dim) => {
  const buf = Buffer.from(b64, "base64");
  return scales.map((s, i) => {
    const v = Array.from({ length: dim }, (_, j) => ((buf[i * dim + j] << 24) >> 24) * s);
    const n = Math.hypot(...v); return v.map(x => x / n);
  });
};
const dishes = decode(EMB.dishes, EMB.scales, EMB.dim);
const protos = decode(PROTO.vecs, PROTO.scales, PROTO.dim);
const has = new Set(PROTO.idx);
const dot = (a, b) => a.reduce((s, x, j) => s + x * b[j], 0);
// z-score over the given indices (population std), as zfn() in index.html
const zfn = (a, idx) => {
  const m = idx.reduce((s, i) => s + a[i], 0) / idx.length;
  const sd = Math.sqrt(idx.reduce((s, i) => s + (a[i] - m) ** 2, 0) / idx.length) + 1e-9;
  return i => (a[i] - m) / sd;
};
const all = EMB.order.map((_, i) => i);
const photoScores = (v, sims) => {
  const zt = zfn(sims, all), ps = new Array(sims.length).fill(0);
  PROTO.idx.forEach((d, j) => { ps[d] = dot(protos[j], v); });
  const zp = zfn(ps, PROTO.idx);
  return sims.map((_, i) => zt(i) + PROTO.w * (has.has(i) ? zp(i) : zt(i)));
};
const macroF1 = (truth, pred) => {
  const labels = [...new Set(truth)];
  return labels.reduce((s, l) => {
    const tp = truth.filter((t, i) => t === l && pred[i] === l).length;
    const fp = pred.filter((p, i) => p === l && truth[i] !== l).length, fn = truth.filter((t, i) => t === l && pred[i] !== l).length;
    return s + (tp ? 2 * tp / (2 * tp + fp + fn) : 0);
  }, 0) / labels.length;
};

const proc = await AutoProcessor.from_pretrained(MODEL);
const vm = await SiglipVisionModel.from_pretrained(MODEL, { dtype: "q4" });
const root = fileURLToPath(new URL("./eval-photos/", import.meta.url));
const truth = [], pred = [], predText = []; let top1 = 0, top3 = 0, t1 = 0, t3 = 0; const misses = [];
for (const ko of fs.readdirSync(root)) {
  if (!fs.statSync(path.join(root, ko)).isDirectory()) continue;
  if (!EMB.order.includes(ko)) { console.warn(`skip folder "${ko}" (not one of the 100 dishes)`); continue; }
  for (const f of fs.readdirSync(path.join(root, ko))) {
    const img = await RawImage.read(path.join(root, ko, f));
    const { pooler_output: o } = await vm(await proc(img));
    const raw = Array.from(o.data), m = Math.hypot(...raw), v = raw.map(x => x / m);
    const sims = dishes.map(d => dot(d, v)), sc = photoScores(v, sims);
    const rank = s => all.slice().sort((a, b) => s[b] - s[a]).map(i => EMB.order[i]);
    const r = rank(sc), rt = rank(sims);
    truth.push(ko); pred.push(r[0]); predText.push(rt[0]);
    if (r[0] === ko) top1++; if (rt[0] === ko) t1++; if (rt.slice(0, 3).includes(ko)) t3++;
    if (r.slice(0, 3).includes(ko)) top3++; else misses.push(`${ko}/${f} -> ${r[0]}`);
  }
}
const n = truth.length, pct = x => `${(x / n * 100).toFixed(0)}%`;
console.log(`photos ${n}  first guess ${pct(top1)}  top three ${pct(top3)}  macro-F1 ${macroF1(truth, pred).toFixed(2)}`);
console.log(`  (descriptions only: first guess ${pct(t1)}  top three ${pct(t3)}  macro-F1 ${macroF1(truth, predText).toFixed(2)})`);
if (misses.length) console.log("misses:\n  " + misses.join("\n  "));
