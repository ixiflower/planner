#!/bin/bash

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo '██████╗ ██╗      █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ '
echo '██╔══██╗██║     ██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗'
echo '██████╔╝██║     ███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝'
echo '██╔═══╝ ██║     ██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗'
echo '██║     ███████╗██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║'
echo '╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝'
echo -e "${NC}"

# Determine project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Known path fallback
KNOWN_NODE_PATH="/home/ixi_flower/.local/share/mise/installs/node/25.2.1/bin"

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

    # 2. Fallback to the default route IP (current method)
    # Using 'ip route get 1' is generally reliable for finding the source IP for internet traffic
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

# Load ports from .env file if it exists
if [ -f ".env" ]; then
    # Extract backend port from VITE_BACKEND_URL (looks for :port at end of line)
    BACKEND_PORT_FROM_ENV=$(grep "^VITE_BACKEND_URL=" .env | grep -oE ':[0-9]+$' | tr -d :)
    # Extract frontend port from FRONTEND_URL
    FRONTEND_PORT_FROM_ENV=$(grep "^FRONTEND_URL=" .env | grep -oE ':[0-9]+$' | tr -d :)
    
    # Use extracted values if valid, otherwise use defaults
    if [[ "$BACKEND_PORT_FROM_ENV" =~ ^[0-9]+$ ]]; then
        BACKEND_PORT=${BACKEND_PORT:-$BACKEND_PORT_FROM_ENV}
    fi
    if [[ "$FRONTEND_PORT_FROM_ENV" =~ ^[0-9]+$ ]]; then
        FRONTEND_PORT=${FRONTEND_PORT:-$FRONTEND_PORT_FROM_ENV}
    fi
fi

# Default ports (can be overridden by environment variables or command-line)
BACKEND_PORT=${BACKEND_PORT:-8001}
FRONTEND_PORT=${FRONTEND_PORT:-80}

# Port utilities
is_port_in_use() {
    local port=$1
    if command -v ss >/dev/null 2>&1; then
        ss -ltn "( sport = :$port )" | grep -q ":$port " && return 0
    elif command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$port" -sTCP:LISTEN -P -n >/dev/null 2>&1 && return 0
    elif command -v netstat >/dev/null 2>&1; then
        netstat -ltn 2>/dev/null | awk '{print $4}' | grep -qE ":$port$" && return 0
    fi
    return 1
}

find_free_port() {
    local start_port=$1
    local max_attempts=${2:-50}
    local port=$start_port
    local attempts=0

    while [ $attempts -lt $max_attempts ]; do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
        port=$((port + 1))
        attempts=$((attempts + 1))
    done

    return 1
}

ensure_port_available() {
    local label=$1
    local current_port=$2
    local new_port

    if is_port_in_use "$current_port"; then
        echo -e "${YELLOW}⚠ $label port $current_port is already in use. Searching for a free port...${NC}"
        new_port=$(find_free_port "$current_port")
        if [ -z "$new_port" ]; then
            echo -e "${RED}✗ Unable to find a free port for $label after multiple attempts.${NC}"
            return 1
        fi
        echo -e "${GREEN}✓${NC} Using $label port ${YELLOW}$new_port${NC} instead"
        if [ "$label" = "backend" ]; then
            BACKEND_PORT=$new_port
        else
            FRONTEND_PORT=$new_port
        fi
    fi
    return 0
}

refresh_runtime_urls() {
    export VITE_BACKEND_URL="http://$IP:$BACKEND_PORT"
    export ALLOWED_HOSTS="0.0.0.0,127.0.0.1,localhost,$IP"
    export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT,http://localhost:3000,http://localhost:5173,http://$IP:3000,http://$IP:5173"
    export BACKEND_URL="http://$IP:$BACKEND_PORT"
    export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
    export VITE_API_URL="http://$IP:$BACKEND_PORT/tickets/api"
}

set_env_var() {
    local file_path=$1
    local key=$2
    local value=$3
    if [ ! -f "$file_path" ]; then
        return 0
    fi
    
    # Check if file is writable, if not and we're not root, try to fix ownership
    if [ ! -w "$file_path" ] && [ "$EUID" -ne 0 ]; then
        local file_dir=$(dirname "$file_path")
        if [ ! -w "$file_dir" ]; then
            # Directory not writable, skip silently to avoid errors
            return 0
        fi
    fi
    
    if grep -q "^${key}=" "$file_path"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file_path" 2>/dev/null || true
    else
        echo "${key}=${value}" >> "$file_path" 2>/dev/null || true
    fi
}

update_env_files() {
    set_env_var "$PROJECT_ROOT/.env" "VITE_BACKEND_URL" "$VITE_BACKEND_URL"
    set_env_var "$PROJECT_ROOT/.env" "VITE_API_URL" "$VITE_API_URL"
    set_env_var "$PROJECT_ROOT/.env" "BACKEND_URL" "$BACKEND_URL"
    set_env_var "$PROJECT_ROOT/.env" "FRONTEND_URL" "$FRONTEND_URL"
    set_env_var "$PROJECT_ROOT/.env" "ALLOWED_HOSTS" "$ALLOWED_HOSTS"
    set_env_var "$PROJECT_ROOT/.env" "CORS_ALLOWED_ORIGINS" "$CORS_ALLOWED_ORIGINS"

    set_env_var "$PROJECT_ROOT/frontend/.env" "VITE_BACKEND_URL" "$VITE_BACKEND_URL"
    set_env_var "$PROJECT_ROOT/frontend/.env" "VITE_API_URL" "$VITE_API_URL"
}

# Ensure default ports are available (auto-fallback if in use)
ensure_port_available "backend" "$BACKEND_PORT" || exit 1
ensure_port_available "frontend" "$FRONTEND_PORT" || exit 1

# Set environment variables for dynamic configuration
refresh_runtime_urls
update_env_files

# Function to display service status
show_service_status() {
    echo -e "${CYAN}▸ Service Status:${NC}"
    
    # Check backend using ps
    BACKEND_PID=$(ps aux 2>/dev/null | grep -E "[p]ython.*manage.py runserver" | awk '{print $2}' | head -1)
    if [ -n "$BACKEND_PID" ]; then
        echo -e "  ${GREEN}● Backend:${NC}  ${GREEN}Active${NC} (PID: ${BACKEND_PID})"
    else
        echo -e "  ${GREEN}● Backend:${NC}  ${RED}Inactive${NC}"
    fi
    
    # Check frontend using ps
    FRONTEND_PID=$(ps aux 2>/dev/null | grep -E "[n]ode.*vite" | awk '{print $2}' | head -1)
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "  ${GREEN}● Frontend:${NC} ${GREEN}Active${NC} (PID: ${FRONTEND_PID})"
    else
        echo -e "  ${GREEN}● Frontend:${NC} ${RED}Inactive${NC}"
    fi
    
    # Check bot using ps
    BOT_PID=$(ps aux 2>/dev/null | grep -E "[p]ython.*planner-bot.py" | awk '{print $2}' | head -1)
    if [ -n "$BOT_PID" ]; then
        echo -e "  ${GREEN}● Bot:${NC}    ${GREEN}Active${NC} (PID: ${BOT_PID})"
    else
        echo -e "  ${GREEN}● Bot:${NC}    ${RED}Inactive${NC}"
    fi
    echo ""
}

# Function to display header
show_header() {
    clear
    echo -e "${GREEN}"
    echo '██████╗ ██╗      █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ '
    echo '██╔══██╗██║     ██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗'
    echo '██████╔╝██║     ███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝'
    echo '██╔═══╝ ██║     ██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗'
    echo '██║     ███████╗██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║'
    echo '╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝'
    echo -e "${NC}"
    echo ""
}

# Helper to detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        DISTRO=$ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
    else
        OS=$(uname -s)
        DISTRO="unknown"
    fi
}

