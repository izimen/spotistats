# Contributing to SpotiStats

First off, thanks for taking the time to contribute! 🎉

## 🛠️ Development Setup

1.  **Fork and Clone** the repository.
2.  **Install Dependencies**:
    ```bash
    cd backend
    npm install
    cd ../frontend
    npm install
    ```
3.  **Environment Variables**:
    - Copy `.env.example` to `.env` in `backend/`.
    - Fill in required credentials (see `README.md`).
    - Ensure `ENCRYPTION_KEY` is set (separate from `JWT_SECRET`).
4.  **Database**:
    - Ensure you have PostgreSQL running.
    - Run `cd backend && npx prisma migrate dev`.

## 🔑 API Versioning

All API endpoints use **`/api/v1/*`** paths exclusively. Legacy unversioned `/api/*` routes have been removed.

When adding new endpoints:
- Register routes under `/api/v1/` in `app.js`
- Use the `api` Axios instance (not raw `fetch()`) on the frontend

## 🧪 Testing Policy

We require all new features to be tested.

- **Backend**: Run `npm test` in `backend/` directory.
- **Security**: If modifying auth/headers, run `npm test -- security.test.js`.

## 🔒 Security Practices

- Do **NOT** commit secrets. Use `.env` files (already in `.gitignore`).
- CSRF protection uses `X-CSRF-Token` header (not `X-Requested-With`).
- CORS only allows `localhost` origins in development mode.
- Cron endpoints authenticate via `Authorization: Bearer <CRON_SECRET_KEY>` only.

## 📝 Coding Standards

- **Linting**: We use ESLint. Please fix any linting errors before submitting.
- **Commits**: Use conventional commits (e.g., `feat: add user profile`, `fix: token rotation`).
- **Error responses**: Follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) format.

## 🔀 Pull Request Process

1.  Create a new branch: `git checkout -b feature/my-feature`.
2.  Make your changes and add tests.
3.  Ensure all tests pass: `npm test`.
4.  Push to your fork and submit a Pull Request.
5.  Wait for review! 🚀
