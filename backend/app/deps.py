# backend/app/deps.py
from datetime import datetime
from fastapi import HTTPException

def parse_date(s: str) -> datetime:
    try:
        # aceita "2025-10-01" ou "2025-10-01T00:00:00"
        return datetime.fromisoformat(s)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Data inválida: {s}")
