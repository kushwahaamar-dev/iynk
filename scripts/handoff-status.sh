#!/usr/bin/env bash
# Where the build stands, for whoever picks it up next. Read-only apart from the pull.
set -u
cd "$(dirname "$0")/.."

if ! git pull --ff-only --quiet 2>/dev/null; then
  echo "!! git pull --ff-only failed: local commits and remote commits have diverged, or there is no network."
  echo "   Run 'git status' and 'git log --oneline origin/main -5' before doing anything."
fi

echo "== You are committing as: $(git config user.name) <$(git config user.email)>"
echo
echo "== Driver"
grep -m1 '^- \*\*Driver:\*\*' HANDOFF.md || echo "(no Driver line in HANDOFF.md)"
echo
echo "== Next step"
awk '/^- \*\*Next step:\*\*/{p=1} p&&/^$/{exit} p' HANDOFF.md
echo
echo "== Claims"
awk '/^### Claims/{p=1;next} p&&/^## /{exit} p&&/^\|/' HANDOFF.md
echo
echo "== Last checkpoint"
awk '/^## Checkpoint log/{p=1;next} p&&/^- /{print;f=1;next} f&&/^  /{print;next} f{exit}' HANDOFF.md
echo
echo "== Newest commits"
git log --oneline -8
echo
ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
echo "== Commits not pushed yet: $ahead"
echo
echo "== Uncommitted changes"
if [ -z "$(git status --porcelain)" ]; then
  echo "none"
else
  git status --short
  echo "Someone stopped mid-step here. Read 'git diff' before touching anything."
fi
