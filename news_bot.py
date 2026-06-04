#!/usr/bin/env python3
"""
Jaimbo News Bot
===============
Fetches RSS feeds across Tech, Sports, Entertainment, and Local/Kenya news,
AI-rewrites each article as original content, then publishes it directly to
the jaimbo.live JSONBlob cloud database — exactly the same way the admin
panel does.

Run manually:   python3 news_bot.py
Run on a timer: python3 news_bot.py --daemon   (loops every 60 minutes)
"""

import os
import sys
import json
import time
import hashlib
import logging
import argparse
import datetime
import requests
import feedparser
from openai import OpenAI

# ─── Configuration ─────────────────────────────────────────────────────────────

CLOUD_SYNC_URL = "https://api.jsonblob.com/api/jsonBlob/019e8dd0-64e5-7e8f-bf0d-e4e6d53de83a"

# How many articles to fetch per category per run
MAX_PER_CATEGORY = 2

# How many total new articles to publish per run (safety cap)
MAX_PER_RUN = 6

# Path to the file that tracks already-posted article IDs (prevents duplicates)
SEEN_IDS_FILE = os.path.join(os.path.dirname(__file__), "seen_ids.json")

# ─── RSS Feed Sources ──────────────────────────────────────────────────────────

RSS_FEEDS = {
    "Tech": [
        "https://feeds.feedburner.com/TechCrunch",
        "https://www.theverge.com/rss/index.xml",
        "https://feeds.arstechnica.com/arstechnica/index",
        "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    ],
    "Sports": [
        "https://www.espn.com/espn/rss/news",
        "https://feeds.bbci.co.uk/sport/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml",
        "https://www.skysports.com/rss/12040",
    ],
    "Entertainment": [
        "https://variety.com/feed/",
        "https://feeds.feedburner.com/deadline/breaking-news",
        "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml",
        "https://www.hollywoodreporter.com/feed/",
    ],
    "Local News": [
        "https://www.standardmedia.co.ke/rss/headlines.php",
        "https://citizentv.co.ke/feed/",
        "https://www.kbc.co.ke/feed/",
        "https://www.the-star.co.ke/rss",
        "https://nation.africa/kenya/rss",
    ],
}

# ─── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), "news_bot.log")),
    ],
)
log = logging.getLogger("JaimboNewsBot")

# ─── OpenAI client ─────────────────────────────────────────────────────────────

client = OpenAI()  # Uses OPENAI_API_KEY and OPENAI_API_BASE from environment


# ─── Helpers ───────────────────────────────────────────────────────────────────

def load_seen_ids() -> set:
    """Load the set of article IDs that have already been posted."""
    if os.path.exists(SEEN_IDS_FILE):
        try:
            with open(SEEN_IDS_FILE, "r") as f:
                data = json.load(f)
                return set(data.get("ids", []))
        except Exception:
            pass
    return set()


def save_seen_ids(ids: set):
    """Persist the seen IDs, keeping only the most recent 2000 to avoid unbounded growth."""
    ids_list = list(ids)[-2000:]
    with open(SEEN_IDS_FILE, "w") as f:
        json.dump({"ids": ids_list, "updated": datetime.datetime.utcnow().isoformat()}, f, indent=2)


def article_id(entry) -> str:
    """Generate a stable unique ID for an RSS entry."""
    raw = (entry.get("id") or entry.get("link") or entry.get("title") or "")
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def fetch_feed(url: str, category: str) -> list:
    """Fetch and parse an RSS feed, returning a list of entry dicts."""
    try:
        feed = feedparser.parse(url, request_headers={"User-Agent": "JaimboNewsBot/1.0"})
        entries = []
        for entry in feed.entries[:8]:
            title = entry.get("title", "").strip()
            summary = (
                entry.get("summary")
                or entry.get("description")
                or entry.get("content", [{}])[0].get("value", "")
                or ""
            ).strip()
            link = entry.get("link", "").strip()
            if not title or not summary:
                continue
            # Strip HTML tags from summary
            import re
            summary = re.sub(r"<[^>]+>", " ", summary).strip()
            summary = re.sub(r"\s+", " ", summary)
            entries.append({
                "id": article_id(entry),
                "title": title,
                "summary": summary[:1200],  # cap to avoid huge prompts
                "link": link,
                "category": category,
            })
        log.info(f"  Fetched {len(entries)} entries from {url}")
        return entries
    except Exception as e:
        log.warning(f"  Failed to fetch {url}: {e}")
        return []


