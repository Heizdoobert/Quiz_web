#!/usr/bin/env bash
# ---------------------------------------------------------------
# Script: update_imports.sh
# Purpose: After restructuring mobile/lib, rewrite Dart import paths
#          to the new locations (data/, features/, ui/).
# ---------------------------------------------------------------
set -euo pipefail
REPO_ROOT="$(pwd)"
cd "$REPO_ROOT"
# Ensure we are on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "⚠️ Please switch to 'main' before running this script."
  exit 1
fi
# Mapping of old package imports to new ones
declare -A PKG_MAP=(
  ["package:mobile/db/"]="package:mobile/data/db/"
  ["package:mobile/repositories/"]="package:mobile/data/repositories/"
  ["package:mobile/src/"]="package:mobile/features/auth/"
  ["package:mobile/theme/"]="package:mobile/ui/theme/"
  ["package:mobile/widgets/"]="package:mobile/ui/widgets/"
)
# Mapping of relative imports (covers ../ and ../../ patterns)
declare -A REL_MAP=(
  ["../db/"]="../data/db/"
  ["../repositories/"]="../data/repositories/"
  ["../src/"]="../features/auth/"
  ["../theme/"]="../ui/theme/"
  ["../widgets/"]="../ui/widgets/"
  ["../../db/"]="../../data/db/"
  ["../../repositories/"]="../../data/repositories/"
  ["../../src/"]="../../features/auth/"
  ["../../theme/"]="../../ui/theme/"
  ["../../widgets/"]="../../ui/widgets/"
)
replace_imports() {
  local old=$1 new=$2
  # Find .dart files containing the old string
  mapfile -t files < <(git grep -l --untracked "$old" -- "*.dart" || true)
  for f in "${files[@]}"; do
    if sed --version >/dev/null 2>&1; then
      sed -i "s|$old|$new|g" "$f"
    else
      sed -i '' "s|$old|$new|g" "$f"
    fi
  done
}
# Apply package imports
for old in "${!PKG_MAP[@]}"; do
  replace_imports "$old" "${PKG_MAP[$old]}"
done
# Apply relative imports
for old in "${!REL_MAP[@]}"; do
  replace_imports "$old" "${REL_MAP[$old]}"
done
# Stage and commit changes
git add mobile/lib/**/*.dart
if ! git diff --cached --quiet; then
  git commit -m "fix: update Dart import paths after lib restructure"
  echo "✅ Import updates committed."
else
  echo "✅ No import changes needed."
fi
# Quick verification (optional)
flutter pub get >/dev/null 2>&1 || true
flutter analyze || true
flutter test || true
echo "🎉 Done."
