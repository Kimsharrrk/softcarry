#!/usr/bin/env bash
# ==============================================================================
# 🧹 EDCS (Every Day Carry Software) - macOS Cleanup & Wipe Tool
# Removes software installed during this session (Ephemeral Mode)
# ==============================================================================

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}"
cat << "EOF"
==============================================================
   ____ _     _____    _    _   _ _   _ ____  
  / ___| |   | ____|  / \  | \ | | | | |  _ \ 
 | |   | |   |  _|   / _ \ |  \| | | | | |_) |
 | |___| |___| |___ / ___ \| |\  | |_| |  __/ 
  \____|_____|_____/_/   \_\_| \_|\___/|_|    
  EDCS Ephemeral Session Cleaner - https://edcs.dev
==============================================================
EOF
echo -e "${NC}"

packages=(
{{PACKAGES_ARRAY}}
)

total=${#packages[@]}
current=0

echo -e "${CYAN}🧹 Removing $total session apps...${NC}"
echo -e "--------------------------------------------------------------"

for pkg_entry in "${packages[@]}"; do
    current=$((current+1))
    IFS="|" read -r pkg_id pkg_name pkg_type pkg_target <<< "$pkg_entry"

    echo -e "\n${MAGENTA}[$current/$total] 🗑️ Uninstalling $pkg_name ($pkg_target)...${NC}"

    if [ "$pkg_type" = "cask" ]; then
        status_ok=0
        brew uninstall --cask "$pkg_target" --quiet 2>/dev/null || status_ok=$?
    else
        status_ok=0
        brew uninstall "$pkg_target" --quiet 2>/dev/null || status_ok=$?
    fi

    if [ $status_ok -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully uninstalled $pkg_name${NC}"
    else
        echo -e "${YELLOW}⚠️ Uninstall completed or package was not found: $pkg_name${NC}"
    fi
done

echo -e "\n${GREEN}==============================================================${NC}"
echo -e "${GREEN}🎉 Cleanup Complete! All session software removed safely.${NC}"
echo -e "${GREEN}==============================================================${NC}"
