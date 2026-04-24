# Umurava TalentScreen AI

Production-ready AI talent screening SaaS built for recruiter workflows and hackathon judging.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 (fully custom components)
- Redux Toolkit + RTK Query
- MongoDB Atlas + Mongoose
- Google Gemini (`gemini-2.0-flash`) for candidate ranking

## Product Features

- Collapsible recruiter sidebar (`Dashboard`, `Jobs`, `Applicants`, `Screenings`)
- Job management (create, edit, list, delete)
- Applicant ingestion:
  - Structured talent profile JSON
  - CSV upload
  - Excel upload
  - PDF resume upload (auto-extract text)
- AI screening engine:
  - One prompt that evaluates all applicants at once
  - Returns ranked top 10 or top 20
  - Candidate score (0-100), strengths, gaps/risks, explanation
- Dashboard KPIs + screening activity
- Shortlist UX with candidate detail modal
- Loading skeletons for AI feedback

## Architecture

- `app/` route handlers and pages (App Router)
- `components/` custom UI and shell components
- `lib/` database, Gemini client, models, shared utilities
- `redux/` global store, RTK Query API service, UI slice

### AI Flow

1. Recruiter creates job and ingests applicants.
2. Recruiter clicks `Top 10` or `Top 20` on a job card.
3. Backend creates `processing` screening record in MongoDB.
4. Server builds one Gemini prompt including the job + every candidate.
5. Gemini returns strict JSON ranking + reasoning.
6. Screening updates to `completed` and UI re-renders from RTK Query cache.

## Environment Variables

Copy `.env.example` to `.env.local` and set:

- `MONGODB_URI` - MongoDB Atlas connection string
- `GEMINI_API_KEY` - Google Gemini API key

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
The app redirects to `/dashboard`.

## API Endpoints

- `GET/POST /api/jobs`
- `PUT/DELETE /api/jobs/:id`
- `GET/POST /api/applicants`
- `POST /api/applicants/bulk`
- `POST /api/applicants/upload-resumes`
- `GET /api/screenings`
- `POST /api/screenings/run`
- `GET /api/dashboard/summary`

## Deployment Notes

- Deploy to Vercel or any Node-compatible host.
- Set environment variables in deployment platform.
- Use MongoDB Atlas network access rules to allow your deployment IP.

## Current Limitations

- PDF profile parsing infers candidate identity from filename when metadata is missing.
- AI ranking quality depends on the richness of applicant data.
- For very large applicant sets, consider batching and queue-based execution.
