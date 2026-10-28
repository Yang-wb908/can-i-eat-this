// Measures the photo model on your own photos.
// Put photos in tools/eval-photos/<Korean dish name>/*.jpg  (e.g. eval-photos/김치찌개/1.jpg)
//   cd tools && npm install && npm run eval
// Prints first-guess and top-3 accuracy, and the misses. Paste the numbers into VISION.test in index.html.
import { AutoProcessor, SiglipVisionModel, RawImage } from "@huggingface/transformers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MODEL = "Xenova/siglip-base-patch16-224";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const EMB = JSON.parse(html.match(/const EMB = (\{.*\});/)[1]);
const decode = (b64, scales, dim) => {
  const buf = Buffer.from(b64, "base64");
  return scales.map((s, i) => {
    const v = Array.from({ length: dim }, (_, j) => ((buf[i * dim + j] << 24) >> 24) * s);
    const n = Math.hypot(...v); return v.map(x => x / n);
  });
};
const dishes = decode(EMB.dishes, EMB.scales, EMB.dim);

const proc = await AutoProcessor.from_pretrained(MODEL);
const vm = await SiglipVisionModel.from_pretrained(MODEL, { dtype: "q4" });
const root = fileURLToPath(new URL("./eval-photos/", import.meta.url));
let n = 0, top1 = 0, top3 = 0; const misses = [];
for (const ko of fs.readdirSync(root)) {
  if (!EMB.order.includes(ko)) { console.warn(`skip folder "${ko}" (not one of the 100 dishes)`); continue; }
  for (const f of fs.readdirSync(path.join(root, ko))) {
    const img = await RawImage.read(path.join(root, ko, f));
    const { pooler_output: o } = await vm(await proc(img));
    const v = Array.from(o.data); const m = Math.hypot(...v);
    const ranked = dishes.map((d, i) => [EMB.order[i], d.reduce((s, x, j) => s + x * v[j] / m, 0)]).sort((a, b) => b[1] - a[1]);
    n++; if (ranked[0][0] === ko) top1++;
    if (ranked.slice(0, 3).some(r => r[0] === ko)) top3++; else misses.push(`${ko}/${f} -> ${ranked[0][0]}`);
  }
}
console.log(`photos ${n}  first guess ${(top1 / n * 100).toFixed(0)}%  top three ${(top3 / n * 100).toFixed(0)}%`);
if (misses.length) console.log("misses:\n  " + misses.join("\n  "));
