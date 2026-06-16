from datetime import date, datetime

from pydantic import BaseModel


class PeriodRange(BaseModel):
    start: datetime
    end: datetime


class OverviewReport(BaseModel):
    period: PeriodRange
    branch_id: str | None = None
    revenue: float
    expenses: float
    profit: float
    visits: int
    active_subscriptions: int
    currency: str = "UAH"


class AttendancePoint(BaseModel):
    date: date
    count: int


class AttendanceReport(BaseModel):
    period: PeriodRange
    branch_id: str | None = None
    total: int
    unique_visitors: int
    per_day: list[AttendancePoint]


class PeakHourPoint(BaseModel):
    hour: int
    visits: int


class ClassOccupancyRow(BaseModel):
    class_id: str
    title: str
    start_time: datetime
    capacity: int
    booked: int
    occupancy_pct: float


class TrainerPerformanceReport(BaseModel):
    trainer_id: str
    name: str
    total_attendees: int
    classes_taught: int
    average_attendees_per_class: float


class BranchComparisonRow(BaseModel):
    branch_id: str
    branch_name: str
    value: float


class PeriodComparisonReport(BaseModel):
    metric: str
    branch_id: str | None = None
    current_period: PeriodRange
    previous_period: PeriodRange
    current: float
    previous: float
    delta: float
    delta_pct: float | None = None
