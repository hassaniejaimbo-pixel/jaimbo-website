
#!/bin/bash

# This script sets up a cron job to run news_bot.py hourly.

# --- Prerequisites ---
# 1. Python 3 must be installed on your server.
# 2. The 'requests' library must be installed: pip3 install requests lxml
# 3. Your OpenAI API key must be set as an environment variable.
#    Example: export OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY"
#    For cron, it's best to set this directly in the cron job or in a file sourced by cron.

# --- Setup Instructions ---
# 1. Make sure news_bot.py is in the same directory as this script.
# 2. Make this script executable: chmod +x setup_cron.sh
# 3. Run this script: ./setup_cron.sh

# --- Configuration ---
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BOT_PATH="${SCRIPT_DIR}/news_bot.py"
LOG_PATH="${SCRIPT_DIR}/news_bot_cron.log"

# --- Check for OPENAI_API_KEY ---
if [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: OPENAI_API_KEY environment variable is not set."
    echo "The news bot will NOT run correctly without it."
    echo "Please set it before scheduling the cron job, or add it directly to the cron entry."
    echo "Example: export OPENAI_API_KEY=\"sk-YOUR_OPENAI_KEY\""
    read -p "Do you want to proceed without setting OPENAI_API_KEY now? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[yY]$ ]]; then
        echo "Aborting cron setup. Please set OPENAI_API_KEY and re-run."
        exit 1
    fi
fi

# --- Install Python dependencies ---
echo "Installing Python dependencies (requests, lxml)..."
pip3 install requests lxml

# --- Setup Cron Job ---
# Remove any existing news_bot cron jobs to prevent duplicates
(crontab -l 2>/dev/null | grep -v -F "${BOT_PATH}") | crontab -

# Add the new cron job
# This cron job will run news_bot.py every hour.
# It will use the OPENAI_API_KEY from the environment where cron runs, or you can specify it directly.
(crontab -l 2>/dev/null; echo "0 * * * * cd ${SCRIPT_DIR} && export OPENAI_API_KEY=\
${OPENAI_API_KEY} && python3 ${BOT_PATH} >> ${LOG_PATH} 2>&1") | crontab -

echo "Cron job for news_bot.py has been set up to run hourly."
echo "Logs will be written to: ${LOG_PATH}"
echo "To view your cron jobs, run: crontab -l"
echo "To edit your cron jobs, run: crontab -e"

