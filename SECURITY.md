# Security Policy

## 🛡️ Security Status

This project adheres to strict security standards and undergoes regular automated auditing.

| Metric | Rating | Date |
| :--- | :--- | :--- |
| **Mozilla Observatory** | **A+ (125/100)** | 2026-01-09 |
| **SecurityHeaders.com** | **A+** | 2026-01-09 |
| **SSL Labs** | **A+** | 2026-01-09 |
| **Nuclei Audit** | **Pass (0 Issues)** | 2026-01-09 |
| **OWASP ZAP** | **Pass** | 2026-01-09 |

## ✅ Supported Versions

Only the latest major version receives active security updates.

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.x     | :white_check_mark: | Active           |
| < 1.0   | :x:                | End of Life      |

## 🐛 Reporting a Vulnerability

We take the security of `spotistats` seriously. If you have found a vulnerability, please **do not** open a public issue.

### Private Disclosure Process
1.  **Email**: Send details to the maintainer via GitHub email (check profile) or open a **Security Advisory** in the repository if enabled.
2.  **Response**: We will acknowledge receipt within 48 hours.
3.  **Resolution**: We will provide a timeline for the fix and coordinate the release.

### Scope
- **In Scope**: Source code, authentication flows (OAuth/JWT), data protection features, API endpoints.
- **Out of Scope**: DDoS attacks, social engineering, issues in 3rd party dependencies (unless strictly pinned and unpatchable).

## 🔐 Security Features Implemented

### Authentication & Authorization
- **OAuth 2.0 + PKCE**: Stateless authentication with Spotify.
- **JWT Rotation**: Access tokens stored in `HttpOnly` cookies, refresh tokens encrypted (AES-256-GCM) in DB.
- **RBAC**: Strict separation of user roles enforced by middleware and Database Row Level Security (RLS).

### Protection Mechanisms
- **CSRF**: Double Submit Cookie pattern with cryptographically secure tokens.
- **Content Security Policy (CSP)**: Strict policy blocking unsafe inline scripts and limiting external resources.
- **Rate Limiting**: Adaptive limiting per user/IP to prevent Brute Force and DDoS.
- **Audit Logging**: Sensitive actions (role changes, data imports) are securely logged.

### Data Privacy (GDPR)
- **Data Export**: Users can export all their stored data.
- **Right to be Forgotten**: Complete account deletion cascades to all related data.
- **Minimal Collection**: only necessary Spotify data is cached.
