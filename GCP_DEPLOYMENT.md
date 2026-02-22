# SpotiStats - GCP Deployment Guide

## 📋 Overview

This guide covers:
1. One-time GCP setup
2. GitHub secrets configuration
3. Automatic deployment via GitHub Actions
4. Cloud Scheduler setup for cron jobs

---

## 🔧 Step 1: GCP Project Setup (One-time)

### 1.1 Create GCP Project
```bash
# Set your project name
export PROJECT_ID="spotistats-prod"

# Create project
gcloud projects create $PROJECT_ID --name="SpotiStats"

# Set as default
gcloud config set project $PROJECT_ID

# Enable billing (required for Cloud Run)
# Do this in GCP Console: https://console.cloud.google.com/billing
```

### 1.2 Enable Required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

### 1.3 Create Artifact Registry Repository
```bash
gcloud artifacts repositories create spotistats \
  --repository-format=docker \
  --location=europe-central2 \
  --description="SpotiStats Docker images"
```

---

## 🔐 Step 2: Create Secrets in GCP Secret Manager

### 2.1 Create all required secrets
```bash
# Database (from Supabase)
echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
echo -n "postgresql://..." | gcloud secrets create DIRECT_URL --data-file=-

# Spotify OAuth
echo -n "your_client_id" | gcloud secrets create SPOTIFY_CLIENT_ID --data-file=-
echo -n "your_client_secret" | gcloud secrets create SPOTIFY_CLIENT_SECRET --data-file=-
echo -n "https://YOUR_BACKEND_URL/auth/callback" | gcloud secrets create SPOTIFY_REDIRECT_URI --data-file=-

# JWT
echo -n "your-super-secret-jwt-key-min-32-chars" | gcloud secrets create JWT_SECRET --data-file=-

# Encryption key (separate from JWT_SECRET)
echo -n "your-separate-encryption-key-min-32-chars" | gcloud secrets create ENCRYPTION_KEY --data-file=-

# Frontend URL
echo -n "https://YOUR_FRONTEND_URL" | gcloud secrets create FRONTEND_URL --data-file=-

# Cron Secret
echo -n "your-random-cron-secret-key" | gcloud secrets create CRON_SECRET_KEY --data-file=-
```

---

## 🤖 Step 3: Create Service Account for GitHub Actions

### 3.1 Create Service Account
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"
```

### 3.2 Grant Required Roles
```bash
export SA_EMAIL="github-actions@$PROJECT_ID.iam.gserviceaccount.com"

# Cloud Run Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

# Artifact Registry Writer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Service Account User (for Cloud Run)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

### 3.3 Create Service Account Key
```bash
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=$SA_EMAIL

# IMPORTANT: Copy content of gcp-key.json for GitHub Secrets
cat gcp-key.json
```

---

## 🔑 Step 4: Configure GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g., `spotistats-prod`) |
| `GCP_SA_KEY` | Entire content of `gcp-key.json` |

---

## 🚀 Step 5: Deploy

### Option A: Automatic (Recommended)
Just push to `main` branch:
```bash
git add .
git commit -m "Deploy to GCP"
git push origin main
```
GitHub Actions will automatically build and deploy.

### Option B: Manual Trigger
Go to GitHub → Actions → "Deploy to GCP Cloud Run" → Run workflow

---

## ⏰ Step 6: Setup Cloud Scheduler (After First Deploy)

### 6.1 Get Backend URL
```bash
gcloud run services describe spotistats-backend \
  --region=europe-central2 \
  --format='value(status.url)'
```

### 6.2 Create Scheduler Job
```bash
export BACKEND_URL="https://spotistats-backend-xxxxx-xx.a.run.app"

gcloud scheduler jobs create http spotify-history-sync \
  --location=europe-central2 \
  --schedule="0 */6 * * *" \
  --uri="$BACKEND_URL/api/v1/cron/sync-listening-history" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_CRON_SECRET_KEY" \
  --time-zone="Europe/Warsaw" \
  --max-retry-attempts=3 \
  --min-backoff-duration=5m \
  --attempt-deadline=540s
```

> ⚠️ **Note**: The `X-Cloudscheduler` header is no longer accepted by the backend. Use `Authorization: Bearer <CRON_SECRET_KEY>` for authentication.

### 6.3 Test Scheduler
```bash
gcloud scheduler jobs run spotify-history-sync --location=europe-central2
```

---

## 🔄 Step 7: Update Spotify OAuth Redirect URI

After first deploy, update in Spotify Developer Dashboard:
1. Go to https://developer.spotify.com/dashboard
2. Select your app
3. Edit Settings
4. Add Redirect URI: `https://YOUR_BACKEND_URL/auth/callback`
5. Save

Also update the secret:
```bash
echo -n "https://YOUR_BACKEND_URL/auth/callback" | \
  gcloud secrets versions add SPOTIFY_REDIRECT_URI --data-file=-
```

---

## 📊 Monitoring

### View Logs
```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=spotistats-backend" --limit=50

# Cron job logs
gcloud logging read 'jsonPayload.component="spotify-sync"' --limit=20
```

### View Cloud Run Services
```bash
gcloud run services list --region=europe-central2
```

---

## 🔧 Troubleshooting

### 1. Container fails to start
```bash
gcloud run services logs spotistats-backend --region=europe-central2 --limit=50
```

### 2. Database connection issues
- Check if DATABASE_URL secret is correct
- Verify Supabase allows connections from Cloud Run IP range

### 3. OAuth callback fails
- Verify SPOTIFY_REDIRECT_URI matches exactly what's in Spotify Dashboard
- Check FRONTEND_URL is correct

---

## 💰 Cost Estimate (Low Traffic)

| Service | Estimated Cost |
|---------|----------------|
| Cloud Run (Backend) | ~$0-5/month |
| Cloud Run (Frontend) | ~$0-3/month |
| Cloud Scheduler | ~$0.10/month |
| Artifact Registry | ~$0.10/month |
| Secret Manager | ~$0.03/month |

**Total: ~$0-10/month** (with GCP free tier)
