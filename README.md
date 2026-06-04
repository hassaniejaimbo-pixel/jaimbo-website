# Jaimbo News Bot

Automatically fetches news from RSS feeds, AI-rewrites each article as original content, and publishes it directly to **jaimbo.live** — using the same cloud sync endpoint as your admin panel.

---

## What It Does

Every hour the bot:
1. Pulls fresh articles from RSS feeds across **Tech, Sports, Entertainment, and Local/Kenya News**
2. Sends each article to an AI that **fully rewrites it** in a new voice — new headline, new paragraphs, original tone
3. Publishes up to **6 new articles per run** directly to your JSONBlob database
4. Tracks already-posted articles in `seen_ids.json` to **never post the same story twice**

---

## Files

| File | Purpose |
|------|---------|
| `news_bot.py` | Main bot script |
| `seen_ids.json` | Auto-created — tracks posted article IDs |
| `news_bot.log` | Auto-created — full activity log |
| `setup_cron.sh` | One-click hourly cron setup |
| `jaimbo-news-bot.service` | Systemd service (for Linux servers) |
| `admin.html` | Your updated admin panel (with Auto News tab) |

---

## Quick Start

### Option 1 — Run Once (Test)
```bash
python3 news_bot.py
```

### Option 2 — Run Every Hour (Cron)
```bash
bash setup_cron.sh
```

### Option 3 — Run as a Background Service (systemd)
```bash
sudo cp jaimbo-news-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable jaimbo-news-bot
sudo systemctl start jaimbo-news-bot
sudo systemctl status jaimbo-news-bot
```

---

## Requirements

- Python 3.8+
- `pip install feedparser openai requests`
- `OPENAI_API_KEY` environment variable set

### Setting the OpenAI API Key
```bash
# Add to ~/.bashrc or ~/.profile for persistence:
export OPENAI_API_KEY="sk-your-key-here"
```

---

## Customisation

Open `news_bot.py` and edit the top section:

```python
MAX_PER_CATEGORY = 2   # Articles fetched per category per run
MAX_PER_RUN = 6        # Total articles published per run (safety cap)
```

To add or change RSS feeds, edit the `RSS_FEEDS` dictionary:
```python
RSS_FEEDS = {
    "Tech": ["https://feeds.feedburner.com/TechCrunch", ...],
    "Sports": [...],
    "Entertainment": [...],
    "Local News": [...],
}
```

---

## Admin Panel — Auto News Tab

Your `admin.html` has been updated with a new **"Auto News"** tab in the sidebar. From there you can:
- See the bot status and last run time
- Preview the most recently auto-posted articles
- Manually trigger a fetch right from the browser (using your OpenAI key)
- Delete any auto-posted article you don't want

---

## Troubleshooting

**Articles not appearing on the website?**
- Check `news_bot.log` for errors
- Verify your internet connection
- The JSONBlob endpoint may occasionally be slow — wait 30 seconds and refresh

**AI rewrite errors?**
- Ensure `OPENAI_API_KEY` is set correctly
- Check your OpenAI account has available credits

**Duplicate articles?**
- The `seen_ids.json` file prevents duplicates. Do not delete it unless you want to re-post old articles.
