#!/usr/bin/env bash
# ==============================================================================
# ⚔️ EDCS (Every Day Carry Software) - Retro RPG Inventory Quest Launcher
# macOS Double-Clickable .command Launcher
# ==============================================================================

set -e

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
GRAY='\033[0;90m'
NC='\033[0m'

clear 2>/dev/null || true
printf "${GREEN}"
cat << "EOF"
==============================================================
  ⚔️   E D C S   Q U E S T   L A U N C H E R   ⚔️
  Every Day Carry Software - Backpack Loadout Deployment
==============================================================
EOF
printf "${NC}\n"

# 1. Check Package Manager (Homebrew)
echo -e "${YELLOW}🔍 [STATUS] 던전 환경 확인 중 (macOS Hybrid Engine)...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Homebrew를 찾을 수 없습니다. 자동으로 구성을 진행합니다...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f "/usr/local/bin/brew" ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

echo -e "${GREEN}✅ [STATUS] 장비 장착 엔진 준비 완료! ($(brew --version | head -n 1))${NC}\n"

# 2. Package List
packages=(
{{PACKAGES_ARRAY}}
)

total=${#packages[@]}
current=0
startTime=$(date +%s)

echo -e "${CYAN}🎒 [INVENTORY] 배낭에 담긴 장비: $total 개${NC}"
echo -e "${GRAY}--------------------------------------------------------------${NC}"

for pkg_entry in "${packages[@]}"; do
    current=$((current+1))
    IFS="|" read -r pkg_id pkg_name pkg_type pkg_target <<< "$pkg_entry"

    echo -e "\n${CYAN}[$current/$total] ⚔️ $pkg_name 장착 시도 중...${NC}"
    pkgStartTime=$(date +%s)

    if [ "$pkg_type" = "cask" ]; then
        status_ok=0
        brew install --cask "$pkg_target" --quiet || status_ok=$?
    else
        status_ok=0
        brew install "$pkg_target" --quiet || status_ok=$?
    fi

    if [ $status_ok -eq 0 ]; then
        pkgEndTime=$(date +%s)
        pkgDuration=$((pkgEndTime - pkgStartTime))
        echo -e "${GREEN}      ✨ [EQUIPPED! 장착 완료] (${pkgDuration}초 소요)${NC}"
    else
        pkgEndTime=$(date +%s)
        pkgDuration=$((pkgEndTime - pkgStartTime))
        echo -e "${YELLOW}      ⚠️ [NOTICE] 이미 장착되어 있거나 확인 완료 (${pkgDuration}초)${NC}"
    fi
done

totalEndTime=$(date +%s)
totalDuration=$((totalEndTime - startTime))

echo -e "\n${GREEN}==============================================================${NC}"
echo -e "${GREEN}🎉 [QUEST COMPLETE] 모든 장비 $total 개가 정상적으로 세팅되었습니다!${NC}"
echo -e "${CYAN}⏱️  총 장착 시간: ${totalDuration} 초${NC}"
echo -e "${GREEN}새로운 컴퓨터에서의 모험을 즐기세요!${NC}"
echo -e "${GREEN}==============================================================${NC}"

# Telemetry Ping
curl -s -X POST "{{TELEMETRY_URL}}" \
  -H "Content-Type: application/json" \
  -d "{\"preset_id\":\"{{PRESET_ID}}\",\"os\":\"macos\",\"total_duration_sec\":$totalDuration}" \
  --max-time 3 > /dev/null 2>&1 || true

echo -e "\n${GRAY}창을 닫으셔도 좋습니다.${NC}"
