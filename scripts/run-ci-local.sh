#!/usr/bin/env bash
set -e
# Install act if not present
if ! command -v act &>/dev/null; then
  echo "Installing act..."
  curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
fi
# Run the workflow locally, using a default event (push) and providing required secrets.
act -P ubuntu-latest=nektos/act-environments-ubuntu:18.04 \
  -s SUPABASE_URL="${SUPABASE_URL:-https://test.supabase.co}" \
  -s SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-test_pub_key}" \
  -s SUPABASE_SECRET_KEY="${SUPABASE_SECRET_KEY:-test_secret_key}" \
  -s SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-test_pub_key}"
