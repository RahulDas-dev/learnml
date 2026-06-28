---
name: fastapi-patterns
description: >
  FastAPI project structure, directory organization, and file naming conventions.
  Use when creating new routes, services, components, or any new directory/file in a FastAPI project.
  Defines what lives where and why — the structural DNA of the project.
---

# FastAPI Project Structure & Patterns

## Project Layout

```
<package>/
├── app.py                        # FastAPI app factory + lifespan
├── _types.py                     # Cross-cutting domain models (shared across all layers)
│
├── configs/                      # Pydantic Settings — split by concern
│   ├── __init__.py               # Instantiates & exports the merged config singleton
│   ├── <name>_conf.py            # One file per concern: deployment, db, feature, logging
│   └── <main>_conf.py            # Merges all via multiple inheritance → single config class
│
├── db/                           # ORM models ONLY — no logic here
│   ├── __init__.py               # Re-exports all ORM classes
│   ├── base.py                   # DeclarativeBase (one line)
│   ├── config.py                 # Config-domain ORM models
│   └── state.py                  # Runtime-state ORM models
│
├── services/                     # Business logic singletons
│   ├── base_db_service.py        # Shared async SQLAlchemy base class
│   └── <service_name>/           # One subdirectory per service
│       ├── __init__.py           # Re-exports with module docstring
│       ├── main.py               # Service class + get_*/set_* singleton functions
│       └── schema.py             # Pydantic domain/response models for this service
│
├── routes/                       # FastAPI route handlers
│   ├── __init__.py               # Aggregates all sub-routers into one api_router
│   └── <domain>/                 # One subdirectory per route domain
│       ├── __init__.py           # Exports router
│       ├── views.py              # APIRouter + route handler functions
│       ├── models.py             # Request & Response Pydantic models
│       └── runner.py             # (optional) Re-exports dependencies needed by views
│
├── startops/                     # Startup & shutdown discrete steps
│   ├── __init__.py               # Re-exports all setup/shutdown functions
│   ├── set_*.py                  # Synchronous setup: env vars, loggers, timezone, warnings
│   ├── setup_*.py                # Async setup: DB, app manager, external services
│   └── shutdown_setup.py         # Graceful shutdown + signal handlers
│
├── apps/                         # Application runners (agentic / non-agentic)
│   ├── base.py                   # BaseApp abstract class
│   ├── builder.py                # AppBuilder factory — dispatches to correct app type
│   ├── <type>_app.py             # Concrete app implementations
│   ├── services/                 # Shared helpers used across components
│   └── component/                # Pipeline components
│       ├── base.py               # BaseComponent abstract class
│       └── <component_name>/     # One subdirectory per component
│           ├── __init__.py
│           ├── component.py      # Component logic
│           ├── builder.py        # Builder classmethod factory
│           └── schema.py         # Component-specific domain models
│
└── common/                       # Shared utilities — not domain-specific
```

---

## File Naming Conventions

Every file name signals its role. Always follow these names:

| File | Role |
|---|---|
| `views.py` | FastAPI `APIRouter` + all route handler functions for a domain |
| `models.py` | Request & Response Pydantic models scoped to a route module |
| `main.py` | Service class implementation + singleton getter/setter |
| `schema.py` | Pydantic domain models / response schemas for a service or component |
| `builder.py` | `@classmethod build(...)` factory — no `__init__` instantiation |
| `component.py` | Component business logic class |
| `base.py` | Abstract base class for a layer (BaseApp, BaseComponent, Base ORM) |
| `runner.py` | Re-exports of dependencies/singletons needed by route `views.py` |
| `_types.py` | Cross-cutting domain dataclasses/models shared across multiple layers |
| `set_*.py` | **Synchronous** startup step (env, loggers, timezone, warnings) |
| `setup_*.py` | **Async** startup step (DB, managers, external services) |
| `shutdown_setup.py` | Graceful shutdown + OS signal handlers |

---

## Layer Responsibilities

### `configs/` — Configuration

- Split config into focused `BaseSettings` subclasses, one file per concern
- Merge all via multiple inheritance into one `MainConfig` class
- Instantiate **once** in `__init__.py` as a module-level singleton

```python
# configs/main_conf.py
class AppConfig(DeploymentConfig, LoggingConfig, DatabaseConfig, FeatureConfig):
    model_config = SettingsConfigDict(env_file=".config", frozen=True, extra="ignore")

# configs/__init__.py
from .main_conf import AppConfig
app_conf = AppConfig()          # ← single instantiation point
__all__ = ("AppConfig", "app_conf")
```

→ **Full patterns, `@property` helpers, adding new concerns:** [references/configs.md](references/configs.md)

---

### `db/` — ORM Models Only

- `base.py` contains **only** `DeclarativeBase` — nothing else
- Split ORM models into files by domain concern (not by table count)
- No business logic, no queries — just schema definitions
- `__init__.py` re-exports every ORM class

```python
# db/base.py
from sqlalchemy.orm import DeclarativeBase
class Base(DeclarativeBase): ...

# db/__init__.py
from .base import Base
from .config import AppConfigOrm, AgentConfigOrm
from .state import SessionOrm, UserStateOrm
__all__ = ("Base", "AppConfigOrm", "AgentConfigOrm", "SessionOrm", "UserStateOrm")
```

