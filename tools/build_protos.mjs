// Rebuilds the photo prototypes used by the on-device photo model
// and writes them into ../index.html (the `const PROTO = {...};` line).
// Put freely licensed reference photos in tools/ref-photos/<Korean dish name>/*.jpg
// (list their sources in ref-photos-sources.tsv), then:
//   cd tools && npm install && npm run protos
// Each dish's prototype is the average image embedding of its reference photos.
// The weight w and temperature tau already in index.html are kept.
import { AutoProcessor, SiglipVisionModel, RawImage } from "@huggingface/transformers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MODEL = "Xenova/siglip-base-patch16-224";
const html = new URL("../index.html", import.meta.url);
const src = fs.readFileSync(html, "utf8");
const EMB = JSON.parse(src.match(/const EMB = (\{.*\});/)[1]);
const old = JSON.parse(src.match(/const PROTO = (\{.*\});/)[1]);
const root = fileURLToPath(new URL("./ref-photos/", import.meta.url));

const proc = await AutoProcessor.from_pretrained(MODEL);
const vm = await SiglipVisionModel.from_pretrained(MODEL, { dtype: "q4" });
const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
const idx = [], n = [], rows = [];
let photos = 0;
for (const [d, ko] of EMB.order.entries()) {
  const dir = path.join(root, ko);
  if (!fs.existsSync(dir)) continue;
  const sum = new Array(EMB.dim).fill(0); let k = 0;
  for (const f of fs.readdirSync(dir)) {
    const img = await RawImage.read(path.join(dir, f));
    const { pooler_output: o } = await vm(await proc(img));
    unit(Array.from(o.data)).forEach((x, j) => { sum[j] += x; }); k++;
  }
  if (!k) continue;
  idx.push(d); n.push(k); rows.push(unit(sum)); photos += k;
  console.log(`${ko} ${k}`);
}
const bytes = [], scales = [];
for (const v of rows) {
  const s = Math.max(...v.map(Math.abs)) / 127;
  scales.push(+s.toPrecision(6));
  for (const x of v) bytes.push(Math.round(x / s) & 0xff);
}
const PROTO = { dim: EMB.dim, w: old.w, tau: old.tau, photos, idx, n, scales, vecs: Buffer.from(bytes).toString("base64") };
fs.writeFileSync(html, src.replace(/const PROTO = \{.*\};/, `const PROTO = ${JSON.stringify(PROTO)};`));
console.log(`Wrote prototypes for ${idx.length} dishes from ${photos} photos into index.html`);
