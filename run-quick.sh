#!/bin/bash

# Campus Map - Quick Start (Linux/Ubuntu/macOS)
# This is a simplified version for quick setup

NODE_REQUIRED="18"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt "$NODE_REQUIRED" ]; then
    echo "❌ Node.js 18+ is required (you have $NODE_VERSION)"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo ""
echo "🚀 Starting Campus Map on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
