# 📚 Batch JSON Import Guide

## Overview

The applicant system now supports **two modes** for JSON imports:
- **👤 Single Profile** - Import one applicant at a time (best for manual entry or editing)
- **👥 Batch Import** - Import multiple applicants in one action (best for bulk uploads)

---

## Single Profile Mode

### Use Cases
- Adding a new individual applicant
- Editing an existing profile
- Testing the schema with one record

### Format
Paste a **single JSON object** (not an array):

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "headline": "Senior Software Engineer",
  "skills": [
    { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 },
    { "name": "React", "level": "Advanced", "yearsOfExperience": 4 }
  ],
  "experience": [
    {
      "company": "Tech Corp",
      "role": "Senior Engineer",
      "startDate": "2020-01",
      "endDate": "Present",
      "description": "Led team of 5 engineers",
      "technologies": ["TypeScript", "React", "Node.js"],
      "isCurrent": true
    }
  ],
  "education": [
    {
      "institution": "MIT",
      "degree": "BS Computer Science",
      "fieldOfStudy": "Computer Science",
      "startYear": 2014,
      "endYear": 2018
    }
  ],
  "languages": [
    { "name": "English", "proficiency": "Native" },
    { "name": "Spanish", "proficiency": "Fluent" }
  ],
  "availability": {
    "status": "Available",
    "type": "Full-time",
    "startDate": "2024-06-01"
  },
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/janedoe",
    "github": "https://github.com/janedoe",
    "portfolio": "https://janedoe.dev"
  }
}
```

### Steps
1. Click "👤 Single Profile" button
2. Paste or type JSON
3. Click "💾 Save Profile"
4. Success message shows when saved

---

## Batch Import Mode

### Use Cases
- Importing hundreds of applicants from another system
- Bulk loading from a data export
- Testing multiple profiles at once
- Migrating data between systems

### Format
Paste a **JSON array** of objects:

```json
[
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "skills": [
      { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 },
      { "name": "React", "level": "Advanced" }
    ],
    "experience": [
      {
        "company": "Tech Corp",
        "role": "Senior Engineer",
        "startDate": "2020-01",
        "endDate": "Present"
      }
    ]
  },
  {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "skills": [
      { "name": "Python", "level": "Advanced" },
      { "name": "Django", "level": "Advanced" }
    ],
    "experience": [
      {
        "company": "StartUp Inc",
        "role": "Full-Stack Developer",
        "startDate": "2021-06",
        "endDate": "Present"
      }
    ]
  },
  {
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice@example.com",
    "skills": [
      { "name": "Java", "level": "Expert" },
      { "name": "Spring Boot", "level": "Expert" }
    ]
  }
]
```

### Steps
1. Click "👥 Batch Import" button
2. Paste JSON array
3. (Optional) Click "✓ Validate JSON" to check format
4. Click "💾 Import Batch"
5. Progress message shows count of imported applicants

### Validation
- System auto-detects if input is array or single object
- If array: imports all applicants in batch
- If single object: imports as one applicant
- Error handling for invalid JSON with helpful messages

---

## Batch Import Examples

### Example 1: Minimal Batch (3 applicants)
```json
[
  {
    "firstName": "Alice",
    "email": "alice@company.com",
    "skills": [{ "name": "Python" }, { "name": "SQL" }]
  },
  {
    "firstName": "Bob",
    "email": "bob@company.com",
    "skills": [{ "name": "JavaScript" }, { "name": "React" }]
  },
  {
    "firstName": "Charlie",
    "email": "charlie@company.com",
    "skills": [{ "name": "Java" }, { "name": "Spring" }]
  }
]
```

### Example 2: Mixed Detail Levels
```json
[
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "headline": "Senior Full-Stack Engineer",
    "skills": [
      { "name": "TypeScript", "level": "Expert", "yearsOfExperience": 5 },
      { "name": "React", "level": "Advanced", "yearsOfExperience": 4 },
      { "name": "Node.js", "level": "Advanced", "yearsOfExperience": 4 }
    ],
    "experience": [
      {
        "company": "TechCorp",
        "role": "Senior Engineer",
        "startDate": "2020-01",
        "endDate": "Present",
        "technologies": ["TypeScript", "React", "Node.js"]
      },
      {
        "company": "StartupXYZ",
        "role": "Full-Stack Developer",
        "startDate": "2018-06",
        "endDate": "2019-12",
        "technologies": ["JavaScript", "Python", "React"]
      }
    ],
    "education": [
      {
        "institution": "Stanford University",
        "degree": "BS Computer Science",
        "startYear": 2014,
        "endYear": 2018
      }
    ]
  },
  {
    "firstName": "John",
    "email": "john@example.com",
    "skills": [{ "name": "Java" }, { "name": "Spring Boot" }]
  }
]
```

---

## Automatic Format Detection

The system is **smart about format detection**:

✅ **This is treated as BATCH** (array):
```json
[
  { "firstName": "Alice", "email": "alice@company.com" },
  { "firstName": "Bob", "email": "bob@company.com" }
]
```

✅ **This is treated as SINGLE** (object):
```json
{
  "firstName": "Alice",
  "email": "alice@company.com"
}
```

✅ **This works in SINGLE mode** (auto-wrapped):
```json
{
  "firstName": "Alice",
  "email": "alice@company.com"
}
```

✅ **This works in BATCH mode** (auto-detected):
```json
[{ "firstName": "Alice", "email": "alice@company.com" }]
```

---

## Data Requirements

### Minimum Required Field
- `email` - All other fields are optional

### Auto-Generated Defaults
- `firstName` → extracted from name or generated
- `lastName` → extracted from name or generated
- `fullName` → generated if not provided
- `yearsOfExperience` → calculated from experience dates
- `source` → always "json"

### Date Formats Supported
- `"YYYY-MM"` for start/end dates (e.g., `"2024-01"`)
- `"Present"` for current positions
- `"MM/DD/YYYY"` (automatically converted)

### Enum Values

**Skill Levels**:
- `Beginner`, `Intermediate`, `Advanced`, `Expert`
- (system normalizes: "junior" → "Beginner", "senior" → "Advanced", etc.)

**Language Proficiency**:
- `Basic`, `Conversational`, `Fluent`, `Native`

**Availability Status**:
- `Available`, `Open to Opportunities`, `Not Available`

**Employment Type**:
- `Full-time`, `Part-time`, `Contract`

---

## Batch Import Workflow

### Step 1: Prepare Data
- Export from CSV/Excel/database
- Convert to JSON array
- Or paste multiple JSON objects as array

### Step 2: Switch to Batch Mode
- Click "👥 Batch Import" button
- Textarea placeholder updates to show array format

### Step 3: Validate (Optional)
- Click "✓ Validate JSON" button
- System checks JSON syntax and format
- Shows count of applicants found

### Step 4: Import
- Click "💾 Import Batch"
- System processes all applicants
- Success message shows count imported
- Table updates with new applicants

### Step 5: Review
- New applicants appear in table
- Check for duplicates (yellow highlights)
- Merge any duplicates as needed

---

## Error Handling

### Invalid JSON
```
❌ "Invalid JSON format. Please paste a valid JSON object or array of objects."
```
**Solution**: Check syntax at jsonlint.com

### Empty Array
```
❌ "No valid applicants found in JSON."
```
**Solution**: Ensure array has at least one valid object

### Missing Email
```
⚠️ System generates: "firstname.lastname@unknown.local"
```
**Solution**: Add emails or accept generated ones

### Invalid Dates
```
⚠️ System skips invalid dates, uses calculated values
```
**Supported formats**:
- `2024-01` (YYYY-MM) ✅
- `01/15/2024` (MM/DD/YYYY) ✅
- `01-15-2024` (MM-DD-YYYY) ✅
- `2024/01/15` ❌ Not supported

### Duplicate Emails
```
⚠️ System updates existing applicant or creates new
```
**Solution**: Review duplicates panel after import

---

## Best Practices

### 1. **Validate Before Importing**
```json
// ✅ GOOD - Simple & clear
[
  {
    "firstName": "Alice",
    "email": "alice@company.com",
    "skills": [{ "name": "Python" }]
  }
]

