"""
Search & Discovery Engine using DDGS (DuckDuckGo Search)
Tailored for Import-Export Companies to discover actual CLIENTS (Buyers, Retailers,
Boutiques, Showrooms, Stores, and Local Dealers) across different domains and regions.

Strictly filters out:
- Other import-export companies, export houses, and trading intermediaries
- Freight forwarders, customs clearing agents, cargo, and logistics brokers
- News articles, media reports, and blogs
- Marketplaces (Amazon, Ozon, eBay) and social media
"""

import re
import urllib.parse
from typing import List, Dict, Any, Set
from ddgs import DDGS

# 1. Marketplaces, aggregators, social networks, news media, and document hosts
IGNORED_BRAND_KEYWORDS = {
    # Major consumer & B2B aggregators / marketplaces
    'amazon.', 'ebay.', 'aliexpress.', 'alibaba.', 'walmart.', 'flipkart.', 'etsy.', 'target.',
    'dhgate.', 'made-in-china.', 'indiamart.', 'ec21.', 'globalsources.', 'tradekey.',
    'ozon.ru', 'wildberries.ru', 'avito.ru', 'market.yandex.ru', 'sbermegamarket.ru', 'livemaster.ru',
    'myntra.', 'nykaa.', 'ajio.', 'meesho.', 'purplle.', 'snapdeal.', 'tatacliq.',
    
    # Social media & design portfolios
    'youtube.', 'youtu.be', 'facebook.', 'fb.com', 'instagram.', 'linkedin.', 'twitter.', 'x.com',
    'pinterest.', 'tiktok.', 'reddit.', 'quora.', 't.me', 'telegram.', 'vk.com', 'vk.ru', 'ok.ru',
    'behance.', 'dribbble.', 'vc.ru', 'habr.ru', 'tumblr.', 'substack.',
    
    # Map, directory, and review portals
    '2gis.', 'yandex.ru/maps', 'maps.google.', 'tripadvisor.', 'yelp.', 'yellowpages.',
    'trustpilot.', 'glassdoor.', 'indeed.', 'webindia123.', 'quickerala.', 'sulekha.',
    'justdial.', 'dial4trade.', 'tradeindia.', 'exportersindia.', 'indiabizlist.',
    'addressguru.', 'locanto.', 'mouthshut.', 'dubaidirectory.', 'uaeyellowpagesonline.',
    'infobel.', 'hotfrog.',
    
    # Document sharing & academic/homework repositories
    'scribd.', 'slideshare.', 'academia.edu', 'researchgate.', 'issuu.com',
    'archive.org', 'pdfcoffee.', 'pdfdrive.', 'docplayer.', 'studocu.', 'coursehero.',
    'wikipedia.', 'wikimedia.', 'medium.', 'github.', 'play.google.', 'apps.apple.',
    'vedantu.', 'byjus.', 'toppr.', 'shaalaa.', 'brainly.', 'doubtnut.', 'cuemath.',
    'careers360.', 'shiksha.', 'collegedunia.', 'geeksforgeeks.', 'tutorialspoint.',
    'sanfoundry.', 'dokumen.', 'chegg.', 'toppersbulletin.',
    
    # Global & regional news agencies, newspapers, and lifestyle magazines
    'thehindu.', 'hindu.com', 'hindustantimes.', 'timesofindia.', 'indiatimes.', 'ndtv.',
    'indianexpress.', 'indiatoday.', 'livemint.', 'deccanchronicle.', 'deccanherald.',
    'theprint.', 'thewire.', 'scroll.in', 'thequint.', 'moneycontrol.', 'business-standard.',
    'financialexpress.', 'zeenews.', 'news18.', 'firstpost.', 'curlytales.', 'scoopwhoop.',
    'mensxp.', 'femina.', 'vogue.', 'elle.', 'gqindia.', 'gq.com', 'vanityfair.', 'cosmopolitan.',
    'harpersbazaar.', 'cntraveller.', 'nationalgeographic.', 'khaleejtimes.', 'gulfnews.',
    'thenationalnews.', 'arabianbusiness.', 'aljazeera.', 'dailymail.', 'thesun.', 'mirror.co',
    'telegraph.co', 'independent.co', 'standard.co', 'latimes.', 'washingtonpost.', 'usatoday.',
    'news.', 'daily.', 'gazette.', 'tribune.', 'journal.', 'herald.', 'post.',
    'reuters.', 'bloomberg.', 'forbes.', 'fortune.', 'economist.', 'statista.',
    'pravda.', 'tass.', 'interfax.', 'kommersant.', 'rbc.ru', 'ria.ru', 'lenta.ru', 'rt.com',
    'sputnik', 'vedomosti.', 'rg.ru', 'gazeta.ru', 'iz.ru', 'bbc.', 'cnn.', 'theguardian.',
    'nytimes.', 'wsj.', 'ft.com', 'dw.com', 'euronews.', 'apnews.',
    'dreamstime.', 'shutterstock.', 'istockphoto.', 'gettyimages.', 'blogspot.', 'wordpress.'
}

