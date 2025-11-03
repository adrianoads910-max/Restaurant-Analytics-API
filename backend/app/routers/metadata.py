from fastapi import APIRouter
from ..db import get_conn

router = APIRouter(prefix="/metadata", tags=["Metadata"])


@router.get("/stores")
def get_stores():
    """
    Retorna lista de lojas disponíveis para filtro
    """
    sql = """
        SELECT id, name, city, state, is_active, is_own
        FROM stores
        ORDER BY name;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "city": r[2],
            "state": r[3],
            "is_active": r[4],
            "is_own": r[5],
        }
        for r in rows
    ]


@router.get("/channels")
def get_channels():
    """
    Retorna canais de venda (iFood, Rappi, Presencial etc)
    """
    sql = """
        SELECT id, name, type
        FROM channels
        ORDER BY name;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "type": r[2],  # P=presencial, D=delivery
        }
        for r in rows
    ]

@router.get("/customers")
def get_customers(limit: int = 100):
    """
    Retorna clientes (para autocomplete, CRM, churn etc)
    """

    sql = """
        SELECT
            c.id,
            c.customer_name,
            c.email,
            c.phone_number,
            MAX(s.created_at)::date AS last_purchase
        FROM customers c
        LEFT JOIN sales s ON s.customer_id = c.id
        GROUP BY c.id, c.customer_name, c.email, c.phone_number
        ORDER BY last_purchase DESC NULLS LAST
        LIMIT %s;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, [limit])
            rows = cur.fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "phone_number": r[3],
            "last_purchase": str(r[4]) if r[4] else None,
        }
        for r in rows
    ]
