#!/bin/bash

# Jaimbo Website Startup Script

echo "🚀 Starting Jaimbo Website..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
mkdir -p data

# Start the server
echo "✅ Starting server on http://localhost:3000"
npm start