# Helper to install system packages
install_pkg() {
    PACKAGE=$1
    detect_os
    
    echo -e "${YELLOW}⚠ Missing dependency: $PACKAGE. Attempting to install for $DISTRO...${NC}"
    
    if [[ "$DISTRO" == "ubuntu" ]] || [[ "$DISTRO" == "debian" ]] || [[ "$DISTRO" == "linuxmint" ]] || [[ "$DISTRO" == "kali" ]]; then
        if [ "$EUID" -ne 0 ]; then
            sudo apt-get update && sudo apt-get install -y $PACKAGE
        else
            apt-get update && apt-get install -y $PACKAGE
        fi
    elif [[ "$DISTRO" == "arch" ]] || [[ "$DISTRO" == "manjaro" ]]; then
        if [ "$EUID" -ne 0 ]; then
            sudo pacman -S --noconfirm $PACKAGE
        else
            pacman -S --noconfirm $PACKAGE
        fi
    elif [[ "$DISTRO" == "fedora" ]]; then
        if [ "$EUID" -ne 0 ]; then
            sudo dnf install -y $PACKAGE
        else
            dnf install -y $PACKAGE
        fi
    elif [[ "$DISTRO" == "centos" ]] || [[ "$DISTRO" == "rhel" ]]; then
        if [ "$EUID" -ne 0 ]; then
            sudo yum install -y $PACKAGE
        else
            yum install -y $PACKAGE
        fi
    elif [[ "$OS" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install $PACKAGE
        else
            echo -e "${RED}✗ Homebrew not found. Please install '$PACKAGE' manually.${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Could not detect package manager. Please install '$PACKAGE' manually.${NC}"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $PACKAGE installed successfully"
    else
        echo -e "${RED}✗ Failed to install $PACKAGE${NC}"
        return 1
    fi
}

# Ensure backend venv exists, is writable, and has a working pip
ensure_backend_venv() {
    local PYTHON_CMD="$1"
    local VENV_DIR="venv"

    # If venv exists, forcefully fix permissions to avoid sudo-related issues.
    if [ -d "$VENV_DIR" ] && [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
        # If the user doesn't own the venv directory, take ownership.
        if [ ! -O "$VENV_DIR" ] || [ ! -O "$VENV_DIR/bin" ]; then
            echo -e "${YELLOW}⚠ venv ownership appears incorrect. Attempting to fix...${NC}"
            sudo chown -R "$(id -un):$(id -gn)" "$VENV_DIR"
        fi
    fi

    # If venv exists but is not writable by current user, it might be a deeper issue.
    if [ -d "$VENV_DIR" ] && [ ! -w "$VENV_DIR" ]; then
        echo -e "${YELLOW}⚠ Existing venv is not writable. Attempting to fix...${NC}"
        if [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
            sudo chown -R "$(id -un):$(id -gn)" "$VENV_DIR" 2>/dev/null || true
        fi
    fi

    # If still not writable, recreate it.
    if [ -d "$VENV_DIR" ] && [ ! -w "$VENV_DIR" ]; then
        echo -e "${YELLOW}⚠ Unable to repair venv permissions. Recreating venv...${NC}"
        if [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
            sudo rm -rf "$VENV_DIR" 2>/dev/null || true
        else
            rm -rf "$VENV_DIR" 2>/dev/null || true
        fi
    fi

    # Ensure venv exists
    if [ ! -d "$VENV_DIR" ]; then
        echo -e "${YELLOW}⚠ Creating virtual environment...${NC}"
        "$PYTHON_CMD" -m venv "$VENV_DIR" || return 1
        echo -e "${GREEN}✓${NC} Virtual environment created"
    fi

    # Activate
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/backend/$VENV_DIR/bin/activate" || return 1

    # Ensure pip module is installed and usable inside venv.
    if ! python -m pip --version >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Pip not working in venv. Attempting repair (ensurepip)...${NC}"
        python -m ensurepip --upgrade >/dev/null 2>&1 || true
    fi

    # Some systems create a broken pip launcher script (bin/pip) even when the module is missing.
    # Always validate via `python -m pip`.
    if ! python -m pip --version >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ ensurepip failed. Bootstrapping pip using get-pip.py...${NC}"
        local GETPIP_TMP="/tmp/get-pip.py"
        if command -v curl >/dev/null 2>&1; then
            curl -fsSL https://bootstrap.pypa.io/get-pip.py -o "$GETPIP_TMP" || true
        elif command -v wget >/dev/null 2>&1; then
            wget -qO "$GETPIP_TMP" https://bootstrap.pypa.io/get-pip.py || true
        fi
        if [ -f "$GETPIP_TMP" ]; then
            python "$GETPIP_TMP" >/dev/null 2>&1 || true
            rm -f "$GETPIP_TMP"
        fi
    fi

    if ! python -m pip --version >/dev/null 2>&1; then
        echo -e "${RED}✗ Could not get a working pip inside backend/venv.${NC}"
        echo -e "${YELLOW}Tip:${NC} run without sudo and delete backend/venv, then re-run start.sh"
        return 1
    fi

    return 0
}

# Ensure PySocks is available when proxy is enabled
ensure_pysocks() {
    # If already present, we're done
    if python -c "import socks" >/dev/null 2>&1; then
        echo -e "${GREEN}   ✓ PySocks is already installed.${NC}"
        return 0
    fi

    echo -e "${YELLOW}   -> PySocks not found. Installing via pip...${NC}"
    # First try a regular pip install (works if proxy is HTTP/HTTPS)
    python -m pip install --quiet "PySocks>=1.7.1" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✓ PySocks installed via pip.${NC}"
        return 0
    fi

    # If pip failed (likely SOCKS proxy without PySocks), try offline install from a wheel
    if command -v curl >/dev/null 2>&1; then
        echo -e "${YELLOW}   -> Falling back to downloading wheel via curl...${NC}"
        SIMPLE_URL="https://pypi.org/simple/pysocks/"
        # Fetch the simple index and pick a py3-none-any wheel link
        HTML=$(curl -fsSL ${https_proxy:+--proxy "$https_proxy"} "$SIMPLE_URL" 2>/dev/null)
        WHEEL_REL=$(echo "$HTML" | grep -Eo 'href="[^"]+PySocks-[^"]+py3-none-any\.whl"' | sed -E 's/^href="|"$//g' | tail -n1)
        if [ -n "$WHEEL_REL" ]; then
            case "$WHEEL_REL" in
                http*) WHEEL_URL="$WHEEL_REL" ;;
                *) WHEEL_URL="https://pypi.org$WHEEL_REL" ;;
            esac
            WHEEL_PATH="/tmp/PySocks.whl"
            if curl -L --fail --show-error ${https_proxy:+--proxy "$https_proxy"} "$WHEEL_URL" -o "$WHEEL_PATH"; then
                if file "$WHEEL_PATH" 2>/dev/null | grep -qi "Zip archive data"; then
                    echo -e "${YELLOW}   -> Installing PySocks from local wheel...${NC}"
                    python -m pip install --quiet "$WHEEL_PATH" && {
                        rm -f "$WHEEL_PATH"
                        echo -e "${GREEN}   ✓ PySocks installed from wheel.${NC}"
                        return 0
                    }
                fi
                rm -f "$WHEEL_PATH" 2>/dev/null || true
            fi
        fi
    fi

    echo -e "${RED}   ✗ Failed to install PySocks automatically. Proxy installs may fail.${NC}"
    return 1
}

backend_requirements_hash() {
    python - <<'PY'
import hashlib
from pathlib import Path
requirements = Path('requirements.txt')
print(hashlib.sha256(requirements.read_bytes()).hexdigest())
PY
}

backend_deps_ok() {
    if [ ! -f "requirements.txt" ]; then
        return 0
    fi

    local marker="venv/.requirements_installed"
    local req_hash
    req_hash=$(backend_requirements_hash)

    if [ -f "$marker" ]; then
        local stored_hash
        stored_hash=$(cat "$marker" 2>/dev/null)
        if [ "$stored_hash" = "$req_hash" ]; then
            if python -m pip check >/dev/null 2>&1; then
                return 0
            fi
        fi
    fi

    return 1
}

ensure_backend_deps() {
    if [ ! -f "requirements.txt" ]; then
        return 0
    fi

    if backend_deps_ok; then
        echo -e "${GREEN}✓${NC} Backend dependencies already satisfied"
        return 0
    fi

    if python -m pip check >/dev/null 2>&1; then
        backend_requirements_hash > "venv/.requirements_installed"
        echo -e "${GREEN}✓${NC} Backend dependencies already satisfied"
        return 0
    fi

    echo -e "${YELLOW}⚠ Installing backend dependencies...${NC}"
    if [ ! -z "$https_proxy" ]; then
        echo -e "${YELLOW}🔒 Proxy detected. Ensuring SOCKS support for pip...${NC}"
        ensure_pysocks || true
    fi

    python -m pip install --timeout=60 -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install dependencies. Trying to upgrade pip...${NC}"
        python -m pip install --upgrade pip
        python -m pip install --timeout=60 -r requirements.txt
    fi

    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Backend dependencies failed to install.${NC}"
        return 1
    fi

    backend_requirements_hash > "venv/.requirements_installed"
    echo -e "${GREEN}✓${NC} Backend dependencies installed"
    return 0
}

# Ensure frontend node_modules exists and is writable
# Try to allow Node to bind to low ports (e.g., 80) without sudo
try_enable_low_port_binding() {
    # Only relevant if trying to bind to privileged ports and not running as root
    if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
        if command -v node >/dev/null 2>&1 && command -v getcap >/dev/null 2>&1; then
            NODE_BIN="$(which node)"
            if [ -n "$NODE_BIN" ]; then
                CURRENT_CAPS="$(getcap "$NODE_BIN" 2>/dev/null | awk '{print $3}')"
                if [[ "$CURRENT_CAPS" != *"cap_net_bind_service=ep"* ]]; then
                    echo -e "${YELLOW}⚠ Allowing Node to bind to port ${FRONTEND_PORT} without sudo (setcap)...${NC}"
                    if command -v sudo >/dev/null 2>&1; then
                        sudo setcap 'cap_net_bind_service=+ep' "$NODE_BIN" 2>/dev/null || true
                    else
                        setcap 'cap_net_bind_service=+ep' "$NODE_BIN" 2>/dev/null || true
                    fi
                    # Show result (best-effort)
                    getcap "$NODE_BIN" 2>/dev/null | grep -q 'cap_net_bind_service=ep' && \
                        echo -e "${GREEN}✓${NC} Node can now bind to privileged ports" || \
                        echo -e "${YELLOW}⚠ Could not set capability automatically. You may still need sudo to use port ${FRONTEND_PORT}.${NC}"
                fi
            fi
        fi
    fi
}

# Ensure frontend node_modules exists and is writable
ensure_frontend_deps() {
    # Always run in frontend directory
    cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return 1; }

    # If node_modules exists but is root-owned or not writable, fix ownership
    if [ -d "node_modules" ]; then
        if [ ! -w "node_modules" ] || [ "$(stat -c '%U' node_modules 2>/dev/null)" != "$(id -un)" ]; then
            echo -e "${YELLOW}⚠ Fixing frontend permissions (node_modules ownership)...${NC}"
            if command -v sudo >/dev/null 2>&1; then
                sudo chown -R "$(id -un):$(id -gn)" .
            else
                chown -R "$(id -un):$(id -gn)" . 2>/dev/null || true
            fi
        fi
    fi

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}⚠ npm not found in PATH. Checking fallback...${NC}"
        if [ -d "$KNOWN_NODE_PATH" ]; then
            export PATH="$KNOWN_NODE_PATH:$PATH"
            echo -e "${GREEN}✓${NC} Added $KNOWN_NODE_PATH to PATH"
        else
            echo -e "${YELLOW}⚠ npm not found. Attempting to install Node.js...${NC}"
            install_pkg "nodejs"
            install_pkg "npm"

            if ! command -v npm &> /dev/null; then
                echo -e "${RED}✗ Error: npm not found.${NC}"
                echo -e "${YELLOW}Please install Node.js from: https://nodejs.org/${NC}"
                cd "$PROJECT_ROOT"; return 1
            fi
        fi
    fi

    # If node_modules missing or package-lock mismatch, do a clean install
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
        if [ -f "package-lock.json" ]; then
            npm ci || npm install || npm install --legacy-peer-deps
        else
            # No lockfile -> prefer regular install with relaxed peer deps
            npm install --no-audit --no-fund || npm install --legacy-peer-deps
        fi
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Frontend dependencies installed"
        else
            echo -e "${RED}✗ Failed to install dependencies${NC}"
            cd "$PROJECT_ROOT"; return 1
        fi
    else
        # Skip the repair check to avoid unnecessary reinstallation
        # The original check for node_modules/.package-lock.json was causing
        # unwanted reinstalls when using option 6 followed by option 3
        echo -e "${GREEN}✓${NC} Frontend dependencies already installed"
    fi

    # Ensure vite is runnable
    if ! command -v vite &> /dev/null; then
        if [ -f "node_modules/.bin/vite" ]; then
            export PATH="$(pwd)/node_modules/.bin:$PATH"
        fi
    fi

    # Preemptively add magic-string if Tailwind/node requires it
    if ! node -e "require.resolve('magic-string')" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Adding missing dependency: magic-string${NC}"
        npm install magic-string@^0.30.10 --save-exact >/dev/null 2>&1 || true
    fi

    # Stay in frontend directory for subsequent commands
    return 0
}

# Helper: safely run manage.py for short commands, auto-fixing missing Django
safe_manage_py() {
    local args=("$@")
    local output
    # run and capture output
    if ! output=$(python manage.py "${args[@]}" 2>&1); then
        if echo "$output" | grep -qE "No module named 'django'|Couldn't import Django"; then
            echo -e "${YELLOW}⚠ Django not available. Attempting to install backend dependencies...${NC}"
            python -m pip install --timeout=60 -r requirements.txt || {
                echo -e "${RED}❌ Failed to install Django and dependencies${NC}";
                echo "$output"
                return 1
            }
            echo -e "${GREEN}✓${NC} Dependencies installed. Retrying: manage.py ${args[*]}"
            if ! output=$(python manage.py "${args[@]}" 2>&1); then
                echo "$output"
                return 1
            fi
        else
            echo "$output"
            return 1
        fi
    fi
    # print output on success (useful for check/migrate)
    [ -n "$output" ] && echo "$output"
    return 0
}

# Helper: start runserver and auto-heal missing Django by installing deps, with logging
start_runserver_autoheal() {
    local port="$1"
    local log_file="$PROJECT_ROOT/backend.log"
    : > "$log_file"
    nohup python manage.py runserver 0.0.0.0:"$port" > "$log_file" 2>&1 &
    local pid=$!
    sleep 2
    if grep -qE "No module named 'django'|Couldn't import Django" "$log_file" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Detected Django import error on startup. Installing dependencies and retrying...${NC}"
        python -m pip install --timeout=60 -r requirements.txt || {
            echo -e "${RED}❌ Failed to install dependencies${NC}"; return 1; }
        # retry
        nohup python manage.py runserver 0.0.0.0:"$port" > "$log_file" 2>&1 &
        pid=$!
        sleep 2
    fi
    BACKEND_PID=$pid
    echo -e "${GREEN}✓${NC} Backend starting on ${YELLOW}0.0.0.0:$port${NC} (PID: ${YELLOW}$BACKEND_PID${NC})"
    echo -e "${BLUE}ℹ${NC} Logs: ${YELLOW}$log_file${NC}"
    return 0
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}Starting Backend...${NC}"
    cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return 1; }
    
    # Check if Python is available
    if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗ Python not found.${NC}"
        install_pkg "python3"
        if ! command -v python3 &> /dev/null; then
             echo -e "${RED}✗ Python installation failed. Please install Python 3 manually.${NC}"
             cd "$PROJECT_ROOT"
             return 1
        fi
    fi
    
    PYTHON_CMD="python"
    if ! command -v python &> /dev/null; then
        PYTHON_CMD="python3"
    fi
    
    # Check if venv module is available
    if ! $PYTHON_CMD -c "import venv" &> /dev/null; then
        echo -e "${YELLOW}⚠ Python venv module missing.${NC}"
        install_pkg "python3-venv"
    fi

    # Ensure venv + pip work
    if ! ensure_backend_venv "$PYTHON_CMD"; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    echo -e "${GREEN}✓${NC} Virtual environment activated"
    
    if ! ensure_backend_deps; then
        return 1
    fi
    
    # Test manage.py and auto-install Django if missing
    echo -e "${BLUE}Testing Django configuration...${NC}"
    if ! safe_manage_py check --deploy >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Running migrations...${NC}"
        safe_manage_py migrate --noinput || true
    fi
    
    ensure_port_available "backend" "$BACKEND_PORT" || return 1
    refresh_runtime_urls
    update_env_files
    start_runserver_autoheal "$BACKEND_PORT" || { cd "$PROJECT_ROOT"; return 1; }
    # Do not cd to project root here; keep context consistent
    return $BACKEND_PID
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}Starting Frontend...${NC}"
    ensure_port_available "frontend" "$FRONTEND_PORT" || return 1
    refresh_runtime_urls
    update_env_files

    # If port < 1024 and not root, try enabling low-port binding for node
    try_enable_low_port_binding || true

    cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return 1; }
    
    if ! ensure_frontend_deps; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Frontend starting on ${YELLOW}0.0.0.0:$FRONTEND_PORT${NC}"
    npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT
    cd "$PROJECT_ROOT"
}

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Backend stopped"
    fi
    echo -e "${CYAN}Goodbye! 👋${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Check if running as root for port 80
check_sudo() {
    # If port is privileged, prefer setcap method over re-invoking with sudo
    if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}ℹ Attempting to allow Node to bind to privileged port without sudo...${NC}"
        try_enable_low_port_binding || true
        # If still not root, continue without re-exec to avoid creating root-owned node_modules
        return 0
    fi

    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}⚠ Running on port 80 may require sudo permissions.${NC}"
        echo -e "${YELLOW}Skipping auto-sudo to prevent permission issues in node_modules.${NC}"
        return 0
    fi
}

