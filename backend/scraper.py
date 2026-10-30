"""
Enhanced Website Contact Information Scraper
- JSON-LD / Schema.org extraction
- Microformat (hCard, vCard) extraction
- Expanded page discovery with internal link crawling
- Stricter phone & email validation
- Company name cascade
- Retry logic with multiple User-Agents
- Address extraction from <address> elements and structured HTML
- Social link handle extraction
- JS bundle scanning for SPA / JavaScript-rendered sites
"""

import re
import json
import time
import urllib.parse
from typing import Dict, List, Any, Optional, Set, Tuple
import requests
from bs4 import BeautifulSoup, Tag

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]

BASE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}

# Common contact/team page URL suffixes
CONTACT_PATHS = [
    "/contact", "/contact-us", "/contacts", "/contact-us.html", "/contact.html",
    "/get-in-touch", "/reach-us", "/reach-out", "/connect", "/inquire",
    "/contactus", "/contact_us",
]
ABOUT_PATHS = [
    "/about", "/about-us", "/about.html", "/about-us.html",
    "/company", "/our-company", "/who-we-are", "/our-story",
]
TEAM_PATHS = [
    "/team", "/our-team", "/people", "/staff", "/our-staff",
    "/leadership", "/management", "/founders", "/executives", "/directors",
]

# Email filtering (only block actual bounce/automated systems, never business inboxes)
JUNK_EMAIL_PREFIXES = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "postmaster",
    "webmaster", "abuse", "mailer-daemon", "bounce", "unsubscribe",
    "spam", "nobody", "daemon", "automated",
}
JUNK_EMAIL_DOMAINS = {
    "example.com", "domain.com", "sentry.io", "wixpress.com",
    "yoursite.com", "mysite.com", "website.com", "placeholder.com",
    "test.com", "sample.com", "email.com",
}
JUNK_EMAIL_FILE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
}

# Phone validation
PHONE_REGEX = re.compile(
    r'(?<!\d)(\+?1[\s\-.]?)?'               # optional country code +1
    r'(\(?\d{3}\)?[\s\-.]?)'               # area code
    r'(\d{3}[\s\-.]?)'                      # exchange
    r'(\d{4})'                              # subscriber
    r'(?!\d)',
    re.VERBOSE
)

INTL_PHONE_REGEX = re.compile(
    r'(?<!\d)\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{2,4}(?:[\s\-.]?\d{1,4})?(?!\d)'
)

# Strictly formatted phone (for text extraction fallback)
LOOSE_PHONE_REGEX = re.compile(
    r'(?<!\d)(?:\+?[\d]{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,4}[\s\-.]?\d{3,5}(?!\d)'
)

# Common designations for person extraction
COMMON_DESIGNATIONS = [
    "CEO", "Chief Executive Officer", "CTO", "Chief Technology Officer",
    "CFO", "Chief Financial Officer", "COO", "Chief Operating Officer",
    "CMO", "Chief Marketing Officer", "CIO", "Chief Information Officer",
    "President", "Vice President", "VP", "SVP", "EVP",
    "Founder", "Co-Founder", "Co Founder", "Managing Partner",
    "Director", "Managing Director", "Executive Director", "Associate Director",
    "Partner", "Senior Partner",
    "Marketing Manager", "Marketing Director", "Head of Marketing",
    "Sales Manager", "Sales Director", "Head of Sales", "Sales Head",
    "Account Executive", "Account Manager", "Business Development",
    "Support Lead", "Head of Support", "Customer Success",
    "Product Manager", "Product Director", "Product Lead",
    "Engineering Lead", "Engineering Manager", "Head of Engineering",
    "General Manager", "Operations Manager", "Project Manager",
    "HR Manager", "Human Resources", "Talent Acquisition",
    "Consultant", "Senior Consultant", "Principal Consultant",
    "Manager", "Senior Manager",
]

SOCIAL_DOMAINS = [
    "linkedin.com", "twitter.com", "x.com", "facebook.com",
    "instagram.com", "youtube.com", "github.com", "pinterest.com",
]

# Year / zip / version false positive filters for phone
YEAR_PATTERN = re.compile(r'^(?:19|20)\d{2}$')
VERSION_PATTERN = re.compile(r'^\d+\.\d+(?:\.\d+)*$')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_session(ua_index: int = 0) -> requests.Session:
    session = requests.Session()
    headers = dict(BASE_HEADERS)
    headers["User-Agent"] = USER_AGENTS[ua_index % len(USER_AGENTS)]
    session.headers.update(headers)
    return session


