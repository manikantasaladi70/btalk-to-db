# BtalkToDB 🗣️→🗄️

> Ask your database anything in plain English. Powered by GPT-4o + LangChain.

![Stack](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/LangChain-0.2-FF6B35?style=flat-square)
![Stack](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)

---

## What it does

BtalkToDB converts natural language questions into SQL queries and executes them against your connected databases — no SQL knowledge required.

**Key features:**
- 🔌 Connect PostgreSQL, MySQL, or SQLite databases
- 🧠 GPT-4o powered NL→SQL with schema-aware prompts
- ⚡ Redis query caching (same question = instant result)
- 🛡️ SQL safety guard — blocks INSERT/UPDATE/DELETE/DROP
- 📊 Dashboard with execution time charts
- 📜 Full query history with SQL inspection
- 📥 Export results as CSV
- 🔐 JWT authentication per user

---

## Project structure

```
btalk-to-db/
├── backend/                  # FastAPI + LangChain
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   │   ├── auth.py       # Register / login
│   │   │   ├── connections.py# DB connection CRUD
│   │   │   └── query.py      # NL→SQL + history + stats
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic settings
│   │   │   └── security.py   # JWT helpers
│   │   ├── db/
│   │   │   └── session.py    # Async SQLAlchemy engine
│   │   ├── models/
│   │   │   └── models.py     # User, DBConnection, QueryLog
│   │   ├── services/
│   │   │   ├── nl2sql_service.py  # LangChain + Redis cache
│   │   │   └── schema_service.py  # DB introspection + execution
│   │   └── main.py           # FastAPI app + CORS + startup
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── lib/api.ts        # Axios client + all API calls
│   │   ├── store/useStore.ts # Zustand global state
│   │   ├── components/
│   │   │   └── Sidebar.tsx   # Nav + connection manager
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx  # Login / Register
│   │   │   ├── DashboardPage.tsx  # Stats + charts
│   │   │   ├── QueryPage.tsx # Main query interface
│   │   │   └── HistoryPage.tsx    # Query history
│   │   ├── App.tsx           # Router + protected routes
│   │   └── index.css         # Design tokens + global styles
│   └── Dockerfile
│
└── docker-compose.yml        # Full stack: postgres + redis + backend + frontend
```

---

## Quick start

### Option A — Docker (recommended)

```bash
# 1. Clone and enter the project
cd btalk-to-db

# 2. Copy and fill in your env
cp .env.example .env
# Edit .env → add your OPENAI_API_KEY

# 3. Start everything
docker compose up --build

# App runs at:
#   Frontend → http://localhost:5173
#   Backend  → http://localhost:8000
#   API Docs → http://localhost:8000/docs
```

### Option B — Manual (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, OPENAI_API_KEY, SECRET_KEY

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> Make sure PostgreSQL and Redis are running locally.

---

## Environment variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (GPT-4o) |
| `DATABASE_URL` | PostgreSQL connection for BtalkToDB's own data |
| `REDIS_URL` | Redis for query caching |
| `SECRET_KEY` | JWT signing secret — change in production! |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default: 60) |
| `QUERY_CACHE_TTL` | Cache duration in seconds (default: 300) |

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login → get JWT token |
| GET | `/api/connections/` | List your DB connections |
| POST | `/api/connections/` | Add a new DB connection |
| DELETE | `/api/connections/{id}` | Remove connection |
| POST | `/api/connections/{id}/refresh-schema` | Re-introspect schema |
| POST | `/api/query/` | Run NL→SQL query |
| GET | `/api/query/history` | Get query history |
| GET | `/api/query/stats` | Get usage statistics |

Full interactive docs at `http://localhost:8000/docs`

---

## How the NL→SQL pipeline works

```
User question
     │
     ▼
Redis cache check ──── HIT ──→ Return cached SQL
     │ MISS
     ▼
Schema introspection (tables, columns, FK relationships)
     │
     ▼
LangChain prompt → GPT-4o
  System: schema + safety rules
  User: natural language question
     │
     ▼
SQL safety guard (blocks non-SELECT statements)
     │
     ▼
Execute against target DB (max 500 rows)
     │
     ▼
Cache result in Redis (5 min TTL)
     │
     ▼
Log to QueryLog table
     │
     ▼
Return columns + rows + metadata to frontend
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| AI / NL→SQL | LangChain + GPT-4o |
| ORM | SQLAlchemy 2.0 (async) |
| Auth | JWT (python-jose + passlib) |
| Caching | Redis |
| App DB | PostgreSQL |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| Charts | Recharts |
| HTTP | Axios |
| Routing | React Router v6 |
| Containers | Docker + Docker Compose |

---

## Demo credentials

After `docker compose up`, register at `http://localhost:5173/login`.

To test with a sample database, connect to the app's own PostgreSQL instance:
```
postgresql://postgres:password@localhost:5432/btalktodb
```
Then ask: *"Show all users"* or *"How many connections exist?"*

---

## GitHub

```bash
git init
git add .
git commit -m "feat: BtalkToDB — NL to SQL engine"
git remote add origin https://github.com/manikantasaladi70/btalk-to-db.git
git push -u origin main
```

---

Built with ❤️ — BtalkToDB
