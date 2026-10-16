<div align="center">

# 🛡️ LabelVerify AI

### AI-assisted alcohol label verification

**A human-in-the-loop prototype for reviewing alcohol beverage label artwork against application information.**

[**🚀 Live Demo**](https://labelverify-ai.vercel.app/) · [**⚙️ Setup**](#-quick-start) · [**🧪 Tests**](#-testing) · [**📋 Assumptions**](#-assumptions--limitations)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Vision-412991?logo=openai&logoColor=white)
![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel)

</div>

---

## ✨ Overview

LabelVerify AI helps a reviewer compare **submitted application details** with **what is visible on uploaded alcohol labels**. An AI vision model extracts evidence from the artwork; deterministic comparison rules identify matches, discrepancies, and findings that need human judgment.

> **Decision support, not automated regulatory approval.** This prototype does not issue Certificates of Label Approval (COLAs) or replace a TTB reviewer.

### At a glance

| Capability | What it does |
| --- | --- |
| 🔎 **AI extraction** | Reads brand, class/type, ABV, net contents, producer, origin, and warning text from label images |
| ⚖️ **Field comparisons** | Shows expected vs. observed values with **Match**, **Mismatch**, or **Review** findings |
| ⚠️ **Government warning** | Checks required wording and provides advisory heading/legibility assessments |
| 📁 **Multiple uploads** | Processes multiple images in one review session |
| 🕘 **Verification history** | Saves up to 50 completed results locally in the browser, with search, filtering, and deletion |
| 📤 **JSON export** | Downloads structured findings for further inspection |
| ⏱️ **Timing** | Displays processing time for each image |

## 🧭 How it works

```text
Application details + label artwork
                 │
                 ▼
         OpenAI vision model
         (extract visible text)
                 │
                 ▼
      TypeScript verification rules
       (compare each field / warning)
                 │
                 ▼
       Match · Mismatch · Review
                 │
                 ▼
       Reviewer inspects findings
       ├── Export results as JSON
       └── Reopen browser-local history
```

**Example:** If an application specifies **45% ABV, 750 mL bourbon**, but the uploaded artwork shows **7.5% ABV, 946 mL malt liquor**, the system flags the discrepancies rather than silently accepting the label.

## 🧰 Technology

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Vision extraction | OpenAI GPT-4.1-mini |
| Validation | Zod |
| Comparison engine | Deterministic TypeScript rules |
| Tests | Vitest |
| Source control | GitHub |
| Hosting | Vercel |
| Prototype history | Browser `localStorage` |

## 🚀 Quick start

**Requirements:** Node.js 20.9+ and an OpenAI API key with access to Chat Completions.

```bash
git clone https://github.com/scottjames99/labelverify-ai.git
cd labelverify-ai
npm install
cp .env.example .env.local
```

Set the following in `.env.local`:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Start the development server:

```bash
npm run dev
```

Open **http://localhost:3000**. Never commit your API key or expose it through a client-side environment variable.

### Try a verification

1. Enter the values claimed in the application, or use the sample application button.
2. Upload a PNG, JPG, or WebP label image (up to **8 MB** each).
3. Select **Verify labels** and inspect the field-by-field results.
4. Export the JSON or reopen the saved result from **Verification History**.

For a mismatch demo, use application values from one beverage and artwork from a different beverage.

## 🧪 Testing

```bash
npm test
npm run build
```

Unit tests cover brand normalization, ABV discrepancies, warning text and formatting uncertainty, and net-contents unit comparisons. Tests and builds should be run after changes; a successful production deployment alone is not a substitute for a test run.

## ☁️ Deployment

1. Import this GitHub repository into **Vercel** as a Next.js project.
2. Add `OPENAI_API_KEY` to the project's **server-side environment variables**.
3. Optionally set `OPENAI_MODEL=gpt-4.1-mini`.
4. Deploy and run a sample label verification.

**Live deployment:** [labelverify-ai.vercel.app](https://labelverify-ai.vercel.app/)

> **Cost/security note:** AI requests use the configured OpenAI API account. This public prototype has no user authentication or production-grade rate limiting; set appropriate API budgets and avoid uploading sensitive records.

## 🧠 Approach & design decisions

- **Separate extraction from verification.** The AI describes what is visible; explicit code compares it against the application.
- **Preserve uncertainty.** Missing or unclear fields receive **Review**, not a fabricated match.
- **Normalize carefully.** Brand comparisons ignore capitalization and typographic apostrophe differences. Net contents recognize common mL, L, US fluid-ounce, and quart equivalences. Warning wording tolerates OCR capitalization differences, while heading appearance is evaluated separately.
- **Keep humans in control.** Visual judgments, including boldness and legibility, are advisory.
- **Favor a lightweight prototype.** Multiple uploads run sequentially. History is stored locally without introducing accounts or a database.

## 📋 Assumptions & limitations

| Area | Assumption / trade-off |
| --- | --- |
| **Integration** | Standalone demonstration; no connection to TTB COLA systems |
| **Regulatory scope** | Demonstrates core comparisons, not every beverage-specific labeling requirement |
| **Decision-making** | Human reviewers retain responsibility for final determinations |
| **File formats** | PNG, JPEG, and WebP; PDFs require conversion to images |
| **Warning assessment** | OCR and visual analysis can be imperfect; layout, placement, and minimum font size require human inspection |
| **Measurements** | Common volume units are supported, but complex formats and proof-only alcohol statements are not fully normalized |
| **History** | Up to 50 results in the current browser only; images are **not retained**, and clearing browser data can erase history |
| **Privacy/security** | Artwork is sent to the configured AI service; no authentication, shared audit log, or production retention policy |
| **Performance** | Approximately five seconds is a target, not a guaranteed processing time; per-image latency is displayed |

### Production considerations

A production implementation would need authenticated access, secure record retention and audit trails, appropriate privacy and security reviews, rate limiting, durable batch jobs, broader accessibility validation, and a representative labeled test dataset to measure accuracy and latency under real-world image conditions.

---

<div align="center">

**Built as a practical, reviewable proof of concept for AI-assisted alcohol label verification.**

[Launch the demo](https://labelverify-ai.vercel.app/) · [Back to top](#️-labelverify-ai)

</div>
