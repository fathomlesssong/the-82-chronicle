#!/usr/bin/env bash

set -u

GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

ok() {
  printf "${GREEN}✓ %s${RESET}\n" "$1"
}

fail() {
  printf "${RED}✗ %s${RESET}\n" "$1"
}

info() {
  printf "${CYAN}→ %s${RESET}\n" "$1"
}

warn() {
  printf "${YELLOW}! %s${RESET}\n" "$1"
}

if [ $# -lt 1 ] || [ -z "${1// }" ]; then
  fail "Podaj opis commita."
  echo
  echo "Użycie:"
  echo '  ./commit-ok.sh "Opis zmiany"'
  exit 2
fi

COMMIT_MESSAGE="$1"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "To nie jest repozytorium Git."
  exit 2
fi

BRANCH="$(git branch --show-current)"

if [ -z "$BRANCH" ]; then
  fail "Nie udało się ustalić aktywnego brancha."
  exit 2
fi

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  fail "Jesteś na branchu $BRANCH. Automatyczny commit zablokowany."
  exit 2
fi

printf "\n${CYAN}Branch: %s${RESET}\n\n" "$BRANCH"

if [ -z "$(git status --porcelain)" ]; then
  warn "Brak zmian do zapisania."
  exit 0
fi

info "Sprawdzam diff..."

if git diff --check && git diff --cached --check; then
  ok "diff bez błędów"
else
  fail "git diff --check wykrył problem"
  exit 1
fi

mapfile -t JS_FILES < <(
  {
    git diff --name-only --diff-filter=ACMR
    git diff --cached --name-only --diff-filter=ACMR
    git ls-files --others --exclude-standard
  } |
  sort -u |
  grep -E '\.js$' || true
)

if [ "${#JS_FILES[@]}" -gt 0 ]; then
  info "Sprawdzam składnię JavaScript..."

  for file in "${JS_FILES[@]}"; do
    [ -f "$file" ] || continue

    if node --check "$file" >/dev/null; then
      ok "JS: $file"
    else
      fail "Błąd składni: $file"
      node --check "$file"
      exit 1
    fi
  done
else
  ok "brak zmienionych plików JS"
fi

if [ -f "scripts/test-article-gallery.cjs" ]; then
  info "Uruchamiam test galerii..."

  if node scripts/test-article-gallery.cjs; then
    ok "test galerii"
  else
    fail "test galerii nie przeszedł"
    exit 1
  fi
fi

echo
info "Pliki do commita:"
git status --short
echo

git add -A

if git diff --cached --quiet; then
  warn "Po git add nie ma nic do zapisania."
  exit 0
fi

info "Tworzę commit..."

if git commit -m "$COMMIT_MESSAGE"; then
  echo
  ok "Commit utworzony: $COMMIT_MESSAGE"
  printf "${YELLOW}! Push NIE został wykonany.${RESET}\n"
  echo
  echo "Gdy zaakceptujesz zmianę:"
  printf "  ${CYAN}git push origin %s${RESET}\n" "$BRANCH"
else
  fail "Nie udało się utworzyć commita."
  exit 1
fi
