#!/bin/bash
# check_history.sh
# Helps analyze git history for potential secrets

echo "Analyzing git history for high-entropy strings and keywords..."
echo "This might take a moment."

# Keywords to search for
KEYWORDS="(api_key|secret|password|auth|token)"

# Search commit diffs
git log -p --all | grep -E -i "$KEYWORDS" | head -n 20

echo "----------------------------------------"
echo "If you see actual secrets above, use BFG Repo-Cleaner to remove them."
echo "Running: bfg --delete-files .env"
echo "----------------------------------------"
