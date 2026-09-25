# FitCheck Coach

FitCheck Coach is a browser-based interview practice tool for candidates who need to improve both answer quality and spoken French delivery.

It helps a user practise role-specific interview questions, score answers against job requirements, get French verbing feedback, hear a spoken coach response, and track improvement over time.

## Features

- JD-fit scoring for interview answers
- French delivery feedback with verb swaps and simpler sentence templates
- Voice interview mode that asks questions aloud and listens where browser speech recognition is supported
- Spoken coach replies using browser text-to-speech
- Local progress history by role, language, and question
- Bilingual English/French practice mode
- Static frontend with an optional Vercel Function coach endpoint

## Privacy

FitCheck stores practice answers and progress history in browser `localStorage`. No account or database is required. The included API endpoint has a deterministic local-coach fallback and can optionally call Vercel AI Gateway when `AI_GATEWAY_API_KEY` or Vercel OIDC is configured.

## Local Development

```bash
python3 -m http.server 4177
```

Then open:

```text
http://localhost:4177/practice/?lang=fr
```

## Deploy

This repo is static and deploys directly on Vercel:

```bash
vercel --prod --yes
```

## Demo Roles

The public demo uses generic sample roles:

- FinTech Accelerator Lead
- AI Delivery Manager

The content is intentionally anonymized and does not include private interview notes, meeting links, recruiter details, or personal contact information.

## Product Status

Current:

- Local-first interview practice
- Voice mock interview mode
- French verbing and fluency feedback
- Local answer and progress history

Next:

- Adaptive follow-up questions
- Session summaries and improvement plans
- Importable job descriptions
- Optional AI Gateway-powered interviewer responses
