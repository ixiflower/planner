#!/bin/bash

# Simple script to start just the frontend without complex dependency checks

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Frontend Only${NC}"

# Determine project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load ports from .env file if it exists
if [ -f ".env" ]; then
    # Extract frontend port from FRONTEND_URL
    FRONTEND_PORT_FROM_ENV=$(grep "^FRONTEND_URL=" .env | grep -oE ':[0-9]+$' | tr -d :)
    
    # Use extracted value if valid, otherwise use default
    if [[ "$FRONTEND_PORT_FROM_ENV" =~ ^[0-9]+$ ]]; then
        FRONTEND_PORT=${FRONTEND_PORT:-$FRONTEND_PORT_FROM_ENV}
    fi
fi

# Default frontend port (can be overridden by environment variable)
FRONTEND_PORT=${FRONTEND_PORT:-80}

# Function to get the primary local IP address
get_primary_ip() {
    # 1. Try to get IP of wlan0 if it exists and has an IP
    if ip addr show wlan0 > /dev/null 2>&1; then
        IP_WLAN0=$(ip -4 addr show wlan0 | grep "inet" | awk '{print $2}' | cut -d/ -f1 | head -n 1)
        if [ -n "$IP_WLAN0" ]; then
            echo "$IP_WLAN0"
            return
        fi
    fi

    # 2. Fallback to the default route IP
    if ip route get 1.1.1.1 > /dev/null 2>&1; then
        IP_DEFAULT_ROUTE=$(ip route get 1.1.1.1 | awk '{print $7; exit}')
        if [ -n "$IP_DEFAULT_ROUTE" ]; then
            echo "$IP_DEFAULT_ROUTE"
            return
        fi
    fi

    # 3. Fallback to any non-loopback UP interface IP
    IP_ANY=$(ip -4 addr | grep "inet" | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -n 1)
    if [ -n "$IP_ANY" ]; then
        echo "$IP_ANY"
        return
    fi

    # 4. If all fails, use localhost as a last resort
    echo "127.0.0.1"
}

# Get the primary local IP address
IP=$(get_primary_ip)

# Set environment variables for dynamic configuration
export VITE_BACKEND_URL="http://$IP:8001"  # Default backend URL
export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
export VITE_API_URL="http://$IP:8001/tickets/api"

echo -e "${BLUE}Configuration:${NC}"
echo -e "  ${GREEN}✓${NC} Local IP: ${YELLOW}$IP${NC}"
echo -e "  ${GREEN}✓${NC} Frontend Port: ${YELLOW}$FRONTEND_PORT${NC}"
echo -e "  ${GREEN}✓${NC} Frontend URL: ${YELLOW}$FRONTEND_URL${NC}"
echo ""

# Function to start frontend without complex dependency checks
start_simple_frontend() {
    echo -e "${BLUE}Starting Frontend...${NC}"
    
    # Check if we're in the right directory
    if [ ! -d "frontend" ]; then
        echo -e "${RED}✗ 'frontend' directory not found in current path${NC}"
        echo -e "${YELLOW}Please run this script from the project root directory${NC}"
        return 1
    fi
    
    cd frontend || { echo "Failed to cd to frontend"; return 1; }
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}✗ package.json not found in frontend directory${NC}"
        cd ..; return 1
    fi
    
    # Check if node_modules exists, if not install dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ Failed to install dependencies${NC}"
            cd ..; return 1
        fi
    else
        # Simply check if key dependencies are available without complex checks
        echo -e "${GREEN}✓${NC} node_modules found, skipping complex checks"
    fi
    
    # Ensure vite is available
    if ! command -v vite &> /dev/null; then
        if [ -f "node_modules/.bin/vite" ]; then
            export PATH="$(pwd)/node_modules/.bin:$PATH"
        fi
    fi
    
    echo -e "${GREEN}✓${NC} Starting frontend on ${YELLOW}0.0.0.0:$FRONTEND_PORT${NC}"
    echo -e "${CYAN}Access the frontend at: http://$IP:$FRONTEND_PORT${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop${NC}"
    
    # Start the frontend
    npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT
    
    cd ..
}

# Run the function
start_simple_frontend