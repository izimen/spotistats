# Developer Security Training

## 1. Safe Coding Habits

### ⛔ Common Pitfalls
- **Hardcoding**: `const apiKey = "12345"` (Never do this!)
- **Committing .env**: Adding `.env` to git instead of `.gitignore`.
- **Debugging**: Logging valid tokens to console/logs (`console.log(token)`).

### ✅ Best Practices
- **Use .env**: Always load config from environment variables.
- **Pre-commit**: Keep the pre-commit hooks enabled.
- **Sanitize Logs**: Ensure no PII or secrets are written to logs.

## 2. Tools You Should Know
- **Pre-commit**: Runs automatically. If it fails, fix the issue (don't use `git commit --no-verify`).
- **Gitleaks**: Scans for secrets.
- **Audit Scripts**: Use `./scripts/security/scan_secrets.sh` to check your work locally.

## 3. Onboarding Checklist
- [ ] Read `SECURITY.md`
- [ ] Read `SECRETS_MANAGEMENT.md`
- [ ] Install pre-commit (`pre-commit install`)
- [ ] Setup local `.env` (copy from `.env.development.example`)
