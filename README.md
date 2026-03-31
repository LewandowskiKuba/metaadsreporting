# META Ads Dashboard

Wewnętrzny dashboard do raportowania kampanii Meta Ads (Facebook/Instagram) dla agencji. Umożliwia podgląd metryk reklamowych, analizę kreacji i zarządzanie dostępem klientów.

## Funkcje

- Podgląd metryk kampanii w czasie rzeczywistym (wydatki, zasięg, CPM, CPC, CTR, ROAS)
- Wykresy wydajności w czasie
- Analiza targetowań (wiek, region)
- Podgląd kreacji reklamowych (grafika + video)
- Analiza video: retencja, ćwiartki, ThruPlay
- Zarządzanie użytkownikami i dostępem do kont
- Automatyczna synchronizacja danych z Meta API (co 24h)

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
- Konto Meta Ads z aktywnym tokenem dostępu

## Instalacja

```bash
git clone https://github.com/LewandowskiKuba/metaadsreporting.git
cd metaadsreporting
npm install
```

## Konfiguracja

Utwórz plik `.env` w katalogu głównym:

```env
META_ACCESS_TOKEN=twoj_token_meta_api
JWT_SECRET=losowy_sekret_min_32_znaki
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=BezpieczneHaslo123!
PORT=3002
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
# Na serwerze
cd /opt/meta-dashboard
git pull
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

## Role użytkowników

| Rola | Uprawnienia |
|---|---|
| `admin` | Dostęp do wszystkich kont, zarządzanie użytkownikami, ręczna synchronizacja |
| `viewer` | Dostęp tylko do przypisanych kont, podgląd danych |

## Synchronizacja danych

- **Automatyczna:** codziennie o 3:00 CET — sync danych z poprzedniego dnia
- **Ręczna:** przycisk sync w navbarze (tylko admin)
- **Backfill:** przy pierwszym uruchomieniu pobiera ostatnie 90 dni historii
