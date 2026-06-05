
import os
import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Configuration
CLOUD_SYNC_URL = 'https://api.jsonblob.com/api/jsonBlob/019e9595-9417-74e7-b54b-b48f676cc642'
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

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
        response = requests.get(feed_url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching RSS feed {feed_url}: {e}")
        return None

def parse_rss_feed(xml_content, category):
    articles = []
    try:
        root = ET.fromstring(xml_content)
        items = root.findall('.//item') + root.findall('.//entry')
        for item in items:
            title = item.find('title')
            description = item.find('description') or item.find('summary') or item.find('content')
            link = item.find('link')

            if title is not None and description is not None:
                clean_desc = requests.utils.unquote(description.text or '').replace('<p>', '').replace('</p>', '').strip()
                if clean_desc:
                    articles.append({
                        'title': title.text.strip(),
                        'desc': clean_desc[:800], # Truncate description
                        'cat': category,
                        'link': link.attrib.get('href') if link is not None and 'href' in link.attrib else (link.text.strip() if link is not None else '')
                    })
    except ET.ParseError as e:
        print(f"Error parsing XML feed: {e}")
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
        
        if not ai_data.get('choices') or not ai_data['choices'][0].get('message'):
            print(f"Invalid OpenAI response structure: {ai_data}")
            return None
            
        raw_content = ai_data['choices'][0]['message']['content'].strip()
        
        # Robust JSON extraction
        if raw_content.startswith('```'):
            match = raw_content.find('```json')
            if match != -1:
                raw_content = raw_content[match + len('```json'):].strip()
                raw_content = raw_content[:raw_content.rfind('```')].strip()
            else:
                match = raw_content.find('```')
                if match != -1:
                    raw_content = raw_content[match + len('```'):].strip()
                    raw_content = raw_content[:raw_content.rfind('```')].strip()

        if not raw_content.startswith('{'):
            json_start = raw_content.find('{')
            json_end = raw_content.rfind('}')
            if json_start != -1 and json_end != -1 and json_end > json_start:
                raw_content = raw_content[json_start : json_end + 1]

        parsed_content = json.loads(raw_content)
        if parsed_content.get('title') and parsed_content.get('content'):
            return {
                'title': parsed_content['title'].strip(),
                'content': parsed_content['content'].strip()
            }
        else:
            print(f"Missing title or content in AI response: {parsed_content}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenAI API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"OpenAI API response error: {e.response.text}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from OpenAI response: {e}")
        print(f"Raw AI content: {raw_content}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during AI rewrite: {e}")
        return None

def get_current_cloud_data():
    try:
        response = requests.get(f"{CLOUD_SYNC_URL}?_={datetime.now().timestamp()}", timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching current cloud data: {e}")
        return None

def update_cloud_data(data):
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.put(CLOUD_SYNC_URL, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        print("Cloud data updated successfully.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error updating cloud data: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Cloud API response error: {e.response.text}")
        return False

def main():
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set it before running the bot. Example: export OPENAI_API_KEY=\'sk-YOUR_KEY\'")
        return

    print("Starting news bot run...")
    all_candidates = []
    for feed_config in FEEDS_TO_TRY:
        xml_content = fetch_rss_feed(feed_config['url'])
        if xml_content:
            all_candidates.extend(parse_rss_feed(xml_content, feed_config['cat']))

    if not all_candidates:
        print("No new articles found in RSS feeds.")
        return

    current_cloud_data = get_current_cloud_data()
    if current_cloud_data is None:
        print("Could not retrieve current cloud data. Exiting.")
        return

    existing_article_titles = set(a['title'].lower() for a in current_cloud_data.get('articles', []))
    new_articles_to_process = []
    for candidate in all_candidates:
        if candidate['title'].lower() not in existing_article_titles:
            new_articles_to_process.append(candidate)

    if not new_articles_to_process:
        print("No new unique articles to process after deduplication.")
        return

    print(f"Found {len(new_articles_to_process)} new unique articles to process.")
    published_count = 0
    for i, article_candidate in enumerate(new_articles_to_process[:MAX_ARTICLES_PER_RUN]):
        print(f"Rewriting article {i+1}/{min(len(new_articles_to_process), MAX_ARTICLES_PER_RUN)}: {article_candidate['title']}")
        rewritten = rewrite_article_with_openai(
            article_candidate['title'],
            article_candidate['desc'],
            article_candidate['cat'],
            OPENAI_API_KEY
        )

        if rewritten:
            new_article = {
                'id': f"art_{int(datetime.now(timezone.utc).timestamp())}_{i}",
                'title': rewritten['title'],
                'content': rewritten['content'],
                'image': '', # AI doesn't generate images, leave empty
                'category': article_candidate['cat'],
                'sourceUrl': article_candidate['link'],
                'autoPosted': True,
                'date': datetime.now(timezone.utc).isoformat()
            }
            current_cloud_data.setdefault('articles', []).append(new_article)
            published_count += 1
        else:
            print(f"Failed to rewrite article: {article_candidate['title']}")

    if published_count > 0:
        print(f"Attempting to save {published_count} new articles to cloud...")
        if update_cloud_data(current_cloud_data):
            print(f"Successfully published {published_count} new articles.")
        else:
            print("Failed to save new articles to cloud.")
    else:
        print("No articles were successfully rewritten and published.")

    print("News bot run finished.")

if __name__ == '__main__':
    main()
