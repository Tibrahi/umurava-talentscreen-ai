# ⚡ Quick Start Guide

## 🚀 What's Ready to Use

Your applicant data system is **fully implemented and ready**. Here's what you can do right now:

---

## 1️⃣ Add New Applicants

### Via JSON
1. Go to Applicants page
2. Click "📋 Structured JSON"
3. Paste JSON:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "headline": "Senior Software Engineer",
  "location": "San Francisco, CA",
  "skills": [
    {
      "name": "React",
      "level": "Expert",
      "yearsOfExperience": 5
    },
    {
      "name": "Node.js",
      "level": "Advanced",
      "yearsOfExperience": 3
    }
  ],
  "experience": [
    {
      "company": "Tech Corp",
      "role": "Senior Engineer",
      "startDate": "2020-01",
      "endDate": "Present",
      "description": "Led frontend team of 5 engineers",
      "technologies": ["React", "TypeScript", "GraphQL"],
      "isCurrent": true
    }
  ],
  "education": [
    {
      "institution": "MIT",
      "degree": "BS Computer Science",
      "fieldOfStudy": "Computer Science",
      "startYear": 2016,
      "endYear": 2020
    }
  ],
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/john-doe",
    "github": "https://github.com/johndoe",
    "portfolio": "https://johndoe.dev"
  }
}
```
4. Click "💾 Save Profile"
5. Done! ✅

### Via CSV/Excel/PDF
1. Click appropriate tab
2. Upload file
3. Data auto-imported and formatted

---

## 2️⃣ View Applicant Profile

1. Find applicant in table
2. Click on row
3. Beautiful modal opens with:
   - Name & headline
   - Contact info
   - Social links
   - Skills with levels
   - Work experience timeline
   - Education
   - Certifications
   - Projects
   - Languages
   - Availability status
4. Click ✕ to close

---

## 3️⃣ Migrate Old Data (if needed)

### Automatic (Default)
- Simply view old applicant
- Profile auto-migrates on first load
- You won't notice anything - it just works

### Manual Batch Migration
1. Go to Applicants page
2. Look for "Data Migration Available" panel
3. Click "Run Migration"
4. See results: successful/failed counts
5. Done! ✅

---

## 📝 Complete Data Format

All these fields are supported:

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string (required)",
  "headline": "string",
  "bio": "string",
  "location": "string",
  "phone": "string",
  
  "skills": [
    {
      "name": "string (required)",
      "level": "Beginner|Intermediate|Advanced|Expert",
      "yearsOfExperience": "number (0-80)"
    }
  ],
  
  "languages": [
    {
      "name": "string",
      "proficiency": "Basic|Conversational|Fluent|Native"
    }
  ],
  
  "experience": [
    {
      "company": "string (required)",
      "role": "string (required)",
      "startDate": "YYYY-MM (required)",
      "endDate": "YYYY-MM or 'Present'",
      "description": "string",
      "technologies": ["string"],
      "isCurrent": "boolean"
    }
  ],
  
  "education": [
    {
      "institution": "string (required)",
      "degree": "string",
      "fieldOfStudy": "string",
      "startYear": "number (1900-2050)",
      "endYear": "number (1900-2050)"
    }
  ],
  
  "certifications": [
    {
      "name": "string (required)",
      "issuer": "string",
      "issueDate": "YYYY-MM"
    }
  ],
  
  "projects": [
    {
      "name": "string (required)",
      "description": "string",
      "technologies": ["string"],
      "role": "string",
      "link": "string (URL)",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM"
    }
  ],
  
  "availability": {
    "status": "Available|Open to Opportunities|Not Available",
    "type": "Full-time|Part-time|Contract",
    "startDate": "YYYY-MM-DD"
  },
  
  "socialLinks": {
    "linkedin": "string (URL)",
    "github": "string (URL)",
    "portfolio": "string (URL)"
  }
}
```

---

## ✅ Validation Rules

Your data will be validated:

| Field | Rule |
|-------|------|
| email | Must be valid format |
| skills[].yearsOfExperience | 0-80 years |
| experience[].startDate | YYYY-MM format |
| education[].startYear | Valid year |
| socialLinks | Valid URLs |

If validation fails, you'll see clear error messages with field names.

---

## 🔧 API Endpoints (for developers)

### Create Applicant
```bash
POST /api/applicants
Content-Type: application/json

{
  "firstName": "John",
  "email": "john@example.com",
  ...
}
```

### List All
```bash
GET /api/applicants
```

### Get One (auto-migrates)
```bash
GET /api/applicants/:id
```

### Update
```bash
PUT /api/applicants/:id
Content-Type: application/json

{ /* same format as create */ }
```

### Delete
```bash
DELETE /api/applicants/:id
```

### Batch Migrate
```bash
POST /api/applicants/migrate
```

---

## 📊 What Happens Behind the Scenes

1. **Data Ingestion**
   - Your data is received and validated
   - All fields are parsed and normalized
   - Structured profile created
   - Original input preserved

2. **Database Storage**
   - Full structured profile saved
   - Flat fields indexed for quick search
   - Original raw data kept for recovery
   - Timestamps auto-added

3. **Display**
   - Data fetched from database
   - All sections rendered with formatting
   - Dates formatted human-readable
   - Technologies shown as badges
   - Skills color-coded by level

---

## 🎯 Common Tasks

### Add a New Applicant
1. Paste JSON → Save Profile

### View Applicant Details
1. Click row in table → See beautiful modal

### Update Applicant Info
1. (Feature coming) Edit form with validation

### Search Applicants
1. (Use existing search functionality)

### Export Applicant Data
1. (Can use API to fetch JSON)

---

## 🆘 Troubleshooting

### "Error Loading Profile"
- Go to Applicants page
- Click "Run Migration" button
- Modal will work after migration

### Invalid JSON Error
- Check JSON format
- Ensure valid structure
- Must have at least email field

### Validation Error on Save
- Check error message for field name
- Fix the specific field
- Try again

### Data Not Showing
- Refresh page
- Check browser console for errors
- Verify MongoDB is running

---

## 📚 Learn More

- **Complete Schema**: `APPLICANT_DATA_SYSTEM.md`
- **Migration Guide**: `DATA_MIGRATION_FIX.md`
- **Full Implementation**: `IMPLEMENTATION_COMPLETE.md`

---

## 🎉 You're All Set!

Start using the system:
1. Go to Applicants page
2. Add some test data
3. Click on applicants to view
4. See the beautiful profile modal
5. Enjoy! 🚀

Everything is working, validated, and ready to go! ✨
