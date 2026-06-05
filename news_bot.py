
import os
import json
import time
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Configuration
CLOUD_SYNC_URL = 'https://api.jsonblob.com/api/jsonBlob/019e9595-9417-74e7-b54b-b48f676cc642'
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Common User-Agent to avoid being blocked by servers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/xml, */*',
}

FEEDS_TO_TRY = [
    {'url': 'https://feeds.feedburner.com/TechCrunch', 'cat': 'Tech'},
    {'url': 'https://feeds.bbci.co.uk/sport/rss.xml', 'cat': 'Sports'},
    {'url': 'https://variety.com/feed/', 'cat': 'Entertainment'},
    {'url': 'https://www.standardmedia.co.ke/rss/headlines.php', 'cat': 'Local News'},
    {'url': 'https://www.kenyanews.go.ke/feed/', 'cat': 'Local News'},
    {'url': 'https://www.kenyans.co.ke/feeds/news', 'cat': 'Local News'},
    {'url': 'https://nairobiwire.com/feed', 'cat': 'Local News'},
]

MAX_ARTICLES_PER_RUN = 3

def fetch_rss_feed(feed_url):
    try:
        response = requests.get(feed_url, headers=HEADERS, timeout=20, allow_redirects=True)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error fetching RSS feed {feed_url}: {e}")
        return None

def parse_rss_feed(xml_content, category):
    articles = []
    if not xml_content: return articles
    try:
        xml_str = xml_content.decode('utf-8', errors='ignore').strip()
        start_idx = xml_str.find('<')
        if start_idx == -1: return articles
        xml_str = xml_str[start_idx:]
        root = ET.fromstring(xml_str)
        ns = {'content': 'http://purl.org/rss/1.0/modules/content/', 'atom': 'http://www.w3.org/2005/Atom'}
        items = root.findall('.//item') or root.findall('.//atom:entry', ns) or root.findall('.//entry')
        for item in items:
            def get_text(tag_names):
                for tag in tag_names:
                    for prefix, uri in ns.items():
                        el = item.find(f'{{{uri}}}{tag}')
                        if el is not None and el.text: return el.text.strip()
                    el = item.find(tag)
                    if el is not None and el.text: return el.text.strip()
                return ''
            title = get_text(['title'])
            description = get_text(['encoded', 'description', 'summary', 'content'])
            link_el = item.find('link') or item.find('atom:link', ns)
            link = link_el.attrib.get('href') or link_el.text or '' if link_el is not None else ''
            if title and description:
                import re
                clean_desc = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', description, flags=re.DOTALL)
                clean_desc = re.sub(r'<[^>]*>', ' ', clean_desc)
                clean_desc = ' '.join(clean_desc.split()).strip()
                if clean_desc:
                    articles.append({'title': title, 'desc': clean_desc[:1000], 'cat': category, 'link': link.strip()})
    except Exception as e:
        print(f"Error parsing {category} feed: {e}")
    return articles

def rewrite_article_with_openai(title, description, category, api_key):
    if not api_key: return None
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'}
    payload = {
        'model': 'gpt-4o-mini',
        'messages': [{'role': 'user', 'content': f"Rewrite this {category} news story for Jaimbo.live (Kenyan audience). Original headline: {title}. Summary: {description}. Output ONLY a JSON object with 'title' and 'content' keys."}],
        'temperature': 0.8,
        'max_tokens': 1000
    }
    for attempt in range(3):
        try:
            response = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload, timeout=60)
            if response.status_code == 429:
                time.sleep((attempt + 1) * 30); continue
            response.raise_for_status()
            raw = response.json()['choices'][0]['message']['content'].strip()
            import re
            match = re.search(r'(\{.*\})', raw, re.DOTALL)
            if match: raw = match.group(1)
            parsed = json.loads(raw)
            if parsed.get('title') and parsed.get('content'):
                return {'title': parsed['title'].strip(), 'content': parsed['content'].strip()}
        except Exception: time.sleep(10)
    return None

def get_current_cloud_data():
    try:
        # Try fetching without the timestamp query param first, as some APIs dislike it
        response = requests.get(CLOUD_SYNC_URL, headers=HEADERS, timeout=20)
        
        if not response.ok:
            print(f"Cloud fetch failed with status {response.status_code}")
            return None
            
        content = response.text.strip()
        if not content:
            print("Cloud storage returned an empty response.")
            return None
            
        try:
            return response.json()
        except json.JSONDecodeError as je:
            print(f"Cloud storage did not return valid JSON. First 50 chars: {content[:50]}")
            # If it looks like HTML, the server might be blocking the request
            if content.lower().startswith('<!doctype') or content.lower().startswith('<html'):
                print("Error: The cloud server returned an HTML page (possibly a block or challenge) instead of data.")
            return None
            
    except Exception as e:
        print(f"Error fetching cloud data: {e}")
        return None

def update_cloud_data(data):
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.put(CLOUD_SYNC_URL, headers=headers, json=data, timeout=20)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Error updating cloud data: {e}")
        return False

def main():
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not set.")
        return

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting news bot run...")
    
    current_data = get_current_cloud_data()
    if not current_data:
        print("Failed to load existing website data. Aborting to prevent data loss.")
        return

    all_candidates = []
    for feed_config in FEEDS_TO_TRY:
        print(f"Fetching {feed_config['cat']}...")
        content = fetch_rss_feed(feed_config['url'])
        feed_articles = parse_rss_feed(content, feed_config['cat'])
        all_candidates.extend(feed_articles)

    if not all_candidates:
        print("No articles found in any feeds.")
        return

    existing_titles = set(a['title'].lower() for a in current_data.get('articles', []))
    new_candidates = [c for c in all_candidates if c['title'].lower() not in existing_titles]

    if not new_candidates:
        print("No new articles to process.")
        return

    print(f"Processing {min(len(new_candidates), MAX_ARTICLES_PER_RUN)} new articles...")
    published = 0
    for i, candidate in enumerate(new_candidates[:MAX_ARTICLES_PER_RUN]):
        if i > 0: time.sleep(15)
        print(f"Rewriting: {candidate['title'][:50]}...")
        rewritten = rewrite_article_with_openai(candidate['title'], candidate['desc'], candidate['cat'], OPENAI_API_KEY)
        if rewritten:
            article = {
                'id': f"art_{int(datetime.now(timezone.utc).timestamp())}_{i}",
                'title': rewritten['title'],
                'content': rewritten['content'],
                'image': '',
                'category': candidate['cat'],
                'sourceUrl': candidate['link'],
                'autoPosted': True,
                'date': datetime.now(timezone.utc).isoformat()
            }
            current_data.setdefault('articles', []).append(article)
            published += 1
            print(f"Success: {rewritten['title'][:50]}...")
        
    if published > 0:
        if update_cloud_data(current_data):
            print(f"Successfully published {published} articles.")
        else:
            print("Failed to save to cloud.")
    
    print("Run finished.")

if __name__ == '__main__':
    main()
