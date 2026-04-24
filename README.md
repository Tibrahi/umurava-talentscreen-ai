# Umurava TalentScreen AI

<div align="center">

![Umurava](https://img.shields.io/badge/Umurava-TalentScreen_AI-10b981?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?style=flat-square&logo=mongodb)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**AI-powered talent screening and shortlisting platform for modern recruitment teams.**

</div>

---

# 📖 1. Project Overview

**Umurava TalentScreen AI** is a production-ready prototype built for the **Umurava AI Hackathon**, designed to solve large-scale recruitment challenges using **explainable AI**.

It enables recruiters to:

- Ingest candidates from structured and unstructured sources
- Evaluate applicants against job requirements
- Generate a **ranked shortlist (Top 10 / Top 20)**
- Provide **clear AI-driven reasoning** for every decision

The system ensures:

- Transparency (no hallucinated data)
- Consistency (deterministic fallback scoring)
- Human control (AI supports—not replaces—decisions)

---

# ❗ 2. Problem Statement

Recruiters face:

- High application volumes
- Difficulty comparing candidates across formats

This system answers:

> How can AI screen and rank candidates **accurately, transparently, and efficiently**, while keeping hiring decisions human-led?

---

# 🎯 3. Core Objectives

- Understand job requirements and candidate profiles
- Analyze multiple applicants simultaneously
- Rank candidates using structured scoring
- Provide **explainable AI outputs (strengths, gaps, reasoning)**

---

# 🧩 4. Product Scope

## Scenario 1: Structured Talent Profiles
- Input: Job + structured applicant schema
- Output: Ranked shortlist with explanations

## Scenario 2: External Candidate Sources
- Input:
  - CSV / Excel uploads
  - PDF resumes
  - JSON / API links
- Output:
  - Parsed profiles
  - AI-ranked shortlist

---

# ✨ 5. Key Features

## Candidate Ingestion
- JSON, CSV, Excel, PDF, URL
- Automatic normalization → `structuredProfile`
- Resume parsing (PDF → text → inferred skills)

## AI Screening Engine
- Gemini-powered ranking
- Multi-candidate batch evaluation
- Explainable outputs:
  - Match Score (0–100)
  - Strengths
  - Gaps / Risks
  - Recommendation

## Job Management
- Create/edit job roles
- Define:
  - Skills
  - Experience
  - Education

## Recruiter Dashboard
- Real-time metrics
- Ranked shortlist view
- Candidate deep-dive panel

## Duplicate Detection
- Smart similarity scoring
- Merge duplicate candidates
- Data integrity preservation

---

# 🧱 6. System Architecture

```

Frontend (Next.js)
↓
API Layer (Node.js / Next API Routes)
↓
AI Orchestration Layer (Gemini)
↓
Database (MongoDB)

```

## Components

### Frontend
- Dashboard
- Job management UI
- Candidate ingestion UI
- Shortlist visualization

### Backend
- REST APIs
- Data processing
- Screening orchestration

### AI Layer (Gemini - Mandatory)
- Candidate evaluation
- Ranking & scoring
- Explanation generation

### Database
- Applicants
- Jobs
- Screening results

---

# 🧠 7. AI Decision Flow

### Step 1: Input Preparation
- Job requirements structured
- Candidates normalized into labeled sections

### Step 2: Prompt Construction
- Multi-candidate batch prompt
- Strict rules:
  - No inference beyond data
  - Missing data = zero score

### Step 3: AI Evaluation
Gemini returns:
- Score per candidate
- Ranking
- Strengths (with evidence)
- Gaps (missing requirements)

### Step 4: Fallback Mechanism
If AI fails:
- Deterministic scoring algorithm runs
- Same scoring logic
- No external dependency

---

# 📊 8. Scoring System

| Category        | Weight |
|----------------|--------|
| Skills         | 40     |
| Experience     | 30     |
| Education      | 15     |
| Completeness   | 15     |

### Recommendation Levels
- 85–100 → Strongly Recommend
- 70–84 → Recommend
- 50–69 → Consider
- 0–49 → Do Not Recommend

---

# ⚙️ 9. Tech Stack

| Layer        | Technology |
|-------------|-----------|
| Frontend     | Next.js, React, TypeScript |
| Backend      | Node.js (API Routes) |
| Database     | MongoDB (Mongoose) |
| AI           | Gemini API (Mandatory) |
| State Mgmt   | Redux Toolkit |
| Styling      | Tailwind CSS |

---

# 📁 10. Project Structure

```

src/
├── app/
├── components/
├── lib/
│   ├── gemini.ts
│   ├── normalize-applicant.ts
│   ├── duplicate-detection.ts
│   └── models/
├── redux/
└── utils/

````

---

# 🚀 11. Setup Instructions

## Prerequisites
- Node.js ≥ 18
- MongoDB
- Gemini API Key

## Installation

```bash
git clone <repo>
cd project
npm install
````

## Environment Variables

```env
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_api_key
```

## Run

```bash
npm run dev
```

---

# 📡 12. API Overview

| Endpoint              | Description       |
| --------------------- | ----------------- |
| `/api/applicants`     | Manage applicants |
| `/api/jobs`           | Manage jobs       |
| `/api/screenings/run` | Run AI screening  |
| `/api/dashboard`      | Metrics           |

---

# 🛡 13. AI Safety & Transparency Rules

* Only use explicitly provided data
* No assumptions or hallucinations
* Missing data = score = 0
* Every output must include reasoning
* Every strength/gap must reference data

---

# 🔄 14. Data Flow

```
Raw Input → Normalization → Structured Profile → Database → AI Screening → Ranked Output
```

---

# ⚠️ 15. Assumptions & Limitations

## Assumptions

* Input data follows expected schema (or is parseable)
* Skills listed reflect actual competence
* Experience duration is correctly formatted

## Limitations

* PDF parsing may miss complex formatting
* AI scoring depends on input quality
* No real-time external verification (e.g., LinkedIn validation)

---

# 🌐 16. Deployment

## Requirements

* Live accessible URL
* Secure environment variables
* Production error handling

## Recommended

* Frontend: Vercel
* Backend: Render / Railway
* Database: MongoDB Atlas

---

# 📦 17. Deliverables

* Live deployed application
* Functional AI screening system
* Clean, structured codebase
* This README (documentation)
* Presentation slides (2 max)

---

# 🧪 18. Evaluation Criteria Alignment

This project is designed to meet:

* Practical relevance
* AI clarity & explainability
* Engineering quality
* Product usability

---

# 🤝 19. Contributing

1. Fork repo
2. Create branch
3. Commit changes
4. Submit PR

---

# 📄 20. License

MIT License

---