def fetch_page(url: str, session: requests.Session, timeout: int = 10, retries: int = 2) -> Optional[requests.Response]:
    """Fetch a URL with retries and user-agent rotation."""
    for attempt in range(retries + 1):
        try:
            resp = session.get(url, timeout=timeout, allow_redirects=True)
            if resp.status_code < 400:
                return resp
            if resp.status_code in (403, 429) and attempt < retries:
                # Try with a different user-agent
                session.headers["User-Agent"] = USER_AGENTS[(attempt + 1) % len(USER_AGENTS)]
                time.sleep(0.5)
                continue
            return None
        except requests.exceptions.SSLError:
            # Try without SSL verification as fallback
            try:
                resp = session.get(url, timeout=timeout, allow_redirects=True, verify=False)
                if resp.status_code < 400:
                    return resp
            except Exception:
                pass
            return None
        except requests.exceptions.ConnectionError:
            if attempt < retries:
                time.sleep(0.5)
                continue
            return None
        except requests.exceptions.Timeout:
            if attempt < retries:
                time.sleep(0.5)
                continue
            return None
        except Exception:
            return None
    return None


def clean_email(email: str, site_domain: str = "") -> str:
    """Validate and clean an email address."""
    email = email.strip().lower()
    if not email or "@" not in email:
        return ""
    # Filter file extensions mistakenly captured
    for ext in JUNK_EMAIL_FILE_EXTS:
        if email.endswith(ext):
            return ""
    # Filter junk domains
    domain_part = email.split("@")[-1]
    if domain_part in JUNK_EMAIL_DOMAINS:
        return ""
    # Filter nonsensical local parts (too short or contain only digits)
    local_part = email.split("@")[0]
    if len(local_part) < 2 or local_part.isdigit():
        return ""
    # Filter version-number-like emails (e.g. 2.3@domain.com)
    if re.match(r'^\d+\.\d+', local_part):
        return ""
    # Filter junk prefixes (noreply etc.) — but keep them if they're the only contact
    # We'll mark them but still include to not lose all data
    return email


def is_junk_email(email: str) -> bool:
    """Return True if this is a generic/noreply email."""
    local = email.split("@")[0].lower().replace("-", "").replace("_", "").replace(".", "")
    return local in {p.replace("-", "").replace("_", "") for p in JUNK_EMAIL_PREFIXES}


DUMMY_PHONES = {"1234567890", "9876543210", "0123456789", "0000000000", "1111111111"}

def clean_phone(raw: str) -> str:
    """Clean and validate a phone number string."""
    if not raw:
        return ""
    digits_only = re.sub(r'[^\d]', '', raw)
    # Too short or too long
    if len(digits_only) < 7 or len(digits_only) > 15:
        return ""
    # Filter dummy template numbers
    if digits_only in DUMMY_PHONES or digits_only.endswith("9876543210") or digits_only.endswith("1234567890"):
        return ""
    # Filter out pure years (4-digit years 1900-2099)
    if YEAR_PATTERN.match(digits_only):
        return ""
    # Filter version numbers
    stripped = raw.strip()
    if VERSION_PATTERN.match(stripped):
        return ""
    # Filter numbers that are clearly zip codes (exactly 5 digits with no formatting)
    if re.match(r'^\d{5}$', digits_only):
        return ""
    return stripped


def dedupe_phones(raw_phones: List[str]) -> List[str]:
    """Deduplicate phone numbers based on digits, keeping the cleanest formatted version."""
    phone_map: Dict[str, str] = {}
    for p in raw_phones:
        cleaned = clean_phone(p)
        if not cleaned:
            continue
        digits = re.sub(r'[^\d]', '', cleaned)
        if len(digits) < 7:
            continue
        
        # Check if already in map or suffix/prefix match
        existing_key = None
        for k in list(phone_map.keys()):
            if digits == k or digits.endswith(k) or k.endswith(digits):
                existing_key = k
                break
                
        if existing_key:
            current = phone_map[existing_key]
            # Prefer longer number or one with + or formatted with spaces/dashes
            if len(digits) > len(existing_key) or ('+' in cleaned and '+' not in current) or (' ' in cleaned and ' ' not in current):
                del phone_map[existing_key]
                phone_map[digits] = cleaned
        else:
            phone_map[digits] = cleaned
            
    return list(phone_map.values())


def normalize_name_key(name: str) -> str:
    """Normalize a person's name for case-insensitive deduplication."""
    return re.sub(r'[^a-z0-9]', '', name.lower())


def extract_phones_from_text(text: str) -> List[str]:
    """Extract phone numbers from free text using multiple strategies."""
    phones = set()
    # International format (+XX...)
    for m in INTL_PHONE_REGEX.finditer(text):
        p = clean_phone(m.group())
        if p:
            phones.add(p)
    # US format
    for m in PHONE_REGEX.finditer(text):
        p = clean_phone(m.group())
        if p:
            phones.add(p)
    # Loose fallback
    for m in LOOSE_PHONE_REGEX.finditer(text):
        p = clean_phone(m.group())
        if p and len(re.sub(r'[^\d]', '', p)) >= 8:
            phones.add(p)
    return list(phones)


