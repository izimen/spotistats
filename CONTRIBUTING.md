# Contributing to SpotiStats

First off, thanks for taking the time to contribute! 🎉

## 🛠️ Development Setup

1.  **Fork and Clone** the repository.
2.  **Install Dependencies**:
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```
3.  **Environment Variables**:
    - Copy `.env.example` to `.env` in `backend/` and `frontend/`.
    - Fill in required credentials (see `README.md`).
4.  **Database**:
    - Ensure you have PostgreSQL running.
    - Run `cd backend && npx prisma migrate dev`.

## 🧪 Testing Policy

We require all new features to be tested.

- **Backend**: Run `npm test` in `backend/` directory.
- **Security**: If modifying auth/headers, run `npm test -- security.test.js`.

## 📝 Coding Standards

- **Linting**: We use ESLint. Please fix any linting errors before submitting.
- **Commits**: Use conventional commits (e.g., `feat: add user profile`, `fix: token rotation`).
- **Security**: Do NOT commit secrets. Use `.env` files.

##  Pull Request Process

1.  Create a new branch: `git checkout -b feature/my-feature`.
2.  Make your changes and add tests.
3.  Ensure all tests pass: `npm test`.
4.  Push to your fork and submit a Pull Request.
5.  Wait for review! 🚀
