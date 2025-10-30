#!/bin/bash

echo "🚀 Starting SDR Script Tool..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your Slack configuration before running again."
    echo "   You need to set SLACK_BOT_TOKEN and SLACK_USER_ID"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Start the application
echo "🎯 Starting development server..."
npm run dev
