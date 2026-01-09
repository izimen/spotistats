# Secrets Management Guide

## 1. Principles
- **Never Commit Secrets**: Real credentials should never touch the git repository.
- **Least Privilege**: API keys and tokens should have the minimum required scope.
- **Rotation**: Regular rotation reduces the impact of compromised keys.

## 2. Storage
- **Local Development**: Use `.env` files (git-ignored).
- **CI/CD**: Use GitHub Repository Secrets (`Settings > Secrets and variables > Actions`).
- **Production (GCP)**: Use GCP Secret Manager.
- **Database (Encryption at Rest)**: Refresh Tokens are encrypted using AES-256-GCM before storage. The key is derived from `JWT_SECRET`.

## 3. Secret Rotation Procedure

### Google Cloud (GCP)
1.  Go to **IAM & Admin > Service Accounts**.
2.  Select the account (e.g., `github-actions-deployer`).
3.  **Keys** > **Add Key** > **Create new key**.
4.  Update the new key in GitHub Secrets (`GCP_SA_KEY`).
5.  Delete the old key after verifying the new one works.

### Spotify API
1.  Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Select App > **Settings**.
3.  Regenerate **Client Secret**.
4.  Update `SPOTIFY_CLIENT_SECRET` in:
    - Local `.env`
    - GCP Secret Manager (for production)
    - GitHub Secrets (if used for tests)

### JWT Secret
1.  Generate a new random 32+ char string: `openssl rand -hex 32`
2.  Update `JWT_SECRET` in deployment vars.
3.  **Note**: This will invalidate all existing user sessions.

## 4. Emergency Revocation
If a secret is leaked:
1.  **Revoke immediately** at the provider (GCP, Spotify).
2.  **Check logs** for unauthorized usage.
3.  **Rotate** to a new key.
4.  **Clean history** if committed to git (see `check_history.sh`).

## 5. Rate Limiting Configuration (Optional)

Rate limits can be configured via environment variables (useful for development):

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_AUTH` | 5 | Auth endpoints (per 15 min) |
| `RATE_LIMIT_GENERAL` | 500 | General requests (per 15 min) |
| `RATE_LIMIT_API` | 200 | API endpoints (per 15 min) |
| `RATE_LIMIT_IMPORT` | 10 | Import operations (per hour) |

> **Tip**: For local development, add to `.env`:
> ```env
> RATE_LIMIT_AUTH=1000
> ```
