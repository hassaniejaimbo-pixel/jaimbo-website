
import os
import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Configuration
CLOUD_SYNC_URL = 'https://api.jsonblob.com/api/jsonBlob/019e9595-9417-74e7-b54b-b48f676cc642'
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Common User-Agent to avoid being blocked by servers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

FEEDS_TO_TRY = [
    {'url': 'https://feeds.feedburner.com/TechCrunch', 'cat': 'Tech'},
    {'url': 'https://feeds.bbci.co.uk/sport/rss.xml', 'cat': 'Sports'},
    {'url': 'https://variety.com/feed/', 'cat': 'Entertainment'},
    {'url': 'https://www.standardmedia.co.ke/rss/headlines.php', 'cat': 'Local News'},
    {'url': 'https://citizentv.co.ke/feed/', 'cat': 'Local News'},
]

MAX_ARTICLES_PER_RUN = 3 # Max articles to rewrite and publish per bot run

def fetch_rss_feed(feed_url):
    try:
        response = requests.get(feed_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        return response.content # Use content to handle encoding better
    except requests.exceptions.RequestException as e:
        print(f"Error fetching RSS feed {feed_url}: {e}")
        return None

def parse_rss_feed(xml_content, category):
    articles = []
    if not xml_content:
        return articles
        
    try:
        # Some feeds have leading whitespace or BOM, strip it
        xml_str = xml_content.decode('utf-8', errors='ignore').strip()
        if not xml_str.startswith('<'):
            # Try to find the start of the XML
            start_idx = xml_str.find('<')
            if start_idx != -1:
                xml_str = xml_str[start_idx:]
            else:
                print(f"Invalid XML content for {category}")
                return articles

        root = ET.fromstring(xml_str)
        
        # Handle both RSS (item) and Atom (entry)
        items = root.findall('.//item') or root.findall('.//{http://www.w3.org/2005/Atom}entry') or root.findall('entry')
        
        for item in items:
            def get_text(tag_name):
                # Try plain tag, then Atom namespace
                for name in [tag_name, f'{{http://www.w3.org/2005/Atom}}{tag_name}']:
                    el = item.find(name)
                    if el is not None and el.text:
                        return el.text.strip()
                return ''

            title = get_text('title')
            # Try various content/description tags
            description = get_text('description') or get_text('summary') or get_text('content')
            
            # Extract link
            link = ''
            link_el = item.find('link') or item.find('{http://www.w3.org/2005/Atom}link')
            if link_el is not None:
                link = link_el.attrib.get('href') or link_el.text or ''

            if title and description:
                # Basic HTML stripping
                clean_desc = description.replace('<p>', ' ').replace('</p>', ' ').replace('<br>', ' ').replace('<br/>', ' ')
                clean_desc = ' '.join(clean_desc.split()) # Normalize whitespace
                
                # Simple tag removal
                import re
                clean_desc = re.sub('<[^>]*>', '', clean_desc).strip()
                
                if clean_desc:
                    articles.append({
                        'title': title,
                        'desc': clean_desc[:800],
                        'cat': category,
                        'link': link.strip()
                    })
    except Exception as e:
        print(f"Error parsing {category} feed: {e}")
    return articles

def rewrite_article_with_openai(title, description, category, api_key):
    if not api_key:
        print("OpenAI API key not set. Skipping AI rewrite.")
        return None

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    payload = {
        'model': 'gpt-4o-mini',
        'messages': [{
            'role': 'user',
            'content': f"""You are a professional news writer for Jaimbo.live, a Kenyan digital media platform.\n\nRewrite the following {category} news story as a completely original article.\n- Write a new, engaging headline\n- Write 3-4 paragraphs of original body text in your own words\n- Use a conversational yet professional tone for a Kenyan/African audience\n- Do NOT mention the original source\n- Output ONLY a JSON object with keys: "title" (string) and "content" (string)\n\nOriginal headline: {title}\n\nOriginal summary: {description}"""
        }],
        'temperature': 0.8,
        'max_tokens': 800
    }

    try:
        response = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        ai_data = response.json()
        
        raw_content = ai_data['choices'][0]['message']['content'].strip()
        
        # Extract JSON from markdown or text
        if '```' in raw_content:
            import re
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_content, re.DOTALL)
            if match:
                raw_content = match.group(1)
        
        if not raw_content.startswith('{'):
            import re
            match = re.search(r'(\{.*\})', raw_content, re.DOTALL)
            if match:
                raw_content = match.group(1)

        parsed_content = json.loads(raw_content)
        if parsed_content.get('title') and parsed_content.get('content'):
            return {
                'title': parsed_content['title'].strip(),
                'content': parsed_content['content'].strip()
            }
    except Exception as e:
        print(f"AI rewrite failed: {e}")
    return None

def get_current_cloud_data():
    try:
        response = requests.get(f"{CLOUD_SYNC_URL}?_={datetime.now().timestamp()}", headers=HEADERS, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching cloud data: {e}")
        return None

def update_cloud_data(data):
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.put(CLOUD_SYNC_URL, headers=headers, json=data, timeout=15)
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
    all_candidates = []
    for feed_config in FEEDS_TO_TRY:
        print(f"Fetching {feed_config['cat']}...")
        content = fetch_rss_feed(feed_config['url'])
        feed_articles = parse_rss_feed(content, feed_config['cat'])
        print(f"Found {len(feed_articles)} articles in {feed_config['cat']}.")
        all_candidates.extend(feed_articles)

    if not all_candidates:
        print("No articles found in any feeds.")
        return

    current_data = get_current_cloud_data()
    if not current_data:
        return

    existing_titles = set(a['title'].lower() for a in current_data.get('articles', []))
    new_candidates = [c for c in all_candidates if c['title'].lower() not in existing_titles]

    if not new_candidates:
        print("No new articles to process.")
        return

    print(f"Processing {min(len(new_candidates), MAX_ARTICLES_PER_RUN)} new articles...")
    published = 0
    for i, candidate in enumerate(new_candidates[:MAX_ARTICLES_PER_RUN]):
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
