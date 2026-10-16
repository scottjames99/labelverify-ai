# LabelVerify AI

Human-in-the-loop alcohol label verification prototype.

## Features

- Review PNG, JPEG, and WebP alcohol-label artwork (single or multiple files).
- Vision-model extraction of brand, type, ABV, volume, producer, origin and government warning.
- Deterministic field comparisons and individual match/mismatch/review findings.
- Exact government health-warning text check, with advisory checks for heading uppercase, bold appearance and legibility.
- Batch results and JSON export.
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

AI transcribes and describes the label; explicit comparison rules generate the verdict. Uncertain extraction must be reviewed by a person and never silently passes. Brand capitalization differences are ignored; the government warning is evaluated for exact words and heading format separately. Batch processing runs sequentially and streams completed responses into the results view. The model's claims about visual characteristics are advisory, not proof of conformity.

## Limitations and trade-offs

- Does not approve COLAs or implement all beverage-specific TTB regulations.
- PNG/JPG/WebP only; PDF artwork must first be converted to an image.
- Numeric net-content and ABV comparisons do not fully normalize units, proof-only expressions, or other complex label variants.
- Warning extraction can be imperfect; placement, minimum text size and artwork layout require human review.
- Missing country-of-origin data does not mean the origin requirement is inapplicable.
- No direct COLA integration, authentication, server-side records or audit retention policy.
- Artwork is sent to the configured cloud AI service; do not use sensitive production records.
- Five seconds is a **latency target**, not a guarantee; duration is measured and shown for each request.
- High-volume production batch processing would require a durable job queue and rate limiting.
- Real-world deployment requires approved infrastructure, security/retention/accessibility evaluations and agents' final decisions.

## Engineering verification

Automated unit tests cover case-insensitive brand matching, incorrect ABV, missing or altered government warnings, and ambiguous bold typography. Before real deployment, add a curated gold-standard image dataset and measure accuracy and latency across glare, skew and low-resolution cases.


## Image safety screening

Before AI label extraction, the verification endpoint checks uploaded PNG, JPEG, and WebP artwork with OpenAI's `omni-moderation-latest` image moderation model. Flagged images are rejected with a clear message and are not included in verification history. If moderation is unavailable, verification stops rather than bypassing the safety check. The existing `OPENAI_API_KEY` is reused; **restricted keys must have permission to call the Moderations endpoint**. No separate API key, database, or service is required. Automated moderation can make mistakes and does not guarantee detection of every inappropriate image.
