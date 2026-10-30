import os
import re
import json
import httpx
import sqlite3

def load_env_file():
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and not os.environ.get(k):
                            os.environ[k] = v
        except Exception:
            pass

load_env_file()

def get_gemini_api_key() -> str:
    # 1. Check database settings
    db_path = os.path.join(os.path.dirname(__file__), "contact_scraper.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = 'gemini_api_key'")
            row = cursor.fetchone()
            conn.close()
            if row and row[0] and row[0].strip():
                return row[0].strip()
        except Exception:
            pass

    # 2. Check environment variable
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key

    # 3. Re-check .env
    load_env_file()
    return os.environ.get("GEMINI_API_KEY", "").strip()

def generate_email_content(prompt_notes: str, company_name: str = "", contact_name: str = "") -> dict:
    prompt_notes = prompt_notes.strip()
    api_key = get_gemini_api_key()

    if not prompt_notes:
        return {
            "subject": "Exploring Partnership Opportunities",
            "body": "Hello {{contact_name}},\n\nI hope this email finds you well at {{company_name}}.\n\nWe would love to introduce our services and discuss how we can help your business grow.\n\nPlease let us know if you have time for a brief discussion this week.\n\nBest regards,\nYour Team",
            "model_used": "Template Default"
        }

    # If GEMINI_API_KEY is available, call Gemini API
    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            sys_instruction = (
                "You are an expert B2B copywriter. Given the user's notes, generate a compelling, professional cold outreach email. "
                "You MUST include standard personalization placeholders: {{contact_name}}, {{company_name}}, and {{email}} where appropriate. "
                "Return strictly valid JSON with two fields: 'subject' (string) and 'body' (string)."
            )
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{sys_instruction}\n\nUser Notes:\n{prompt_notes}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    return {
                        "subject": parsed.get("subject", "Collaboration Proposal"),
                        "body": parsed.get("body", ""),
                        "model_used": "Gemini 1.5 Flash"
                    }
        except Exception as e:
            # Fallback if request failed
            pass

    # Local intelligent generator fallback
    notes_lower = prompt_notes.lower()

    if "software" in notes_lower or "ai" in notes_lower or "automation" in notes_lower or "development" in notes_lower:
        subject = "Exploring a Potential Technology Partnership"
        body = (
            "Hello {{contact_name}},\n\n"
            "I hope you are doing well.\n\n"
            "We would like to introduce our software development services, specializing in AI solutions, "
            "web application development, and business process automation.\n\n"
            "We are interested in exploring potential collaboration opportunities with {{company_name}}.\n\n"
            "Please let us know whether you would be available for a brief introductory call this week.\n\n"
            "Best regards,\nYour Team"
        )
    elif "marketing" in notes_lower or "growth" in notes_lower or "sales" in notes_lower:
        subject = "Accelerating Growth for {{company_name}}"
        body = (
            "Hi {{contact_name}},\n\n"
            "I have been following {{company_name}}'s recent work and wanted to reach out.\n\n"
            "We help innovative organizations scale their market reach and streamline their customer acquisition pipelines.\n\n"
            "Would you be open to a 10-minute chat to discuss how this could benefit your team?\n\n"
            "Best regards,\nGrowth Strategy Team"
        )
    elif "partnership" in notes_lower or "collaborat" in notes_lower:
        subject = "Potential Strategic Partnership with {{company_name}}"
        body = (
            "Dear {{contact_name}},\n\n"
            "I am reaching out regarding a synergistic partnership opportunity between our organizations.\n\n"
            f"Based on our review of {{company_name}}, we believe our solutions align closely with your strategic goals: {prompt_notes[:120]}...\n\n"
            "Would you be open to an introductory meeting next Tuesday or Wednesday?\n\n"
            "Sincerely,\nPartnerships Team"
        )
    else:
        subject = f"Inquiry regarding {{company_name}} & Collaboration"
        body = (
            "Hello {{contact_name}},\n\n"
            "I hope this message finds you well.\n\n"
            f"I am reaching out to discuss: {prompt_notes}\n\n"
            "We believe there is strong alignment between what we do and the priorities at {{company_name}}.\n\n"
            "Could we schedule a brief 15-minute conversation at your convenience?\n\n"
            "Best regards,\nBusiness Development Team"
        )

    return {
        "subject": subject,
        "body": body,
        "model_used": "Smart Offline Template Engine"
    }
