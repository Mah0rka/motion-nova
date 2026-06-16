"""Компактні OpenAPI-описи й приклади актуального API."""

from __future__ import annotations

from typing import Any

API_SUMMARY = "API інформаційної системи Motion Nova"
API_DESCRIPTION = (
    "Self-hosted API мережі спортивних залів: користувачі, філії, абонементи, "
    "оплати, окремі заняття, бронювання та аналітика."
)
OPENAPI_TAGS = [
    {"name": "auth", "description": "Реєстрація, вхід, refresh і logout."},
    {"name": "users", "description": "Профіль і адміністрування користувачів."},
    {"name": "branches", "description": "Філії та призначення працівників."},
    {"name": "subscriptions", "description": "Тарифні плани й абонементи."},
    {"name": "payments", "description": "Оплати абонементів."},
    {"name": "schedules", "description": "Окремі заняття клубу."},
    {"name": "bookings", "description": "Бронювання і скасування."},
    {"name": "visits", "description": "Фактичні відвідування: check-in / check-out."},
    {"name": "expenses", "description": "Витрати філій."},
    {"name": "analytics", "description": "Управлінська аналітика (єдиний AnalyticsService)."},
    {"name": "public", "description": "Публічні дані для лендінгу."},
    {"name": "health", "description": "Перевірка доступності API."},
]

REQUEST_ID_EXAMPLE = "req-93ac760d"
USER_EXAMPLE = {
    "id": "user-7f6c4d4c",
    "email": "olena@example.com",
    "first_name": "Олена",
    "last_name": "Коваль",
    "role": "CLIENT",
    "phone": "+380501112233",
    "created_at": "2026-06-01T10:00:00Z",
    "updated_at": "2026-06-01T10:00:00Z",
}
REGISTER_REQUEST_EXAMPLE = {
    "email": "olena@example.com",
    "password": "secure-password",
    "first_name": "Олена",
    "last_name": "Коваль",
}
LOGIN_REQUEST_EXAMPLE = {"email": "olena@example.com", "password": "secure-password"}
AUTH_PAYLOAD_EXAMPLE = {"user": USER_EXAMPLE}
REFRESH_RESPONSE_EXAMPLE = {"user": USER_EXAMPLE}

MEMBERSHIP_PLAN_EXAMPLE = {
    "id": "plan-monthly-12",
    "title": "Місячний абонемент",
    "description": "12 відвідувань у будь-якій філії мережі.",
    "type": "MONTHLY",
    "duration_days": 30,
    "visits_limit": 12,
    "price": "1500.00",
    "currency": "UAH",
    "is_active": True,
    "is_public": True,
    "created_at": "2026-06-01T10:00:00Z",
    "updated_at": "2026-06-01T10:00:00Z",
}
MEMBERSHIP_PLAN_CREATE_EXAMPLE = {
    key: value
    for key, value in MEMBERSHIP_PLAN_EXAMPLE.items()
    if key not in {"id", "created_at", "updated_at"}
}
MEMBERSHIP_PLAN_UPDATE_EXAMPLE = {"price": "1650.00", "is_public": True}

CLUB_STATS_EXAMPLE = {
    "clients_count": 154,
    "trainers_count": 9,
    "classes_next_7_days": 36,
    "active_subscriptions_count": 128,
}
HEALTH_LIVE_EXAMPLE = {"status": "ok"}
HEALTH_READY_EXAMPLE = {"status": "ready"}


def response_example(description: str, example: Any) -> dict[str, Any]:
    return {"description": description, "content": {"application/json": {"example": example}}}


def error_body(detail: str) -> dict[str, Any]:
    return {"detail": detail, "code": "http_error", "request_id": REQUEST_ID_EXAMPLE}


VALIDATION_ERROR_RESPONSE = {
    422: response_example(
        "Помилка валідації параметрів або тіла запиту.",
        {
            "detail": "Validation failed",
            "code": "validation_error",
            "request_id": REQUEST_ID_EXAMPLE,
            "errors": [],
        },
    )
}
AUTH_REQUIRED_RESPONSE = {
    401: response_example("Потрібна авторизація.", error_body("Authentication required"))
}
PERMISSION_DENIED_RESPONSE = {
    403: response_example("Недостатньо прав.", error_body("Insufficient permissions"))
}
RATE_LIMIT_RESPONSE = {
    429: response_example("Перевищено ліміт запитів.", error_body("Too many requests"))
}


def bad_request_response(description: str, detail: str) -> dict[int, dict[str, Any]]:
    return {400: response_example(description, error_body(detail))}


def not_found_response(description: str, detail: str) -> dict[int, dict[str, Any]]:
    return {404: response_example(description, error_body(detail))}


def conflict_response(description: str, detail: str) -> dict[int, dict[str, Any]]:
    return {409: response_example(description, error_body(detail))}


def no_content_response(description: str) -> dict[str, Any]:
    return {"description": description}


def merge_responses(*groups: dict[int, dict[str, Any]]) -> dict[int, dict[str, Any]]:
    merged: dict[int, dict[str, Any]] = {}
    for group in groups:
        merged.update(group)
    return merged
