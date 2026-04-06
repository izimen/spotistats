-- SEC-003: Auth code for cross-domain token exchange (DB-backed, multi-instance safe)
ALTER TABLE "User" ADD COLUMN "authCode" TEXT;
ALTER TABLE "User" ADD COLUMN "authCodeExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_authCode_key" ON "User"("authCode");