# Function to change ports configuration
change_ports() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Change Port Configuration${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Current settings:${NC}"
    echo -e "  Backend Port: ${YELLOW}$BACKEND_PORT${NC}"
    echo -e "  Frontend Port: ${YELLOW}$FRONTEND_PORT${NC}"
    echo -e "  Backend URL: ${YELLOW}$VITE_BACKEND_URL${NC}"
    echo -e "  Frontend URL: ${YELLOW}$FRONTEND_URL${NC}"
    echo ""
    echo -e "${YELLOW}What would you like to change?${NC}"
    echo -e "  ${GREEN}1${NC}) Change Backend Port (Current: $BACKEND_PORT)"
    echo -e "  ${GREEN}2${NC}) Change Frontend Port (Current: $FRONTEND_PORT)"
    echo -e "  ${GREEN}3${NC}) Change Both Ports"
    echo -e "  ${RED}4${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r port_choice
    
    case $port_choice in
        1)
            echo ""
            echo -n "Enter new backend port (e.g., 8000, 8001, 3000): "
            read -r new_backend_port
            
            # Validate port number
            if [[ "$new_backend_port" =~ ^[0-9]+$ ]] && [ "$new_backend_port" -ge 1 ] && [ "$new_backend_port" -le 65535 ]; then
                export BACKEND_PORT=$new_backend_port
                export VITE_BACKEND_URL="http://$IP:$BACKEND_PORT"
                export BACKEND_URL="http://$IP:$BACKEND_PORT"
                export VITE_API_URL="http://$IP:$BACKEND_PORT/tickets/api"
                export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT"
                
                # Update .env file if it exists
                if [ -f ".env" ]; then
                    sed -i "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$IP:$BACKEND_PORT|" .env
                    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://$IP:$BACKEND_PORT/tickets/api|" .env
                    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=http://$IP:$BACKEND_PORT|" .env
                fi
                
                echo ""
                echo -e "${GREEN}✓${NC} Backend port changed to: ${YELLOW}$BACKEND_PORT${NC}"
                echo -e "${GREEN}✓${NC} Backend URL updated to: ${YELLOW}$VITE_BACKEND_URL${NC}"
                echo -e "${GREEN}✓${NC} Changes saved to .env file${NC}"
            else
                echo ""
                echo -e "${RED}✗ Invalid port number. Must be between 1 and 65535.${NC}"
            fi
            ;;
        2)
            echo ""
            echo -n "Enter new frontend port (e.g., 80, 3000, 5173, 8080): "
            read -r new_frontend_port
            
            # Validate port number
            if [[ "$new_frontend_port" =~ ^[0-9]+$ ]] && [ "$new_frontend_port" -ge 1 ] && [ "$new_frontend_port" -le 65535 ]; then
                export FRONTEND_PORT=$new_frontend_port
                export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
                export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT"
                
                # Update .env file if it exists
                if [ -f ".env" ]; then
                    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=http://$IP:$FRONTEND_PORT|" .env
                    # Update CORS to include the new frontend port
                    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS|" .env
                fi
                
                echo ""
                echo -e "${GREEN}✓${NC} Frontend port changed to: ${YELLOW}$FRONTEND_PORT${NC}"
                echo -e "${GREEN}✓${NC} Frontend URL updated to: ${YELLOW}$FRONTEND_URL${NC}"
                echo -e "${GREEN}✓${NC} Changes saved to .env file${NC}"
                
                # Warn about sudo for ports < 1024
                if [ "$FRONTEND_PORT" -lt 1024 ]; then
                    echo -e "${YELLOW}⚠ Note: Port $FRONTEND_PORT requires sudo/root privileges${NC}"
                fi
            else
                echo ""
                echo -e "${RED}✗ Invalid port number. Must be between 1 and 65535.${NC}"
            fi
            ;;
        3)
            echo ""
            echo -n "Enter new backend port (e.g., 8000, 8001, 3000): "
            read -r new_backend_port
            
            echo -n "Enter new frontend port (e.g., 80, 3000, 5173, 8080): "
            read -r new_frontend_port
            
            # Validate both port numbers
            valid_backend=true
            valid_frontend=true
            
            if ! [[ "$new_backend_port" =~ ^[0-9]+$ ]] || [ "$new_backend_port" -lt 1 ] || [ "$new_backend_port" -gt 65535 ]; then
                echo -e "${RED}✗ Invalid backend port number. Must be between 1 and 65535.${NC}"
                valid_backend=false
            fi
            
            if ! [[ "$new_frontend_port" =~ ^[0-9]+$ ]] || [ "$new_frontend_port" -lt 1 ] || [ "$new_frontend_port" -gt 65535 ]; then
                echo -e "${RED}✗ Invalid frontend port number. Must be between 1 and 65535.${NC}"
                valid_frontend=false
            fi
            
            if [ "$valid_backend" = true ] && [ "$valid_frontend" = true ]; then
                export BACKEND_PORT=$new_backend_port
                export FRONTEND_PORT=$new_frontend_port
                export VITE_BACKEND_URL="http://$IP:$BACKEND_PORT"
                export BACKEND_URL="http://$IP:$BACKEND_PORT"
                export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
                export VITE_API_URL="http://$IP:$BACKEND_PORT/tickets/api"
                export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT"
                
                # Update .env file if it exists
                if [ -f ".env" ]; then
                    sed -i "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$IP:$BACKEND_PORT|" .env
                    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://$IP:$BACKEND_PORT/tickets/api|" .env
                    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=http://$IP:$BACKEND_PORT|" .env
                    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=http://$IP:$FRONTEND_PORT|" .env
                    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS|" .env
                fi
                
                echo ""
                echo -e "${GREEN}✓${NC} Ports changed successfully!"
                echo -e "  Backend: ${YELLOW}$BACKEND_PORT${NC} → ${YELLOW}$VITE_BACKEND_URL${NC}"
                echo -e "  Frontend: ${YELLOW}$FRONTEND_PORT${NC} → ${YELLOW}$FRONTEND_URL${NC}"
                echo -e "${GREEN}✓${NC} Changes saved to .env file${NC}"
                
                # Warn about sudo for ports < 1024
                if [ "$FRONTEND_PORT" -lt 1024 ]; then
                    echo -e "${YELLOW}⚠ Note: Port $FRONTEND_PORT requires sudo/root privileges${NC}"
                fi
            fi
            ;;
        4)
            echo ""
            echo -e "${BLUE}Port configuration cancelled.${NC}"
            ;;
        *)
            echo ""
            echo -e "${RED}✗ Invalid choice. Please select 1-4.${NC}"
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to change backend URL
change_backend_url() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Change Backend URL Configuration${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Current settings:${NC}"
    echo -e "  IP Address: ${YELLOW}$IP${NC}"
    echo -e "  Backend URL: ${YELLOW}$VITE_BACKEND_URL${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  ${GREEN}1${NC}) Use Local IP (Current: $IP)"
    echo -e "  ${GREEN}2${NC}) Use Localhost (127.0.0.1)"
    echo -e "  ${GREEN}3${NC}) Enter Custom URL"
    echo -e "  ${RED}4${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r url_choice
    
    case $url_choice in
        1)
            export VITE_BACKEND_URL="http://$IP:$BACKEND_PORT"
            export VITE_API_URL="http://$IP:$BACKEND_PORT/tickets/api"
            export BACKEND_URL="http://$IP:$BACKEND_PORT"
            export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
            export ALLOWED_HOSTS="0.0.0.0,127.0.0.1,localhost,$IP"
            export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://0.0.0.0:3000,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://127.0.0.1:3000,http://localhost,http://localhost:$FRONTEND_PORT,http://localhost:3000,http://$IP,http://$IP:$FRONTEND_PORT,http://$IP:3000,http://$IP:5173"
            echo ""
            echo -e "${GREEN}✓${NC} Backend URL set to: ${YELLOW}http://$IP:$BACKEND_PORT${NC}"
            ;;
        2)
            export VITE_BACKEND_URL="http://127.0.0.1:$BACKEND_PORT"
            export VITE_API_URL="http://127.0.0.1:$BACKEND_PORT/tickets/api"
            export BACKEND_URL="http://127.0.0.1:$BACKEND_PORT"
            export FRONTEND_URL="http://127.0.0.1:$FRONTEND_PORT"
            export ALLOWED_HOSTS="0.0.0.0,127.0.0.1,localhost"
            export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://0.0.0.0:3000,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://127.0.0.1:3000,http://localhost,http://localhost:$FRONTEND_PORT,http://localhost:3000"
            echo ""
            echo -e "${GREEN}✓${NC} Backend URL set to: ${YELLOW}http://127.0.0.1:$BACKEND_PORT${NC}"
            ;;
        3)
            echo ""
            echo -n "Enter custom backend URL (e.g., http://192.168.1.100:8001): "
            read -r custom_url
            
            # Remove trailing slash if present
            custom_url="${custom_url%/}"
            
            # Extract IP/hostname from URL
            custom_ip=$(echo "$custom_url" | sed -E 's|https?://([^:/]+).*|\1|')
            
            # Extract port if present, default to 8001
            custom_port=$(echo "$custom_url" | sed -E 's|https?://[^:]+:?([0-9]+)?.*|\1|')
            if [ -z "$custom_port" ]; then
                custom_port="8001"
            fi
            
            export VITE_BACKEND_URL="$custom_url"
            export VITE_API_URL="$custom_url/tickets/api"
            export BACKEND_URL="$custom_url"
            export FRONTEND_URL="http://$custom_ip"
            export ALLOWED_HOSTS="0.0.0.0,127.0.0.1,localhost,$custom_ip"
            export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:80,http://0.0.0.0:3000,http://127.0.0.1,http://127.0.0.1:80,http://127.0.0.1:3000,http://localhost,http://localhost:80,http://localhost:3000,http://$custom_ip,http://$custom_ip:80,http://$custom_ip:3000,http://$custom_ip:5173,https://$custom_ip,https://$custom_ip:443"
            echo ""
            echo -e "${GREEN}✓${NC} Backend URL set to: ${YELLOW}$custom_url${NC}"
            echo -e "${BLUE}ℹ${NC}  CORS will allow: ${YELLOW}http://$custom_ip (all common ports)${NC}"
            ;;
        5)
            echo ""
            echo -e "${YELLOW}Cancelled${NC}"
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid option${NC}"
            sleep 1
            clear
            ;;
    esac
    
    # Update .env file with new URL
    if [ "$url_choice" != "4" ] && [ -f ".env" ]; then
        echo ""
        echo -n "Would you like to save this to .env file? [y/N]: "
        read -r save_choice
        if [[ "$save_choice" =~ ^[Yy]$ ]]; then
            sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=$VITE_BACKEND_URL|g" .env
            sed -i "s|VITE_API_URL=.*|VITE_API_URL=$VITE_API_URL|g" .env
            sed -i "s|BACKEND_URL=.*|BACKEND_URL=$BACKEND_URL|g" .env
            sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|g" .env
            sed -i "s|ALLOWED_HOSTS=.*|ALLOWED_HOSTS=$ALLOWED_HOSTS|g" .env
            sed -i "s|CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS|g" .env
            echo -e "${GREEN}✓${NC} Settings saved to .env file"
            echo ""
            echo -e "${YELLOW}⚠ Important: You need to restart the backend for CORS changes to take effect!${NC}"
            echo -e "${BLUE}ℹ${NC}  If backend is running, use option 7 to stop it, then start again."
        fi
    fi
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to backup database to Telegram
backup_database_to_telegram() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Backup Database to Telegram${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Telegram bot configuration
    BOT_TOKEN="7761098777:AAHpfFRjgmYGgnTqMD0NdS1ecS0QzPGm1Go"
    CHAT_ID="2006833036"
    DB_PATH="backend/db.sqlite3"
    
    # Try alternative Telegram API endpoints (for network/firewall issues)
    TELEGRAM_APIS=(
        "https://api.telegram.org"
        "https://149.154.167.220"
        "https://149.154.167.99"
    )
    
    # Check if database exists
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}✗ Database not found at: ${YELLOW}$DB_PATH${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        return
    fi
    
    # Get database info
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
    BACKUP_NAME="db_backup_${TIMESTAMP}.sqlite3"
    
    echo -e "${BLUE}Database Information:${NC}"
    echo -e "  File: ${YELLOW}$DB_PATH${NC}"
    echo -e "  Size: ${YELLOW}$DB_SIZE${NC}"
    echo -e "  Backup name: ${YELLOW}$BACKUP_NAME${NC}"
    echo ""
    
    echo -e "${YELLOW}What would you like to do?${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Upload database to Telegram (curl method)"
    echo -e "  ${GREEN}2${NC}) Upload using Python (alternative for network issues)"
    echo -e "  ${GREEN}3${NC}) Create local backup only"
    echo -e "  ${GREEN}4${NC}) Upload with custom message"
    echo -e "  ${RED}5${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-5]: "
    read -r backup_choice
    
    case $backup_choice in
        1)
            echo ""
            echo -e "${BLUE}Uploading database to Telegram...${NC}"
            
            # Check if curl is installed
            if ! command -v curl &> /dev/null; then
                echo -e "${RED}✗ curl not found. Please install curl first.${NC}"
                echo -e "${YELLOW}Run: sudo apt install curl${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            # Upload to Telegram (try multiple endpoints)
            echo -e "${YELLOW}Sending request to Telegram API...${NC}"
            UPLOAD_SUCCESS=false
            
            for API_URL in "${TELEGRAM_APIS[@]}"; do
                echo -e "${BLUE}Trying: ${YELLOW}$API_URL${NC}"
                
                RESPONSE=$(curl -m 30 --connect-timeout 10 -F "chat_id=$CHAT_ID" \
                               -F "document=@$DB_PATH" \
                               -F "caption=📦 Database Backup
⏰ Time: $(date '+%Y-%m-%d %H:%M:%S')
💾 Size: $DB_SIZE" \
                               "$API_URL/bot$BOT_TOKEN/sendDocument" 2>&1)
                
                if echo "$RESPONSE" | grep -q '"ok":true'; then
                    UPLOAD_SUCCESS=true
                    echo -e "${GREEN}✓${NC} Connected successfully via $API_URL"
                    break
                else
                    echo -e "${RED}✗${NC} Failed via $API_URL"
                fi
            done
            
            if [ "$UPLOAD_SUCCESS" = false ]; then
                echo ""
                echo -e "${RED}✗ All connection attempts failed${NC}"
                echo ""
                echo -e "${YELLOW}════════ NETWORK ISSUE DETECTED ════════${NC}"
                echo -e "${RED}Your server cannot connect to Telegram API${NC}"
                echo ""
                echo -e "${CYAN}Solutions:${NC}"
                echo -e "  ${YELLOW}1)${NC} Check if your server has internet access:"
                echo -e "     ${BLUE}ping 8.8.8.8${NC}"
                echo ""
                echo -e "  ${YELLOW}2)${NC} Check if HTTPS/port 443 is blocked:"
                echo -e "     ${BLUE}curl -I https://google.com${NC}"
                echo ""
                echo -e "  ${YELLOW}3)${NC} Use alternative: Create local backup and download it manually:"
                echo -e "     Option 2 will create backup in: ${BLUE}backups/${NC} folder"
                echo ""
                echo -e "  ${YELLOW}4)${NC} Check firewall/proxy settings:"
                echo -e "     ${BLUE}sudo iptables -L${NC}"
                echo ""
                echo -e "  ${YELLOW}5)${NC} If using VPN/proxy, configure curl to use it:"
                echo -e "     ${BLUE}export https_proxy=http://your-proxy:port${NC}"
                echo -e "${YELLOW}════════════════════════════════════════${NC}"
            fi
            
            # Check if upload was successful
            if echo "$RESPONSE" | grep -q '"ok":true'; then
                echo -e "${GREEN}✓${NC} Database uploaded successfully to Telegram!"
                echo -e "${BLUE}ℹ${NC}  Chat ID: ${YELLOW}$CHAT_ID${NC}"
            else
                echo -e "${RED}✗ Upload failed${NC}"
                echo ""
                echo -e "${YELLOW}════════ ERROR DETAILS ════════${NC}"
                echo "$RESPONSE" | grep -E "(error_code|description|HTTP/|ok)" || echo "$RESPONSE"
                echo -e "${YELLOW}═══════════════════════════════${NC}"
                echo ""
                echo -e "${BLUE}Debugging info:${NC}"
                echo -e "  Bot Token: ${YELLOW}$BOT_TOKEN${NC}"
                echo -e "  Chat ID: ${YELLOW}$CHAT_ID${NC}"
                echo -e "  Database: ${YELLOW}$DB_PATH${NC}"
                echo -e "  File exists: ${YELLOW}$([ -f "$DB_PATH" ] && echo "Yes" || echo "No")${NC}"
                echo -e "  File size: ${YELLOW}$DB_SIZE${NC}"
                echo ""
                echo -e "${CYAN}Possible issues:${NC}"
                echo -e "  1. Bot token might be invalid"
                echo -e "  2. Chat ID might be incorrect"
                echo -e "  3. Bot might not have started a conversation with user"
                echo -e "  4. Network/firewall issues"
            fi
            ;;
        2)
            echo ""
            echo -e "${BLUE}Uploading using Python method...${NC}"
            
            # Check if Python is available
            PYTHON_CMD="python3"
            if ! command -v python3 &> /dev/null; then
                if command -v python &> /dev/null; then
                    PYTHON_CMD="python"
                else
                    echo -e "${RED}✗ Python not found${NC}"
                    echo ""
                    echo -n "Press Enter to continue..."
                    read
                    return
                fi
            fi
            
            # Create a temporary Python script
            cat > /tmp/telegram_upload.py << 'PYTHON_SCRIPT'
