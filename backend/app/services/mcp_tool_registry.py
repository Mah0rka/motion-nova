import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.tools import (
    AllowedToolName,
    CompareBranchesArgs,
    ComparePeriodsArgs,
    ToolPeriodArgs,
)
from app.services.analytics_service import AnalyticsMetric, AnalyticsService


class ToolValidationError(ValueError):
    """Raised when an MCP/AI tool receives malformed or unsupported arguments."""


class McpToolRegistry:
    def __init__(self, session: AsyncSession, *, timeout_seconds: int | None = None) -> None:
        self.session = session
        self.timeout_seconds = timeout_seconds or settings.mcp_tool_timeout_seconds

    async def call(
        self,
        tool_name: AllowedToolName,
        arguments: dict[str, Any] | None = None,
        *,
        default_branch_id: str | None = None,
    ) -> Any:
        args = dict(arguments or {})
        if tool_name != "compare_branches" and default_branch_id and not args.get("branch_id"):
            args["branch_id"] = default_branch_id

        handler = {
            "get_business_overview": self.get_business_overview,
            "get_attendance_analysis": self.get_attendance_analysis,
            "get_class_occupancy": self.get_class_occupancy,
            "compare_periods": self.compare_periods,
            "compare_branches": self.compare_branches,
        }.get(tool_name)
        if handler is None:
            raise ToolValidationError(f"Unsupported tool: {tool_name}")

        return await asyncio.wait_for(handler(args), timeout=self.timeout_seconds)

    async def get_business_overview(self, raw_args: dict[str, Any]) -> dict[str, Any]:
        args = self._validate(ToolPeriodArgs, raw_args)
        start, end = self._period(args)
        report = await AnalyticsService(self.session).get_overview(start, end, args.branch_id)
        return report.model_dump(mode="json")

    async def get_attendance_analysis(self, raw_args: dict[str, Any]) -> dict[str, Any]:
        args = self._validate(ToolPeriodArgs, raw_args)
        start, end = self._period(args)
        report = await AnalyticsService(self.session).get_attendance(start, end, args.branch_id)
        peak_hours = await AnalyticsService(self.session).get_peak_hours(start, end, args.branch_id)
        return {
            "attendance": report.model_dump(mode="json"),
            "peak_hours": [point.model_dump(mode="json") for point in peak_hours],
        }

    async def get_class_occupancy(self, raw_args: dict[str, Any]) -> list[dict[str, Any]]:
        args = self._validate(ToolPeriodArgs, raw_args)
        start, end = self._period(args)
        rows = await AnalyticsService(self.session).get_class_occupancy(start, end, args.branch_id)
        return [row.model_dump(mode="json") for row in rows]

    async def compare_periods(self, raw_args: dict[str, Any]) -> dict[str, Any]:
        args = self._validate(ComparePeriodsArgs, raw_args)
        start, end = self._period(args)
        report = await AnalyticsService(self.session).compare_periods(
            AnalyticsMetric(args.metric), start, end, args.branch_id
        )
        return report.model_dump(mode="json")

    async def compare_branches(self, raw_args: dict[str, Any]) -> list[dict[str, Any]]:
        args = self._validate(CompareBranchesArgs, raw_args)
        start, end = self._period(args)
        rows = await AnalyticsService(self.session).compare_branches(
            AnalyticsMetric(args.metric), start, end
        )
        return [row.model_dump(mode="json") for row in rows]

    @staticmethod
    def _validate[T: BaseModel](schema: type[T], raw_args: dict[str, Any]) -> T:
        try:
            return schema.model_validate(raw_args)
        except ValidationError as exc:
            raise ToolValidationError(str(exc)) from exc

    @staticmethod
    def _period(args: ToolPeriodArgs | CompareBranchesArgs) -> tuple[datetime, datetime]:
        end = _parse_datetime(args.end) if args.end else datetime.now(UTC)
        start = _parse_datetime(args.start) if args.start else end - timedelta(days=30)
        if start > end:
            raise ToolValidationError("Invalid period: from must be before to")
        return start, end


def _parse_datetime(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ToolValidationError(f"Invalid datetime: {value}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed
