#!/bin/bash

# Campus Map Application - Local Development Server
# Compatible with Linux, Ubuntu, macOS
# Usage: ./run.sh

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-3000}
NODE_ENV=${NODE_ENV:-development}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Campus Map Application${NC}"
echo -e "${BLUE}  Local Development Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version:${NC} $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm version:${NC} $(npm --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Start development server
echo -e "${BLUE}🚀 Starting development server...${NC}"
echo -e "${BLUE}Port: ${PORT}${NC}"
echo -e "${BLUE}Environment: ${NODE_ENV}${NC}"
echo ""
echo -e "${GREEN}✓ Server running at http://localhost:${PORT}${NC}"
echo -e "${GREEN}✓ Open http://localhost:${PORT} in your browser${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Run development server
PORT=$PORT NODE_ENV=$NODE_ENV npm run dev