def extract_company_name(soup: BeautifulSoup, domain: str) -> str:
    """Extract company name using a cascade of strategies."""
    # 1. og:site_name
    og = soup.find("meta", attrs={"property": "og:site_name"})
    if og and og.get("content", "").strip():
        return og["content"].strip()

    # 2. application-name
    app = soup.find("meta", attrs={"name": "application-name"})
    if app and app.get("content", "").strip():
        return app["content"].strip()

    # 3. twitter:site or twitter:title
    tw = soup.find("meta", attrs={"name": "twitter:title"})
    if tw and tw.get("content", "").strip():
        raw = tw["content"].strip()
        parts = re.split(r'[-–—|·]', raw)
        return parts[0].strip() if parts else raw

    # 4. og:title
    og_title = soup.find("meta", attrs={"property": "og:title"})
    if og_title and og_title.get("content", "").strip():
        raw = og_title["content"].strip()
        parts = re.split(r'[-–—|·]', raw)
        return parts[0].strip() if parts else raw

    # 5. Schema.org JSON-LD name field
    # (handled separately in extract_jsonld)

    # 6. <title> tag (first segment)
    if soup.title and soup.title.string:
        raw = soup.title.string.strip()
        parts = re.split(r'[-–—|·]', raw)
        candidate = parts[0].strip()
        if candidate and len(candidate) > 2:
            return candidate

    # 7. h1 in header/nav area
    header = soup.find(["header", "nav"])
    if header:
        h1 = header.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)

    # 8. First h1 on page
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        t = h1.get_text(strip=True)
        if len(t) < 80:
            return t

    return domain


def extract_jsonld(soup: BeautifulSoup) -> Dict[str, Any]:
    """Extract contact info from JSON-LD structured data (Schema.org)."""
    result: Dict[str, Any] = {
        "company": "",
        "emails": [],
        "phones": [],
        "addresses": [],
        "contacts": [],
        "social": [],
    }

    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        try:
            data = json.loads(script.string or "")
        except Exception:
            continue

        # Handle both single objects and arrays
        items = data if isinstance(data, list) else [data]

        for item in items:
            _parse_jsonld_item(item, result)

    return result


def _parse_jsonld_item(item: Any, result: Dict[str, Any]) -> None:
    """Recursively parse a JSON-LD item for contact info."""
    if not isinstance(item, dict):
        return

    rtype = item.get("@type", "")
    if isinstance(rtype, list):
        rtype = " ".join(rtype)

    # Company / organization name
    if any(t in rtype for t in ["Organization", "LocalBusiness", "Corporation", "Store", "Restaurant", "Hotel", "MedicalBusiness"]):
        if item.get("name"):
            result["company"] = item["name"]

        # Email
        for key in ["email", "contactEmail"]:
            val = item.get(key, "")
            if val and isinstance(val, str):
                e = clean_email(val.replace("mailto:", ""))
                if e:
                    result["emails"].append(e)

        # Telephone
        for key in ["telephone", "faxNumber", "phone"]:
            val = item.get(key, "")
            if val and isinstance(val, str):
                p = clean_phone(val)
                if p:
                    result["phones"].append(p)

        # Address
        addr = item.get("address", {})
        if isinstance(addr, dict):
            parts = [
                addr.get("streetAddress", ""),
                addr.get("addressLocality", ""),
                addr.get("addressRegion", ""),
                addr.get("postalCode", ""),
                addr.get("addressCountry", ""),
            ]
            address_str = ", ".join(p for p in parts if p)
            if address_str:
                result["addresses"].append(address_str)
        elif isinstance(addr, str) and addr:
            result["addresses"].append(addr)

        # Social profiles
        same_as = item.get("sameAs", [])
        if isinstance(same_as, str):
            same_as = [same_as]
        for link in same_as:
            if any(s in link for s in SOCIAL_DOMAINS):
                result["social"].append(link)

        # Contact points
        cp = item.get("contactPoint", [])
        if isinstance(cp, dict):
            cp = [cp]
        for point in cp:
            if isinstance(point, dict):
                em = point.get("email", "")
                ph = point.get("telephone", "")
                if em:
                    e = clean_email(em.replace("mailto:", ""))
                    if e:
                        result["emails"].append(e)
                if ph:
                    p = clean_phone(ph)
                    if p:
                        result["phones"].append(p)

    # Person
    if "Person" in rtype:
        person: Dict[str, str] = {}
        if item.get("name"):
            person["name"] = item["name"]
        if item.get("jobTitle"):
            person["designation"] = item["jobTitle"]
        em = item.get("email", "")
        if em:
            e = clean_email(em.replace("mailto:", ""))
            if e:
                person["email"] = e
        ph = item.get("telephone", "")
        if ph:
            p = clean_phone(ph)
            if p:
                person["phone"] = p
        if person.get("name"):
            result["contacts"].append(person)

    # Handle @graph arrays
    graph = item.get("@graph", [])
    if isinstance(graph, list):
        for g in graph:
            _parse_jsonld_item(g, result)


