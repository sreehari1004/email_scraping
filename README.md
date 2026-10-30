# Website Contact Information Scraper

A modern web application for extracting, managing, analyzing, exporting, and reaching out to website contacts at scale.

Built in accordance with the project specification and UI design mockups.

---

## Key Modules & Features

### 1. Home (URL Submission)
- **Single URL**: Direct entry with instant validation.
- **Bulk URLs**: Multi-line entry with duplicate detection and URL normalization.
- **File Upload**: Native ingestion of **CSV**, **Excel (.xlsx, .xls)**, and **PDF** documents with automated regex URL extraction.

### 2. Scraping in Progress
- Real-time progress percentage bar.
- Live stat counters: Total Websites, Completed, Failed, In Progress.
- Real-time activity table showing crawled domains and contact counts.

### 3. History Management
- Centralized historical table of all previous jobs.
- Search by domain, contact person, or email.
- Date filters: *Today*, *Last 7 days*, *Last 30 days*, *All time*.
- Status filters: *Completed*, *Failed*, *In Progress*.
- **Job Details Modal**:
  - Detailed tabs for **Contacts**, **Website Details**, and **Summary**.
  - Direct URL copy to clipboard.
  - CSV & Excel export capabilities.
- Bulk selection & deletion with confirmation.

### 4. Analytics Dashboard
- 4 Key Metrics with 7-day trend indicators:
  - Total Websites Scraped
  - Unique Contacts Found
  - Email Addresses
  - Phone Numbers
- **Website Status Chart**: Donut chart with breakdown of Completed, Failed, Partial, and In Progress percentages.
- **Scraping Activity Chart**: Bar chart of websites processed over time.

### 5. Email Outreach & AI Content Generation
- **Recipient Management**: Single or Bulk outreach list.
- **AI-Powered Email Generator**: Converts brief user notes into tailored B2B outreach subjects and bodies with personalization tokens (`{{contact_name}}`, `{{company_name}}`, `{{email}}`).
- **Rich Text Controls**: Formatting toolbar with personalization dropdown.
- **Email Preview**: Live preview resolving company and contact tags.
- **Outreach Logs**: Tracks status (*Sent*, *In Progress*, *Completed*, *Failed*) and timestamps.

### 6. Automated Email Notifications & Settings
- Configure report recipients.
- Trigger automatic delivery of extraction reports (CSV/Excel) upon job completion.
- Configurable alerts on restricted or failed domains.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.11, FastAPI, Uvicorn, BeautifulSoup4, Requests, openpyxl, pypdf, SQLite.
- **AI**: Gemini 1.5 Flash integration with intelligent contextual copywriting engine fallback.

---

## Quick Start Guide

### 1. Start the Unified Server (Backend & Frontend)
Run with the provided virtual environment:
```powershell
.\venv\Scripts\python.exe run.py
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

### 2. Run Frontend in Development Mode (Optional)
If you want hot-reloading on the frontend:
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

