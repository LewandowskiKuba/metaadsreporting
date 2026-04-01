# META Ads Dashboard

Wewnętrzny dashboard agencji .eliteagency do raportowania kampanii Meta Ads i Google Ads. Umożliwia podgląd metryk reklamowych, analizę kreacji video, zarządzanie klientami i dostępem użytkowników.

## Funkcje

- Przełącznik platform: **Meta Ads** / **Google Ads**
- Metryki kampanii: wydatki, zasięg, wyświetlenia, CPC, CTR, ROAS, Koszt konwersji
- Wykresy wydajności w czasie
- Analiza targetowań (wiek, region) — Meta
- Podgląd kreacji reklamowych (grafika + video) — Meta
- Analiza video: retencja, ćwiartki (25/50/75/100%), ThruPlay, śr. czas oglądania
- Zarządzanie klientami — przypisywanie kont reklamowych (Meta + Google Ads)
- Zarządzanie użytkownikami i dostępem do kont
- Google Ads OAuth — podpięcie konta przez Panel Administratora
- Automatyczna synchronizacja danych (codziennie o 3:00 CET)

## Technologie

| Warstwa | Technologia |
|---|---|
| Frontend | React 18, React Router v7, Tailwind CSS v3 |
| Wykresy | Recharts |
| Ikony / UI | Lucide React, Radix UI |
| Backend | Node.js, Express 4 |
| Baza danych | SQLite (better-sqlite3) |
| Autoryzacja | JWT (30 dni), bcrypt |
| Build | Vite 5 |
| Proces | PM2 |
| Proxy | nginx |

## Wymagania

- Node.js 18+
- npm 9+
- Konto Meta Ads z aktywnym tokenem systemowym (System User)
- Konto Google Ads MCC z Developer Token (do integracji Google Ads)

## Instalacja

```bash
git clone https://github.com/LewandowskiKuba/metaadsreporting.git
cd metaadsreporting
npm install
```

## Konfiguracja

Utwórz plik `.env` w katalogu głównym:

```env
# Meta Ads — token systemowy (System User)
META_ACCESS_TOKEN=twoj_token_meta_api

# Google Ads — dane aplikacji OAuth (tokeny użytkowników trafiają do DB przez OAuth)
GOOGLE_ADS_DEVELOPER_TOKEN=twoj_developer_token
GOOGLE_ADS_CLIENT_ID=twoj_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=twoj_client_secret

# URL aplikacji (wymagane dla OAuth callback)
APP_URL=https://twoja-domena.pl
FRONTEND_URL=https://twoja-domena.pl/meta

# Auth
JWT_SECRET=losowy_sekret_min_32_znaki
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=BezpieczneHaslo123!

# Serwer
PORT=3002
```

### Opcjonalne zmienne Google Ads

```env
GOOGLE_ADS_MANAGER_ID=     # ID konta MCC (login-customer-id)
GOOGLE_ADS_CUSTOMER_IDS=   # Lista ID klientów przez przecinek (pomija auto-discovery)
GOOGLE_ADS_REFRESH_TOKEN=  # Tylko migracja — zostanie auto-przeniesiony do DB
```

## Uruchomienie (development)

```bash
npm run dev
```

Uruchamia jednocześnie:
- Backend Express: `http://localhost:3002`
- Frontend Vite: `http://localhost:5173`

## Build produkcyjny

```bash
npm run build
node server.js
```

## Deployment (Hetzner / Ubuntu)

```bash
# Na serwerze — projekt w /opt/meta-dashboard
cd /opt/meta-dashboard
git pull origin main
npm install
npm run build
pm2 restart meta-dashboard
```

## Konfiguracja nginx

```nginx
location /meta/ {
    proxy_pass http://localhost:3002/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Podpięcie Google Ads (OAuth)

1. Zarejestruj aplikację w Google Cloud Console (typ: Web application)
2. Dodaj Authorized redirect URI: `{APP_URL}/api/auth/google-ads/callback`
3. Wypełnij `GOOGLE_ADS_*` zmienne w `.env`
4. Zaloguj się jako admin → **Panel Administratora → Połącz Google Ads (OAuth)**

## Role użytkowników

| Rola | Uprawnienia |
|---|---|
| `admin` | Dostęp do wszystkich kont, zarządzanie użytkownikami i klientami, sync, OAuth |
| `viewer` | Dostęp tylko do przypisanych kont, podgląd danych |

## Synchronizacja danych

| Tryb | Kiedy | Co robi |
|---|---|---|
| Automatyczna | Codziennie 3:00 CET | Pobiera dane z poprzedniego dnia (Meta + Google Ads) |
| Ręczna | Przycisk sync w navbarze (admin) | Pełny sync wszystkich kont |
| Backfill | Pierwsze uruchomienie | Pobiera ostatnie 90 dni historii |