def extract_microformats(soup: BeautifulSoup) -> Dict[str, Any]:
    """Extract hCard / microformat contact data."""
    result: Dict[str, Any] = {
        "emails": [],
        "phones": [],
        "addresses": [],
        "contacts": [],
    }

    # itemprop-based extraction (Schema.org microdata)
    for el in soup.find_all(attrs={"itemprop": True}):
        prop = el.get("itemprop", "")
        if prop == "email":
            val = el.get("href", "") or el.get_text(strip=True)
            e = clean_email(val.replace("mailto:", ""))
            if e:
                result["emails"].append(e)
        elif prop == "telephone":
            val = el.get("href", "") or el.get_text(strip=True)
            p = clean_phone(val.replace("tel:", ""))
            if p:
                result["phones"].append(p)

    # hCard vcard class
    for vcard in soup.find_all(class_=re.compile(r'\bvcard\b|\bh-card\b', re.I)):
        contact: Dict[str, str] = {}
        fn = vcard.find(class_=re.compile(r'\bfn\b|\bp-name\b', re.I))
        if fn:
            contact["name"] = fn.get_text(strip=True)
        title = vcard.find(class_=re.compile(r'\btitle\b|\bp-job-title\b|\brole\b', re.I))
        if title:
            contact["designation"] = title.get_text(strip=True)
        email_el = vcard.find("a", class_=re.compile(r'\bemail\b|\bu-email\b', re.I))
        if email_el:
            val = email_el.get("href", "").replace("mailto:", "")
            e = clean_email(val)
            if e:
                contact["email"] = e
        tel_el = vcard.find(class_=re.compile(r'\btel\b|\bp-tel\b', re.I))
        if tel_el:
            p = clean_phone(tel_el.get_text(strip=True))
            if p:
                contact["phone"] = p
        if contact.get("name"):
            result["contacts"].append(contact)

    # <address> elements
    for addr_el in soup.find_all("address"):
        text = addr_el.get_text(separator=", ", strip=True)
        text = re.sub(r'\s+', ' ', text)
        if text and len(text) > 10:
            result["addresses"].append(text)

    return result


def extract_team_cards(soup: BeautifulSoup, all_emails: Set[str], all_phones: Set[str]) -> List[Dict[str, str]]:
    """Extract person cards from team/leadership sections."""
    contacts: List[Dict[str, str]] = []
    seen_names: Set[str] = set()

    # Patterns for team card containers
    card_selectors = [
        # class-based
        re.compile(r'\bteam\b|\bmember\b|\bstaff\b|\bpeople\b|\bleader\b|\bperson\b|\bprofile\b|\bcard\b', re.I),
    ]

    # Find containers that look like person cards
    candidate_containers = []
    for el in soup.find_all(["div", "article", "li", "section"], class_=True):
        classes = " ".join(el.get("class", []))
        if any(p.search(classes) for p in card_selectors):
            candidate_containers.append(el)

    for container in candidate_containers[:40]:  # Limit to avoid excessive processing
        contact = _parse_person_container(container, all_emails, all_phones)
        if contact and contact.get("name") and contact["name"] not in seen_names:
            seen_names.add(contact["name"])
            contacts.append(contact)

    # Also try designation-based extraction from any container
    if not contacts:
        contacts = extract_by_designation(soup, all_emails, all_phones, seen_names)

    return contacts


def _parse_person_container(container: Tag, all_emails: Set[str], all_phones: Set[str]) -> Optional[Dict[str, str]]:
    """Parse a single person card container."""
    contact: Dict[str, str] = {}

    # Name: look for h2/h3/h4/strong with short text
    for tag in container.find_all(["h2", "h3", "h4", "h5", "strong", "b"]):
        text = tag.get_text(strip=True)
        if 2 <= len(text.split()) <= 5 and re.match(r'^[A-Z][a-zA-Z\'\-]+\s+[A-Z]', text):
            contact["name"] = text
            break

    if not contact.get("name"):
        return None

    # Designation: look for small text after the name
    for tag in container.find_all(["p", "span", "small", "em", "div"]):
        text = tag.get_text(strip=True)
        if 1 <= len(text.split()) <= 8:
            for desig in COMMON_DESIGNATIONS:
                if desig.lower() in text.lower():
                    contact["designation"] = text
                    break
        if contact.get("designation"):
            break

    # Email in container
    mailto = container.find("a", href=re.compile(r'^mailto:', re.I))
    if mailto:
        e = clean_email(mailto["href"].replace("mailto:", "").split("?")[0])
        if e:
            contact["email"] = e

    # Phone in container
    tel = container.find("a", href=re.compile(r'^tel:', re.I))
    if tel:
        p = clean_phone(tel["href"].replace("tel:", ""))
        if p:
            contact["phone"] = p

    # Fall back to first available email/phone
    if not contact.get("email") and all_emails:
        contact["email"] = next(iter(all_emails))
    if not contact.get("phone") and all_phones:
        contact["phone"] = next(iter(all_phones))

    return contact