→ **Full ORM anatomy, JSONB patterns, indexes, `flag_modified`, state vs config tables:** [references/db-orm.md](references/db-orm.md)

---

### `services/<name>/` — Service Singletons

Each service is a **package** (subdirectory), not a flat file.

- `main.py` holds the service class + **two functions**: `get_<name>()` and `set_<name>()`
- `schema.py` holds all Pydantic / dataclass models the service owns
- `__init__.py` re-exports the public API with a module-level docstring

```python
# services/session/main.py
_session_service: SessionService | None = None

def get_session_service() -> SessionService:
    if _session_service is None:
        raise RuntimeError("SessionService not initialized")
    return _session_service

def set_session_service(service: SessionService) -> None:
    global _session_service  # noqa: PLW0603
    _session_service = service
```

- `set_*` is called **only** from `startops/setup_*.py` — never from route handlers
- `get_*` is used everywhere else (routes, other services, apps)

→ **Full service class, `BaseDBService`, `schema.py` dataclasses, keyword-only args:** [references/services.md](references/services.md)

---

### `routes/<domain>/` — Route Handlers

Each route domain is a **package** with exactly these files:

```
routes/
├── __init__.py        ← aggregates all routers into api_router
└── sessions/
    ├── __init__.py    ← exports only: router
    ├── views.py       ← APIRouter + handlers
    ├── models.py      ← Request/Response Pydantic models
    └── runner.py      ← (optional) dependency re-exports
```

**`routes/__init__.py`** — aggregate all routers, no other logic:
```python
from fastapi.routing import APIRouter
from <package>.routes import chat, config, health, sessions

api_router = APIRouter()
api_router.include_router(config.router)
api_router.include_router(sessions.router)
api_router.include_router(chat.router)
api_router.include_router(health.router)
```

Mounted globally in `app.py` under `/api/v1`:
```python
def add_routers(app: FastAPI) -> None:
    from <package>.routes import api_router  # ruff: noqa: PLC0415
    app.include_router(router=api_router, prefix="/api/v1")
```

→ **Full CRUD patterns, SSE streaming, `Annotated` DI, error handling, logging rules:** [references/routes.md](references/routes.md)

---

### `startops/` — Startup & Shutdown Steps

- `set_*.py` = **synchronous** (env, loggers, tz, warnings) — called in `add_startup_ops()`
- `setup_*.py` = **async** (DB, managers, external services) — called inside `lifespan()`
- Startup order is **strict** — each step depends on the previous

```python
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # ruff: noqa: PLC0415
    from <package>.startops import graceful_shutdown, setup_db_service, setup_agent_manager, setup_mcp_connection

    await setup_db_service()                         # 1. DB first
    await setup_agent_manager()                      # 2. cache — depends on DB
    if not await setup_mcp_connection():
        raise RuntimeError("MCP server unavailable") # 3. fail fast
    yield
    await graceful_shutdown()                        # 4. reverse-order teardown
```

→ **Full `set_*` / `setup_*` implementations, `graceful_shutdown`, `emergency_cleanup`, atexit:** [references/startops.md](references/startops.md)

---

### `apps/component/<name>/` — Pipeline Components

Each component is a **package** with exactly:
- `component.py` — the class, extends `BaseComponent`, implements `run_async()`
- `builder.py` — `@classmethod build(cls, config) -> ComponentType`
- `schema.py` — Pydantic models this component produces/consumes
- `__init__.py` — re-exports

Builder pattern — always a `@classmethod`, never an instance method:
```python
class TransactionPosterBuilder:
    @classmethod
    async def build(cls, config: AppConfig) -> TransactionPoster:
        return TransactionPoster(...)

# Usage — never instantiate the builder
poster = await TransactionPosterBuilder.build(config)
```

---

## Rules

1. **Never put business logic in `db/`** — ORM models only, no queries
2. **Never instantiate singletons in route handlers** — use `get_*()` functions
3. **`set_*()`** is called only from `startops/` — never from routes or services
4. **`builder.py`** always exposes a `@classmethod build()` — never instantiate builders
5. **`runner.py`** is only for re-exporting dependencies into a route module — no logic
6. **Inline imports** in `app.py` and `startops/` are intentional — suppress with `# ruff: noqa: PLC0415`
7. **`__init__.py` in every package** re-exports the public API — nothing else
8. **`_types.py`** (underscore prefix) signals cross-cutting types shared across layers
9. **`schema.py` vs `models.py`**: `schema.py` = service/component domain types; `models.py` = HTTP request/response types scoped to one route module

---

## References

| Topic | File |
|---|---|
| Config singleton, `BaseSettings` split, `@property` helpers | [references/configs.md](references/configs.md) |
| ORM anatomy, JSONB, indexes, `flag_modified`, state vs config tables | [references/db-orm.md](references/db-orm.md) |
| Route handlers, models, SSE streaming, DI, error handling | [references/routes.md](references/routes.md) |
| Service class, `BaseDBService`, singleton pattern, `schema.py` | [references/services.md](references/services.md) |
| `set_*` vs `setup_*`, lifespan ordering, graceful/emergency shutdown | [references/startops.md](references/startops.md) |