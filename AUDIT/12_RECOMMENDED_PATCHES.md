# AUDIT: Recommended Patches (Manual/Risky)

Zmiany zbyt ryzykowne do automatycznego wdrozenia. Wymagaja planowania, testow i recznej decyzji.

---

## PATCH-001: Rotacja Wszystkich Sekretow
- **Powiazane:** SEC-001
- **Severity:** CRITICAL
- **Opis:** Wszystkie sekrety w `backend/.env` sa w historii git. Musza zostac zrotowane na zewnetrznych serwisach.

### Plan Wdrozenia

1. **Supabase Database Password**
   - Zaloguj sie do Supabase Dashboard
   - Settings -> Database -> Reset Database Password
   - Zaktualizuj `DATABASE_URL` i `DIRECT_URL` w GCP Secret Manager
   - Przetestuj polaczenie

2. **Spotify Client Secret**
   - Zaloguj sie do Spotify Developer Dashboard
   - Edytuj aplikacje -> Reset Client Secret
   - Zaktualizuj `SPOTIFY_CLIENT_SECRET` w GCP Secret Manager
   - Przetestuj OAuth flow

3. **JWT Secret**
   - Wygeneruj nowy: `openssl rand -hex 32`
   - Zaktualizuj `JWT_SECRET` w GCP Secret Manager
   - UWAGA: Wszystkie aktywne sesje uzytkownikkow zostana uniewaznione (wymaga ponownego logowania)

4. **Encryption Key**
   - Wygeneruj nowy: `openssl rand -hex 32`
   - Zaktualizuj `ENCRYPTION_KEY` w GCP Secret Manager
   - UWAGA: Wszystkie zaszyfrowane refresh tokeny stana sie nieczytelne - uzytkownicy beda musieli sie ponownie zalogowac

5. **Cron Secret Key**
   - Wygeneruj nowy: `openssl rand -hex 32`
   - Zaktualizuj w GCP Secret Manager ORAZ w Cloud Scheduler job config

### Kolejnosc
1. CRON_SECRET_KEY (najmniej wplyw)
2. JWT_SECRET + ENCRYPTION_KEY (razem - oba powoduja wylogowanie)
3. SPOTIFY_CLIENT_SECRET
4. DATABASE_URL (najwyzsze ryzyko)

### Rollback
- Zachowaj stare klucze na 24h w razie potrzeby rollbacku
- Monitoruj logi po kazdej rotacji

---

## PATCH-002: Czyszczenie Historii Git (BFG)
- **Powiazane:** SEC-001
- **Severity:** CRITICAL
- **Opis:** Nawet po rotacji sekretow, stare wartosci sa nadal w historii git.

### Plan Wdrozenia

1. **Backup repozytorium:**
   ```bash
   git clone --mirror git@github.com:izimen/spotistats.git spotistats-backup.git
   ```

2. **Czyszczenie z BFG Repo Cleaner:**
   ```bash
   # Install BFG
   # Create file with patterns to remove
   echo "DATABASE_URL" > secrets-to-remove.txt
   echo "SPOTIFY_CLIENT_SECRET" >> secrets-to-remove.txt
   echo "JWT_SECRET" >> secrets-to-remove.txt
   echo "ENCRYPTION_KEY" >> secrets-to-remove.txt
   echo "CRON_SECRET_KEY" >> secrets-to-remove.txt

   java -jar bfg.jar --replace-text secrets-to-remove.txt spotistats.git
   cd spotistats.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force push:**
   ```bash
   git push --force
   ```

4. **Powiadom wspolpracownikow** zeby re-clone'owali repo

### Rollback
- Mirror backup umozliwia pelne przywrocenie w razie problemow

---

## PATCH-003: Zmiana JWT-in-URL na Auth Code Flow
- **Powiazane:** SEC-003
- **Severity:** HIGH
- **Opis:** Zamiast przekazywac pelny JWT w URL, uzyj krotkotrwalego authorization code.

### Plan Wdrozenia

1. **Backend:**
   - W callback, zamiast `res.redirect(...?token=JWT)`:
     - Wygeneruj krotkotrwaly code (UUID, 30s TTL)
     - Zapisz w Redis/memory: `code -> { userId, accessToken, ... }`
     - Redirect: `${frontendUrl}/callback?code=${code}`

2. **Frontend:**
   - W Callback.tsx:
     - Odczytaj `code` z URL
     - POST `/auth/exchange` z `{ code }`
     - Otrzymaj JWT w response body (nie URL)
     - Zapisz JWT

3. **Nowy endpoint:**
   - `POST /auth/exchange` - wymienia code na JWT
   - Rate limited, single-use

### Kolejnosc
- Po rotacji sekretow (PATCH-001)
- Wymaga zmian w obu: backend i frontend

### Rollback
- Zachowaj stary flow za feature flag na 1-2 tygodnie

---

## PATCH-004: Przeniesienie Access Token Server-Side
- **Powiazane:** SEC-004
- **Severity:** HIGH
- **Opis:** Spotify access token nie powinien byc w JWT payload.

### Plan Wdrozenia

1. **Backend:**
   - Przechowuj Spotify access token zaszyfrowany w DB (kolumna `accessToken` w User)
   - JWT zawiera tylko: `userId`, `tokenVersion`, `tokenFamily`
   - W `protect.js`: po weryfikacji JWT, pobierz access token z DB

2. **Migracja:**
   ```sql
   ALTER TABLE "User" ADD COLUMN "accessToken" TEXT;
   ALTER TABLE "User" ADD COLUMN "accessTokenExpiry" TIMESTAMP;
   ```

3. **Frontend:** Brak zmian (frontend nie uzywa bezposrednio access token)

### Kolejnosc
- Moze byc robione niezaleznie od PATCH-003
- Wymaga migracji bazy danych

### Rollback
- Migracja reversible (DROP COLUMN)
- Stary flow (token w JWT) jako fallback na 1-2 tygodnie

---

## PATCH-005: Staging Environment
- **Powiazane:** OPS-001
- **Severity:** Medium
- **Opis:** Dodaj staging Cloud Run services.

### Plan Wdrozenia

1. Stworz osobne Cloud Run services: `spotistats-backend-staging`, `spotistats-frontend-staging`
2. Stworz osobna baze danych Supabase (staging)
3. Stworz osobna Spotify App (staging redirect URI)
4. Dodaj workflow `deploy-staging.yml` uruchamiany na PR
5. Dodaj smoke tests po deploy staging

### Koszty
- Cloud Run: ~$0 (min-instances=0, pay-per-use)
- Supabase: $0 (free tier)
- Spotify: $0 (free developer app)
