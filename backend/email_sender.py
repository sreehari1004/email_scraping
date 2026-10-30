"""
SMTP Email Sender Module
Supports Gmail SMTP (smtp.gmail.com:587), Google Workspace, Outlook, and Custom SMTP.
"""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Tuple, Optional
from dotenv import load_dotenv

def reload_env():
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    try:
        from dotenv import load_dotenv
        if os.path.exists(env_path):
            load_dotenv(env_path, override=True)
        else:
            load_dotenv(override=True)
    except Exception:
        pass

    # Ensure native fallback reads .env without overwriting non-empty with empty
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        key = k.strip()
                        val = v.strip().strip("'\"")
                        if key and val:
                            os.environ[key] = val
                        elif key and key not in os.environ:
                            os.environ[key] = ""
        except Exception:
            pass

reload_env()

def get_smtp_config() -> Dict[str, Any]:
    """Retrieve SMTP configuration securely from environment variables (.env)."""
    reload_env()
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com") or "smtp.gmail.com"
    port_str = os.environ.get("SMTP_PORT", "587") or "587"
    try:
        port = int(port_str)
    except ValueError:
        port = 587

    user = os.environ.get("SMTP_USER", "") or ""
    password = os.environ.get("SMTP_PASSWORD", "") or ""
    from_name = os.environ.get("SMTP_FROM_NAME", "Contact Scraper") or "Contact Scraper"
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_name": from_name,
        "use_tls": use_tls,
        "configured": bool(user.strip() and password.strip())
    }

def test_smtp_connection(
    host: str,
    port: int,
    user: str,
    password: str,
    use_tls: bool = True
) -> Tuple[bool, str]:
    """Test connection and authentication to SMTP server."""
    if not host or not user or not password:
        return False, "Host, email address, and app password are required."

    # Clean password of any spaces (Google app passwords often copied with spaces like 'abcd efgh ijkl mnop')
    clean_pw = password.replace(" ", "")

    try:
        if port == 465:
            # SSL directly
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=12) as server:
                server.login(user, clean_pw)
        else:
            # STARTTLS (default for Gmail port 587)
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(user, clean_pw)

        return True, "Successfully authenticated with SMTP server!"
    except smtplib.SMTPAuthenticationError as e:
        return False, f"Authentication failed: Invalid email or app password. ({e.smtp_error.decode('utf-8', errors='ignore') if isinstance(e.smtp_error, bytes) else str(e)})"
    except smtplib.SMTPConnectError as e:
        return False, f"Could not connect to {host}:{port}. Check host and port."
    except Exception as e:
        return False, f"Connection error: {str(e)}"

def send_smtp_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Send an email via configured SMTP server (e.g. Gmail).
    Returns (success: bool, message_or_error: str).
    """
    config = get_smtp_config()
    if not config["configured"]:
        return False, "SMTP is not configured. Please set your Gmail email and App Password in Settings."

    host = config["host"]
    port = config["port"]
    user = config["user"]
    clean_pw = config["password"].replace(" ", "")
    from_name = config["from_name"]
    use_tls = config["use_tls"]

    from_header = f"{from_name} <{user}>" if from_name else user

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = to_email

    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        if port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
                server.login(user, clean_pw)
                server.sendmail(user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=20) as server:
                server.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(user, clean_pw)
                server.sendmail(user, [to_email], msg.as_string())

        return True, "Email sent successfully"
    except Exception as e:
        return False, str(e)