# 2. Intermediaries to block: logistics, freight, customs, generic import-export agencies
# Since the user IS an import-export company, they want CLIENTS (stores, shops, buyers), not intermediaries
INTERMEDIARY_KEYWORDS = [
    'import export', 'import-export', 'importers and exporters', 'export house', 'exporthouse',
    'freight forwarding', 'freight forwarder', 'logistics services', 'customs clearance',
    'clearing agent', 'cargo services', 'shipping agency', 'customs broker', 'logistics provider',
    'forwarding agent', 'trading house', 'trade agency', 'trade portal', 'clearing and forwarding'
]

# 3. URL paths that indicate an article, news report, or blog rather than a company homepage
ARTICLE_PATH_REGEX = re.compile(
    r'/(news|article|articles|articleshow|story|stories|blog|blogs|press-release|press|opinion|politics|world|economy|business-news|investigation|breaking|report|reports|life-and-style|lifestyle|fashion|culture|buzz|trending|entertainment)/?|/(19|20)\d{2}[/\-][01]?\d',
    re.IGNORECASE
)

# 4. Editorial phrases common in headlines/articles but rare on company websites
EDITORIAL_PHRASES = [
    'may quit', 'quit business', 'quits', 'crisis', 'bans', 'banned', 'protest', 'why',
    'how to', 'top 10', 'top 5', 'best 10', 'top 20', 'market research', 'industry analysis',
    'market report', 'investigation', 'scandal', 'lawsuit', 'overview', 'statistics',
    'history of', 'study reveals', 'outlook', 'trends in', 'what happened', 'sanctions on',
    'threatens to', 'faces crisis', 'ban on', 'controversy', 'for a test-run', 'what you can expect',
    'test run', 'review:', 'explained:', 'here is what', "here's what"
]

# 5. Words in title that identify news/blogs or media outlets
TITLE_NEWS_OR_BLOG_REGEX = re.compile(
    r'\b(news|blog|blogs|magazine|journal|podcast|webinar|editorial|lifestyle|features)\b',
    re.IGNORECASE
)

TITLE_MEDIA_OUTLETS_REGEX = re.compile(
    r'(-\s*|\b|\|\s*)(The Hindu|Times of India|NDTV|Hindustan Times|Indian Express|India Today|Livemint|Deccan Chronicle|Deccan Herald|The Print|The Wire|The Quint|Moneycontrol|Business Standard|Financial Express|Zee News|News18|Firstpost|Curly Tales|ScoopWhoop|Femina|Vogue|Elle|GQ|Khaleej Times|Gulf News|The National|Arabian Business|Al Jazeera|Daily Mail|The Sun|Mirror|Telegraph|Independent|Guardian|Reuters|Bloomberg|Forbes|BBC|CNN)\b',
    re.IGNORECASE
)

# 6. School / college Q&A, exam homework, or quiz patterns
ACADEMIC_OR_QUIZ_REGEX = re.compile(
    r'\b(ncert|mcq|class 10|class 12|exam question|solution|calculate|if a perfume bottle is opened|textbook solutions?|question and answer|homework help|doubts?)\b',
    re.IGNORECASE
)

MEDIA_DOMAIN_REGEX = re.compile(
    r'\b(news|times|press|daily|gazette|tribune|journal|herald|chronicle|bulletin|observer|telegraph|inquirer)\b',
    re.IGNORECASE
)

# Regional code mapping for DDGS targeted searches
REGION_MAP = {
    'russia': 'ru-ru',
    'russian federation': 'ru-ru',
    'moscow': 'ru-ru',
    'uae': 'ae-en',
    'united arab emirates': 'ae-en',
    'dubai': 'ae-en',
    'abu dhabi': 'ae-en',
    'uk': 'uk-en',
    'united kingdom': 'uk-en',
    'london': 'uk-en',
    'england': 'uk-en',
    'us': 'us-en',
    'usa': 'us-en',
    'united states': 'us-en',
    'america': 'us-en',
    'germany': 'de-de',
    'berlin': 'de-de',
    'france': 'fr-fr',
    'paris': 'fr-fr',
    'italy': 'it-it',
    'spain': 'es-es',
    'canada': 'ca-en',
    'australia': 'au-en',
    'india': 'in-en',
    'singapore': 'sg-en',
    'saudi': 'sa-ar',
    'saudi arabia': 'sa-ar',
    'qatar': 'qa-ar',
    'kuwait': 'kw-ar',
    'turkey': 'tr-tr',
    'china': 'cn-zh',
    'japan': 'jp-jp',
    'brazil': 'br-pt'
}

