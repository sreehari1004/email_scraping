import re
import csv
import io
from typing import List, Set
from pypdf import PdfReader
import openpyxl

URL_REGEX = re.compile(
    r'(?:https?://)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s,;"\'<>]*)?',
    re.IGNORECASE
)

def normalize_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        return ""
    # remove trailing punctuations
    url = re.sub(r'[,;.>\)\]]+$', '', url)
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url

def clean_and_deduplicate(raw_urls: List[str]) -> List[str]:
    seen: Set[str] = set()
    cleaned: List[str] = []
    for item in raw_urls:
        if not item or not isinstance(item, str):
            continue
        matches = URL_REGEX.findall(item)
        for m in matches:
            norm = normalize_url(m)
            # Basic sanity check
            if "." in norm and len(norm) > 8:
                if norm.lower() not in seen:
                    seen.add(norm.lower())
                    cleaned.append(norm)
    return cleaned

def parse_csv_file(content_bytes: bytes) -> List[str]:
    text = content_bytes.decode('utf-8', errors='ignore')
    reader = csv.reader(io.StringIO(text))
    raw_urls = []
    for row in reader:
        for cell in row:
            raw_urls.append(cell)
    return clean_and_deduplicate(raw_urls)

def parse_excel_file(content_bytes: bytes) -> List[str]:
    wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
    raw_urls = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            for cell in row:
                if cell:
                    raw_urls.append(str(cell))
    return clean_and_deduplicate(raw_urls)

def parse_pdf_file(content_bytes: bytes) -> List[str]:
    reader = PdfReader(io.BytesIO(content_bytes))
    raw_urls = []
    for page in reader.pages:
        text = page.extract_text() or ""
        raw_urls.append(text)
    return clean_and_deduplicate(raw_urls)

