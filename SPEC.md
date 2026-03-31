# Specyfikacja techniczna — META Ads Dashboard

## Architektura systemu

```
┌──────────────────────────────────────────────────────┐
│                  FRONTEND (React SPA)                │
│   Vite dev: localhost:5173 │ Build: /meta/ (nginx)  │
│   Routes: / (login), /dashboard, /users             │
└──────────────────────┬───────────────────────────────┘
                       │ fetch /api/*
              ┌────────▼────────┐
              │  Express server │  :3002
              ├─────────────────┤
              │  Auth (JWT)     │
              │  Meta Proxy     │
              │  DB endpoints   │
              │  Cron sync      │
              └───────┬─────────┘
              ┌───────┴─────────┐
              │                 │
     ┌────────▼──────┐  ┌───────▼──────────┐
     │  SQLite DB    │  │  Meta Graph API  │
     │  metrics.db   │  │  v21.0           │
     └───────────────┘  └──────────────────┘
```

---

## Backend

### server.js

**Port:** `process.env.PORT || 3002`
**Runtime:** Node.js ESM (`"type": "module"`)

#### Middleware

```
CORS          origins: localhost:5173, localhost:3002
express.json  body parsing
authMiddleware  JWT verify (na chronionych trasach)
```

#### Endpointy

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| POST | `/api/auth/login` | — | Login email+password → JWT |
| GET | `/api/auth/me` | JWT | Profil zalogowanego |
| GET | `/api/users` | admin | Lista użytkowników + konta |
| POST | `/api/users` | admin | Nowy użytkownik |
| PUT | `/api/users/:id` | admin | Edycja użytkownika |
| DELETE | `/api/users/:id` | admin | Usunięcie użytkownika |
| GET | `/api/db/accounts` | JWT | Konta (filtered by role) |
| GET | `/api/db/metrics/:accountId` | JWT | Daily metrics z DB |
| GET | `/api/db/aggregate/:accountId` | JWT | KPI zagregowane |
| POST | `/api/db/sync` | admin | Ręczna synchronizacja |
| ALL | `/api/meta/*` | JWT | Proxy → Meta Graph API |

#### Parametry dla metryk

```
?since=YYYY-MM-DD&until=YYYY-MM-DD
```

#### Aggregate KPI (obliczane w locie)

```javascript
spend          // suma wydatków
impressions    // suma wyświetleń
reach          // suma zasięgu
clicks         // suma kliknięć (unique)
cpm            // spend / impressions * 1000
cpc            // spend / clicks
ctr            // clicks / impressions * 100
cpl            // spend / leads (jeśli leads > 0)
cost_per_call  // spend / calls (jeśli calls > 0)
roas           // purchase_value / spend (jeśli purchase_value > 0)
```

---

## Baza danych

**Silnik:** SQLite via better-sqlite3
**Plik:** `data/metrics.db`
**Tryb WAL:** Tak (wyższa wydajność odczytu)

### Schemat

```sql
CREATE TABLE accounts (
  id        TEXT PRIMARY KEY,     -- act_XXXXXXXXXXXXXXX
  name      TEXT NOT NULL,
  currency  TEXT DEFAULT 'PLN',
  status    INTEGER DEFAULT 1,
  synced_at TEXT                  -- ISO timestamp ostatniego syncu
);

CREATE TABLE daily_metrics (
  account_id      TEXT NOT NULL,
  date            TEXT NOT NULL,  -- YYYY-MM-DD
  spend           REAL DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  unique_clicks   INTEGER DEFAULT 0,
  outbound_clicks INTEGER DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  calls           INTEGER DEFAULT 0,
  purchase_value  REAL DEFAULT 0,
  PRIMARY KEY (account_id, date),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'viewer',  -- 'admin' | 'viewer'
  active        INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_accounts (
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, account_id)
);
```

---

## Autoryzacja

**Biblioteki:** `jsonwebtoken`, `bcryptjs`

```
Token TTL:    30 dni
Algorithm:    HS256
Secret:       process.env.JWT_SECRET
Header:       Authorization: Bearer <token>
Storage:      localStorage ('auth_token')
```

### Role

| Rola | DB | Konta | Sync | Użytkownicy |
|------|-----|-------|------|-------------|
| admin | pełny dostęp | wszystkie | tak | tak |
| viewer | tylko odczyt | przypisane | nie | nie |

### Seed admin

Przy pierwszym uruchomieniu, jeśli tabela `users` jest pusta i `ADMIN_EMAIL` + `ADMIN_PASSWORD` są ustawione w `.env`, automatycznie tworzony jest konto administratora.

---

## Synchronizacja z Meta API

### db/sync.js

#### syncAll()
1. Pobiera `/me/adaccounts?fields=id,name,currency` z Meta API
2. Upsert do tabeli `accounts`
3. Dla każdego konta:
   - `synced_at IS NULL` → backfill ostatnich 90 dni
   - `synced_at IS NOT NULL` → sync tylko yesterday

#### syncYesterday()
- Sync wszystkich aktywnych kont dla `date = yesterday`
- Wywoływany przez cron: **codziennie o 3:00 CET**

