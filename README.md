# Can I Eat This in Korea?

A web page that tells a Muslim living in Korea whether a Korean dish fits their dietary rules, and why.
G3 · Group Assignment 2 (Taboos in Islam) · Introduction to Religion · Fall 2026.

**Live page:** `https://<your-username>.github.io/can-i-eat-this/` (after GitHub Pages is turned on)

## How it works

Everything runs in the browser. No server, no API keys.

| Step | What does it | Where |
|---|---|---|
| Identify the dish | English / romanized name matching with typo tolerance; on-device photo model (SigLIP, zero-shot) | `index.html` |
| List the ingredients | Recipe set of 100 Korean dishes, each ingredient tagged with group, frequency and visibility | `RAW` in `index.html` |
| Decide | Team rule table × the user's school-of-law settings | `RULES` in `index.html` |

The model only names the dish. It never makes a religious ruling.
Dishes outside the set are estimated from the words in their name and marked low confidence.

### Photo model

`Xenova/siglip-base-patch16-224`, 4-bit, about 60 MB, downloaded once from Hugging Face and cached by the browser.
Each dish has a one-line visual description (`tools/dishes.json`); its text embedding is precomputed and stored in `index.html`, so only the image half of the model is loaded.

Zero-shot accuracy on 192 web photos of the 100 dishes: first guess 52%, right dish within the top three 71%.
The page therefore always shows three candidates and asks the user to pick when it is unsure.

## Run locally

Open `index.html` in a browser. The photo model needs an internet connection the first time.

## Edit the data

| To change | Edit |
|---|---|
| Ingredients of a dish | `RAW` in `index.html` |
| English names / romanizations | `ALIAS_RAW` in `index.html` |
| Rule table and sources | `RULES` in `index.html` |
| How a dish looks (for photos) | `tools/dishes.json`, then rebuild embeddings |

```bash
cd tools
npm install
npm run embed     # rewrites the embeddings inside ../index.html
npm run eval      # accuracy on photos in tools/eval-photos/<dish>/
```

## Limits

Typical recipes, not a specific kitchen. A photo cannot show stock, marinade or frying oil.
Not a substitute for halal certification or a scholar's answer.
