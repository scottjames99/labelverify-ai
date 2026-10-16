# LabelVerify AI

Human-in-the-loop alcohol label verification prototype.

**Live demo:** https://labelverify-ai.vercel.app/

## Submission overview

**Approach:** Reviewers enter the information claimed in an application and upload label artwork. OpenAI vision extracts visible label information; deterministic TypeScript rules compare it against application values and flag matches, discrepancies, and uncertain findings for human review. The app supports multiple uploads, JSON export, and browser-local verification history.

**Tools:** Next.js 16, React 19, TypeScript, Tailwind CSS, OpenAI GPT-4.1-mini (vision), Zod, Vitest, GitHub, and Vercel.

**Assumptions:** This is a standalone demonstration, not a connection to TTB COLA infrastructure. AI output is advisory, and a human reviewer makes final decisions. Input images should be legible and non-sensitive; not every beverage-specific rule is implemented. Saved history is local to the browser, not an official audit record.


## Features

- Review PNG, JPEG, and WebP alcohol-label artwork (single or multiple files).
- Vision-model extraction of brand, type, ABV, volume, producer, origin and government warning.
- Deterministic field comparisons and individual match/mismatch/review findings.
- Exact government health-warning text check, with advisory checks for heading uppercase, bold appearance and legibility.
- Batch results and JSON export.
- Searchable browser-local verification history (up to 50 saved results), with reopening, filtering, and deletion; original images are not retained.
- Processing time displayed for every image.

## Local development

Use Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
npm test
npm run build
```

## Deployment

Import the repository in Vercel, select Next.js, configure `OPENAI_API_KEY` as a **server-side** environment variable, and deploy. Optionally set `OPENAI_MODEL`. No key should be exposed to the browser.

## Design decisions

AI transcribes and describes the label; explicit comparison rules generate the verdict. Uncertain extraction must be reviewed by a person and never silently passes. Brand capitalization differences are ignored; the government warning is evaluated for exact words and heading format separately. Batch processing runs sequentially and streams completed responses into the results view. The model's claims about visual characteristics are advisory, not proof of conformity. Warning wording comparison tolerates OCR capitalization differences while checking heading capitalization separately. Verification history uses browser localStorage, so records are not synchronized between browsers or devices.

## Limitations and trade-offs

- Does not approve COLAs or implement all beverage-specific TTB regulations.
- PNG/JPG/WebP only; PDF artwork must first be converted to an image.
- Net contents support common mL, L, US fluid-ounce and quart equivalences, but not every unit or complex label variant. ABV comparison does not normalize proof-only expressions.
- Warning extraction can be imperfect; placement, minimum text size and artwork layout require human review.
- Missing country-of-origin data does not mean the origin requirement is inapplicable.
- No direct COLA integration, authentication, server-side records or audit retention policy.
- Artwork is sent to the configured cloud AI service; do not use sensitive production records.
- Five seconds is a **latency target**, not a guarantee; duration is measured and shown for each request.
- High-volume production batch processing would require a durable job queue and rate limiting.
- Real-world deployment requires approved infrastructure, security/retention/accessibility evaluations and agents' final decisions.

## Engineering verification

Automated unit tests cover case-insensitive brand matching, incorrect ABV, missing or altered government warnings, and ambiguous bold typography. Before real deployment, add a curated gold-standard image dataset and measure accuracy and latency across glare, skew and low-resolution cases.
