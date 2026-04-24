```markdown
# Umurava TalentScreen AI

<div align="center">

![Umurava](https://img.shields.io/badge/Umurava-TalentScreen_AI-10b981?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?style=flat-square&logo=mongodb)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**AI‑powered talent screening and shortlisting platform built for modern recruitment teams.**

</div>

---

## 📖 Overview

**Umurava TalentScreen AI** is a comprehensive, full‑stack web application designed to streamline the recruitment pipeline. Recruiters can create job openings, ingest candidate profiles from multiple sources (JSON, CSV, Excel, PDF, URL), and run an **evidence‑based Gemini AI screening engine** that ranks candidates strictly on the data provided – no hallucinations, no guessing.

The system enforces a transparent, auditable scoring formula (skills, experience, education, profile completeness) and returns sub‑scores, strength/gap analysis, and actionable recommendations. All results are stored in MongoDB and exposed through a modern React dashboard with real‑time updates.

**Built for scale, reliability, and clarity.** Every screening run is backed by a deterministic fallback heuristic, ensuring the platform remains functional even when external APIs are unavailable.

---

## ✨ Key Features

- **Multi‑format Candidate Ingestion**
  - Structured JSON (single or batch)
  - CSV/Excel with automatic header mapping and nested‑index parsing (e.g., `skills[0].name`)
  - PDF resume upload → text extraction → skill inference
  - Remote URL fetch (must return JSON)
  - Drag‑and‑drop zones with live file parsing feedback

- **Intelligent Profile Enrichment**
  - Automatic construction of a canonical `structuredProfile` from raw data
  - Robust support for mixed camelCase, snake_case, and Title Case headers
  - Duplicate detection (Levenshtein similarity across name, email, skills, and full profile data)
  - One‑click merge of duplicate applicant records
  - Force re‑sync to rebuild profiles from original source data

- **Job Management**
  - Create, edit, and delete job openings
  - Rich job description supporting file upload (`.txt`, `.md`)
  - Job metadata: required skills, experience, education, location, employment type

- **Gemini‑Powered Screening**
  - **Strict anti‑hallucination prompt** – the model only scores on explicit, labelled sections
  - Sub‑scores: **Skills (0–40), Experience (0–30), Education (0–15), Completeness (0–15)**
  - Detailed evidence: `strengths`, `gapsAndRisks`, `explanation` citing exact profile fields
  - Error‑resilient: automatic fallback to a **deterministic heuristic** if Gemini is unavailable (e.g., quota exceeded)
  - Output: ranked shortlist with `matchScore`, `recommendation` tier, and deep‑dive AI panel

- **Interactive Recruiter Dashboard**
  - Real‑time metrics: active jobs, total applicants, screening runs
  - Side‑by‑side shortlisted / unshortlisted columns with pagination
  - Slide‑over candidate preview with full applicant data and AI insights
  - Full‑screen talent profile modal

- **Bulk Operations & Duplicate Handling**
  - Select multiple applicants for batch delete or merge
  - Duplicate groups surfaced with similarity percentages
  - “Force Re‑sync” button recalculates all structured profiles from original raw data

- **Developer Experience**
  - Next.js App Router with `"use client"` components
  - Redux Toolkit (RTK Query) for API state management
  - Tailwind CSS 4 for rapid UI development
  - Mongoose ODM with connection caching for serverless environments

---

## 🧱 Tech Stack

| Layer          | Technology                                                                 |
|----------------|----------------------------------------------------------------------------|
| **Frontend**   | Next.js 15 (React 18), TypeScript, Tailwind CSS 4, Redux Toolkit, Lucide Icons |
| **Backend**    | Next.js API routes (serverless)                                            |
| **Database**   | MongoDB (via Mongoose)                                                     |
| **AI Engine**  | Google Gemini 2.0 Flash (`@google/generative-ai`)                          |
| **File Parsing** | PapaParse (CSV), SheetJS (Excel), pdf-parse (PDF extract)                |
| **State Mgmt** | Redux Toolkit (RTK Query)                                                  |
| **Validation** | Built‑in TypeScript types + runtime normalization utilities                |
| **Deployment** | Vercel / any Node.js environment                                           |

---

## 📁 Folder Structure

```
umurava-talentscreenai/
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Recruiter Command Center
│   │   ├── jobs/               # Job creation & management
│   │   ├── screenings/         # AI screening triggers & results
│   │   ├── applicants/         # Applicant database & imports
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # Reusable UI primitives (Button, Badge, ActionMessage, JobCard, etc.)
│   │   └── applicants/        # ApplicantDetailModal, DataMigrationPanel
│   ├── lib/
│   │   ├── gemini.ts          # Gemini prompt & fallback heuristic
│   │   ├── duplicate-detection.ts  # Levenshtein-based similarity & merge
│   │   ├── normalize-applicant.ts  # Build structuredProfile from any raw source
│   │   ├── migration.ts       # Batch migration utility
│   │   ├── mongoose.ts        # MongoDB connection helper (global cache)
│   │   ├── models/            # Mongoose schemas (Applicant, Job, Screening)
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils.ts
│   └── redux/
│       ├── hooks.ts
│       └── services/
│           └── api.ts         # RTK Query API slice (all endpoints)
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwing.config.ts
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** `>=18` (v20+ recommended)
- **npm** or **yarn**
- **MongoDB** instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Google Gemini API key** ([get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
git clone <repository-url>
cd umurava-talentscreenai
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# MongoDB connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/your-db-name

# Google Gemini API key (required for AI screening)
GEMINI_API_KEY=your_gemini_api_key_here
```

> ⚠️ **Important**: The application will **still work without GEMINI_API_KEY** – screening falls back to a deterministic heuristic. However, AI‑generated rationale, strengths, gaps, and precise matching will degrade.

### Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

- **Dashboard** → `/dashboard`
- **Jobs** → `/jobs`
- **Screenings** → `/screenings`
- **Applicants** → `/applicants`

---

## 🚀 Usage Walkthrough

### 1. Import Candidates
Navigate to **Applicants** and choose your source:

- **JSON** – paste structured profile(s) manually or import a pre‑built file.
- **CSV / Excel** – drag‑and‑drop files with headers like `First Name`, `Email`, `skills[0].name`, etc.
- **PDF** – upload one or multiple resumes; text is extracted and stored.
- **URL** – fetch applicant data from a remote JSON endpoint.

The system automatically builds a `structuredProfile` (skills, experience, education, certifications, projects, etc.) and detects duplicates.

### 2. Create Job Openings
Head to **Jobs** and fill in the role details. Optionally upload a `.txt` description file. Required skills, experience, and education fields define the evaluation criteria used by Gemini.

### 3. Run AI Screening
Go to **Screenings**, select a job, choose the number of candidates to shortlist (Top 10/20), and click **“Run Screening”**.

![Screening Process](./docs/screening-diagram.png) *(optional – local image)*

The backend sends a **single, batch prompt** to Gemini containing every candidate’s labelled profile and the job specification. The model returns a ranked shortlist with detailed sub‑scores and evidence.

If the Gemini API is unavailable (quota, network error), the built‑in fallback scoring algorithm runs automatically – identical logic, no AI, instant results.

### 4. Review Results
The **Screenings** page displays the ranked list. Click any candidate to open a slide‑over panel with:

- Match score and recommendation tier
- Gemini’s structured assessment (strengths, gaps, explanation)
- Quick‑view of skills, location, experience
- Full talent profile modal

From here, recruiters can make informed shortlisting decisions.

---

## 🔧 API Endpoints (RTK Query)

The application uses **Redux Toolkit Query** to auto‑generate React hooks. All endpoints are defined in `src/redux/services/api.ts`. The main operations:

| HTTP Method | Endpoint                  | RTK Hook                     | Description |
|-------------|---------------------------|------------------------------|-------------|
| `GET`       | `/api/applicants`         | `useGetApplicantsQuery`      | List all applicants |
| `POST`      | `/api/applicants`         | `useCreateApplicantMutation` | Create single applicant |
| `PUT`       | `/api/applicants/[id]`    | `useUpdateApplicantMutation` | Update applicant (including structuredProfile) |
| `DELETE`    | `/api/applicants/[id]`    | `useDeleteApplicantMutation` | Remove applicant |
| `POST`      | `/api/applicants/bulk`    | `useBulkApplicantsMutation`  | Bulk insert (array) |
| `POST`      | `/api/upload/resumes`     | `useUploadResumesMutation`   | PDF resume upload |
| `GET`       | `/api/jobs`               | `useGetJobsQuery`            | List all jobs |
| `POST`      | `/api/jobs`               | `useCreateJobMutation`       | Create job |
| `PUT`       | `/api/jobs/[id]`          | `useUpdateJobMutation`       | Edit job |
| `DELETE`    | `/api/jobs/[id]`          | `useDeleteJobMutation`       | Delete job |
| `GET`       | `/api/screenings`         | `useGetScreeningsQuery`      | List screening runs |
| `POST`      | `/api/screenings/run`     | `useRunScreeningMutation`    | Trigger a new screening |
| `GET`       | `/api/dashboard/summary`  | `useGetDashboardSummaryQuery`| Get aggregate counts (jobs, applicants, screenings) |

All mutations automatically refetch relevant queries to keep the UI consistent.

---

## 🧠 How Gemini Screening Works

The core prompt (`src/lib/gemini.ts`) enforces an **evidence‑only** evaluation. Every candidate profile is transformed into a highly structured text block where each section is either populated or explicitly marked as `"NONE PROVIDED"`.

**Scoring Formula (hard‑coded in the prompt and fallback):**

| Dimension        | Max Score | Logic |
|------------------|-----------|-------|
| **Skills**       | 40        | `(matched required skills / total required skills) × 40` |
| **Experience**   | 30        | `min(yearsOfExperience / minimumExperience, 1) × 30` |
| **Education**    | 15        | Exact field match → 15, related → 10, unrelated → 5, none → 0 |
| **Completeness** | 15        | Based on presence of Skills, Experience, Education, and Bio/Headline (4 → 15, 3 → 10, 2 → 5, 0‑1 → 0) |

**Recommendation Tiers:**  
- 85‑100 → **Strongly Recommend**  
- 70‑84  → **Recommend**  
- 50‑69  → **Consider**  
- 0‑49   → **Do Not Recommend**

The fallback (`buildFallbackShortlist`) mirrors this logic exactly – no AI, same maths, always available.

---

## 🔄 Data Flow for Applicants

```
Raw Input (JSON/CSV/Excel/PDF/URL)
        ↓
  normalize-applicant.ts
        ↓
  buildStructuredProfile(raw)   →   canonical typed object
        ↓
  Mongoose save (with profileData.raw preserved)
        ↓
  Duplicate detection runs on the stored collection
```

Structured profiles are **re‑buildable** at any time using the “Force Re‑sync” button, which reads the original `profileData.raw` and recreates the entire profile. This ensures no data is ever lost, even if the schema evolves.

---

## 🛡 Anti‑Hallucination Rules (Gemini Prompt)

```
1. Only count explicitly listed skills – never infer from job titles.
2. Use CALCULATED_EXPERIENCE_YEARS, not company prestige.
3. "NONE PROVIDED" → score that dimension as 0.
4. Every strength must quote the source field.
5. Every gap must name the exact missing requirement.
```

These rules are repeated and enforced in the system prompt to produce auditable, consistent rankings.

---

## 📦 Duplicate Detection & Merging

The duplicate detector (`lib/duplicate-detection.ts`) calculates a **weighted similarity score** using:

- Email (35% weight) – exact match yields 1.0
- Normalized name (30%)
- Phone number (25%)
- Skills overlap (15%)
- Deep comparison of all profile fields and structured data (30%)

Pairs above a threshold (default 0.7) are flagged as potential duplicates. Users can **select two or more** and merge them; the merge logic combines experiences, education, and skills from both while keeping the primary contact info.

---

## 📊 Dashboard Highlights

The **Recruiter Command Center** (`/dashboard`) provides an at‑a‑glance view:

- **Metrics cards** – jobs, applicants, screenings count
- **Latest screening activity** – quick status of recent runs
- **Shortlisted / Unshortlisted columns** – paginated, clickable for instant preview
- **Candidate preview drawer** – full applicant data with AI insight card

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Write TypeScript – no `any` unless unavoidable.
- Keep components small and focused.
- Use RTK Query for all API calls; avoid direct `fetch`.
- Add clear JSDoc comments to complex functions.
- Test the Gemini prompt changes against a variety of profile shapes.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

```