# Country TLD mapping for regional boosting
COUNTRY_TLD_MAP = {
    'russia': ['.ru', '.su', '.рф'],
    'uae': ['.ae'],
    'united arab emirates': ['.ae'],
    'dubai': ['.ae'],
    'germany': ['.de'],
    'france': ['.fr'],
    'uk': ['.co.uk', '.uk'],
    'united kingdom': ['.co.uk', '.uk'],
    'italy': ['.it'],
    'spain': ['.es'],
    'canada': ['.ca'],
    'australia': ['.com.au', '.au'],
    'india': ['.in', '.co.in']
}

# Russian localized vocabulary for finding local buyers/shops
RUSSIAN_VOCAB = {
    'perfume': 'парфюмерии духов',
    'fragrance': 'парфюмерии',
    'cosmetics': 'косметики',
    'beauty': 'косметики красоты',
    'coffee': 'кофе',
    'tea': 'чая',
    'furniture': 'мебели',
    'tiles': 'плитки керамики',
    'ceramics': 'керамики',
    'shoes': 'обуви',
    'clothing': 'одежды',
    'apparel': 'одежды',
    'electronics': 'электроники',
    'toys': 'игрушек',
    'food': 'продуктов питания',
    'medical': 'медицинских товаров'
}

def clean_domain(url: str) -> str:
    """Extract clean domain name from URL."""
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain.strip()
    except Exception:
        return ""

def is_article_url(url: str) -> bool:
    """Detect if a URL points to an article, news piece, blog post, or editorial headline slug."""
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.lower()
        if not path or path == "/":
            return False

        # 1. Hyphen-dense slugs (headline sentences converted into URLs)
        # Genuine business pages are concise: /products, /catalog, /collections/perfume, /store-locator
        segments = [s for s in path.split('/') if s]
        for seg in segments:
            # If a slug has 3 or more hyphens, or is long with hyphens, it's an article/blog title
            if seg.count('-') >= 3 or (seg.count('-') >= 2 and len(seg) > 25):
                return True

        # 2. Article / media / CMS path tokens
        if ARTICLE_PATH_REGEX.search(path):
            return True
        if re.search(r'article\d+', path):
            return True

        # 3. Editorial CMS file extensions
        if path.endswith(('.ece', '.cms', '.amp')):
            return True

        # 4. Dates in path (e.g. /2024/05/..., /2023-11-04/...)
        if re.search(r'/(19|20)\d{2}[/\-][01]?\d', path):
            return True

        return False
    except Exception:
        return False

def is_valid_client_website(url: str, title: str, snippet: str = "") -> bool:
    """
    Validates that a URL is a genuine commercial client (store, boutique, dealer, showroom),
    and strictly filters out:
    - Other import-export companies or freight/customs intermediaries
    - Social media, marketplaces, and aggregators
    - News articles, newspapers, magazines, media reports, and blogs
    - Homework/academic/quiz sites
    """
    domain = clean_domain(url)
    if not domain or "." not in domain:
        return False

    # Block educational and governmental domains
    if domain.endswith(('.edu', '.gov', '.mil', '.ac.uk', '.edu.ru', '.gov.ru')):
        return False

    # Block known media, marketplace, directory, and social domains
    for kw in IGNORED_BRAND_KEYWORDS:
        if kw in domain:
            return False

    # Block media domain patterns (times, news, gazette, etc.)
    if MEDIA_DOMAIN_REGEX.search(domain):
        # Allow if explicitly e-commerce (e.g. newstore, but not newspaper)
        if not any(k in domain for k in ['store', 'shop', 'brand']):
            return False

    # Block file downloads
    lower_url = url.lower()
    if any(lower_url.endswith(ext) for ext in ['.pdf', '.jpg', '.png', '.doc', '.docx', '.xlsx', '.zip', '.txt']):
        return False

    # If the URL points to an article, news piece, or blog slug, REJECT!
    # (Prevents turning a newspaper article URL into a company homepage)
    if is_article_url(url):
        return False

    # Block editorial/journalistic titles
    t_lower = title.lower()
    for phrase in EDITORIAL_PHRASES:
        if phrase in t_lower:
            return False

    # Block titles identifying as news, blogs, or known media publications
    if TITLE_NEWS_OR_BLOG_REGEX.search(title):
        return False
    if TITLE_MEDIA_OUTLETS_REGEX.search(title):
        return False

    # Block academic, quiz, homework, or theoretical questions
    combined_meta = f"{title} {snippet}".lower()
    if ACADEMIC_OR_QUIZ_REGEX.search(combined_meta):
        return False

    # Block intermediaries (freight forwarders, customs brokers, generic import-export agencies)
    combined_text = f"{url} {title} {snippet}".lower()
    for ik in INTERMEDIARY_KEYWORDS:
        if ik in combined_text:
            return False

    return True

