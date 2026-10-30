import io
import os
import re
import json
import csv
import threading
import time
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import openpyxl

from database import init_db, get_connection
from file_parser import parse_csv_file, parse_excel_file, parse_pdf_file, clean_and_deduplicate
from scraper import scrape_url
from ai_service import generate_email_content
from email_sender import get_smtp_config, test_smtp_connection, send_smtp_email

# Initialize Database
init_db()

app = FastAPI(title="Website Contact Information Scraper API")

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------
class StartScrapeRequest(BaseModel):
    urls: List[str]

class GenerateEmailRequest(BaseModel):
    prompt: str
    company_name: Optional[str] = ""
    contact_name: Optional[str] = ""

class SendEmailRequest(BaseModel):
    recipients: List[dict] # [{"company_name": "", "email": ""}]
    subject: str
    body: str

class SettingsUpdateRequest(BaseModel):
    notification_email: str
    notify_on_complete: bool
    notify_on_failure: bool

# ----------------- Helper Background Worker -----------------
def run_scrape_job(batch_id: int, url_job_pairs: List[Tuple[str, int]]):
    conn = get_connection()
    cursor = conn.cursor()

    total = len(url_job_pairs)
    completed_count = 0
    failed_count = 0
    total_contacts = 0

    for url, job_id in url_job_pairs:
        site_start = time.time()
        parsed_domain = url.split("://")[-1].split("/")[0]

        # Insert initial in-progress record for this website
        cursor.execute("""
            INSERT INTO job_websites (job_id, website, url, status, contacts_count, last_updated, error_message)
            VALUES (?, ?, ?, 'In Progress', 0, 'Just now', '')
        """, (job_id, parsed_domain, url))
        conn.commit()
        site_id = cursor.lastrowid

        # Perform scraping
        result = scrape_url(url)
        contacts = result.get("contacts", [])
        status = result.get("status", "Completed")
        error_msg = result.get("error_message", "")
        contacts_count = len(contacts)

        if status == "Completed":
            completed_count += 1
        else:
            failed_count += 1
        total_contacts += contacts_count

        # Update job_websites for this site
        cursor.execute("""
            UPDATE job_websites
            SET status = ?, contacts_count = ?, last_updated = 'Just now', error_message = ?
            WHERE id = ?
        """, (status, contacts_count, error_msg, site_id))

        # Insert contacts strictly under this website's job_id
        for c in contacts:
            cursor.execute("""
                INSERT INTO contacts (job_id, website_id, name, email, phone, designation, source_url, company_name, address, social_links, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id,
                site_id,
                c.get("name", ""),
                c.get("email", ""),
                c.get("phone", ""),
                c.get("designation", ""),
                c.get("source_url", url),
                result.get("company_name", parsed_domain),
                ", ".join(result.get("addresses", [])),
                json.dumps(result.get("social_links", [])),
                datetime.now().isoformat()
            ))

        site_elapsed = int(time.time() - site_start)
        hours, rem = divmod(site_elapsed, 3600)
        minutes, seconds = divmod(rem, 60)
        site_duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        # Update this specific job row
        cursor.execute("""
            UPDATE jobs
            SET status = ?, completed_websites = ?, failed_websites = ?, in_progress_websites = 0, contacts_found = ?, duration = ?
            WHERE id = ?
        """, (
            status,
            1 if status == "Completed" else 0,
            1 if status == "Failed" else 0,
            contacts_count,
            site_duration_str,
            job_id
        ))
        conn.commit()

    conn.close()

# ----------------- Endpoints -----------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Website Contact Information Scraper"}

# --- 1. Home / Scraping Endpoints ---

@app.post("/api/scrape/upload")
async def upload_file_urls(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".csv"):
        urls = parse_csv_file(content)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        urls = parse_excel_file(content)
    elif filename.endswith(".pdf"):
        urls = parse_pdf_file(content)
    else:
        # Fallback to plain text
        text = content.decode("utf-8", errors="ignore")
        urls = clean_and_deduplicate(text.splitlines())

    return {
        "filename": file.filename,
        "count": len(urls),
        "urls": urls
    }

def normalize_site_domain(url_or_name: str) -> str:
    m = re.search(r'([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', url_or_name)
    if m:
        return m.group(1).lower().replace("www.", "").strip()
    return url_or_name.lower().replace("www.", "").strip()

@app.post("/api/scrape/start")
def start_scrape(req: StartScrapeRequest, background_tasks: BackgroundTasks):
    urls = clean_and_deduplicate(req.urls)
    if not urls:
        raise HTTPException(status_code=400, detail="No valid URLs provided")

    conn = get_connection()
    cursor = conn.cursor()

    batch_id = int(time.time() * 1000)
    now_str = datetime.now().strftime("%b %d, %Y %I:%M %p")
    url_job_pairs = []

    # Prevent duplication in history:
    # If any website being scraped already exists in a previous job, remove the older record(s)
    for url in urls:
        dom = normalize_site_domain(url)
        parsed_domain = url.split("://")[-1].split("/")[0]
        site_name = parsed_domain if parsed_domain else dom

        if dom:
            # Find jobs matching this domain
            cursor.execute("""
                SELECT id FROM jobs 
                WHERE LOWER(job_name) LIKE ? OR EXISTS (
                    SELECT 1 FROM job_websites jw WHERE jw.job_id = jobs.id AND LOWER(jw.website) LIKE ?
                )
            """, (f"%{dom}%", f"%{dom}%"))
            old_job_ids = [r[0] for r in cursor.fetchall()]
            if old_job_ids:
                placeholders = ",".join("?" * len(old_job_ids))
                cursor.execute(f"DELETE FROM contacts WHERE job_id IN ({placeholders})", old_job_ids)
                cursor.execute(f"DELETE FROM job_websites WHERE job_id IN ({placeholders})", old_job_ids)
                cursor.execute(f"DELETE FROM jobs WHERE id IN ({placeholders})", old_job_ids)
                conn.commit()

        # Insert individual job for each website
        cursor.execute("""
            INSERT INTO jobs (job_name, created_at, status, total_websites, completed_websites, failed_websites, in_progress_websites, contacts_found, duration, batch_id)
            VALUES (?, ?, 'In Progress', 1, 0, 0, 1, 0, '00:00:00', ?)
        """, (site_name, now_str, batch_id))
        conn.commit()
        site_job_id = cursor.lastrowid
        url_job_pairs.append((url, site_job_id))

    conn.close()

    background_tasks.add_task(run_scrape_job, batch_id, url_job_pairs)

    return {"job_id": batch_id, "status": "In Progress", "total": len(urls)}

@app.get("/api/scrape/progress/{job_id}")
def get_job_progress(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE batch_id = ? OR id = ? ORDER BY id ASC", (job_id, job_id))
    matched_jobs = [dict(r) for r in cursor.fetchall()]
    if not matched_jobs:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    job_ids = [j["id"] for j in matched_jobs]
    placeholders = ",".join("?" * len(job_ids))
    cursor.execute(f"SELECT * FROM job_websites WHERE job_id IN ({placeholders}) ORDER BY id ASC", job_ids)
    websites = [dict(w) for w in cursor.fetchall()]

    # If any job in matched_jobs has not started scraping yet, provide queued placeholder
    seen_job_ids = {w["job_id"] for w in websites}
    for j in matched_jobs:
        if j["id"] not in seen_job_ids:
            websites.append({
                "id": j["id"],
                "job_id": j["id"],
                "website": j["job_name"],
                "url": f"https://{j['job_name']}",
                "status": j["status"],
                "contacts_count": j["contacts_found"],
                "last_updated": "Pending",
                "error_message": ""
            })

    conn.close()

    total = len(matched_jobs)
    completed = sum(1 for j in matched_jobs if j["status"] == "Completed")
    failed = sum(1 for j in matched_jobs if j["status"] == "Failed")
    in_progress = sum(1 for j in matched_jobs if j["status"] == "In Progress")
    total_contacts = sum(j["contacts_found"] for j in matched_jobs)
    percent = int(((completed + failed) / total) * 100) if total > 0 else 0
    overall_status = "In Progress" if in_progress > 0 else ("Completed" if completed > 0 else "Failed")

    first_job = matched_jobs[0]
    return {
        "job": {
            "id": job_id,
            "job_name": first_job["job_name"],
            "created_at": first_job["created_at"],
            "status": overall_status,
            "total_websites": total,
            "completed_websites": completed,
            "failed_websites": failed,
            "in_progress_websites": in_progress,
            "contacts_found": total_contacts,
            "duration": first_job.get("duration", "00:00:00")
        },
        "percent": percent,
        "websites": websites
    }

# --- 2. History Endpoints ---

@app.get("/api/history")
def get_history(
    search: Optional[str] = None,
    date_filter: Optional[str] = "Last 7 days",
    status_filter: Optional[str] = "All statuses",
    page: int = 1,
    limit: int = 5
):
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM jobs WHERE 1=1"
    params = []

    if search:
        query += " AND (job_name LIKE ? OR EXISTS (SELECT 1 FROM contacts c WHERE c.job_id = jobs.id AND (c.name LIKE ? OR c.email LIKE ? OR c.company_name LIKE ?)))"
        s_term = f"%{search}%"
        params.extend([s_term, s_term, s_term, s_term])

    if status_filter and status_filter != "All statuses":
        query += " AND status = ?"
        params.append(status_filter)

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    all_rows = [dict(r) for r in cursor.fetchall()]

    total_count = len(all_rows)
    start_idx = (page - 1) * limit
    paged_rows = all_rows[start_idx : start_idx + limit]

    conn.close()
    return {
        "jobs": paged_rows,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_count + limit - 1) // limit)
    }

# IMPORTANT: Static routes must be defined BEFORE path parameter routes like /api/history/{job_id}
@app.get("/api/history/export")
def export_contacts(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    job_id: Optional[int] = None,
    job_ids: Optional[str] = None
):
    conn = get_connection()
    cursor = conn.cursor()

    if job_ids:
        # Export only the selected jobs/companies
        parsed_ids = [int(i.strip()) for i in job_ids.split(",") if i.strip().isdigit()]
        if parsed_ids:
            placeholders = ",".join("?" * len(parsed_ids))
            cursor.execute(f"SELECT * FROM contacts WHERE job_id IN ({placeholders}) ORDER BY id ASC", parsed_ids)
        else:
            cursor.execute("SELECT * FROM contacts ORDER BY id DESC")
    elif job_id:
        cursor.execute("SELECT * FROM contacts WHERE job_id = ? ORDER BY id ASC", (job_id,))
    else:
        cursor.execute("SELECT * FROM contacts ORDER BY id DESC")

    contacts = [dict(c) for c in cursor.fetchall()]
    conn.close()

    headers = ["ID", "Email", "Phone", "Company Name", "Website"]
    if format == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Contacts"
        ws.append(headers)
        for c in contacts:
            ws.append([
                c.get("id"), c.get("email"), c.get("phone"),
                c.get("company_name"), c.get("source_url")
            ])
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=contacts.xlsx"}
        )
    else:
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(headers)
        for c in contacts:
            writer.writerow([
                c.get("id"), c.get("email"), c.get("phone"),
                c.get("company_name"), c.get("source_url")
            ])
        stream.seek(0)
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=contacts.csv"}
        )

@app.post("/api/history/bulk-delete")
def bulk_delete_jobs(req: dict):
    job_ids = req.get("job_ids", [])
    if not job_ids:
        return {"success": True, "count": 0}

    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(job_ids))
    cursor.execute(f"DELETE FROM contacts WHERE job_id IN ({placeholders})", job_ids)
    cursor.execute(f"DELETE FROM job_websites WHERE job_id IN ({placeholders})", job_ids)
    cursor.execute(f"DELETE FROM jobs WHERE id IN ({placeholders})", job_ids)
    conn.commit()
    conn.close()
    return {"success": True, "count": len(job_ids)}

@app.get("/api/history/{job_id}")
def get_job_details(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    job = cursor.fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    cursor.execute("SELECT * FROM contacts WHERE job_id = ? ORDER BY id ASC", (job_id,))
    contacts = [dict(c) for c in cursor.fetchall()]

    cursor.execute("SELECT * FROM job_websites WHERE job_id = ? ORDER BY id ASC", (job_id,))
    websites = [dict(w) for w in cursor.fetchall()]

    conn.close()
    return {
        "job": dict(job),
        "contacts": contacts,
        "websites": websites
    }

@app.delete("/api/history/{job_id}")
def delete_job(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contacts WHERE job_id = ?", (job_id,))
    cursor.execute("DELETE FROM job_websites WHERE job_id = ?", (job_id,))
    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": job_id}

# --- 3. Analytics Endpoints ---

@app.get("/api/analytics")
def get_analytics(period: str = "Last 7 days"):
    conn = get_connection()
    cursor = conn.cursor()

    # Get total websites
    cursor.execute("SELECT SUM(total_websites) as sum_total, SUM(completed_websites) as sum_comp, SUM(failed_websites) as sum_fail, SUM(in_progress_websites) as sum_prog FROM jobs")
    job_stats = cursor.fetchone()

    total_websites = job_stats["sum_total"] or 0
    completed = job_stats["sum_comp"] or 0
    failed = job_stats["sum_fail"] or 0
    in_progress = job_stats["sum_prog"] or 0
    partial = max(0, total_websites - (completed + failed + in_progress))

    # Get contacts stats
    cursor.execute("SELECT COUNT(*) as total_contacts, COUNT(DISTINCT email) as unique_emails, COUNT(DISTINCT phone) as unique_phones FROM contacts")
    c_stats = cursor.fetchone()

    unique_contacts = c_stats["total_contacts"] or 0
    email_count = c_stats["unique_emails"] or 0
    phone_count = c_stats["unique_phones"] or 0

    # Scraping activity timeline (last 7 days based on real activity)
    now = datetime.now()
    days_data = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        day_str = d.strftime("%b %d")
        cursor.execute("SELECT SUM(completed_websites) as cnt FROM jobs WHERE created_at LIKE ?", (f"%{day_str}%",))
        row = cursor.fetchone()
        days_data.append({"date": day_str, "count": row["cnt"] or 0})

    conn.close()

    comp_pct = round((completed / total_websites) * 100) if total_websites else 0
    fail_pct = round((failed / total_websites) * 100) if total_websites else 0
    part_pct = round((partial / total_websites) * 100) if total_websites else 0
    prog_pct = round((in_progress / total_websites) * 100) if total_websites else 0

    return {
        "kpis": {
            "total_websites": {"value": total_websites, "trend": "0% vs. previous 7 days" if total_websites == 0 else "+100% vs. previous 7 days"},
            "unique_contacts": {"value": unique_contacts, "trend": "0% vs. previous 7 days" if unique_contacts == 0 else "+100% vs. previous 7 days"},
            "email_addresses": {"value": email_count, "trend": "0% vs. previous 7 days" if email_count == 0 else "+100% vs. previous 7 days"},
            "phone_numbers": {"value": phone_count, "trend": "0% vs. previous 7 days" if phone_count == 0 else "+100% vs. previous 7 days"},
        },
        "website_status": {
            "total": total_websites,
            "completed": {"count": completed, "percent": comp_pct},
            "failed": {"count": failed, "percent": fail_pct},
            "partial": {"count": partial, "percent": part_pct},
            "in_progress": {"count": in_progress, "percent": prog_pct},
        },
        "activity_chart": days_data
    }

# --- 4. Email Outreach Endpoints ---

@app.get("/api/outreach/stats")
def get_outreach_stats():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM contacts")
    total_contacts = cursor.fetchone()["total"] or 0

    cursor.execute("SELECT COUNT(DISTINCT email) as avail FROM contacts WHERE email != '' AND email IS NOT NULL")
    avail_recipients = cursor.fetchone()["avail"] or 0

    cursor.execute("SELECT COUNT(*) as sent_count, SUM(CASE WHEN status = 'Completed' OR status = 'Sent' THEN 1 ELSE 0 END) as successful FROM outreach_logs")
    sent_row = cursor.fetchone()
    emails_sent = sent_row["sent_count"] or 0
    successful = sent_row["successful"] or 0
    success_rate = round((successful / emails_sent) * 100) if emails_sent > 0 else 0

    conn.close()
    return {
        "total_contacts": total_contacts,
        "available_recipients": avail_recipients,
        "emails_sent": emails_sent,
        "success_rate": success_rate
    }

@app.get("/api/outreach/logs")
def get_outreach_logs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM outreach_logs ORDER BY id DESC")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return logs

@app.post("/api/outreach/ai-generate")
def ai_generate_email(req: GenerateEmailRequest):
    result = generate_email_content(req.prompt, req.company_name, req.contact_name)
    return result

@app.post("/api/outreach/send")
def send_outreach_emails(req: SendEmailRequest):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%b %d, %Y %I:%M %p")

    results = []
    for r in req.recipients:
        company = r.get("company_name", "Target Organization")
        email = r.get("email", "")
        if not email:
            continue

        # Personalize subject & body
        p_subject = req.subject.replace("{{company_name}}", company).replace("{{contact_name}}", company).replace("{{email}}", email)
        p_body = req.body.replace("{{company_name}}", company).replace("{{contact_name}}", company).replace("{{email}}", email)

        # Attempt actual SMTP email send if configured
        smtp_success, smtp_msg = send_smtp_email(
            to_email=email,
            subject=p_subject,
            body_html=p_body.replace("\n", "<br>"),
            body_text=p_body
        )

        status = "Sent" if smtp_success else "Failed"
        error_details = "" if smtp_success else smtp_msg

        # Log to outreach_logs table
        cursor.execute("""
            INSERT INTO outreach_logs (company_name, email, subject, body, status, sent_on, error_details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (company, email, p_subject, p_body, status, now_str, error_details))

        results.append({
            "company": company, 
            "email": email, 
            "status": status,
            "error": error_details
        })

    conn.commit()
    conn.close()
    return {"success": True, "sent_count": len(results), "details": results}

@app.get("/api/outreach/company-lookup")
def company_lookup(name: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM contacts 
        WHERE company_name LIKE ? OR name LIKE ? OR email LIKE ?
        LIMIT 10
    """, (f"%{name}%", f"%{name}%", f"%{name}%"))
    results = [dict(c) for c in cursor.fetchall()]
    conn.close()
    return results

# --- 5. Settings Endpoints ---

@app.get("/api/settings")
def get_settings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings")
    rows = {r["key"]: r["value"] for r in cursor.fetchall()}
    conn.close()

    smtp_cfg = get_smtp_config()
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    return {
        "notification_email": rows.get("notification_email", "admin@company.com"),
        "notify_on_complete": rows.get("notify_on_complete", "true") == "true",
        "notify_on_failure": rows.get("notify_on_failure", "true") == "true",
        "ai_active": bool(gemini_key.strip()),
        # Public status info loaded from .env (no sensitive keys or passwords)
        "smtp_host": smtp_cfg["host"],
        "smtp_port": smtp_cfg["port"],
        "smtp_user": smtp_cfg["user"],
        "smtp_from_name": smtp_cfg["from_name"],
        "smtp_configured": smtp_cfg["configured"]
    }

@app.post("/api/settings")
def save_settings(req: SettingsUpdateRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('notification_email', ?)", (req.notification_email,))
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('notify_on_complete', ?)", ("true" if req.notify_on_complete else "false",))
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('notify_on_failure', ?)", ("true" if req.notify_on_failure else "false",))
    # Ensure sensitive credentials remain strictly in .env, not in database
    cursor.execute("DELETE FROM settings WHERE key IN ('smtp_password', 'gemini_api_key', 'smtp_user')")
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/settings/test-smtp")
def test_smtp_endpoint():
    cfg = get_smtp_config()
    if not cfg["configured"]:
        return {
            "success": False,
            "message": "SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASSWORD in your .env file."
        }

    success, message = test_smtp_connection(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        use_tls=cfg["use_tls"]
    )
    return {"success": success, "message": message}

# --- 6. Frontend Static Assets Serving ---
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by FastAPI
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

