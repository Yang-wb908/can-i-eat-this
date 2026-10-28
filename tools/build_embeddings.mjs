// Rebuilds the dish text embeddings used by the on-device photo model
// and writes them into ../index.html (the `const EMB = {...};` line).
// Run after editing dishes.json (add a dish, improve a description):
//   cd tools && npm install && npm run embed
import { AutoTokenizer, SiglipTextModel } from "@huggingface/transformers";
import fs from "fs";

const MODEL = "Xenova/siglip-base-patch16-224";
const D = JSON.parse(fs.readFileSync(new URL("./dishes.json", import.meta.url)));
const NEG = ["a photo of a person", "a photo of an animal", "a photo of a room", "a photo of a building or street",
  "a screenshot or a page of text", "a photo of an object on a desk", "a photo of a vehicle", "a photo of a landscape"];
const templates = k => [
  `a photo of ${D.en[k]}, a Korean dish: ${D.desc[k]}.`,
  `${D.rom[k]}: ${D.desc[k]}.`,
  `a photo of ${D.desc[k]}.`,
];

const tok = await AutoTokenizer.from_pretrained(MODEL);
const tm = await SiglipTextModel.from_pretrained(MODEL, { dtype: "q8" });
const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
async function embed(texts) {
  const { pooler_output: o } = await tm(tok(texts, { padding: "max_length", max_length: 64, truncation: true }));
  const d = o.dims[1];
  return texts.map((_, i) => unit(Array.from(o.data.slice(i * d, (i + 1) * d))));
}
function int8(vecs) {
  const bytes = [], scales = [];
  for (const v of vecs) {
    const s = Math.max(...v.map(Math.abs)) / 127;
    scales.push(+s.toPrecision(6));
    for (const x of v) bytes.push(Math.round(x / s) & 0xff);
  }
  return { b64: Buffer.from(bytes).toString("base64"), scales };
}

const dishVecs = [];
for (const k of D.order) {
  const vs = await embed(templates(k));
  dishVecs.push(unit(vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length)));
}
const negVecs = await embed(NEG);
const d = int8(dishVecs), n = int8(negVecs);
const EMB = { dim: dishVecs[0].length, order: D.order, dishes: d.b64, scales: d.scales, neg: n.b64, negScales: n.scales };

const html = new URL("../index.html", import.meta.url);
const src = fs.readFileSync(html, "utf8");
const out = src.replace(/const EMB = \{.*\};/, `const EMB = ${JSON.stringify(EMB)};`);
if (out === src) throw new Error("Could not find the EMB line in index.html");
fs.writeFileSync(html, out);
console.log(`Wrote embeddings for ${D.order.length} dishes into index.html`);