def get_region_for_location(location: str) -> str:
    """Detect regional search code for DuckDuckGo based on location."""
    loc_clean = location.lower().strip()
    for key, reg in REGION_MAP.items():
        if key in loc_clean:
            return reg
    return "wt-wt"  # Worldwide fallback

def discover_websites(niche: str, location: str, max_results: int = 20) -> List[Dict[str, Any]]:
    """
    Search DuckDuckGo specifically for CLIENTS (Boutiques, Retailers, Stores, Showrooms, Dealers)
    in the requested domain and location.
    
    Excludes import-export houses, logistics, news, and aggregators.
    """
    niche = niche.strip()
    location = location.strip()
    
    if not niche and not location:
        return []

    # Detect region code for targeted geographical search
    region_code = get_region_for_location(location)
    loc_lower = location.lower()

    # Build queries focused strictly on CLIENTS (stores, shops, boutiques, showrooms, dealers)
    queries = []
    if niche and location:
        # Client Query 1: Showrooms, Boutiques, Stores, Dealerships
        queries.append(f'"{niche}" (store OR shop OR boutique OR showroom OR dealer OR retailer OR stockist) "{location}" catalog')
        
        # Client Query 2: Retail networks and local sales dealers
        queries.append(f'"{niche}" (retailers OR boutique chain OR dealers OR salon) "{location}"')

        # Client Query 3: Localized language query if location is Russia
        if 'russia' in loc_lower or 'moscow' in loc_lower:
            ru_niche = niche
            for en_k, ru_v in RUSSIAN_VOCAB.items():
                if en_k in niche.lower():
                    ru_niche = ru_v
                    break
            queries.append(f'магазин {ru_niche} {location} бутик купить каталог')
            queries.append(f'бутик селективной {ru_niche} {location}')
        else:
            queries.append(f'{niche} stores shops showrooms in {location} official website')
    elif niche:
        queries.append(f'"{niche}" (store OR shop OR boutique OR showroom OR dealer) catalog')
    else:
        queries.append(f'retail stores boutiques showrooms in "{location}"')

    raw_candidates: List[Dict[str, Any]] = []
    seen_domains: Set[str] = set()

    # Use verify=False to avoid LibreSSL / OpenSSL TLS 1.3 version issues on macOS
    try:
        ddgs = DDGS(verify=False)
    except Exception:
        ddgs = None

    if not ddgs:
        return []

    fetch_per_query = max(20, (max_results * 2) // len(queries))
    expected_tlds = COUNTRY_TLD_MAP.get(loc_lower, [])

    for q in queries:
        try:
            results = list(ddgs.text(q, region=region_code, max_results=fetch_per_query))
        except Exception:
            continue
            
        for r in results:
            raw_url = r.get("href", "")
            title = r.get("title", "")
            snippet = r.get("body", "")
            
            # Apply client validation (filters out intermediaries, news, blogs, aggregators)
            if not is_valid_client_website(raw_url, title, snippet):
                continue
                
            domain = clean_domain(raw_url)
            if domain in seen_domains:
                continue
                
            parsed = urllib.parse.urlparse(raw_url)
            clean_url = f"{parsed.scheme}://{parsed.netloc}"
            
            # Relevance scoring for target clients:
            score = 0
            # Country-specific TLD (e.g. .ru for Russia, .ae for UAE)
            if any(domain.endswith(tld) for tld in expected_tlds):
                score += 6
            if loc_lower and loc_lower in domain:
                score += 4
            if loc_lower and loc_lower in title.lower():
                score += 3
            if loc_lower and loc_lower in snippet.lower():
                score += 2
                
            # Buyer/Client intent words (boutique, store, shop, dealer, showroom)
            t_lower = title.lower()
            if any(k in t_lower for k in ['boutique', 'бутик', 'магазин', 'store', 'shop', 'showroom', 'шоурум', 'dealer', 'дилер', 'stockist', 'retail']):
                score += 4

            seen_domains.add(domain)
            raw_candidates.append({
                "domain": domain,
                "url": clean_url,
                "page_url": raw_url,
                "title": title or domain,
                "snippet": snippet,
                "score": score
            })

    # Sort candidates by client relevance score (highest location & buyer match first)
    raw_candidates.sort(key=lambda x: x["score"], reverse=True)

    # Return top requested count without the internal score field
    cleaned_results = []
    for c in raw_candidates[:max_results]:
        cleaned_results.append({
            "domain": c["domain"],
            "url": c["url"],
            "page_url": c["page_url"],
            "title": c["title"],
            "snippet": c["snippet"]
        })

    return cleaned_results