import sys
import os

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("⚠ 'requests' module not found. Trying with urllib...")

def upload_with_requests(bot_token, chat_id, file_path, caption):
    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    with open(file_path, 'rb') as file:
        files = {'document': file}
        data = {'chat_id': chat_id, 'caption': caption}
        response = requests.post(url, files=files, data=data, timeout=30)
    return response.json()

def upload_with_urllib(bot_token, chat_id, file_path, caption):
    import urllib.request
    import urllib.parse
    import mimetypes
    
    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    
    # Read file
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    # Create multipart form data
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
        f'{chat_id}\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="caption"\r\n\r\n'
        f'{caption}\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="document"; filename="{os.path.basename(file_path)}"\r\n'
        f'Content-Type: application/x-sqlite3\r\n\r\n'
    ).encode('utf-8') + file_data + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        response = urllib.request.urlopen(req, timeout=30)
        import json
        return json.loads(response.read().decode())
    except Exception as e:
        return {'ok': False, 'error': str(e)}

if __name__ == "__main__":
    bot_token = sys.argv[1]
    chat_id = sys.argv[2]
    file_path = sys.argv[3]
    caption = sys.argv[4] if len(sys.argv) > 4 else "Database Backup"
    
    try:
        if HAS_REQUESTS:
            result = upload_with_requests(bot_token, chat_id, file_path, caption)
        else:
            result = upload_with_urllib(bot_token, chat_id, file_path, caption)
        
        if result.get('ok'):
            print("✓ Upload successful!")
            sys.exit(0)
        else:
            print(f"✗ Upload failed: {result.get('description', 'Unknown error')}")
            sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        sys.exit(1)
PYTHON_SCRIPT

            # Try to install requests if not available
            if ! $PYTHON_CMD -c "import requests" 2>/dev/null; then
                echo -e "${YELLOW}⚠ Installing requests module...${NC}"
                $PYTHON_CMD -m pip install requests -q 2>/dev/null || echo -e "${YELLOW}⚠ Using built-in urllib instead${NC}"
            fi
            
            # Run the Python script
            CAPTION="📦 Database Backup\n⏰ Time: $(date '+%Y-%m-%d %H:%M:%S')\n💾 Size: $DB_SIZE"
            $PYTHON_CMD /tmp/telegram_upload.py "$BOT_TOKEN" "$CHAT_ID" "$DB_PATH" "$CAPTION"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓${NC} Database uploaded successfully to Telegram!"
                echo -e "${BLUE}ℹ${NC}  Chat ID: ${YELLOW}$CHAT_ID${NC}"
            else
                echo -e "${RED}✗ Upload failed using Python method too${NC}"
                echo ""
                echo -e "${YELLOW}Your server appears to have network restrictions.${NC}"
                echo -e "${CYAN}Please use option 3 to create a local backup.${NC}"
            fi
            
            # Clean up
            rm -f /tmp/telegram_upload.py
            ;;
        3)
            echo ""
            echo -e "${BLUE}Creating local backup...${NC}"
            
            # Create backups directory
            mkdir -p backups
            
            # Copy database
            cp "$DB_PATH" "backups/$BACKUP_NAME"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓${NC} Local backup created: ${YELLOW}backups/$BACKUP_NAME${NC}"
                echo -e "${BLUE}ℹ${NC}  You can download this file manually"
                echo -e "${BLUE}ℹ${NC}  Location: ${YELLOW}$(pwd)/backups/$BACKUP_NAME${NC}"
            else
                echo -e "${RED}✗ Failed to create local backup${NC}"
            fi
            ;;
        5)
            echo ""
            echo -n "Enter custom message (or press Enter for default): "
            read -r custom_message
            
            if [ -z "$custom_message" ]; then
                custom_message="📦 Database Backup\n⏰ Time: $(date '+%Y-%m-%d %H:%M:%S')\n💾 Size: $DB_SIZE"
            fi
            
            echo ""
            echo -e "${BLUE}Uploading database to Telegram with custom message...${NC}"
            
            if ! command -v curl &> /dev/null; then
                echo -e "${RED}✗ curl not found. Please install curl first.${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            RESPONSE=$(curl -v -F "chat_id=$CHAT_ID" \
                           -F "document=@$DB_PATH" \
                           -F "caption=$custom_message" \
                           "https://api.telegram.org/bot$BOT_TOKEN/sendDocument" 2>&1)
            
            if echo "$RESPONSE" | grep -q '"ok":true'; then
                echo -e "${GREEN}✓${NC} Database uploaded successfully to Telegram!"
            else
                echo -e "${RED}✗ Upload failed${NC}"
                echo ""
                echo -e "${YELLOW}════════ ERROR DETAILS ════════${NC}"
                echo "$RESPONSE" | grep -E "(error_code|description|HTTP/|ok)" || echo "$RESPONSE"
                echo -e "${YELLOW}═══════════════════════════════${NC}"
            fi
            ;;
        5)
            echo ""
            echo -e "${YELLOW}Cancelled${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid option${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to deploy to Vercel
deploy_to_vercel() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Deploy to Vercel${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}What would you like to deploy?${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Deploy Frontend to Vercel"
    echo -e "  ${GREEN}2${NC}) Deploy Backend to Vercel"
    echo -e "  ${GREEN}3${NC}) Deploy Both (Frontend + Backend)"
    echo -e "  ${BLUE}4${NC}) Install Vercel CLI (if not installed)"
    echo -e "  ${RED}5${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-5]: "
    read -r deploy_choice
    
    case $deploy_choice in
        1)
            echo ""
            echo -e "${BLUE}Deploying Frontend to Vercel...${NC}"
            
            # Check if vercel CLI is installed
            if ! command -v vercel &> /dev/null; then
                echo -e "${RED}✗ Vercel CLI not found${NC}"
                echo -e "${YELLOW}Please install it first using option 4${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            cd frontend
            
            echo -e "${YELLOW}⚠ Building frontend...${NC}"

            if ! ensure_frontend_deps; then
                cd ..
                return
            fi
            
            # Build the project
            npm run build
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓${NC} Build successful"
                echo ""
                echo -e "${YELLOW}Deploying to Vercel...${NC}"
                vercel --prod
                echo ""
                echo -e "${GREEN}✓${NC} Frontend deployed to Vercel!"
            else
                echo -e "${RED}✗ Build failed${NC}"
            fi
            
            cd ..
            ;;
        2)
            echo ""
            echo -e "${BLUE}Deploying Backend to Vercel...${NC}"
            
            # Check if vercel CLI is installed
            if ! command -v vercel &> /dev/null; then
                echo -e "${RED}✗ Vercel CLI not found${NC}"
                echo -e "${YELLOW}Please install it first using option 4${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            cd backend
            
            echo -e "${YELLOW}⚠ Checking backend configuration...${NC}"
            
            # Check if vercel.json exists
            if [ ! -f "vercel.json" ]; then
                echo -e "${RED}✗ vercel.json not found in backend directory${NC}"
                cd ..
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            echo -e "${GREEN}✓${NC} Configuration found"
            echo ""
            echo -e "${YELLOW}Deploying backend to Vercel...${NC}"
            vercel --prod
            echo ""
            echo -e "${GREEN}✓${NC} Backend deployed to Vercel!"
            echo -e "${BLUE}ℹ${NC}  Note: Make sure your environment variables are set in Vercel dashboard"
            
            cd ..
            ;;
        3)
            echo ""
            echo -e "${BLUE}Deploying Both Frontend and Backend to Vercel...${NC}"
            
            # Check if vercel CLI is installed
            if ! command -v vercel &> /dev/null; then
                echo -e "${RED}✗ Vercel CLI not found${NC}"
                echo -e "${YELLOW}Please install it first using option 4${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            echo ""
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}Step 1/2: Deploying Frontend...${NC}"
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            
            cd frontend

            if ! ensure_frontend_deps; then
                cd ..
                return
            fi
            
            echo -e "${YELLOW}⚠ Building frontend...${NC}"
            npm run build
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓${NC} Frontend built successfully"
                echo -e "${YELLOW}Deploying frontend to Vercel...${NC}"
                vercel --prod
                echo -e "${GREEN}✓${NC} Frontend deployed!"
            else
                echo -e "${RED}✗ Frontend build failed${NC}"
            fi
            
            cd ..
            
            echo ""
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}Step 2/2: Deploying Backend...${NC}"
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            
            cd backend
            
            if [ -f "vercel.json" ]; then
                echo -e "${YELLOW}Deploying backend to Vercel...${NC}"
                vercel --prod
                echo -e "${GREEN}✓${NC} Backend deployed!"
            else
                echo -e "${RED}✗ vercel.json not found in backend directory${NC}"
            fi
            
            cd ..
            
            echo ""
            echo -e "${GREEN}✓✓✓${NC} Deployment complete!"
            echo -e "${BLUE}ℹ${NC}  Don't forget to set environment variables in Vercel dashboard"
            ;;
        5)
            echo ""
            echo -e "${BLUE}Installing Vercel CLI...${NC}"
            
            # Check npm
            if ! command -v npm &> /dev/null; then
                if [ -d "$KNOWN_NODE_PATH" ]; then
                    export PATH="$KNOWN_NODE_PATH:$PATH"
                else
                    echo -e "${RED}✗ npm not found. Please install Node.js first.${NC}"
                    echo ""
                    echo -n "Press Enter to continue..."
                    read
                    return
                fi
            fi
            
            echo -e "${YELLOW}⚠ Installing Vercel CLI globally...${NC}"
            npm install -g vercel
            
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✓${NC} Vercel CLI installed successfully!"
                echo -e "${BLUE}ℹ${NC}  You can now deploy using options 1-3"
                echo ""
                echo -e "${YELLOW}Next steps:${NC}"
                echo -e "  1. Run: ${CYAN}vercel login${NC} to authenticate"
                echo -e "  2. Then use this menu to deploy"
            else
                echo -e "${RED}✗ Installation failed${NC}"
            fi
            ;;
        5)
            echo ""
            echo -e "${YELLOW}Cancelled${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid option${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to check service status
