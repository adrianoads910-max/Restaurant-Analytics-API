# backend/app/schemas/sales.py
from pydantic import BaseModel
from typing import Optional

class SalesOverview(BaseModel):
    faturamento: float
    pedidos: int
    ticket_medio: float
    cancelamentos_pct: float
    p90_prep_seconds: Optional[float] = None
    p90_delivery_seconds: Optional[float] = None