#### syncAccount(accountId, since, until)
- GET `/{accountId}/insights`
- Fields: `spend, impressions, reach, clicks, unique_clicks, outbound_clicks, actions, action_values`
- Time increment: `day`
- Przetwarza actions → `leads`, `calls`, `outbound_clicks`
- Przetwarza action_values → `purchase_value`
- Upsert do `daily_metrics` (INSERT OR REPLACE)

### Typy konwersji zliczane jako leady

```javascript
'lead'
'offsite_conversion.fb_pixel_lead'
'onsite_conversion.lead_grouped'
'onsite_conversion.messaging_first_reply'
'contact'
'omni_complete_registration'
```

### Typy zliczane jako połączenia

```javascript
'click_to_call_call_confirm'
```

---

## Frontend

### Routing

```javascript
basename: import.meta.env.PROD ? '/meta' : '/'

/           → LoginPage
/dashboard  → DashboardPage (protected)
/users      → UsersPage (protected, adminOnly)
```

### Zmienne środowiskowe Vite

```
VITE_API_URL=/meta    # produkcja: prefix do API calls
                      # dev: pusty (proxy na :3002)
```

### API calls

**src/api/local.js** — komunikacja z backendem

```javascript
const BASE = import.meta.env.VITE_API_URL ?? '';
// → /meta/api/... (prod) | /api/... (dev, przez Vite proxy)
```

**src/api/meta.js** — komunikacja z Meta Graph API przez proxy

```javascript
const PROXY = (import.meta.env.VITE_API_URL ?? '') + '/api/meta';

getAds(accountId, {since, until})
  fields: name, status, creative{image_url, thumbnail_url, video_id, actor_id}, insights

getVideoAds(accountId, {since, until})
  fields: video_play_actions, video_p25/p50/p75/p95/p100_watched_actions,
          video_avg_time_watched_actions, video_thruplay_watched_actions

getInsightsBreakdown(accountId, {since, until}, breakdowns)
  breakdowns: ['age'] | ['region']
```

### Komponenty

| Komponent | Opis |
|-----------|------|
| `Navigation` | Topbar: logo, konto dropdown, date range, sync, logout |
| `MetricCard` | Pojedyncza karta KPI |
| `PerformanceChart` | LineChart: wydatki / wyświetlenia / kliknięcia |
| `TargetingAnalysis` | Tabs: breakdown wiek / region |
| `AdCards` | Reklamy: thumbnail + metryki (wyświetlenia, CTR, wydatki, konwersje). Pagination po 3. |
| `VideoCards` | Reklamy video: thumbnail + metryki playback + retencja ćwiartkowa. Pagination po 3. |
| `UserModal` | Form: tworzenie/edycja użytkownika + przypisanie kont |
| `DateRangeModal` | Date picker dla zakresu dat |
| `FractalBackground` | Animowane kręgi canvas na stronie logowania |
| `ProtectedRoute` | HOC: sprawdza token, redirectuje jeśli brak |

---

## Build i deployment

### Vite config

```javascript
// Dev: base = '/', Build: base = '/meta/'
base: command === 'build' ? '/meta/' : '/'

server: {
  port: 5173,
  allowedHosts: 'all',
  proxy: { '/api': 'http://localhost:3002' }
}
```

### nginx (na serwerze Hetzner)

```nginx
# /etc/nginx/sites-enabled/advy
location /meta/ {
    proxy_pass http://localhost:3002/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### PM2

```bash
pm2 start server.js --name meta-dashboard
pm2 restart meta-dashboard
pm2 logs meta-dashboard
```

### Deploy workflow

```bash
cd /opt/meta-dashboard
git pull
npm install
npm run build
pm2 restart meta-dashboard
```

---

## Środowisko produkcyjne

| Parametr | Wartość |
|----------|---------|
| Serwer | Hetzner VPS (Ubuntu) |
| IP | 204.168.146.172 |
| Port aplikacji | 3002 |
| Ścieżka | `/opt/meta-dashboard` |
| URL | `https://<ngrok>/meta/` |
| Process manager | PM2 (id: 0) |
| ngrok | PM2 (id: 3), port 80 |

### Inne usługi na serwerze

| Usługa | Port | Opis |
|--------|------|------|
| Advy (Swarm) | 3000 | Drugi projekt agencji |
| Advy backend | 3001 | Docker container |
| n8n | — | Automatyzacje |
| Qdrant | — | Baza wektorowa (RAG) |

---

## Bezpieczeństwo

- Tokeny JWT z krótkim TTL (30d) przechowywane w `localStorage`
- Hasła hashowane bcrypt (10 rund)
- META_ACCESS_TOKEN nigdy nie trafia do frontendu — tylko przez proxy
- Filtrowanie kont per user (viewer widzi tylko przypisane)
- CORS ograniczony do znanych originów
- `.env` w `.gitignore`

---

## Znane ograniczenia

- SQLite nie nadaje się do bardzo dużej skali (>100 kont, duży ruch) — wystarczy dla agencji
- Meta API rate limits: przy wielu kontach sync może być wolny
- Token Meta (long-lived) wygasa po ~60 dniach — wymaga ręcznego odnowienia
- Brak automatycznego odnawiania tokenów Meta