def extract_by_designation(soup: BeautifulSoup, all_emails: Set[str], all_phones: Set[str], seen: Set[str]) -> List[Dict[str, str]]:
    """Fallback: find designations in text and look for adjacent names."""
    contacts = []

    for desig in COMMON_DESIGNATIONS:
        pattern = re.compile(rf'\b{re.escape(desig)}\b', re.IGNORECASE)
        for tag in soup.find_all(string=pattern):
            parent = tag.parent
            if not parent:
                continue
            container = parent.find_parent(["div", "li", "section", "article", "td", "tr"]) or parent
            container_text = container.get_text(separator="\n")
            lines = [l.strip() for l in container_text.splitlines() if l.strip()]

            for idx, line in enumerate(lines):
                if desig.lower() in line.lower():
                    candidate = ""
                    # Check line before
                    if idx > 0:
                        prev = lines[idx - 1]
                        words = prev.split()
                        if 2 <= len(words) <= 4 and re.match(r'^[A-Z][a-zA-Z\'\-]+', prev):
                            candidate = prev
                    # Check line after
                    if not candidate and idx + 1 < len(lines):
                        nxt = lines[idx + 1]
                        words = nxt.split()
                        if 2 <= len(words) <= 4 and re.match(r'^[A-Z][a-zA-Z\'\-]+', nxt):
                            candidate = nxt

                    if candidate and candidate not in seen:
                        seen.add(candidate)
                        c: Dict[str, str] = {
                            "name": candidate,
                            "designation": desig,
                        }
                        if all_emails:
                            c["email"] = next(iter(all_emails))
                        if all_phones:
                            c["phone"] = next(iter(all_phones))
                        contacts.append(c)
                    break

    return contacts


def discover_contact_pages(soup: BeautifulSoup, base_url: str, visited: Set[str]) -> List[str]:
    """Discover additional contact-related pages from internal links."""
    found = []
    contact_keywords = re.compile(
        r'contact|about|team|staff|people|leadership|management|founders|'
        r'get.in.touch|reach.us|connect|inquire|company|who.we.are',
        re.IGNORECASE
    )

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        text = a.get_text(strip=True)

        # Skip external links, anchors, JS links
        if href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
            continue

        # Resolve relative URLs
        if href.startswith("/"):
            full_url = base_url.rstrip("/") + href
        elif href.startswith("http"):
            # Only follow same-domain links
            parsed = urllib.parse.urlparse(href)
            base_parsed = urllib.parse.urlparse(base_url)
            if parsed.netloc != base_parsed.netloc:
                continue
            full_url = href
        else:
            full_url = base_url.rstrip("/") + "/" + href

        # Remove query strings and anchors
        full_url = full_url.split("?")[0].split("#")[0].rstrip("/")

        if full_url in visited:
            continue

        if contact_keywords.search(href) or contact_keywords.search(text):
            found.append(full_url)

    return list(dict.fromkeys(found))  # deduplicate preserving order


def is_spa_page(soup: BeautifulSoup) -> bool:
    """Detect if the page is a JavaScript SPA (very little text content)."""
    visible_text = soup.get_text(separator=" ", strip=True)
    # If page has almost no text after stripping, it's likely an SPA
    return len(visible_text) < 300


def extract_js_bundle_urls(soup: BeautifulSoup, base_url: str) -> List[str]:
    """Find all JS bundle URLs referenced in the HTML."""
    js_urls = []
    for script in soup.find_all("script", src=True):
        src = script["src"].strip()
        if src.startswith("/"):
            js_urls.append(base_url.rstrip("/") + src)
        elif src.startswith("http"):
            parsed_src = urllib.parse.urlparse(src)
            parsed_base = urllib.parse.urlparse(base_url)
            if parsed_src.netloc == parsed_base.netloc:
                js_urls.append(src)
        # Filter for likely app bundles (not polyfills or tiny chunks)
    return [u for u in js_urls if any(kw in u for kw in ["index", "main", "app", "bundle", "chunk"])]


