# Can I Eat This in Korea?

A web page that tells a Muslim living in Korea whether a Korean dish fits their dietary rules, and why.
G3 · Group Assignment 2 (Taboos in Islam) · Introduction to Religion · Fall 2026.

**Live page:** https://yang-wb908.github.io/can-i-eat-this/

## How it works

Everything runs in the browser. No server, no API keys.

| Step | What does it | Where |
|---|---|---|
| Identify the dish | English / romanized name matching with typo tolerance; on-device photo model (SigLIP, zero-shot, plus reference photos) | `index.html` |
| List the ingredients | Recipe set of 100 Korean dishes, each ingredient tagged with group, frequency and visibility | `RAW` in `index.html` |
| Decide | Team rule table × the user's school-of-law settings | `RULES` in `index.html` |

The model only names the dish. It never makes a religious ruling.
Dishes outside the set are estimated from the words in their name and marked low confidence.

### Photo model

`Xenova/siglip-base-patch16-224`, 4-bit, about 60 MB, downloaded once from Hugging Face and cached by the browser.
Each dish has a one-line visual description (`tools/dishes.json`); its text embedding is precomputed and stored in `index.html`, so only the image half of the model is loaded.
Each dish also has a prototype: the average image embedding of its reference photos (1,286 freely licensed photos from Wikimedia Commons and Flickr, covering 96 dishes; sources and licenses in `tools/ref-photos-sources.tsv`).
A photo is scored as `z(description match) + 3 × z(prototype match)`; a dish without reference photos uses its description score alone. No model weights are trained.

Accuracy on 357 separate test photos (Wikimedia Commons, 97 dishes, none used for the prototypes):

| | First guess | Top three | Macro-F1 |
|---|---|---|---|
| Descriptions + reference photos (live) | 60% | 75% | 0.54 |
| Descriptions only | 52% | 76% | 0.48 |

Web photos may have been in the model's training data, so photos taken in a real cafeteria can score lower.
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
| Reference photos | `tools/ref-photos/<dish>/` (not committed) and `tools/ref-photos-sources.tsv`, then rebuild prototypes |

```bash
cd tools
npm install
npm run embed     # rewrites the embeddings inside ../index.html
npm run protos    # rewrites the prototypes inside ../index.html from tools/ref-photos/<dish>/
npm run eval      # accuracy on photos in tools/eval-photos/<dish>/
```

## Limits

Typical recipes, not a specific kitchen. A photo cannot show stock, marinade or frying oil.
Not a substitute for halal certification or a scholar's answer.
