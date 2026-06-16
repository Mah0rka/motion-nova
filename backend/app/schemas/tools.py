from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AllowedToolName = Literal[
    "get_business_overview",
    "get_attendance_analysis",
    "get_class_occupancy",
    "compare_periods",
    "compare_branches",
]


class ToolPeriodArgs(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    start: str | None = Field(default=None, alias="from")
    end: str | None = Field(default=None, alias="to")
    branch_id: str | None = None


class ComparePeriodsArgs(ToolPeriodArgs):
    metric: Literal["REVENUE", "EXPENSES", "PROFIT", "VISITS"]


class CompareBranchesArgs(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    metric: Literal["REVENUE", "EXPENSES", "PROFIT", "VISITS"]
    start: str | None = Field(default=None, alias="from")
    end: str | None = Field(default=None, alias="to")