check_service_status() {
    echo -e "${BLUE}Checking service status...${NC}"
    echo ""
    
    # Check backend
    if pgrep -f "manage.py runserver" > /dev/null; then
        BACKEND_PID=$(pgrep -f "manage.py runserver")
        echo -e "  ${GREEN}✓${NC} Backend is running (PID: ${YELLOW}$BACKEND_PID${NC})"
    else
        echo -e "  ${RED}✗${NC} Backend is not running"
    fi
    
    # Check frontend
    if pgrep -f "vite.*--host.*--port $FRONTEND_PORT" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "vite.*--host.*--port $FRONTEND_PORT")
        echo -e "  ${GREEN}✓${NC} Frontend is running (PID: ${YELLOW}$FRONTEND_PID${NC})"
    else
        echo -e "  ${RED}✗${NC} Frontend is not running"
    fi
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to stop services
stop_services() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Stop Running Services${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check what's running
    BACKEND_RUNNING=false
    FRONTEND_RUNNING=false
    
    if pgrep -f "manage.py runserver" > /dev/null; then
        BACKEND_RUNNING=true
        echo -e "  ${GREEN}✓${NC} Backend is running"
    else
        echo -e "  ${RED}✗${NC} Backend is not running"
    fi
    
    if pgrep -f "vite.*--host.*--port $FRONTEND_PORT" > /dev/null; then
        FRONTEND_RUNNING=true
        echo -e "  ${GREEN}✓${NC} Frontend is running"
    else
        echo -e "  ${RED}✗${NC} Frontend is not running"
    fi
    
    echo ""
    
    if [ "$BACKEND_RUNNING" = false ] && [ "$FRONTEND_RUNNING" = false ]; then
        echo -e "${YELLOW}No services are running${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        return
    fi
    
    echo -e "${YELLOW}What would you like to stop?${NC}"
    echo ""
    echo -e "  ${RED}1${NC}) Stop Backend"
    echo -e "  ${RED}2${NC}) Stop Frontend"
    echo -e "  ${RED}3${NC}) Stop Both"
    echo -e "  ${BLUE}4${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r stop_choice
    
    case $stop_choice in
        1)
            if [ "$BACKEND_RUNNING" = true ]; then
                pkill -f "manage.py runserver"
                echo ""
                echo -e "${GREEN}✓${NC} Backend stopped"
            else
                echo ""
                echo -e "${YELLOW}Backend is not running${NC}"
            fi
            ;;
        2)
            if [ "$FRONTEND_RUNNING" = true ]; then
                pkill -f "vite.*--host.*--port $FRONTEND_PORT"
                echo ""
                echo -e "${GREEN}✓${NC} Frontend stopped"
            else
                echo ""
                echo -e "${YELLOW}Frontend is not running${NC}"
            fi
            ;;
        3)
            if [ "$BACKEND_RUNNING" = true ]; then
                pkill -f "manage.py runserver"
                echo ""
                echo -e "${GREEN}✓${NC} Backend stopped"
            fi
            if [ "$FRONTEND_RUNNING" = true ]; then
                pkill -f "vite.*--host.*--port $FRONTEND_PORT"
                echo -e "${GREEN}✓${NC} Frontend stopped"
            fi
            if [ "$BACKEND_RUNNING" = false ] && [ "$FRONTEND_RUNNING" = false ]; then
                echo ""
                echo -e "${YELLOW}No services were running${NC}"
            fi
            ;;
        5)
            echo ""
            echo -e "${YELLOW}Cancelled${NC}"
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to start services in background (daemon mode)
start_daemon() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Start Services in Background (24/7 Mode)${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}What would you like to start in background?${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Start Backend (24/7)"
    echo -e "  ${GREEN}2${NC}) Start Frontend (24/7)"
    echo -e "  ${GREEN}3${NC}) Start Both (24/7)"
    echo -e "  ${BLUE}4${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r daemon_choice
    
    case $daemon_choice in
        1)
            echo ""
            echo -e "${BLUE}Starting Backend in background...${NC}"
            
            cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return; }
            
            # Check Python and venv
            PYTHON_CMD="python"
            if ! command -v python &> /dev/null; then
                PYTHON_CMD="python3"
            fi
            
            if ! ensure_backend_venv "$PYTHON_CMD"; then
                cd "$PROJECT_ROOT"
                return
            fi
            
            if ! ensure_backend_deps; then
                cd "$PROJECT_ROOT"; return
            fi
            
            # Start in background with nohup
            start_runserver_autoheal "$BACKEND_PORT"
            BACKEND_PID=$BACKEND_PID
            
            cd "$PROJECT_ROOT"
            
            echo -e "${GREEN}✓${NC} Backend started in background (PID: ${YELLOW}$BACKEND_PID${NC})"
            echo -e "${BLUE}ℹ${NC}  Logs: ${YELLOW}backend.log${NC}"
            echo -e "${BLUE}ℹ${NC}  To stop: Use option 7 or run: ${YELLOW}kill $BACKEND_PID${NC}"
            ;;
        2)
            echo ""
            
            # Check sudo for ports < 1024
            if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
                echo -e "${YELLOW}⚠ Port $FRONTEND_PORT requires sudo. Please run with sudo.${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi

            # Check if frontend is already running
            if pgrep -f "vite.*--host.*--port" > /dev/null; then
                EXISTING_PID=$(pgrep -f "vite.*--host.*--port")
                echo -e "${YELLOW}⚠ Frontend is already running (PID: ${EXISTING_PID})${NC}"
                echo -e "${BLUE}Use option 8 or './start.sh stop-frontend' to stop it first${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            echo -e "${BLUE}Starting Frontend in background...${NC}"
            
            cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return; }

            if ! ensure_frontend_deps; then
                cd "$PROJECT_ROOT"
                return
            fi
            
            # Start in background with nohup
            nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > "$PROJECT_ROOT/frontend.log" 2>&1 &
            FRONTEND_PID=$!
            
            # Keep working directory in frontend for accurate npm paths
            echo -e "${GREEN}✓${NC} Frontend started in background (PID: ${YELLOW}$FRONTEND_PID${NC})"
            echo -e "${BLUE}ℹ${NC}  Logs: ${YELLOW}frontend.log${NC}"
            echo -e "${BLUE}ℹ${NC}  To stop: Use option 7 or run: ${YELLOW}kill $FRONTEND_PID${NC}"
            ;;
        3)
            echo ""
            
            # Check sudo for frontend if port < 1024
            if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
                echo -e "${YELLOW}⚠ Port $FRONTEND_PORT requires sudo. Please run with sudo.${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
            
            echo -e "${BLUE}Starting Both services in background...${NC}"
            echo ""

            # Start backend
            if pgrep -f "manage.py runserver" > /dev/null; then
                EXISTING_BACKEND_PID=$(pgrep -f "manage.py runserver")
                echo -e "${YELLOW}⚠ Backend is already running (PID: ${EXISTING_BACKEND_PID})${NC}"
            else
                cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return; }
                PYTHON_CMD="python"
                if ! command -v python &> /dev/null; then
                    PYTHON_CMD="python3"
                fi
                
                if ! ensure_backend_venv "$PYTHON_CMD"; then
                    cd "$PROJECT_ROOT"
                    return
                fi
                
                if ! ensure_backend_deps; then
                    cd "$PROJECT_ROOT"; return
                fi
                
                start_runserver_autoheal "$BACKEND_PORT"
                BACKEND_PID=$BACKEND_PID
                # Keep working directory in backend context for consistency
                echo -e "${GREEN}✓${NC} Backend started (PID: ${YELLOW}$BACKEND_PID${NC})"
            fi
            
            # Start frontend
            if pgrep -f "vite.*--host.*--port" > /dev/null; then
                EXISTING_FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
                echo -e "${YELLOW}⚠ Frontend is already running (PID: ${EXISTING_FRONTEND_PID})${NC}"
            else
                cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return; }
                
                if ! ensure_frontend_deps; then
                    cd "$PROJECT_ROOT"
                    return
                fi
                
                nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > "$PROJECT_ROOT/frontend.log" 2>&1 &
                FRONTEND_PID=$!
                cd "$PROJECT_ROOT"
                echo -e "${GREEN}✓${NC} Frontend started (PID: ${YELLOW}$FRONTEND_PID${NC})"
            fi
            
            echo ""
            echo -e "${BLUE}ℹ${NC}  Backend logs: ${YELLOW}backend.log${NC}"
            echo -e "${BLUE}ℹ${NC}  Frontend logs: ${YELLOW}frontend.log${NC}"
            echo -e "${BLUE}ℹ${NC}  To stop: Use option 7"
            ;;
        5)
            echo ""
            echo -e "${YELLOW}Cancelled${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
        *)
            echo ""
            echo -e "${RED}Invalid option${NC}"
            echo ""
            echo -n "Press Enter to continue..."
            read
            return
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to setup systemd service for auto-start on boot
setup_systemd_service() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Setup Auto-Start on Boot (Systemd Service)${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}✗ This operation requires root privileges${NC}"
        echo -e "${YELLOW}Please run with sudo or as root${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        return
    fi
    
    echo -e "${BLUE}This will configure services to automatically start when your VPS boots.${NC}"
    echo ""
    echo -e "${YELLOW}What would you like to setup?${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Backend only"
    echo -e "  ${GREEN}2${NC}) Frontend only"
    echo -e "  ${GREEN}3${NC}) Both Backend and Frontend"
    echo -e "  ${RED}4${NC}) Cancel"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r service_choice
    
    if [ "$service_choice" == "4" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        return
    fi
    
    # Get current user and working directory
    CURRENT_USER=$(logname 2>/dev/null || echo $SUDO_USER)
    WORK_DIR=$(pwd)
    
    # Setup backend service
    if [ "$service_choice" == "1" ] || [ "$service_choice" == "3" ]; then
        echo ""
        echo -e "${YELLOW}Creating backend systemd service...${NC}"
        
        cat > /etc/systemd/system/backend-django.service << EOF
[Unit]
Description=Django Backend Server (24/7)
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$WORK_DIR/backend
Environment="PATH=$WORK_DIR/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
# Make sure pip exists and requirements are installed before starting
ExecStartPre=/bin/bash -lc 'cd "$WORK_DIR/backend" && if [ ! -d venv ]; then python3 -m venv venv; fi && source venv/bin/activate && python -m ensurepip --upgrade >/dev/null 2>&1 || true && python -m pip --version >/dev/null 2>&1 && python -m pip install --timeout=60 -q -r requirements.txt'
ExecStart=$WORK_DIR/backend/venv/bin/python manage.py runserver 0.0.0.0:$BACKEND_PORT
Restart=always
RestartSec=10
StandardOutput=append:$WORK_DIR/backend.log
StandardError=append:$WORK_DIR/backend.log

[Install]
WantedBy=multi-user.target
EOF
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Backend service file created"
        else
            echo -e "${RED}✗ Failed to create backend service file${NC}"
        fi
    fi
    
    # Setup frontend service
    if [ "$service_choice" == "2" ] || [ "$service_choice" == "3" ]; then
        echo ""
        echo -e "${YELLOW}Creating frontend systemd service...${NC}"
        
        # Detect npm path
        NPM_PATH=$(which npm)
        if [ -z "$NPM_PATH" ] && [ -d "$KNOWN_NODE_PATH" ]; then
            NPM_PATH="$KNOWN_NODE_PATH/npm"
        fi
        
        cat > /etc/systemd/system/frontend-vite.service << EOF
[Unit]
Description=Vite Frontend Server (24/7)
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$WORK_DIR/frontend
Environment="PATH=$KNOWN_NODE_PATH:/usr/local/bin:/usr/bin:/bin"
ExecStart=$NPM_PATH run dev -- --host 0.0.0.0 --port $FRONTEND_PORT
Restart=always
RestartSec=10
StandardOutput=append:$WORK_DIR/frontend.log
StandardError=append:$WORK_DIR/frontend.log

[Install]
WantedBy=multi-user.target
EOF
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Frontend service file created"
        else
            echo -e "${RED}✗ Failed to create frontend service file${NC}"
        fi
    fi
    
    # Reload and enable services
    echo ""
    echo -e "${YELLOW}Reloading systemd...${NC}"
    systemctl daemon-reload
    
    if [ "$service_choice" == "1" ] || [ "$service_choice" == "3" ]; then
        echo -e "${YELLOW}Enabling backend service...${NC}"
        systemctl enable backend-django.service
    fi
    
    if [ "$service_choice" == "2" ] || [ "$service_choice" == "3" ]; then
        echo -e "${YELLOW}Enabling frontend service...${NC}"
        systemctl enable frontend-vite.service
    fi
    
    echo ""
    echo -e "${GREEN}✓✓✓${NC} Systemd service(s) configured successfully!"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Service Commands:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$service_choice" == "1" ] || [ "$service_choice" == "3" ]; then
        echo -e "${YELLOW}Backend:${NC}"
        echo -e "  Start:    ${CYAN}sudo systemctl start backend-django${NC}"
        echo -e "  Stop:     ${CYAN}sudo systemctl stop backend-django${NC}"
        echo -e "  Restart:  ${CYAN}sudo systemctl restart backend-django${NC}"
        echo -e "  Status:   ${CYAN}sudo systemctl status backend-django${NC}"
        echo -e "  Logs:     ${CYAN}sudo journalctl -u backend-django -f${NC}"
        echo -e "  Disable:  ${CYAN}sudo systemctl disable backend-django${NC}"
    fi
    
    if [ "$service_choice" == "2" ] || [ "$service_choice" == "3" ]; then
        echo ""
        echo -e "${YELLOW}Frontend:${NC}"
        echo -e "  Start:    ${CYAN}sudo systemctl start frontend-vite${NC}"
        echo -e "  Stop:     ${CYAN}sudo systemctl stop frontend-vite${NC}"
        echo -e "  Restart:  ${CYAN}sudo systemctl restart frontend-vite${NC}"
        echo -e "  Status:   ${CYAN}sudo systemctl status frontend-vite${NC}"
        echo -e "  Logs:     ${CYAN}sudo journalctl -u frontend-vite -f${NC}"
        echo -e "  Disable:  ${CYAN}sudo systemctl disable frontend-vite${NC}"
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Service(s) will now start automatically on system boot!${NC}"
    echo ""
    echo -n "Would you like to start the service(s) now? [y/N]: "
    read -r start_now
    
    if [[ "$start_now" =~ ^[Yy]$ ]]; then
        echo ""
        if [ "$service_choice" == "1" ] || [ "$service_choice" == "3" ]; then
            echo -e "${YELLOW}Starting backend...${NC}"
            systemctl start backend-django.service
            sleep 1
        fi
        
        if [ "$service_choice" == "2" ] || [ "$service_choice" == "3" ]; then
            echo -e "${YELLOW}Starting frontend...${NC}"
            systemctl start frontend-vite.service
            sleep 1
        fi
        
        echo ""
        if [ "$service_choice" == "1" ] || [ "$service_choice" == "3" ]; then
            echo -e "${CYAN}Backend Status:${NC}"
            systemctl status backend-django.service --no-pager | head -10
            echo ""
        fi
        
        if [ "$service_choice" == "2" ] || [ "$service_choice" == "3" ]; then
            echo -e "${CYAN}Frontend Status:${NC}"
            systemctl status frontend-vite.service --no-pager | head -10
        fi
    fi
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Function to add custom scripts with Tab navigation
add_scripts() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Add Custom Scripts${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Use Tab to move forward, Shift+Tab to move backward, Enter to add${NC}"
    echo ""
    
    # Initialize variables
    local script_name=""
    local script_command=""
    local current_field=0  # 0 = name, 1 = command
    local done=false
    
    # Create a temporary file for storing scripts if it doesn't exist
    local scripts_file="$HOME/.custom_scripts.sh"
    if [ ! -f "$scripts_file" ]; then
        echo "#!/bin/bash" > "$scripts_file"
        chmod +x "$scripts_file"
    fi
    
    while [ "$done" = false ]; do
        # Clear and redraw
        clear
        show_header
        echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Add Custom Scripts${NC}"
        echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${BLUE}Use Tab to move forward, Shift+Tab to move backward, Enter to add${NC}"
        echo ""
        
        # Show input fields with highlighting
        if [ $current_field -eq 0 ]; then
            echo -e "${GREEN}► Script Name:${NC} ${YELLOW}$script_name█${NC}"
        else
            echo -e "  Script Name: $script_name"
        fi
        
        if [ $current_field -eq 1 ]; then
            echo -e "${GREEN}► Script Command:${NC} ${YELLOW}$script_command█${NC}"
        else
            echo -e "  Script Command: $script_command"
        fi
        
        echo ""
        echo -e "${CYAN}Press Esc to cancel${NC}"
        
        # Read single character with special key detection
        IFS= read -rsn1 key
        
        # Handle escape sequences for special keys
        if [ "$key" = $'\x1b' ]; then
            # Read next character to check for escape sequence
            read -rsn2 -t 0.1 key2
            
            if [ "$key2" = "[Z" ]; then
                # Shift+Tab - move backward
                current_field=$((current_field - 1))
                if [ $current_field -lt 0 ]; then
                    current_field=1
                fi
            elif [ "$key2" = "" ]; then
                # Just Escape - cancel
                echo ""
                echo -e "${YELLOW}Cancelled${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            fi
        elif [ "$key" = $'\t' ]; then
            # Tab - move forward
            current_field=$((current_field + 1))
            if [ $current_field -gt 1 ]; then
                current_field=0
            fi
        elif [ "$key" = $'\x7f' ] || [ "$key" = $'\b' ]; then
            # Backspace - delete character
            if [ $current_field -eq 0 ]; then
                script_name="${script_name%?}"
            else
                script_command="${script_command%?}"
            fi
        elif [ "$key" = "" ]; then
            # Enter - submit if both fields have content
            if [ -n "$script_name" ] && [ -n "$script_command" ]; then
                # Add script to file
                echo "" >> "$scripts_file"
                echo "# Script: $script_name" >> "$scripts_file"
                echo "alias $script_name='$script_command'" >> "$scripts_file"
                
                # Also add to current shell session
                alias "$script_name"="$script_command"
                
                # Add to .zshrc if it exists
                if [ -f "$HOME/.zshrc" ]; then
                    if ! grep -q "alias $script_name=" "$HOME/.zshrc"; then
                        echo "alias $script_name='$script_command'" >> "$HOME/.zshrc"
                    fi
                fi
                
                # Add to .bashrc if it exists
                if [ -f "$HOME/.bashrc" ]; then
                    if ! grep -q "alias $script_name=" "$HOME/.bashrc"; then
                        echo "alias $script_name='$script_command'" >> "$HOME/.bashrc"
                    fi
                fi
                
                echo ""
                echo ""
                echo -e "${GREEN}✓${NC} Script '${YELLOW}$script_name${NC}' added successfully!"
                echo -e "${BLUE}ℹ${NC}  You can now use: ${CYAN}$script_name${NC}"
                echo -e "${BLUE}ℹ${NC}  Command: ${CYAN}$script_command${NC}"
                echo ""
                echo -n "Press Enter to continue..."
                read
                return
            else
                # Flash error if fields are empty
                echo ""
                echo -e "${RED}✗ Both fields are required!${NC}"
                sleep 1
            fi
        else
            # Regular character - add to current field
            if [ $current_field -eq 0 ]; then
                script_name="${script_name}${key}"
            else
                script_command="${script_command}${key}"
            fi
        fi
    done
}

# Function to manage proxy settings
change_proxy_settings() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Proxy Configuration${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""

    PROXY_STATUS="Disabled"
    if [ ! -z "$https_proxy" ]; then
        PROXY_STATUS="Enabled ($https_proxy)"
    fi

    echo -e "${BLUE}Current Status: ${YELLOW}$PROXY_STATUS${NC}"
    echo ""
    echo -e "${YELLOW}What would you like to do?${NC}"
    echo -e "  ${GREEN}1${NC}) Enable SOCKS5 Proxy (127.0.0.1:10808)"
    echo -e "  ${GREEN}2${NC}) Test Proxy Connection"
    echo -e "  ${RED}3${NC}) Disable Proxy"
    echo -e "  ${BLUE}4${NC}) Back to Main Menu"
    echo ""
    echo -n "Enter your choice [1-4]: "
    read -r proxy_choice

    case $proxy_choice in
        1)
            echo ""
            echo -e "${BLUE}Enabling SOCKS5 proxy...${NC}"
            export https_proxy="socks5h://127.0.0.1:10808"
            export http_proxy="socks5h://127.0.0.1:10808"
            
            echo -e "${YELLOW}Configuring npm to use proxy...${NC}"
            npm config set proxy socks5h://127.0.0.1:10808
            npm config set https-proxy socks5h://127.0.0.1:10808

            echo -e "${GREEN}✓${NC} Proxy enabled. All network traffic will be routed through socks5h://127.0.0.1:10808"
            ;;
        2)
            echo ""
            echo -e "${BLUE}Testing proxy connection to pypi.org...${NC}"
            if ! command -v curl &> /dev/null; then
                 echo -e "${RED}✗ curl is not installed. Cannot test proxy.${NC}"
            else
                TEST_CMD="curl --silent --head --connect-timeout 5 -x socks5h://127.0.0.1:10808 https://pypi.org"
                if $TEST_CMD | grep "HTTP/2 200" > /dev/null; then
                    echo -e "${GREEN}✓ Success! Proxy is working and can connect to PyPI.${NC}"
                else
                    echo -e "${RED}✗ Failure! Proxy is not working or cannot connect to PyPI.${NC}"
                    echo -e "${YELLOW}Please ensure your proxy is running on 127.0.0.1:10808.${NC}"
                fi
            fi
            ;;
        3)
            echo ""
            echo -e "${BLUE}Disabling proxy...${NC}"
            unset https_proxy
            unset http_proxy
            
            echo -e "${YELLOW}Removing npm proxy configuration...${NC}"
            npm config delete proxy
            npm config delete https-proxy

            echo -e "${GREEN}✓${NC} Proxy disabled."
            ;;
        4)
            ;;
        *)
            echo -e "${RED}Invalid option.${NC}"
            ;;
    esac
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Display menu
show_menu() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Please select an option:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Backend Management 🔧"
    echo -e "  ${GREEN}2${NC}) Frontend Management 🎨"
    echo -e "  ${GREEN}3${NC}) Start Both (Frontend + Backend)"
    echo -e "  ${BLUE}4${NC}) Change Backend URL"
    echo -e "  ${MAGENTA}5${NC}) Change Port Configuration 🔌"
    echo -e "  ${CYAN}6${NC}) Start in Background (24/7 Mode)"
    echo -e "  ${YELLOW}7${NC}) Check Service Status"
    echo -e "  ${RED}8${NC}) Stop Running Services"
    echo -e "  ${MAGENTA}9${NC}) Deploy to Vercel 🚀"
    echo -e "  ${BLUE}b${NC}) Backup Database to Telegram 💾"
    echo -e "  ${GREEN}a${NC}) Setup Auto-Start on Boot (Systemd) 🔄"
    echo -e "  ${MAGENTA}s${NC}) Add Custom Scripts ✨"
    echo -e "  ${GREEN}p${NC}) Proxy Settings 🌐"
    echo -e "  ${RED}0${NC}) Exit"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -n "Enter your choice [0-9/a/b/s/p]: "
}