def rewrite_article(title: str, summary: str, category: str) -> dict:
    """
    Use AI to rewrite the article as original content for Jaimbo.live.
    Returns a dict with 'title' and 'content' keys.
    """
    prompt = f"""You are a professional news writer for Jaimbo.live, a Kenyan digital media platform.

Rewrite the following {category} news story as a completely original article. 
- Write a new, engaging headline (do NOT copy the original title)
- Write 3-5 paragraphs of original body text, presenting the information in your own words
- Use a conversational yet professional tone that resonates with a Kenyan/African audience
- Do NOT mention the original source or use phrases like "according to" or "the original article"
- Do NOT include any meta-commentary like "Here is the rewritten article"
- Output format: Return ONLY a JSON object with two keys: "title" (string) and "content" (string)

Original headline: {title}

Original summary: {summary}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=900,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        if "title" in result and "content" in result:
            return result
    except json.JSONDecodeError:
        # Fallback: treat entire response as content
        pass
    except Exception as e:
        log.error(f"  AI rewrite failed: {e}")
        return None

    # Fallback if JSON parsing fails
    try:
        return {
            "title": f"Breaking: {title}",
            "content": response.choices[0].message.content.strip()
        }
    except Exception:
        return None


def load_cloud_state() -> dict:
    """Fetch the current state from the JSONBlob cloud database."""
    try:
        res = requests.get(CLOUD_SYNC_URL, timeout=15)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        log.error(f"Failed to load cloud state: {e}")
        return None


def save_cloud_state(state: dict) -> bool:
    """Push the updated state back to the JSONBlob cloud database."""
    try:
        state["lastUpdated"] = datetime.datetime.utcnow().isoformat() + "Z"
        res = requests.put(
            CLOUD_SYNC_URL,
            headers={"Content-Type": "application/json"},
            data=json.dumps(state),
            timeout=20,
        )
        res.raise_for_status()
        return True
    except Exception as e:
        log.error(f"Failed to save cloud state: {e}")
        return False


# ─── Main Bot Logic ─────────────────────────────────────────────────────────────

def run_once():
    """Execute one full cycle: fetch → rewrite → publish."""
    log.info("=" * 60)
    log.info("Jaimbo News Bot — starting run")
    log.info("=" * 60)

    seen_ids = load_seen_ids()
    log.info(f"Loaded {len(seen_ids)} previously seen article IDs")

    # ── Step 1: Fetch RSS feeds ──────────────────────────────────────────────
    candidates = []
    for category, urls in RSS_FEEDS.items():
        log.info(f"\nFetching category: {category}")
        cat_entries = []
        for url in urls:
            entries = fetch_feed(url, category)
            for e in entries:
                if e["id"] not in seen_ids:
                    cat_entries.append(e)
            if len(cat_entries) >= MAX_PER_CATEGORY:
                break
        chosen = cat_entries[:MAX_PER_CATEGORY]
        log.info(f"  → {len(chosen)} new articles selected for {category}")
        candidates.extend(chosen)

    if not candidates:
        log.info("No new articles found this run. All feeds are up to date.")
        return

    # Cap total articles per run
    candidates = candidates[:MAX_PER_RUN]
    log.info(f"\nTotal articles to publish this run: {len(candidates)}")

    # ── Step 2: Load cloud state ─────────────────────────────────────────────
    state = load_cloud_state()
    if state is None:
        log.error("Cannot proceed — failed to load cloud state.")
        return

    if not isinstance(state.get("articles"), list):
        state["articles"] = []

    # ── Step 3: Rewrite and publish each article ─────────────────────────────
    published_count = 0
    for entry in candidates:
        log.info(f"\nProcessing: {entry['title'][:80]}…")
        rewritten = rewrite_article(entry["title"], entry["summary"], entry["category"])
        if not rewritten:
            log.warning("  Skipping — AI rewrite returned nothing.")
            seen_ids.add(entry["id"])
            continue

        article = {
            "id": f"art_{int(time.time() * 1000)}_{entry['id'][:8]}",
            "title": rewritten["title"],
            "content": rewritten["content"],
            "image": "",
            "category": entry["category"],
            "sourceUrl": entry["link"],
            "autoPosted": True,
            "date": datetime.datetime.utcnow().isoformat() + "Z",
        }

        state["articles"].append(article)
        seen_ids.add(entry["id"])
        published_count += 1
        log.info(f"  ✓ Queued: \"{rewritten['title'][:70]}\"")
        time.sleep(1)  # small delay between AI calls

    # ── Step 4: Save to cloud ────────────────────────────────────────────────
    if published_count > 0:
        log.info(f"\nSaving {published_count} new article(s) to jaimbo.live…")
        ok = save_cloud_state(state)
        if ok:
            log.info(f"✓ Successfully published {published_count} article(s) to jaimbo.live!")
        else:
            log.error("✗ Failed to save to cloud. Articles NOT published.")
    else:
        log.info("No articles were published this run.")

    save_seen_ids(seen_ids)
    log.info(f"\nRun complete. Seen IDs cache now has {len(seen_ids)} entries.")


def run_daemon(interval_minutes: int = 60):
    """Run the bot in a loop, executing every `interval_minutes` minutes."""
    log.info(f"Starting Jaimbo News Bot daemon — running every {interval_minutes} minutes")
    while True:
        try:
            run_once()
        except Exception as e:
            log.error(f"Unexpected error during run: {e}", exc_info=True)
        next_run = datetime.datetime.now() + datetime.timedelta(minutes=interval_minutes)
        log.info(f"Next run scheduled at: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        time.sleep(interval_minutes * 60)


# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Jaimbo News Bot")
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run continuously, fetching and posting every hour",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Interval in minutes between runs (default: 60)",
    )
    args = parser.parse_args()

    if args.daemon:
        run_daemon(args.interval)
    else:
        run_once()