// ❌ AVOID - Too complex on first import
[{ "firstName": "Alice", "email": "alice@company.com", "profileData": {...} }]
```

### 2. **Use Consistent Date Formats**
```json
// ✅ GOOD - All YYYY-MM
"startDate": "2024-01"
"endDate": "Present"

// ❌ AVOID - Mixed formats
"startDate": "01/15/2024"
"endDate": "2024-06"
```

### 3. **Batch Size Recommendations**
- **Small batches**: 10-50 applicants (fast processing)
- **Medium batches**: 50-500 applicants (few seconds)
- **Large batches**: 500+ applicants (consider splitting)

### 4. **Test with Sample First**
```json
// First: Test 1-2 profiles to ensure format
[
  {
    "firstName": "Test",
    "email": "test@company.com",
    "skills": [{ "name": "JavaScript" }]
  }
]

// Then: Import full batch after validation
```

### 5. **Review Duplicates After Import**
- System auto-detects potential duplicates
- Check "🔍 Duplicates" button
- Merge or delete as needed

---

## CSV to JSON Conversion

### Method 1: Manual in Excel
1. Export CSV from source
2. Copy column headers
3. Manually create JSON array
4. Fill in values

### Method 2: Online Tools
- https://csvjson.com
- Convert CSV → JSON → Paste into Batch mode

### Method 3: Script
```python
import csv
import json

with open('applicants.csv') as f:
    data = json.dumps(list(csv.DictReader(f)))
    print(data)  # Paste result into Batch mode
```

---

## Switching Between Modes

### Single → Batch
1. Click "👥 Batch Import" button
2. Clear textarea
3. Paste array of applicants
4. Click "💾 Import Batch"

### Batch → Single
1. Click "👤 Single Profile" button
2. Clear textarea
3. Paste single object
4. Click "💾 Save Profile"

### Editing a Profile
- Click "Edit" on table row
- Loads profile in Single mode
- Make changes
- Click "✏️ Update Profile"

---

## Performance Notes

- **Batch validation**: Instant (just checks JSON syntax)
- **Batch import**: ~0.1s per applicant
- **100 applicants**: ~10 seconds
- **1000 applicants**: ~100 seconds

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid JSON" | Check syntax at jsonlint.com |
| Array not recognized | Ensure square brackets `[]` at start/end |
| Some fields ignored | Check field names match schema |
| Dates not parsing | Use `YYYY-MM` format for work dates |
| Duplicates detected | Review & merge in duplicates panel |
| Import slow | Try smaller batches (100-500 at a time) |

---

## Schema Reference

For full schema documentation, see: `APPLICANT_QUICK_REFERENCE.md`

### Quick Reference
```typescript
interface StructuredProfile {
  firstName?: string
  lastName?: string
  email: string                    // Required
  headline?: string
  bio?: string
  location?: string
  skills?: Skill[]
  languages?: Language[]
  experience?: Experience[]
  education?: Education[]
  certifications?: Certification[]
  projects?: Project[]
  availability?: Availability
  socialLinks?: SocialLinks
}
```
