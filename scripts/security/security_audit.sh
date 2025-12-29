#!/bin/bash
# security_audit.sh
# Runs dependency audits for the project

echo "🔍 Auditing Backend..."
cd backend || exit
npm audit --audit-level=high
BACKEND_STATUS=$?
cd ..

echo "🔍 Auditing Frontend..."
cd frontend || exit
npm audit --audit-level=high
FRONTEND_STATUS=$?
cd ..

if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
    echo "✅ All audits passed."
    exit 0
else
    echo "❌ Vulnerabilities found."
    exit 1
fi
