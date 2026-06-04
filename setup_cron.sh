#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Jaimbo News Bot — Cron Setup Script
# Run this script ONCE on your server to schedule the bot every hour.
# Usage: bash setup_cron.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(which python3)"
CRON_JOB="0 * * * * $PYTHON $SCRIPT_DIR/news_bot.py >> $SCRIPT_DIR/news_bot.log 2>&1"

echo "Setting up hourly cron job for Jaimbo News Bot..."

# Check if the cron job already exists
if crontab -l 2>/dev/null | grep -qF "news_bot.py"; then
    echo "✓ Cron job already exists. No changes made."
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Cron job added! The bot will run every hour at :00."
fi

echo ""
echo "Current crontab:"
crontab -l
echo ""
echo "To remove the cron job later, run: crontab -e"
echo "To run the bot manually right now: python3 $SCRIPT_DIR/news_bot.py"
