#!/bin/bash
# Setup script - install, build, and link CLI globally
# Usage: ./scripts/setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Resolve devtools root (parent of scripts/)
DEVTOOLS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

info()  { echo -e "${BOLD}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

echo ""
echo -e "${BOLD}=== Devtools Setup ===${NC}"
echo ""

# --- 1. Check prerequisites ---
info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    fail "Node.js not found. Please install Node.js >= 22"
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
    fail "Node.js >= 22 required (found $(node --version))"
fi
ok "Node.js $(node --version)"

if ! command -v pnpm &> /dev/null; then
    fail "pnpm not found. Install with: npm install -g pnpm"
fi
ok "pnpm $(pnpm --version)"

echo ""

# --- 2. Install dependencies ---
info "Installing dependencies..."
cd "$DEVTOOLS_ROOT"
pnpm install
ok "Dependencies installed"

echo ""

# --- 3. Build all packages ---
info "Building all packages..."
pnpm -r build
ok "All packages built"

echo ""

# --- 4. Link CLI globally ---
info "Linking CLI globally..."
cd "$DEVTOOLS_ROOT/common/cli"
pnpm link --global
ok "CLI linked globally"

echo ""

# --- 5. Verify ---
info "Verifying installation..."
if command -v aw &> /dev/null; then
    ok "aw CLI is available globally"
    echo ""
    aw --version 2>/dev/null || true
else
    warn "aw command not found in PATH"
    warn "You may need to restart your shell or add pnpm global bin to PATH:"
    warn "  export PATH=\"\$(pnpm -g bin):\$PATH\""
fi

echo ""
echo -e "${GREEN}${BOLD}=== Setup Complete ===${NC}"
echo ""