def scan_js_bundle(
    js_url: str,
    session: requests.Session,
    site_domain: str
) -> Dict[str, Any]:
    """
    Download a JS bundle and scan it for hardcoded contact information.
    Used for SPA sites where all data is embedded in the compiled JS.
    """
    result: Dict[str, Any] = {"emails": [], "phones": [], "addresses": []}
    try:
        resp = session.get(js_url, timeout=20, allow_redirects=True)
        if not resp or resp.status_code >= 400:
            return result
        js_text = resp.text

        # --- Emails ---
        raw_emails = re.findall(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}', js_text)
        # Filter to emails belonging to the same domain or plausible business emails
        for e in raw_emails:
            ce = clean_email(e)
            if not ce:
                continue
            # Skip placeholder/example emails
            domain_part = ce.split("@")[-1]
            if domain_part in JUNK_EMAIL_DOMAINS:
                continue
            if "you@" in ce or "your@" in ce or "user@" in ce:
                continue
            result["emails"].append(ce)

        # --- Phones ---
        # 1. From tel: links in JS (highest accuracy)
        for tel_m in re.findall(r'tel:(\+?[\d\s\-()]{7,18})', js_text):
            p = clean_phone(tel_m.strip())
            if p:
                result["phones"].append(p)

        # 2. International format (+XX...) found in JS strings (quotes or backticks)
        for m in re.finditer(r'[`\'"](\+\d{1,3}[\s\-\.]?\(?\d{1,4}\)?[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}(?:[\s\-\.]?\d{0,4})?)[`\'"]', js_text):
            p = clean_phone(m.group(1).strip())
            if p:
                result["phones"].append(p)

        # 3. Parenthesis-formatted US phones in JS strings
        for m in re.finditer(r'[`\'"](\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4})[`\'"]', js_text):
            p = clean_phone(m.group(1).strip())
            if p:
                result["phones"].append(p)

        # Deduplicate
        result["emails"] = list(dict.fromkeys(result["emails"]))
        result["phones"] = list(dict.fromkeys(result["phones"]))

    except Exception:
        pass

    return result


def build_complete_contacts_list(
    named_contacts: List[Dict[str, str]],
    all_emails: List[str],
    all_phones: List[str],
    source_url: str,
    company_domain: str
) -> List[Dict[str, str]]:
    """
    Ensure EVERY single discovered email and EVERY single phone number
    is included in the contacts list, without dropping any numbers or emails.
    """
    results: List[Dict[str, str]] = []
    seen_contacts: Set[Tuple[str, str, str]] = set()

    # Track which emails and phones have been paired
    used_emails: Set[str] = set()
    used_phones: Set[str] = set()

    # 1. Process named contacts from team / person sections first
    for person in named_contacts:
        name = person.get("name", "").strip()
        # If all uppercase, convert to Title Case
        if name.isupper():
            name = name.title()

        email = person.get("email", "").strip()
        phone = person.get("phone", "").strip()

        # If missing email, assign an unused email from all_emails
        if not email:
            for e in all_emails:
                if e not in used_emails:
                    email = e
                    used_emails.add(e)
                    break
            if not email and all_emails:
                email = all_emails[0]
        else:
            used_emails.add(email)

        # If missing phone, assign an unused phone from all_phones
        if not phone:
            for p in all_phones:
                if p not in used_phones:
                    phone = p
                    used_phones.add(p)
                    break
            if not phone and all_phones:
                phone = all_phones[0]
        else:
            used_phones.add(phone)

        key = (normalize_name_key(name), email.lower(), re.sub(r'[^\d]', '', phone))
        if key not in seen_contacts:
            seen_contacts.add(key)
            results.append({
                "name": name,
                "email": email,
                "phone": phone,
                "designation": person.get("designation", "Representative"),
                "source_url": person.get("source_url", source_url)
            })

    # 2. Check for any remaining emails or phones that have NOT yet been captured
    unassigned_emails = [e for e in all_emails if e not in used_emails]
    unassigned_phones = [p for p in all_phones if p not in used_phones]

    total_extra = max(len(unassigned_emails), len(unassigned_phones))

    for i in range(total_extra):
        em = unassigned_emails[i] if i < len(unassigned_emails) else (all_emails[0] if all_emails else "")
        ph = unassigned_phones[i] if i < len(unassigned_phones) else (all_phones[0] if all_phones else "")

        # Infer descriptive name based on email prefix or phone line
        guessed_name = "Contact"
        if i < len(unassigned_emails):
            user_part = unassigned_emails[i].split('@')[0].lower()
            name_parts = re.split(r'[._\-]', user_part)
            if len(name_parts) >= 2 and all(p.isalpha() and len(p) > 1 for p in name_parts[:2]):
                guessed_name = " ".join(p.capitalize() for p in name_parts[:2])
            elif user_part in ["sales", "support", "info", "contact", "help", "enquiry", "admin", "office", "marketing", "billing"]:
                guessed_name = f"{user_part.capitalize()} Department"
            else:
                guessed_name = user_part.capitalize()
        elif i < len(unassigned_phones):
            guessed_name = f"Inquiries / Line {i + 1}"

        key = (normalize_name_key(guessed_name), em.lower(), re.sub(r'[^\d]', '', ph))
        if key not in seen_contacts:
            seen_contacts.add(key)
            results.append({
                "name": guessed_name,
                "email": em,
                "phone": ph,
                "designation": "General Inquiries",
                "source_url": source_url
            })

    return results


