# Motion Nova

Self-hosted вебзастосунок для керування мережею фітнес-залів: користувачі та ролі, філії, тарифні плани й абонементи, оплати, заняття та бронювання, check-in/check-out відвідувань, облік витрат і управлінська аналітика.

Один deployment обслуговує одну мережу з довільною кількістю філій. До системи підключений AI-агент на базі **Dify**, який відповідає на запити по бізнес-аналітиці.

## Технології

**Backend** — Python 3.14, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, PostgreSQL 18, Redis 8, pytest, ruff.
**Frontend** — Node 24 (LTS), React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query 5, Zustand 5, Zod 4, FullCalendar 6, Vitest 4.
**AI** — Dify (self-hosted) + read-only MCP сервер на боці backend.
**Інфраструктура** — Docker / Docker Compose.

## AI-агент на Dify

Аналітичний агент реалізований у self-hosted [Dify](https://dify.ai) і вбудований у застосунок через iframe на сторінці `/dashboard/ai`.

- Backend публікує **read-only MCP сервер** на `/mcp`, який віддає набір аналітичних інструментів (огляд бізнесу, відвідуваність, заповнюваність занять, порівняння періодів і філій).
- Dify-агент викликає ці інструменти, отримує дані й формує відповідь користувачу. Агент не змінює дані системи.
- Доступ до MCP захищений токеном `MCP_API_TOKEN`, кожен виклик має timeout і потрапляє в логи застосунку.

Backend і Dify спілкуються через спільну Docker-мережу `motion-nova-shared`: контейнер backend має alias `motion-backend`, тож у Dify UI MCP-сервер вказується як `http://motion-backend:8000/mcp`.

URL застосунку Dify передається фронтенду через змінну `VITE_DIFY_APP_URL`.

## Структура репозиторію

- `backend` — REST API, бізнес-логіка, MCP сервер, міграції, тести.
- `frontend` — SPA-клієнт і лендинг.
- `docker-compose.yml` — локальне оточення; `docker-compose.prod.yml` — продакшн-збірка.

## Швидкий старт

Спільна мережа `motion-nova-shared` оголошена як зовнішня (її використовує self-hosted Dify), тому її потрібно створити **один раз перед першим запуском** — інакше `docker compose up` завершиться помилкою:

```bash
docker network create motion-nova-shared
docker compose up --build
```

Сервіси після старту:

- frontend: `http://localhost:3001`
- backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

AI-агента (Dify) піднімають окремо й підключають до тієї ж мережі `motion-nova-shared` — backend доступний у Dify за адресою `http://motion-backend:8000/mcp`.

> Оновлення мажорної версії PostgreSQL (наприклад 15 → 18) несумісне зі старим томом даних. Якщо том лишився від попередньої версії — перестворіть його: `docker compose down -v` (демо-дані відновляться через `SEED_DEMO_DATA`).

## Конфігурація

Приклади змінних оточення — у `backend/.env.example` та `frontend/.env.example`. Ключові:

- `DATABASE_URL`, `REDIS_URL` — підключення до сховищ.
- `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY` — секрети авторизації.
- `MCP_API_TOKEN`, `MCP_PUBLIC_URL` — доступ до MCP сервера для Dify.
- `VITE_DIFY_APP_URL` — URL вбудованого Dify-агента.

## Тести

```bash
# backend
cd backend && pytest

# frontend
cd frontend && npm test
```
