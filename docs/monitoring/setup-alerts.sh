#!/usr/bin/env bash
# SpotiStats alerts (Cloud Monitoring, free tier). Usage:
#   OWNER_EMAIL=you@example.com bash docs/monitoring/setup-alerts.sh
set -euo pipefail
P=spotistats-prod-482419
: "${OWNER_EMAIL:?set OWNER_EMAIL}"

CHANNEL=$(gcloud beta monitoring channels create --project "$P" \
  --display-name="SpotiStats owner" --type=email \
  --channel-labels=email_address="$OWNER_EMAIL" --format='value(name)')

# Dead-man switch metric: one point per completed cron run
gcloud logging metrics create spotistats_sync_completed --project "$P" \
  --description="Completed hourly listening-history syncs" \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.message="Cron collection completed"' \
  2>/dev/null || echo "metric exists"

DIR=$(dirname "$0")
for f in "$DIR"/policy-*.json; do
  sed "s#__CHANNEL__#$CHANNEL#" "$f" > /tmp/spotistats-policy.json
  gcloud alpha monitoring policies create --project "$P" --policy-from-file=/tmp/spotistats-policy.json
done
echo "Alerts created, notifications -> $OWNER_EMAIL"