# ---------------------------------------------------------------------------
# Main scraper entry point
# ---------------------------------------------------------------------------

def scrape_url(target_url: str) -> Dict[str, Any]:
    """
    Scrape contact information from a website URL.
    Returns a dict with: website, url, company_name, status, error_message,
    contacts, emails, phones, social_links, addresses.
    """
    # Normalize URL
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    parsed = urllib.parse.urlparse(target_url)
    domain = parsed.netloc
    if not domain:
        # Try extracting domain from path
        domain = parsed.path.split("/")[0]
        target_url = "https://" + domain

    base_url = f"{parsed.scheme}://{domain}"

    # Build initial page list
    initial_pages = [target_url]

    # Add standard contact/about/team paths
    for path in CONTACT_PATHS[:6]:
        url = base_url + path
        if url != target_url:
            initial_pages.append(url)
    for path in ABOUT_PATHS[:4]:
        url = base_url + path
        if url != target_url:
            initial_pages.append(url)
    for path in TEAM_PATHS[:4]:
        url = base_url + path
        if url != target_url:
            initial_pages.append(url)

    initial_pages = list(dict.fromkeys(initial_pages))  # deduplicate

    session = make_session(0)

    company_name = domain
    all_emails: Set[str] = set()
    all_phones: Set[str] = set()
    all_socials: Set[str] = set()
    all_addresses: List[str] = []
    all_contacts: List[Dict[str, str]] = []
    seen_contact_names: Set[str] = set()

    successful_pages = 0
    visited: Set[str] = set()
    error_msg = ""

    # First pass: homepage + key standard pages (up to 8 pages)
    pages_to_visit = initial_pages[:8]

    # Second pass bucket: discovered pages
    discovered_pages: List[str] = []
    homepage_soup: Optional[BeautifulSoup] = None

    for page_url in pages_to_visit:
        if page_url in visited:
            continue
        visited.add(page_url)

        resp = fetch_page(page_url, session, timeout=10, retries=1)
        if not resp:
            continue

        successful_pages += 1
        soup = BeautifulSoup(resp.text, "html.parser")

        # Save homepage soup for link discovery
        if page_url == target_url or page_url == base_url:
            homepage_soup = soup

        # --- Company name ---
        if company_name == domain:
            name = extract_company_name(soup, domain)
            if name and name != domain:
                company_name = name

        # --- JSON-LD ---
        jsonld = extract_jsonld(soup)
        if jsonld["company"] and company_name == domain:
            company_name = jsonld["company"]
        for e in jsonld["emails"]:
            c = clean_email(e)
            if c:
                all_emails.add(c)
        for p in jsonld["phones"]:
            cp = clean_phone(p)
            if cp:
                all_phones.add(cp)
        for addr in jsonld["addresses"]:
            if addr not in all_addresses:
                all_addresses.append(addr)
        for soc in jsonld["social"]:
            all_socials.add(soc)
        for person in jsonld["contacts"]:
            if person.get("name") and person["name"] not in seen_contact_names:
                seen_contact_names.add(person["name"])
                person["source_url"] = page_url
                all_contacts.append(person)

        # --- Microformats ---
        micro = extract_microformats(soup)
        for e in micro["emails"]:
            all_emails.add(e)
        for p in micro["phones"]:
            all_phones.add(p)
        for addr in micro["addresses"]:
            if addr not in all_addresses:
                all_addresses.append(addr)
        for person in micro["contacts"]:
            if person.get("name") and person["name"] not in seen_contact_names:
                seen_contact_names.add(person["name"])
                person["source_url"] = page_url
                all_contacts.append(person)

        # --- mailto / tel links ---
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().startswith("mailto:"):
                raw = href[7:].split("?")[0].strip()
                c = clean_email(raw)
                if c:
                    all_emails.add(c)
            elif href.lower().startswith("tel:"):
                raw = href[4:].strip()
                p = clean_phone(raw)
                if p:
                    all_phones.add(p)
            else:
                for s_dom in SOCIAL_DOMAINS:
                    if s_dom in href.lower():
                        # Validate: should contain a path (profile)
                        parsed_social = urllib.parse.urlparse(href)
                        if parsed_social.path and len(parsed_social.path.strip("/")) > 1:
                            all_socials.add(href.split("?")[0])

        # --- Email from page text ---
        page_text = soup.get_text(separator=" ")
        found_emails = re.findall(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}\b', page_text)
        for e in found_emails:
            c = clean_email(e)
            if c:
                all_emails.add(c)

        # --- Phone from page text ---
        found_phones = extract_phones_from_text(page_text)
        for p in found_phones:
            all_phones.add(p)

        # --- Team cards ---
        team_contacts = extract_team_cards(soup, all_emails, all_phones)
        for person in team_contacts:
            if person.get("name") and person["name"] not in seen_contact_names:
                seen_contact_names.add(person["name"])
                person["source_url"] = page_url
                all_contacts.append(person)

        # --- Discover additional internal links ---
        if homepage_soup and page_url == target_url:
            disc = discover_contact_pages(soup, base_url, visited)
            discovered_pages.extend(disc)

    # Second pass: discovered pages (up to 4 more)
    for page_url in list(dict.fromkeys(discovered_pages))[:4]:
        if page_url in visited:
            continue
        visited.add(page_url)

        resp = fetch_page(page_url, session, timeout=10, retries=1)
        if not resp:
            continue

        successful_pages += 1
        soup = BeautifulSoup(resp.text, "html.parser")

        # Run same extraction pipeline
        jsonld = extract_jsonld(soup)
        for e in jsonld["emails"]:
            c = clean_email(e)
            if c:
                all_emails.add(c)
        for p in jsonld["phones"]:
            cp = clean_phone(p)
            if cp:
                all_phones.add(cp)
        for addr in jsonld["addresses"]:
            if addr not in all_addresses:
                all_addresses.append(addr)
        for soc in jsonld["social"]:
            all_socials.add(soc)
        for person in jsonld["contacts"]:
            if person.get("name") and person["name"] not in seen_contact_names:
                seen_contact_names.add(person["name"])
                person["source_url"] = page_url
                all_contacts.append(person)

        micro = extract_microformats(soup)
        for e in micro["emails"]:
            all_emails.add(e)
        for p in micro["phones"]:
            all_phones.add(p)
        for addr in micro["addresses"]:
            if addr not in all_addresses:
                all_addresses.append(addr)

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().startswith("mailto:"):
                raw = href[7:].split("?")[0].strip()
                c = clean_email(raw)
                if c:
                    all_emails.add(c)
            elif href.lower().startswith("tel:"):
                raw = href[4:].strip()
                p = clean_phone(raw)
                if p:
                    all_phones.add(p)

        page_text = soup.get_text(separator=" ")
        for e in re.findall(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}\b', page_text):
            c = clean_email(e)
            if c:
                all_emails.add(c)

        for p in extract_phones_from_text(page_text):
            all_phones.add(p)

        team_contacts = extract_team_cards(soup, all_emails, all_phones)
        for person in team_contacts:
            if person.get("name") and person["name"] not in seen_contact_names:
                seen_contact_names.add(person["name"])
                person["source_url"] = page_url
                all_contacts.append(person)

    # --- JS Bundle Scanning for SPA sites ---
    # If contact info is incomplete and the homepage looks like a JS SPA,
    # scan the compiled JS bundles for hardcoded contact data
    if (not all_emails or not all_phones) and homepage_soup and is_spa_page(homepage_soup):
        js_bundle_urls = extract_js_bundle_urls(homepage_soup, base_url)
        for js_url in js_bundle_urls[:3]:  # Scan up to 3 bundles
            bundle_data = scan_js_bundle(js_url, session, domain)
            for e in bundle_data["emails"]:
                ce = clean_email(e)
                if ce:
                    all_emails.add(ce)
            for p in bundle_data["phones"]:
                cp = clean_phone(p)
                if cp:
                    all_phones.add(cp)
            for addr in bundle_data["addresses"]:
                if addr not in all_addresses:
                    all_addresses.append(addr)

    # --- Clean and deduplicate emails & phones ---
    # Keep ALL valid emails found on the domain
    final_emails = sorted(list(dict.fromkeys(
        clean_email(e) for e in all_emails 
        if clean_email(e) and not is_junk_email(e)
    )))
    # If all were flagged by strict junk filter, fallback to any valid clean email
    if not final_emails and all_emails:
        final_emails = sorted(list(dict.fromkeys(clean_email(e) for e in all_emails if clean_email(e))))

    # Deduplicate phones cleanly using digits normalization
    phone_list = dedupe_phones(list(all_phones))

    # --- Build complete contact list ensuring NO email or phone is lost ---
    all_contacts = build_complete_contacts_list(
        all_contacts,
        final_emails,
        phone_list,
        target_url,
        domain
    )

    # --- Determine status ---
    if successful_pages == 0:
        status = "Failed"
        error_msg = "Could not connect to server or all pages returned errors"
    elif final_emails or phone_list or all_contacts:
        status = "Completed"
    else:
        status = "Partial"

    return {
        "website": domain,
        "url": target_url,
        "company_name": company_name,
        "status": status,
        "error_message": error_msg if status == "Failed" else "",
        "contacts": all_contacts[:50],  # generous cap
        "emails": final_emails,
        "phones": phone_list,
        "social_links": sorted(all_socials)[:10],
        "addresses": all_addresses[:5],
    }
