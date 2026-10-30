import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "contact_scraper.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name TEXT,
        created_at TEXT,
        status TEXT,
        total_websites INTEGER DEFAULT 0,
        completed_websites INTEGER DEFAULT 0,
        failed_websites INTEGER DEFAULT 0,
        in_progress_websites INTEGER DEFAULT 0,
        contacts_found INTEGER DEFAULT 0,
        duration TEXT,
        batch_id INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        website TEXT,
        url TEXT,
        status TEXT,
        contacts_count INTEGER DEFAULT 0,
        last_updated TEXT,
        error_message TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        website_id INTEGER,
        name TEXT,
        email TEXT,
        phone TEXT,
        designation TEXT,
        source_url TEXT,
        company_name TEXT,
        address TEXT,
        social_links TEXT,
        created_at TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
        FOREIGN KEY (website_id) REFERENCES job_websites (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS outreach_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT,
        email TEXT,
        subject TEXT,
        body TEXT,
        status TEXT,
        sent_on TEXT,
        error_details TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    conn.commit()
    conn.close()

def reset_db():
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass
    init_db()
