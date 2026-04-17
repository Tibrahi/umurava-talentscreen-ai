# 🎯 Quick Reference - Applicant System

## Schema Blueprint (Canonical Format)

```typescript
interface StructuredProfile {
  firstName?: string
  lastName?: string
  email: string                          // Required
  headline?: string
  bio?: string
  location?: string
  
  skills?: Skill[]                       // { name, level?, yearsOfExperience? }
  languages?: Language[]                 // { name, proficiency? }
  experience?: Experience[]              // { company, role, startDate, endDate, ... }
  education?: Education[]                // { institution, degree, fieldOfStudy, ... }
  certifications?: Certification[]       // { name, issuer, issueDate }
  projects?: Project[]                   // { name, description, technologies, link, ... }
  availability?: Availability            // { status, type, startDate }
  socialLinks?: SocialLinks              // { linkedin, github, portfolio }
}
```

## Input Formats Supported

### 1. JSON (Structured)
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "skills": [
    { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 }
  ]
}
```

### 2. CSV (Flat or Indexed)
```csv
firstName,email,skills[0].name,skills[0].level,experience[0].company
Jane,jane@example.com,TypeScript,Expert,Tech Corp
```

### 3. Excel (Same as CSV)
Supports both flat and indexed column names

### 4. PDF Resumes
Uploaded and parsed server-side

---

## Enum Values

### Skill Levels
- `Beginner`
- `Intermediate`
- `Advanced`
- `Expert`

### Language Proficiency
- `Basic`
- `Conversational`
- `Fluent`
- `Native`

### Availability Status
- `Available`
- `Open to Opportunities`
- `Not Available`

### Employment Type
- `Full-time`
- `Part-time`
- `Contract`

---

## Date Formats

All dates are normalized:
- **Work/Projects**: `YYYY-MM` (e.g., `2024-01`)
- **Availability**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Current/Ongoing**: `"Present"` or `"Current"`

---

## UI Features

### Table View
| Feature | Description |
|---------|-------------|
| ☑️ Checkbox | Batch select applicants |
| 📊 Experience | Years badge |
| 🛠️ Skills | First 2 + count of others |
| 📌 Source | JSON/CSV/Excel/PDF badge |
| 🟢 Status | ✅ Structured / ⚠️ Basic / 🔗 Duplicate |

### Batch Operations
- **🔗 Merge** - Consolidate 2+ selected applicants
- **🗑️ Delete** - Remove selected applicants
- **Select All** - Toggle all applicants

### Duplicate Detection
- **🔍 [N] Duplicates** - Shows potential duplicates
- **⚠️ Yellow Panel** - Lists groups with similarity scores
- **Checkbox Selection** - Mark duplicates for merge

### Profile Preview
- **📋 Basic Information** - Name, email, contact
- **💭 Professional Summary** - Headline, bio, location
- **🛠️ Skills** - With level badges
- **🗣️ Languages** - With proficiency
- **💼 Experience** - Timeline, description, tech stack
- **🎓 Education** - Degree, institution, field
- **📜 Certifications** - Issuer, date
- **🚀 Projects** - Links, technologies
- **📅 Availability** - Status, type, start date
- **🔗 Social Links** - Clickable URLs
- **ℹ️ Metadata** - Source, status, timestamps

---

## Common Workflows

### 1. Add Single Applicant
1. Select "📋 Structured JSON" tab
2. Paste JSON (or paste partial data - system fills defaults)
3. Click "💾 Save Profile"

### 2. Bulk Import from CSV
1. Select "📊 Upload CSV" tab
2. Choose file (supports flat or indexed columns)
3. System auto-normalizes and imports
4. Check 🔍 for duplicates

### 3. Merge Duplicates
1. System highlights duplicate groups
2. Click 🔍 button to view them
3. Check boxes for duplicates
4. Click "🔗 Merge" button
5. Primary data + merged secondaries = consolidated profile

### 4. Edit Profile
1. Click "Edit" button on row
2. System loads JSON in editor
3. Make changes following schema
4. Click "✏️ Update Profile"

### 5. Delete Multiple
1. Check boxes for applicants
2. Click "🗑️ Delete" button
3. Confirm deletion

---

## Field Aliasing (Auto-Detection)

The system recognizes these alternative names:

| Standard | Also Accepts |
|----------|--------------|
| `firstName` | `first_name`, `FirstName`, `First Name` |
| `lastName` | `last_name`, `LastName`, `Last Name` |
| `email` | `Email`, `EMAIL` |
| `headline` | `title`, `Title`, `job_title` |
| `bio` | `summary`, `Summary`, `bio`, `Bio` |
| `location` | `Location`, `city`, `City` |
| `startDate` | `start_date`, `Start Date`, `from` |
| `endDate` | `end_date`, `End Date`, `to` |
| `yearsOfExperience` | `experience`, `Experience`, `experienceYears` |
| `technologies` | `tech_stack`, `skills_used`, `tech` |
| `isCurrent` | `current`, `is_current` |

---

## System Handling

### What Gets Auto-Detected
✅ Field types (string, number, array, object)
✅ Date formats (YYYY-MM, MM/DD/YYYY, Present)
✅ Enum values (normalizes "junior" → "Beginner")
✅ Array separators (comma-separated strings)
✅ Field names (recognizes common aliases)
✅ Nested structures (experience[], skills[], etc.)

### What Gets Normalized
✅ Names (splits "Jane Doe" → firstName/lastName)
✅ Dates (various formats → YYYY-MM)
✅ Levels (natural language → standard enums)
✅ Emails (lowercased, validated)
✅ Skills (deduplicated, level detected)
✅ Experience (years calculated from dates)

### What Gets Preserved
✅ Structured profile (canonical format)
✅ Raw input data (in profileData.raw)
✅ Source metadata (json/csv/excel/pdf)
✅ Timestamps (created, updated)
✅ Duplicate references (duplicateOf, isDuplicate)

---

## Database Fields

### Flat Fields (For Querying)
- `fullName` - Combined name
- `email` - Unique index
- `skills` - String array for searching
- `yearsOfExperience` - Number for filtering
- `education` - Flattened text
- `summary` - Full text searchable
- `source` - Query by import type

### Rich Fields (For Display)
- `structuredProfile` - Complete canonical format
- `profileData` - Raw + metadata
- `isDuplicate` - Boolean flag
- `duplicateOf` - Reference to primary

### Indexes
- `email` (unique)
- `isDuplicate` (for duplicate queries)
- `duplicateOf` (for relationship queries)

---

## Error Handling

| Error | Solution |
|-------|----------|
| Invalid JSON | Check format matches schema |
| Missing email | System generates from name |
| Invalid date | Supported formats: YYYY-MM, MM/DD/YYYY, "Present" |
| Unknown enum | System uses closest match or omits field |
| Duplicate email | System prompts for merge or update |
| CSV parsing error | Verify column names are correct |

---

## Performance Notes

- Duplicate detection runs on 0.7 similarity threshold
- Levenshtein distance calculated only when needed
- Email exact match detected first (fastest)
- Memoized similarity scores during batch operations
- Indexes on key fields for fast queries

---

## Extension Points

To add new profile fields:

1. Update `StructuredProfile` interface in `lib/types.ts`
2. Add parser function in `lib/normalize-applicant.ts`
3. Call parser in `buildStructuredProfile()`
4. Update preview sections in applicants page
5. Add to example JSON placeholders

Example:
```typescript
// Add to interface
websites?: Website[]

// Add interface
interface Website {
  name: string
  url: string
  primary?: boolean
}

// Add parser
function parseWebsites(webData: unknown): Website[] { ... }

// Use it
export function buildStructuredProfile(raw) {
  return {
    // ... existing
    websites: parseWebsites(raw.websites)
  }
}
```

---

## Duplicate Scoring

Similarity calculated across:
- **Email** (40%): Exact match = 100%
- **Name** (35%): Levenshtein normalized
- **Phone** (25%): Numeric comparison
- **Skills** (10%): Jaccard similarity

Default merge threshold: **0.7** (70% match)

---

## Tips & Tricks

✅ Use indexed columns for cleaner CSV: `skills[0].name` instead of multiple columns
✅ Upload PDFs first, then verify parsed data
✅ Review duplicates before merging to ensure correct primary
✅ Skills levels auto-detected: "senior" → "Advanced"
✅ Dates accept "Present" for current positions
✅ Use "%" in SQL queries on flattened fields
✅ Filter by isDuplicate=true to review merges
✅ Export structured profiles for external processing
