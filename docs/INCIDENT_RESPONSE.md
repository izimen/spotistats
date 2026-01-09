# Incident Response Plan

## 1. Triggers
- Automated alert from `gitleaks` (CI pipeline).
- Manual discovery of secret in git history.
- Notification from external researcher.
- Suspicious activity in production logs.

## 2. Response Phases

### Phase 1: Identification
- **Confirm**: Verify if the alert is a false positive.
- **Audit Logs**: Check `SecurityAuditLog` for suspicious `ACCESS_DENIED` or `ROLE_CHANGE` events.
- **Assess**: Determine scope (What key? What permissions? How long exposed?).

### Phase 2: Containment
- **Revoke**: Immediately revoke the exposed credential.
- **Block**: If necessary, block traffic to affected services (e.g., enable maintenance mode).

### Phase 3: Eradication
- **Rotate**: Issue new credentials.
- **Update**: Deploy new credentials to environment (GCP, GitHub Secrets).
- **Clean**: If in git history, run BFG Repo-Cleaner.

### Phase 4: Recovery
- **Verify**: Ensure systems are functioning with new credentials.
- **Monitor**: Watch for failures or continued suspicious access attempts.

### Phase 5: Lessons Learned
- **Post-Mortem**: Document what happened and why.
- **Improve**: Update pre-commit hooks or rules to prevent recurrence.

## 3. Contact List
- **Security Lead**: [Name/Email]
- **DevOps Lead**: [Name/Email]
- **Project Owner**: [Name/Email]