# Display backend submenu
show_backend_menu() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Backend Management 🔧${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Quick Start Backend (Port 8001) ⚡"
    echo -e "  ${MAGENTA}2${NC}) Start Backend on Custom Port 🔧"
    echo -e "  ${RED}3${NC}) Stop Backend"
    echo -e "  ${YELLOW}4${NC}) Restart Backend"
    echo -e "  ${BLUE}5${NC}) View Backend Logs"
    echo -e "  ${CYAN}b${NC}) Back to Main Menu"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -n "Enter your choice [1-5/b]: "
}

# Display frontend submenu
show_frontend_menu() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Frontend Management 🎨${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Quick Start Frontend (Port 80) ⚡"
    echo -e "  ${MAGENTA}2${NC}) Start Frontend on Custom Port 🔧"
    echo -e "  ${RED}3${NC}) Stop Frontend"
    echo -e "  ${YELLOW}4${NC}) Restart Frontend"
    echo -e "  ${BLUE}5${NC}) View Frontend Logs"
    echo -e "  ${CYAN}b${NC}) Back to Main Menu"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -n "Enter your choice [1-5/b]: "
}

# Helper function to stop frontend
stop_frontend() {
    if pgrep -f "vite.*--host.*--port" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
        pkill -f "vite.*--host.*--port"
        rm -f "$PROJECT_ROOT/run/frontend.pid"
        echo -e "${GREEN}✓${NC} Frontend stopped (PID: ${YELLOW}$FRONTEND_PID${NC})"
    else
        echo -e "${YELLOW}Frontend is not running${NC}"
    fi
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to stop backend
stop_backend() {
    if pgrep -f "manage.py runserver" > /dev/null; then
        BACKEND_PID=$(pgrep -f "manage.py runserver")
        pkill -f "manage.py runserver"
        rm -f "$PROJECT_ROOT/run/backend.pid"
        echo -e "${GREEN}✓${NC} Backend stopped (PID: ${YELLOW}$BACKEND_PID${NC})"
    else
        echo -e "${YELLOW}Backend is not running${NC}"
    fi
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to view frontend logs
view_frontend_logs() {
    echo -e "${BLUE}Frontend Logs (last 30 lines):${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    if [ -f "$PROJECT_ROOT/frontend.log" ]; then
        tail -n 30 "$PROJECT_ROOT/frontend.log"
    else
        echo -e "${YELLOW}No frontend log file found${NC}"
    fi
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to view backend logs
view_backend_logs() {
    echo -e "${BLUE}Backend Logs (last 30 lines):${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    if [ -f "$PROJECT_ROOT/backend.log" ]; then
        tail -n 30 "$PROJECT_ROOT/backend.log"
    else
        echo -e "${YELLOW}No backend log file found${NC}"
    fi
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to show full status
show_full_status() {
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}📊 Full Service Status${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check backend
    if pgrep -f "manage.py runserver" > /dev/null; then
        BACKEND_PID=$(pgrep -f "manage.py runserver")
        echo -e "  ${GREEN}✓${NC} Backend is running"
        echo -e "    ${BLUE}•${NC} PID: ${YELLOW}$BACKEND_PID${NC}"
        echo -e "    ${BLUE}•${NC} URL: ${YELLOW}http://$IP:$BACKEND_PORT${NC}"
    else
        echo -e "  ${RED}✗${NC} Backend is not running"
    fi
    
    echo ""
    
    # Check frontend
    if pgrep -f "vite.*--host.*--port" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
        echo -e "  ${GREEN}✓${NC} Frontend is running"
        echo -e "    ${BLUE}•${NC} PID: ${YELLOW}$FRONTEND_PID${NC}"
        echo -e "    ${BLUE}•${NC} URL: ${YELLOW}http://$IP:$FRONTEND_PORT${NC}"
    else
        echo -e "  ${RED}✗${NC} Frontend is not running"
    fi
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to install dependencies
install_dependencies() {
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}📦 Installing Dependencies${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Backend dependencies
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return 1; }
    
    PYTHON_CMD="python"
    if ! command -v python &> /dev/null; then
        PYTHON_CMD="python3"
    fi
    
    if ! ensure_backend_venv "$PYTHON_CMD"; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    if ! ensure_backend_deps; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    echo ""
    
    # Frontend dependencies
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return 1; }
    
    if ! ensure_frontend_deps; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo -e "${GREEN}✓${NC} All dependencies installed successfully"
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Helper function to start Telegram bot in background
start_bot() {
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}🤖 Starting Telegram Bot${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check if bot is already running
    if pgrep -f "planner-bot.py" > /dev/null; then
        BOT_PID=$(pgrep -f "planner-bot.py")
        echo -e "${YELLOW}⚠ Telegram bot is already running (PID: ${BOT_PID})${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        return
    fi
    
    cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return 1; }
    
    # Check if bot file exists
    if [ ! -f "planner-bot.py" ]; then
        echo -e "${RED}✗ Bot file not found: planner-bot.py${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    # Check Python and venv
    PYTHON_CMD="python"
    if ! command -v python &> /dev/null; then
        PYTHON_CMD="python3"
    fi
    
    if ! ensure_backend_venv "$PYTHON_CMD"; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    if ! ensure_backend_deps; then
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    # Start bot in background with nohup
    echo -e "${BLUE}Starting Telegram bot in background...${NC}"
    nohup python planner-bot.py > "$PROJECT_ROOT/bot.log" 2>&1 &
    BOT_PID=$!
    
    # Save PID to file
    mkdir -p "$PROJECT_ROOT/run"
    echo $BOT_PID > "$PROJECT_ROOT/run/bot.pid"
    
    cd "$PROJECT_ROOT"
    
    sleep 1
    
    # Verify it's running
    if ps -p $BOT_PID > /dev/null; then
        echo -e "${GREEN}✓${NC} Telegram bot started successfully!"
        echo -e "  ${BLUE}•${NC} PID: ${YELLOW}$BOT_PID${NC}"
        echo -e "  ${BLUE}•${NC} Logs: ${YELLOW}bot.log${NC}"
        echo -e "  ${BLUE}•${NC} To stop: ${YELLOW}kill $BOT_PID${NC}"
    else
        echo -e "${RED}✗ Failed to start bot${NC}"
        echo -e "${YELLOW}Check bot.log for errors${NC}"
    fi
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

start_all_services_24_7() {
    show_header
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Start All Services in Background (24/7 Mode)${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Check sudo for frontend if port < 1024
    if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}⚠ Port $FRONTEND_PORT requires sudo. Please run with sudo.${NC}"
        echo ""
        echo -n "Press Enter to continue..."
        read
        clear
        return
    fi
    
    echo -e "${BLUE}Starting all services in background (24/7)...${NC}"
    echo ""
    
    # Start backend
    echo -e "${YELLOW}[1/3] Starting Backend...${NC}"
    if pgrep -f "manage.py runserver" > /dev/null; then
        EXISTING_BACKEND_PID=$(pgrep -f "manage.py runserver")
        echo -e "  ${YELLOW}⚠ Backend is already running (PID: ${EXISTING_BACKEND_PID})${NC}"
    else
        cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return; }
        PYTHON_CMD="python"
        if ! command -v python &> /dev/null; then
            PYTHON_CMD="python3"
        fi
        
        if ! ensure_backend_venv "$PYTHON_CMD"; then
            cd "$PROJECT_ROOT"
            return
        fi
        
        if ! ensure_backend_deps; then
            cd "$PROJECT_ROOT"; return
        fi
        
        start_runserver_autoheal "$BACKEND_PORT"
        BACKEND_PID=$!
        mkdir -p "$PROJECT_ROOT/run"
        echo $BACKEND_PID > "$PROJECT_ROOT/run/backend.pid"
        cd "$PROJECT_ROOT"
        echo -e "  ${GREEN}✓ Backend started (PID: ${BACKEND_PID})${NC}"
    fi
    
    sleep 2
    
    # Start frontend
    echo -e "${YELLOW}[2/3] Starting Frontend...${NC}"
    if pgrep -f "vite.*--host.*--port" > /dev/null; then
        EXISTING_FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
        echo -e "  ${YELLOW}⚠ Frontend is already running (PID: ${EXISTING_FRONTEND_PID})${NC}"
    else
        cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; return; }

        if ! ensure_frontend_deps; then
            cd "$PROJECT_ROOT"
            return
        fi
        
        nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > "$PROJECT_ROOT/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > "$PROJECT_ROOT/run/frontend.pid"
        cd "$PROJECT_ROOT"
        echo -e "  ${GREEN}✓ Frontend started (PID: ${FRONTEND_PID})${NC}"
    fi
    
    sleep 2
    
    # Start bot
    echo -e "${YELLOW}[3/3] Starting Bot...${NC}"
    if pgrep -f "planner-bot.py" > /dev/null; then
        EXISTING_BOT_PID=$(pgrep -f "planner-bot.py")
        echo -e "  ${YELLOW}⚠ Bot is already running (PID: ${EXISTING_BOT_PID})${NC}"
    else
        cd "$PROJECT_ROOT/backend" || { echo "Failed to cd to backend"; return; }
        
        if [ ! -f "planner-bot.py" ]; then
            echo -e "  ${RED}✗ Bot file not found: planner-bot.py${NC}"
        else
            PYTHON_CMD="python"
            if ! command -v python &> /dev/null; then
                PYTHON_CMD="python3"
            fi
            
            if ! ensure_backend_venv "$PYTHON_CMD"; then
                cd "$PROJECT_ROOT"
                return
            fi
            
            if ! ensure_backend_deps; then
                cd "$PROJECT_ROOT"; return
            fi
            
            nohup python planner-bot.py > "$PROJECT_ROOT/bot.log" 2>&1 &
            BOT_PID=$!
            mkdir -p "$PROJECT_ROOT/run"
            echo $BOT_PID > "$PROJECT_ROOT/run/bot.pid"
            cd "$PROJECT_ROOT"
            echo -e "  ${GREEN}✓ Bot started (PID: ${BOT_PID})${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ All services started successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Services running:${NC}"
    echo -e "  ${GREEN}• Backend:${NC}  http://$IP:$BACKEND_PORT"
    echo -e "  ${GREEN}• Frontend:${NC} http://$IP:$FRONTEND_PORT"
    echo -e "  ${GREEN}• Bot:${NC}      Telegram bot running"
    echo ""
    echo -e "${BLUE}Log files:${NC}"
    echo -e "  ${YELLOW}• backend.log${NC}"
    echo -e "  ${YELLOW}• frontend.log${NC}"
    echo -e "  ${YELLOW}• bot.log${NC}"
    echo ""
    echo -e "${BLUE}PIDs saved in:${NC} ${YELLOW}$PROJECT_ROOT/run/${NC}"
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
}

# Main menu logic
main() {
    # Avoid auto-root for frontend; try capabilities instead
    check_sudo "$@" || true
    show_header
    
    while true; do
        echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        # Show current service status at the top
        show_service_status
        echo -e "${BLUE}Environment configured:${NC}"
        echo -e "  ${GREEN}✓${NC} Local IP: ${YELLOW}$IP${NC}"
        echo -e "  ${GREEN}✓${NC} Backend URL: ${YELLOW}$VITE_BACKEND_URL${NC}"
        echo -e "  ${GREEN}✓${NC} Frontend URL: ${YELLOW}$FRONTEND_URL${NC}"
        echo ""
        echo -e "  ${CYAN}🌐 FRONTEND${NC}                    ${CYAN}🔧 BACKEND${NC}"
        echo -e "  ${CYAN}─────────────────────────────${NC}  ${CYAN}─────────────────────────────${NC}"
        echo -e "  ${GREEN}[1]${NC} Start Frontend           ${GREEN}[4]${NC} Start Backend"
        echo -e "  ${GREEN}[2]${NC} Stop Frontend            ${GREEN}[5]${NC} Stop Backend"
        echo -e "  ${GREEN}[3]${NC} View Logs                ${GREEN}[6]${NC} View Logs"
        echo ""
        echo -e "  ${YELLOW}⚡ QUICK ACTIONS${NC}               ${GREEN}📊 MONITORING${NC}"
        echo -e "  ${CYAN}─────────────────────────────${NC}  ${CYAN}─────────────────────────────${NC}"
        echo -e "  ${GREEN}[7]${NC} Start Both               ${GREEN}[9]${NC} Full Status"
        echo -e "  ${GREEN}[8]${NC} Stop Both                ${GREEN}[0]${NC} Install Deps"
        echo -e "  ${GREEN}[r]${NC} Restart Both             ${GREEN}[q]${NC} Quit"
        echo -e "  ${GREEN}[b]${NC} Start Bot (BG) 🤖"
        echo -e "  ${GREEN}[s]${NC} Start All (BG) 24/7 🚀"
        echo ""
        echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
        echo -n "  Choose option: "
        read -r choice
        case $choice in
            1)
                start_frontend
                ;;
            2)
                stop_frontend
                ;;
            3)
                view_frontend_logs
                ;;
            4)
                start_backend
                ;;
            5)
                stop_backend
                ;;
            6)
                view_backend_logs
                ;;
            7)
                start_backend
                start_frontend
                ;;
            8)
                stop_backend
                stop_frontend
                ;;
            r|R)
                stop_backend
                stop_frontend
                sleep 1
                start_backend
                start_frontend
                ;;
            9)
                show_full_status
                ;;
            0)
                install_dependencies
                ;;
            b|B)
                start_bot_in_background
                ;;
            s|S)
                start_all_services_24_7
                ;;
            q|Q)
                cleanup
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                ;;
        esac
    done
}
    # Handle command-line arguments
    if [ $# -gt 0 ]; then
        case "$1" in
            start)
                # Parse port argument if provided
                CUSTOM_BACKEND_PORT=""
                if [ "$2" = "--port" ] || [ "$2" = "-p" ]; then
                    if [ -n "$3" ] && [[ "$3" =~ ^[0-9]+$ ]] && [ "$3" -ge 1 ] && [ "$3" -le 65535 ]; then
                        CUSTOM_BACKEND_PORT=$3
                        export BACKEND_PORT=$CUSTOM_BACKEND_PORT
                        export VITE_BACKEND_URL="http://$IP:$BACKEND_PORT"
                        export BACKEND_URL="http://$IP:$BACKEND_PORT"
                        export VITE_API_URL="http://$IP:$BACKEND_PORT/tickets/api"
                        export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT"
                    else
                        echo -e "${RED}✗ Invalid port number. Must be between 1 and 65535.${NC}"
                        exit 1
                    fi
                fi
                
                # Quick start backend in background
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${GREEN}🚀 Starting Backend 24/7 (Persistent Mode)${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Check if backend is already running on any port
                if pgrep -f "manage.py runserver" > /dev/null; then
                    EXISTING_PID=$(pgrep -f "manage.py runserver")
                    echo -e "${YELLOW}⚠ Backend is already running (PID: ${EXISTING_PID})${NC}"
                    echo -e "${BLUE}Use './start.sh stop-backend' to stop it first${NC}"
                    exit 1
                fi
                
                cd backend
                
                # Check Python
                PYTHON_CMD="python"
                if ! command -v python &> /dev/null; then
                    PYTHON_CMD="python3"
                fi
                
                # Check if new_venv exists, if not create it
                if [ ! -d "new_venv" ]; then
                    echo -e "${YELLOW}⚠ Creating new virtual environment...${NC}"
                    $PYTHON_CMD -m venv new_venv
                fi
                
                # Activate the working virtual environment
                echo -e "${BLUE}Activating virtual environment...${NC}"
                source new_venv/bin/activate || { 
                    echo -e "${RED}❌ Failed to activate virtual environment${NC}"; 
                    cd "$PROJECT_ROOT"
                    exit 1; 
                }
                
                if ! ensure_backend_deps; then
                    cd "$PROJECT_ROOT"
                    exit 1
                fi
                
                # Test Django setup and auto-install if needed
                echo -e "${BLUE}Testing Django configuration...${NC}"
                if ! safe_manage_py check --deploy >/dev/null 2>&1; then
                    echo -e "${YELLOW}⚠ Running migrations...${NC}"
                    safe_manage_py migrate --noinput >/dev/null 2>&1 || true
                fi
                
                # Run migrations
                echo -e "${YELLOW}⚠ Running migrations...${NC}"
                safe_manage_py migrate --noinput >/dev/null 2>&1 || true
                
                # Create directories and files in current backend directory
                mkdir -p logs run || true
                
                # Start backend with auto-heal
                start_runserver_autoheal "$BACKEND_PORT"
                BACKEND_PID=$BACKEND_PID
                
                # Save PID to file for easy stopping
                echo $BACKEND_PID > run/backend.pid || true
                
                cd ..
                
                sleep 1
                
                # Verify it's running
                if ps -p $BACKEND_PID > /dev/null; then
                    echo -e "${GREEN}✓✓✓ Backend started successfully!${NC}"
                    echo ""
                    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                    echo -e "  ${BLUE}•${NC} PID: ${YELLOW}$BACKEND_PID${NC}"
                    echo -e "  ${BLUE}•${NC} URL: ${YELLOW}http://$IP:$BACKEND_PORT${NC}"
                    echo -e "  ${BLUE}•${NC} Status: ${GREEN}Running 24/7${NC}"
                    echo -e "  ${BLUE}•${NC} Logs: ${YELLOW}tail -f backend.log${NC}"
                    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                else
                    echo -e "${RED}✗ Failed to start backend${NC}"
                    echo -e "${YELLOW}Check backend.log for errors${NC}"
                    exit 1
                fi
                exit 0
                ;;
            start-frontend)
                # Parse port argument if provided
                CUSTOM_FRONTEND_PORT=""
                if [ "$2" = "--port" ] || [ "$2" = "-p" ]; then
                    if [ -n "$3" ] && [[ "$3" =~ ^[0-9]+$ ]] && [ "$3" -ge 1 ] && [ "$3" -le 65535 ]; then
                        CUSTOM_FRONTEND_PORT=$3
                        export FRONTEND_PORT=$CUSTOM_FRONTEND_PORT
                        export FRONTEND_URL="http://$IP:$FRONTEND_PORT"
                        export CORS_ALLOWED_ORIGINS="http://0.0.0.0,http://0.0.0.0:$FRONTEND_PORT,http://$IP,http://$IP:$FRONTEND_PORT,http://127.0.0.1,http://127.0.0.1:$FRONTEND_PORT,http://localhost,http://localhost:$FRONTEND_PORT"
                    else
                        echo -e "${RED}✗ Invalid port number. Must be between 1 and 65535.${NC}"
                        exit 1
                    fi
                fi
                
                # Quick start frontend in background
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${GREEN}🚀 Starting Frontend 24/7 (Persistent Mode)${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Check if running as root for port 80 or other privileged ports
                if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
                    echo -e "${YELLOW}⚠ Port $FRONTEND_PORT requires sudo privileges${NC}"
                    echo -e "${BLUE}Please run: sudo ./start.sh start-frontend --port $FRONTEND_PORT${NC}"
                    exit 1
                fi
                
                # Check if frontend is already running on any port
                if pgrep -f "vite.*--host.*--port" > /dev/null; then
                    EXISTING_PID=$(pgrep -f "vite.*--host.*--port")
                    echo -e "${YELLOW}⚠ Frontend is already running (PID: ${EXISTING_PID})${NC}"
                    echo -e "${BLUE}Use './start.sh stop-frontend' to stop it first${NC}"
                    exit 1
                fi
                
                cd "$PROJECT_ROOT/frontend" || { echo "Failed to cd to frontend"; exit 1; }

                if ! ensure_frontend_deps; then
                    cd "$PROJECT_ROOT"
                    exit 1
                fi
                
                # Create PID file directory
                mkdir -p ../run
                
                # Start frontend with nohup (survives SSH disconnect)
                nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > ../frontend.log 2>&1 &
                FRONTEND_PID=$!
                
                # Save PID to file for easy stopping
                echo $FRONTEND_PID > ../run/frontend.pid
                
                cd ..
                
                sleep 1
                
                # Verify it's running
                if ps -p $FRONTEND_PID > /dev/null; then
                    echo -e "${GREEN}✓✓✓ Frontend started successfully!${NC}"
                    echo ""
                    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                    echo -e "  ${BLUE}•${NC} PID: ${YELLOW}$FRONTEND_PID${NC}"
                    echo -e "  ${BLUE}•${NC} URL: ${YELLOW}http://$IP:$FRONTEND_PORT${NC}"
                    echo -e "  ${BLUE}•${NC} Status: ${GREEN}Running 24/7${NC}"
                    echo -e "  ${BLUE}•${NC} Logs: ${YELLOW}tail -f frontend.log${NC}"
                    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                else
                    echo -e "${RED}✗ Failed to start frontend${NC}"
                    echo -e "${YELLOW}Check frontend.log for errors${NC}"
                    exit 1
                fi
                exit 0
                ;;
            start-both)
                # Start both backend and frontend
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${GREEN}🚀 Starting Both Backend & Frontend 24/7${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Check if running as root for frontend port 80
                if [ "$EUID" -ne 0 ]; then
                    echo -e "${YELLOW}⚠ Frontend port 80 requires sudo privileges${NC}"
                    echo -e "${BLUE}Please run: sudo ./start.sh start-both${NC}"
                    exit 1
                fi
                
                # Start backend first
                echo -e "${BLUE}Starting backend...${NC}"
                "$0" start
                
                echo ""
                sleep 2
                
                # Start frontend
                echo -e "${BLUE}Starting frontend...${NC}"
                "$0" start-frontend
                
                exit 0
                ;;
            stop-backend)
                # Stop backend only
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🛑 Stopping Backend${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                if pgrep -f "manage.py runserver" > /dev/null; then
                    BACKEND_PID=$(pgrep -f "manage.py runserver")
                    pkill -f "manage.py runserver"
                    
                    # Remove PID file
                    rm -f run/backend.pid
                    
                    echo -e "${GREEN}✓${NC} Backend stopped (PID: ${YELLOW}$BACKEND_PID${NC})"
                else
                    echo -e "${YELLOW}Backend is not running${NC}"
                fi
                exit 0
                ;;
            stop-frontend)
                # Stop frontend only
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🛑 Stopping Frontend${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                if pgrep -f "vite.*--host.*--port" > /dev/null; then
                    FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
                    pkill -f "vite.*--host.*--port"
                    
                    # Remove PID file
                    rm -f run/frontend.pid
                    
                    echo -e "${GREEN}✓${NC} Frontend stopped (PID: ${YELLOW}$FRONTEND_PID${NC})"
                else
                    echo -e "${YELLOW}Frontend is not running${NC}"
                fi
                exit 0
                ;;
            stop)
                # Stop both backend and frontend
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🛑 Stopping All Services${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                STOPPED_ANY=false
                
                # Stop backend
                if pgrep -f "manage.py runserver" > /dev/null; then
                    BACKEND_PID=$(pgrep -f "manage.py runserver")
                    pkill -f "manage.py runserver"
                    rm -f run/backend.pid
                    echo -e "${GREEN}✓${NC} Backend stopped (PID: ${YELLOW}$BACKEND_PID${NC})"
                    STOPPED_ANY=true
                fi
                
                # Stop frontend
                if pgrep -f "vite.*--host.*--port" > /dev/null; then
                    FRONTEND_PID=$(pgrep -f "vite.*--host.*--port")
                    pkill -f "vite.*--host.*--port"
                    rm -f run/frontend.pid
                    echo -e "${GREEN}✓${NC} Frontend stopped (PID: ${YELLOW}$FRONTEND_PID${NC})"
                    STOPPED_ANY=true
                fi
                
                if [ "$STOPPED_ANY" = false ]; then
                    echo -e "${YELLOW}No services are running${NC}"
                fi
                exit 0
                ;;
            status)
                # Check status
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}📊 Service Status${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Check backend
                if pgrep -f "manage.py runserver" > /dev/null; then
                    BACKEND_PID=$(pgrep -f "manage.py runserver")
                    echo -e "  ${GREEN}✓${NC} Backend is running (PID: ${YELLOW}$BACKEND_PID${NC})"
                    echo -e "    ${BLUE}•${NC} URL: ${YELLOW}http://$IP:8001${NC}"
                    
                    if [ -f "run/backend.pid" ]; then
                        SAVED_PID=$(cat run/backend.pid)
                        echo -e "    ${BLUE}•${NC} PID file: ${YELLOW}$SAVED_PID${NC}"
                    fi
                else
                    echo -e "  ${RED}✗${NC} Backend is not running"
                fi
                
                echo ""
                
                # Check frontend
                if pgrep -f "vite.*--host.*--port $FRONTEND_PORT" > /dev/null; then
                    FRONTEND_PID=$(pgrep -f "vite.*--host.*--port $FRONTEND_PORT")
                    echo -e "  ${GREEN}✓${NC} Frontend is running (PID: ${YELLOW}$FRONTEND_PID${NC})"
                    echo -e "    ${BLUE}•${NC} URL: ${YELLOW}http://$IP${NC}"
                    
                    if [ -f "run/frontend.pid" ]; then
                        SAVED_PID=$(cat run/frontend.pid)
                        echo -e "    ${BLUE}•${NC} PID file: ${YELLOW}$SAVED_PID${NC}"
                    fi
                else
                    echo -e "  ${RED}✗${NC} Frontend is not running"
                fi
                exit 0
                ;;
            restart)
                # Restart both services
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🔄 Restarting All Services${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Stop all services
                if pgrep -f "manage.py runserver" > /dev/null; then
                    echo -e "${YELLOW}Stopping backend...${NC}"
                    pkill -f "manage.py runserver"
                    rm -f run/backend.pid
                fi
                
                if pgrep -f "vite.*--host.*--port" > /dev/null; then
                    echo -e "${YELLOW}Stopping frontend...${NC}"
                    pkill -f "vite.*--host.*--port"
                    rm -f run/frontend.pid
                fi
                
                sleep 2
                
                # Check if running as root for frontend
                if [ "$EUID" -ne 0 ]; then
                    echo -e "${YELLOW}⚠ Frontend requires sudo privileges${NC}"
                    echo -e "${BLUE}Please run: sudo ./start.sh restart${NC}"
                    exit 1
                fi
                
                # Restart both
                "$0" start-both
                exit 0
                ;;
            restart-backend)
                # Restart backend only
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🔄 Restarting Backend${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                if pgrep -f "manage.py runserver" > /dev/null; then
                    echo -e "${YELLOW}Stopping backend...${NC}"
                    pkill -f "manage.py runserver"
                    rm -f run/backend.pid
                    sleep 2
                fi
                
                "$0" start
                exit 0
                ;;
            restart-frontend)
                # Restart frontend only
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo -e "${YELLOW}🔄 Restarting Frontend${NC}"
                echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
                echo ""
                
                # Check if running as root
                if [ "$EUID" -ne 0 ]; then
                    echo -e "${YELLOW}⚠ Frontend requires sudo privileges${NC}"
                    echo -e "${BLUE}Please run: sudo ./start.sh restart-frontend${NC}"
                    exit 1
                fi
                
                if pgrep -f "vite.*--host.*--port" > /dev/null; then
                    echo -e "${YELLOW}Stopping frontend...${NC}"
                    pkill -f "vite.*--host.*--port"
                    rm -f run/frontend.pid
                    sleep 2
                fi
                
                "$0" start-frontend
                exit 0
                ;;
            --help|-h|help)
                echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
                echo -e "${CYAN}║         🚀 PROJECT STARTUP MANAGER 🚀             ║${NC}"
                echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
                echo ""
                echo -e "${YELLOW}Usage:${NC}"
                echo -e "  ${GREEN}./start.sh${NC}                    - Interactive menu"
                echo ""
                echo -e "${YELLOW}Backend Commands:${NC}"
                echo -e "  ${GREEN}./start.sh start${NC}              - Start backend (default: port 8001)"
                echo -e "  ${GREEN}./start.sh start --port PORT${NC}  - Start backend on custom port"
                echo -e "  ${GREEN}./start.sh stop-backend${NC}       - Stop backend"
                echo -e "  ${GREEN}./start.sh restart-backend${NC}    - Restart backend"
                echo ""
                echo -e "${YELLOW}Frontend Commands:${NC}"
                echo -e "  ${GREEN}sudo ./start.sh start-frontend${NC} - Start frontend (default: port 80)"
                echo -e "  ${GREEN}./start.sh start-frontend --port PORT${NC} - Start frontend on custom port"
                echo -e "  ${GREEN}./start.sh stop-frontend${NC}      - Stop frontend"
                echo -e "  ${GREEN}sudo ./start.sh restart-frontend${NC} - Restart frontend"
                echo ""
                echo -e "${YELLOW}Both Services:${NC}"
                echo -e "  ${GREEN}sudo ./start.sh start-both${NC}    - Start both (24/7)"
                echo -e "  ${GREEN}./start.sh stop${NC}               - Stop all services"
                echo -e "  ${GREEN}sudo ./start.sh restart${NC}       - Restart all services"
                echo -e "  ${GREEN}./start.sh status${NC}             - Check status"
                echo ""
                echo -e "${YELLOW}Port Options:${NC}"
                echo -e "  ${GREEN}--port PORT${NC} or ${GREEN}-p PORT${NC}    - Specify custom port (1-65535)"
                echo ""
                echo -e "${YELLOW}Other:${NC}"
                echo -e "  ${GREEN}./start.sh --help${NC}             - Show this help"
                echo ""
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${YELLOW}Examples:${NC}"
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo ""
                echo -e "  ${CYAN}# Start backend on default port (8001)${NC}"
                echo -e "  ./start.sh start"
                echo ""
                echo -e "  ${CYAN}# Start backend on custom port 8002${NC}"
                echo -e "  ./start.sh start --port 8002"
                echo ""
                echo -e "  ${CYAN}# Start frontend on default port (80, requires sudo)${NC}"
                echo -e "  sudo ./start.sh start-frontend"
                echo ""
                echo -e "  ${CYAN}# Start frontend on custom port 3000 (no sudo needed)${NC}"
                echo -e "  ./start.sh start-frontend --port 3000"
                echo ""
                echo -e "  ${CYAN}# Start frontend on custom port 5173${NC}"
                echo -e "  ./start.sh start-frontend -p 5173"
                echo ""
                echo -e "  ${CYAN}# Start both backend and frontend${NC}"
                echo -e "  sudo ./start.sh start-both"
                echo ""
                echo -e "  ${CYAN}# Check status${NC}"
                echo -e "  ./start.sh status"
                echo ""
                echo -e "  ${CYAN}# View backend logs${NC}"
                echo -e "  tail -f backend.log"
                echo ""
                echo -e "  ${CYAN}# View frontend logs${NC}"
                echo -e "  tail -f frontend.log"
                echo ""
                echo -e "  ${CYAN}# Stop all services${NC}"
                echo -e "  ./start.sh stop"
                echo ""
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo -e "${BLUE}Note: Frontend requires sudo because it uses port 80${NC}"
                echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown command: $1${NC}"
                echo -e "${YELLOW}Use './start.sh --help' for usage information${NC}"
                exit 1
                ;;
        esac
    fi
    

# Run main menu
main "$@"
