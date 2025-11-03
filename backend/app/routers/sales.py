# backend/app/routers/sales.py
from fastapi import APIRouter, Query
from typing import Optional, Any
from ..db import get_conn
from typing import Optional, Any, List
from datetime import timedelta
from fastapi import HTTPException



router = APIRouter(prefix="/sales", tags=["Sales"])
# ------------- Helpers -------------

def _date_filters(start: Optional[str], end: Optional[str]) -> tuple[str, list[Any]]:
    where = []
    params: list[Any] = []

    if start:
        where.append("DATE(s.created_at) >= %s")
        params.append(start)

    if end:
        where.append("DATE(s.created_at) < %s")
        params.append(end)   # ✅ antes estava faltando!

    return (" AND ".join(where), params)


def _opt_filter_store(store_id: Optional[int]) -> tuple[str, list[Any]]:
    if store_id is None:
        return ("", [])
    return (" AND s.store_id = %s", [store_id])

def _opt_filter_channel(channel_name: Optional[str]) -> tuple[str, list[Any]]:
    if not channel_name:
        return ("", [])
    return (" AND ch.name ILIKE %s", [channel_name])


# ======================================================
# Helpers de filtro dinâmico (sem “AND AND” no SQL)
# ======================================================
def build_filters(
    start: Optional[str],
    end: Optional[str],
    store_id: Optional[List[int]],      # ✅ agora aceita múltiplos valores
    channel_name: Optional[List[int]]

):
    filters = ["s.sale_status_desc = 'COMPLETED'"]
    params: list[Any] = []

    if start:
        filters.append("DATE(s.created_at) >= %s")
        params.append(start)

    if end:
        filters.append("DATE(s.created_at) < %s")
        params.append(end)

    if store_id:                        # ✅ aceitando [1,2,3]
        filters.append("s.store_id = ANY(%s)")
        params.append(store_id)

    if channel_name:
        filters.append("ch.id = ANY(%s)")
        params.append(channel_name)


    where_clause = "WHERE " + " AND ".join(filters)
    return where_clause, params


# ======================================================
#  Overview
# ======================================================
@router.get("/overview")
def sales_overview(
    start: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD (exclusivo)"),
    store_id: Optional[List[int]] = Query(None),
    channel_name: Optional[str] = None,
):

    where, params = build_filters(start, end, store_id, channel_name)

    sql = f"""
        SELECT
            COALESCE(SUM(s.total_amount), 0) AS faturamento,
            COUNT(*) AS pedidos,
            COALESCE(AVG(s.total_amount), 0) AS ticket_medio,
            AVG(s.production_seconds) AS p90_prep_seconds,
            AVG(s.delivery_seconds) AS p90_delivery_seconds
        FROM sales s
        JOIN channels ch ON ch.id = s.channel_id
        {where};
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            r = cur.fetchone()

    return {
        "faturamento": float(r[0]),
        "pedidos": int(r[1]),
        "ticket_medio": float(r[2]),
        "p90_prep_seconds": float(r[3] or 0),
        "p90_delivery_seconds": float(r[4] or 0),
    }


# ======================================================
# 1) Top produtos mais vendidos
# ======================================================
@router.get("/products/top")
def top_products(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_name: Optional[str] = None,
    limit: int = 10,
):
    where, params = build_filters(start, end, store_id, channel_name)

    sql = f"""
        SELECT
            p.name AS product,
            SUM(ps.quantity) AS qty,
            SUM(ps.total_price) AS revenue
        FROM product_sales ps
        JOIN products p ON p.id = ps.product_id
        JOIN sales s ON s.id = ps.sale_id
        JOIN channels ch ON ch.id = s.channel_id
        {where}
        GROUP BY p.name
        ORDER BY revenue DESC
        LIMIT %s;
    """
    params.append(limit)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [{"product": r[0], "qty": int(r[1]), "revenue": float(r[2])} for r in rows]


# ======================================================
# 2) Customizações mais adicionadas
# ======================================================
@router.get("/customizations/top")
def top_customizations(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_name: Optional[str] = None,
    limit: int = 20,
):
    where, params = build_filters(start, end, store_id, channel_name)

    sql = f"""
        SELECT
            i.name AS item,
            COUNT(*) AS times_added,
            SUM(ips.additional_price) AS revenue_generated
        FROM item_product_sales ips
        JOIN items i ON i.id = ips.item_id
        JOIN product_sales ps ON ps.id = ips.product_sale_id
        JOIN sales s ON s.id = ps.sale_id
        JOIN channels ch ON ch.id = s.channel_id
        {where}
        GROUP BY i.name
        ORDER BY times_added DESC
        LIMIT %s;
    """
    params.append(limit)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [{"item": r[0], "times_added": int(r[1]), "revenue_generated": float(r[2])} for r in rows]


# ======================================================
# 3) Delivery por região
# ======================================================
@router.get("/delivery/regions")
def delivery_by_region(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_name: Optional[str] = None,
    min_orders: int = 10,
    limit: int = 100,
):
    where, params = build_filters(start, end, store_id, channel_name)

    sql = f"""
        SELECT
            COALESCE(da.city, 'N/A') AS city,
            COALESCE(da.neighborhood, 'N/A') AS neighborhood,
            COUNT(*) AS deliveries,
            AVG(s.delivery_seconds)/60.0 AS avg_delivery_minutes
        FROM delivery_addresses da
        JOIN sales s ON s.id = da.sale_id
        JOIN channels ch ON ch.id = s.channel_id
        {where}
        GROUP BY city, neighborhood
        HAVING COUNT(*) >= %s
        ORDER BY avg_delivery_minutes DESC
        LIMIT %s;
    """
    params.extend([min_orders, limit])

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [{"city": r[0], "neighborhood": r[1], "deliveries": r[2], "avg_delivery_minutes": float(r[3])} for r in rows]


# ======================================================
# 4) Mix de pagamento
# ======================================================
@router.get("/payment/mix")
def payment_mix(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_name: Optional[str] = None,
):
    where, params = build_filters(start, end, store_id, channel_name)

    sql = f"""
        SELECT
            COALESCE(pt.description, 'N/A') AS payment_type,
            COUNT(*) AS qtd,
            SUM(pay.value) AS total
        FROM payments pay
        JOIN sales s ON s.id = pay.sale_id
        LEFT JOIN payment_types pt ON pt.id = pay.payment_type_id
        JOIN channels ch ON ch.id = s.channel_id
        {where}
        GROUP BY payment_type
        ORDER BY total DESC;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [{"payment_type": r[0], "count": int(r[1]), "total": float(r[2])} for r in rows]


# ======================================================
# 5) Time Series diária
# ======================================================
@router.get("/timeseries/daily")
def timeseries_daily(
    store_id: Optional[List[int]] = Query(default=None),
    channel_id: Optional[List[int]] = Query(default=None),
    start: Optional[str] = None,
    end: Optional[str] = None,
    previous: Optional[bool] = False  # ✅ NOVO
):
    """
    Retorna vendas por dia. Se previous=true, retorna o mesmo período anterior.
    """

    sql = """
        SELECT
            DATE(s.created_at) AS day,
            ch.name AS channel,
            st.name AS store_name,
            SUM(s.total_amount) AS revenue,
            COUNT(*) AS orders
        FROM sales s
        JOIN channels ch ON ch.id = s.channel_id
        JOIN stores st ON st.id = s.store_id
        WHERE s.sale_status_desc = 'COMPLETED'
    """

    params = []

    # ✅ Período corrente (default)
    if not previous:
        if start:
            sql += " AND DATE(s.created_at) >= %s"
            params.append(start)

        if end:
            sql += " AND DATE(s.created_at) <= %s"
            params.append(end)

    # ✅ Período anterior (mesma duração, deslocado para trás)
    else:
        sql += """
            AND DATE(s.created_at) >= (DATE(%s) - ((DATE(%s) - DATE(%s))))
            AND DATE(s.created_at) <= (DATE(%s) - ((DATE(%s) - DATE(%s))))
        """
        params.extend([start, end, start, end, end, start])

    if store_id:
        sql += " AND s.store_id = ANY(%s)"
        params.append(store_id)

    if channel_id:
        sql += " AND ch.id = ANY(%s)"
        params.append(channel_id)

    sql += """
        GROUP BY day, channel, store_name
        ORDER BY day, channel, store_name;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {
            "day": str(r[0]),
            "channel": r[1],
            "store_name": r[2],
            "revenue": float(r[3]),
            "orders": int(r[4]),
        }
        for r in rows
    ]


# ======================================================
# NEW: Margem por produto (com custo do catálogo)
# ======================================================
@router.get("/products/margin")
def get_products_margin(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_name: Optional[str] = None,
    limit: int = 20,
):
    # usa o helper já existente
    w_date, p_date = _date_filters(start, end)

    sql = """
        SELECT
            p.name AS product_name,
            SUM(ps.quantity) AS total_sold,
            SUM(ps.total_price) AS revenue,
            SUM(ps.quantity * ps.base_price) AS total_cost,   -- usa base_price como custo
            (SUM(ps.total_price) - SUM(ps.quantity * ps.base_price)) AS margin
        FROM product_sales ps
        JOIN products p ON p.id = ps.product_id
        JOIN sales s ON s.id = ps.sale_id
        JOIN channels ch ON ch.id = s.channel_id
        WHERE s.sale_status_desc = 'COMPLETED'
    """

    params = p_date

    if w_date:
        sql += f" AND {w_date}"

    if store_id:
        sql += " AND s.store_id = %s"
        params.append(store_id)

    if channel_name:
        sql += " AND ch.name ILIKE %s"
        params.append(channel_name)

    sql += """
        GROUP BY p.id, p.name
        ORDER BY margin DESC
        LIMIT %s;
    """
    params.append(limit)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {
            "product_name": r[0],
            "total_sold": int(r[1]),
            "revenue": float(r[2]),
            "total_cost": float(r[3]),
            "margin": float(r[4]),
        }
        for r in rows
    ]
# ----------------------------------------------
# 6) Série temporal mensal (para crescimento/sazonalidade)
# ----------------------------------------------
# backend/app/routers/sales.py

@router.get("/timeseries/monthly")
def sales_timeseries_monthly(
    store_id: Optional[List[int]] = Query(default=None),
    channel_id: Optional[List[int]] = Query(default=None),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    sql = """
        SELECT
            TO_CHAR(s.created_at, 'YYYY-MM') AS year_month,
            ch.name AS channel,
            st.name AS store_name,  -- ✅ adicionar nome da loja
            SUM(s.total_amount) AS revenue,
            COUNT(*) AS orders
        FROM sales s
        JOIN channels ch ON ch.id = s.channel_id
        JOIN stores st ON st.id = s.store_id      -- ✅ join com a tabela stores
        WHERE s.sale_status_desc = 'COMPLETED'
    """

    params = []
    if start:
        sql += " AND DATE(s.created_at) >= %s"
        params.append(start)
    if end:
        sql += " AND DATE(s.created_at) < %s"
        params.append(end)
    if store_id:
        sql += " AND s.store_id = ANY(%s)"
        params.append(store_id)
    if channel_id:
        sql += " AND ch.id = ANY(%s)"
        params.append(channel_id)

    sql += """
        GROUP BY year_month, channel, store_name
        ORDER BY year_month, channel, store_name;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {
            "month": r[0],
            "channel": r[1],
            "store_name": r[2],   # ✅ novo
            "revenue": float(r[3]),
            "orders": int(r[4]),
        }
        for r in rows
    ]



# ----------------------------------------------
# 7) Detecção automática de anomalias (picos ou quedas)
# ----------------------------------------------
@router.get("/anomaly-detection")
def anomaly_detection(
    min_orders_threshold: int = 50
):
    """
    Detecta semanas com vendas MUITO acima ou MUITO abaixo
    usando média móvel + desvio padrão.
    """

    sql = """
        SELECT
            DATE_TRUNC('week', created_at)::date AS week,
            SUM(total_amount) AS revenue,
            COUNT(*) AS orders
        FROM sales
        WHERE sale_status_desc = 'COMPLETED'
        GROUP BY week
        ORDER BY week;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            data = cur.fetchall()

    if not data:
        return {"message": "No data available"}

    revenues = [float(row[1]) for row in data]
    mean_rev = sum(revenues) / len(revenues)
    std_rev = (sum((x - mean_rev) ** 2 for x in revenues) / len(revenues)) ** 0.5

    anomalies = []
    for week, revenue, orders in data:
        if orders < min_orders_threshold:
            continue

        if revenue > mean_rev + (2 * std_rev):
            anomalies.append({"week": str(week), "type": "peak", "value": revenue})
        elif revenue < mean_rev - (2 * std_rev):
            anomalies.append({"week": str(week), "type": "drop", "value": revenue})

    return {
        "mean_revenue": mean_rev,
        "std_dev": std_rev,
        "anomalies": anomalies
    }

@router.get("/topstats")
def sales_topstats(start: Optional[str] = None, end: Optional[str] = None):

    with get_conn() as conn:
        with conn.cursor() as cur:

            # Se houver intervalo definido, calcula período anterior
            if start and end:
                cur.execute("SELECT DATE(%s), DATE(%s)", (start, end))
                start_date, end_date = cur.fetchone()

                range_days = (end_date - start_date).days

                prev_start = start_date - timedelta(days=range_days)
                prev_end = end_date - timedelta(days=range_days)

                cur.execute("""
                    SELECT COALESCE(SUM(total_amount), 0)
                    FROM sales
                    WHERE date(created_at) BETWEEN %s AND %s
                    AND sale_status_desc = 'COMPLETED'
                """, (start, end))
                current_sales = cur.fetchone()[0]

                cur.execute("""
                    SELECT COALESCE(SUM(total_amount), 0)
                    FROM sales
                    WHERE date(created_at) BETWEEN %s AND %s
                    AND sale_status_desc = 'COMPLETED'
                """, (prev_start, prev_end))
                previous_sales = cur.fetchone()[0]

            else:
                # Sem filtro → compara com os últimos 30 dias
                cur.execute("SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at >= NOW() - INTERVAL '30 days'")
                current_sales = cur.fetchone()[0]

                cur.execute("SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at < NOW() - INTERVAL '30 days' AND created_at >= NOW() - INTERVAL '60 days'")
                previous_sales = cur.fetchone()[0]

            performance = (
                ((current_sales - previous_sales) / previous_sales) * 100
                if previous_sales > 0 else 0
            )

            return {
                "sales": float(current_sales),
                "performance": round(performance, 2),
            }

# ======================================================
#  🔥 Recent Orders (últimas vendas com cliente e produtos)
# ======================================================
@router.get("/recent")
def recent_orders(
    start: str,                                  # "YYYY-MM-DD"
    end: str,                                    # "YYYY-MM-DD"
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None),
    status: Optional[List[str]] = Query(None),   # ex.: ["COMPLETED","CANCELED"]
    limit: int = 20,
    offset: int = 0,
):
    """
    Últimas vendas do período, com cliente, canal, status e produtos.
    Suporta filtros por loja/canal/status, e paginação.
    """

    # ---------- monta WHERE dinâmico ----------
    where = ["s.created_at::date BETWEEN %s AND %s"]
    params: List[object] = [start, end]

    if store_id:
        # Postgres: ANY(array)
        where.append("s.store_id = ANY(%s)")
        params.append(store_id)

    if channel_id:
        where.append("s.channel_id = ANY(%s)")
        params.append(channel_id)

    if status:
        # normaliza para maiúsculo
        status_norm = [s.upper() for s in status]
        where.append("UPPER(s.sale_status_desc) = ANY(%s)")
        params.append(status_norm)

    where_sql = " AND ".join(where)

    sales_sql = f"""
        SELECT
            s.id              AS sale_id,
            s.created_at      AS created_at,
            s.total_amount    AS total_amount,
            c.customer_name   AS customer_name,
            ch.name           AS channel,
            st.name           AS store_name,
            s.sale_status_desc AS status
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        JOIN channels ch ON ch.id = s.channel_id
        JOIN stores   st ON st.id = s.store_id
        WHERE {where_sql}
        ORDER BY s.created_at DESC
        LIMIT %s OFFSET %s
    """
    params_ext = params + [limit, offset]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sales_sql, params_ext)
            sales_rows = cur.fetchall()

        if not sales_rows:
            return []

        # mapeia linhas
        sales = [
            {
                "sale_id": r[0],
                "date": r[1],
                "amount": float(r[2] or 0),
                "customer": r[3],
                "channel": r[4],
                "store": r[5],
                "status": r[6],
            }
            for r in sales_rows
        ]

        sale_ids = [s["sale_id"] for s in sales]

        # ---------- busca produtos em lote ----------
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ps.sale_id,
                    p.name,
                    ps.quantity,
                    ps.total_price
                FROM product_sales ps
                JOIN products p ON p.id = ps.product_id
                WHERE ps.sale_id = ANY(%s)
                ORDER BY ps.sale_id
                """,
                [sale_ids],
            )
            prod_rows = cur.fetchall()

        # agrupa produtos por sale_id
        by_sale = {sid: [] for sid in sale_ids}
        for sale_id, name, qty, total in prod_rows:
            by_sale[sale_id].append(
                {"name": name, "qty": int(qty or 0), "total": float(total or 0)}
            )

        # anexa produtos ao resultado
        for s in sales:
            s["products"] = by_sale.get(s["sale_id"], [])

    # normaliza formato de data para string (caso precise)
    for s in sales:
        if hasattr(s["date"], "isoformat"):
            s["date"] = s["date"].isoformat()

    return sales

# 🔥 Trending Products (por dia da semana, horário e canal)
@router.get("/customers/lost")
def lost_customers(min_orders: int = 3, inactive_days: int = 30):
    """
    Clientes que fizeram >= min_orders, mas não voltam há inactive_days dias.
    """

    sql = """
        SELECT
            c.customer_name,
            COUNT(s.id) AS total_orders,
            MAX(s.created_at)::date AS last_order
        FROM sales s
        JOIN customers c ON c.id = s.customer_id
        GROUP BY c.customer_name
        HAVING COUNT(s.id) >= %s
        AND MAX(s.created_at) <= NOW() - INTERVAL '%s DAYS'
        ORDER BY last_order ASC;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (min_orders, inactive_days))
            rows = cur.fetchall()

    return [
        {"customer": r[0], "total_orders": r[1], "last_order": r[2].isoformat()}
        for r in rows
    ]
@router.get("/ticket")
def ticket_avg(
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None),
):
    """
    Ticket médio agrupado por Loja e Canal.
    """

    where = ["1=1"]
    params: List[object] = []

    if store_id:
        where.append("s.store_id = ANY(%s)")
        params.append(store_id)

    if channel_id:
        where.append("s.channel_id = ANY(%s)")
        params.append(channel_id)

    sql = f"""
        SELECT
            st.name AS store_name,
            ch.name AS channel_name,
            ROUND(AVG(s.total_amount), 2) AS avg_ticket
        FROM sales s
        JOIN stores st ON st.id = s.store_id
        JOIN channels ch ON ch.id = s.channel_id
        WHERE {' AND '.join(where)}
        GROUP BY st.name, ch.name
        ORDER BY avg_ticket DESC;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {"store": r[0], "channel": r[1], "ticket": float(r[2] or 0)}
        for r in rows
    ]

@router.get("/delivery/performance")
def delivery_performance(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None),
):
    """
    Tempo médio de entrega agrupado por dia da semana e hora.
    """

    where = ["s.delivery_seconds IS NOT NULL"]
    params: List[object] = []

    # filtro por período
    if start and end:
        where.append("s.created_at::date BETWEEN %s AND %s")
        params.extend([start, end])

    # filtro store_id
    if store_id:
        where.append("s.store_id = ANY(%s)")
        params.append(store_id)

    # filtro channel_id
    if channel_id:
        where.append("s.channel_id = ANY(%s)")
        params.append(channel_id)

    sql = f"""
        SELECT
            EXTRACT(DOW FROM s.created_at) AS weekday,
            EXTRACT(HOUR FROM s.created_at) AS hour,
            ROUND(AVG(s.delivery_seconds) / 60.0, 2) AS avg_delivery_minutes
        FROM sales s
        WHERE {" AND ".join(where)}
        GROUP BY weekday, hour
        ORDER BY weekday, hour;
    """

    print("\n--- SQL DEBUG ---")
    print(sql)
    print("PARAMS:", params)
    print("--- END DEBUG ---\n")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {
            "weekday": int(r[0]),
            "hour": int(r[1]),
            "avg_delivery_minutes": float(r[2]),
        }
        for r in rows
    ]



# backend/app/routers/sales.py
@router.get("/products/trending")
def trending_products(
    start: Optional[str] = None,                 # ✅ FILTRO DE PERÍODO
    end: Optional[str] = None,
    weekday: Optional[int] = None,               # opcional
    start_hour: Optional[int] = None,            # opcional
    end_hour: Optional[int] = None,              # opcional
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None),
    limit: int = 100                             # melhor deixar maior e paginar no frontend
):
    """
    Produtos mais vendidos filtrando por:
    ✅ período (start / end)
    ✅ dia da semana
    ✅ faixa de horário
    ✅ loja
    ✅ canal
    """

    where = ["1=1"]
    params: List[object] = []

    if start and end:
        where.append("DATE(s.created_at) BETWEEN %s AND %s")
        params.extend([start, end])

    if weekday is not None:
        where.append("EXTRACT(DOW FROM s.created_at) = %s")
        params.append(weekday)

    if start_hour is not None and end_hour is not None:
        where.append("EXTRACT(HOUR FROM s.created_at) BETWEEN %s AND %s")
        params.extend([start_hour, end_hour])

    if store_id:
        where.append("s.store_id = ANY(%s)")
        params.append(store_id)

    if channel_id:
        where.append("s.channel_id = ANY(%s)")
        params.append(channel_id)

    sql = f"""
        SELECT
            p.name,
            SUM(ps.quantity) AS qty,
            SUM(ps.total_price) AS revenue
        FROM product_sales ps
        JOIN products p ON p.id = ps.product_id
        JOIN sales s ON s.id = ps.sale_id
        WHERE {' AND '.join(where)}
        GROUP BY p.name
        ORDER BY qty DESC
        LIMIT %s;
    """
    params.append(limit)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [
        {"product": r[0], "qty": int(r[1]), "revenue": float(r[2])}
        for r in rows
    ]


# backend/app/routers/sales.py
@router.get("/products/trending/hourly")
def trending_products_hourly(
    start: Optional[str] = None,
    end: Optional[str] = None,
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None)
):
    HOUR_BUCKETS = [
        (0, 6),
        (6, 11),
        (11, 15),
        (15, 19),
        (19, 23),
        (23, 24)
    ]

    results = []

    with get_conn() as conn:
        with conn.cursor() as cur:
            for start_hour, end_hour in HOUR_BUCKETS:
                where = ["1=1"]
                params: List[object] = []

                if start and end:
                    where.append("DATE(s.created_at) BETWEEN %s AND %s")
                    params.extend([start, end])

                where.append("EXTRACT(HOUR FROM s.created_at) BETWEEN %s AND %s")
                params.extend([start_hour, end_hour - 1])

                if store_id:
                    where.append("s.store_id = ANY(%s)")
                    params.append(store_id)

                if channel_id:
                    where.append("s.channel_id = ANY(%s)")
                    params.append(channel_id)

                base_sql = f"""
                    FROM product_sales ps
                    JOIN products p ON p.id = ps.product_id
                    JOIN sales s ON s.id = ps.sale_id
                    WHERE {' AND '.join(where)}
                    GROUP BY p.name
                """

                cur.execute(
                    "SELECT p.name, SUM(ps.quantity) AS qty " + base_sql + " ORDER BY qty DESC LIMIT 1",
                    params
                )
                best = cur.fetchone()

                cur.execute(
                    "SELECT p.name, SUM(ps.quantity) AS qty " + base_sql + " ORDER BY qty ASC LIMIT 1",
                    params
                )
                worst = cur.fetchone()

                results.append({
                    "start_hour": start_hour,
                    "end_hour": end_hour,
                    "top_product": {"product": best[0], "qty": int(best[1])} if best else None,
                    "worst_product": {"product": worst[0], "qty": int(worst[1])} if worst else None,
                })

    return results

# backend/app/routers/sales.py
@router.get("/products/not-selling")
def products_not_selling(
    store_id: Optional[List[int]] = Query(None),
    channel_id: Optional[List[int]] = Query(None),
):
    """
    Retorna produtos que NÃO tiveram vendas nos últimos 30 dias
    + quantos dias estão sem vender.
    """

    sql_filters = []
    params: list[Any] = []

    if store_id:
        sql_filters.append("s.store_id = ANY(%s)")
        params.append(store_id)

    if channel_id:
        sql_filters.append("s.channel_id = ANY(%s)")
        params.append(channel_id)

    where = " AND ".join(sql_filters) if sql_filters else "1=1"

    sql = f"""
        WITH last_sales AS (
            SELECT
                p.id,
                p.name,
                MAX(s.created_at) AS last_sale
            FROM products p
            LEFT JOIN product_sales ps ON ps.product_id = p.id
            LEFT JOIN sales s ON s.id = ps.sale_id AND {where}
            GROUP BY p.id, p.name
        )
        SELECT
            id,
            name,
            last_sale,
            COALESCE(
                DATE_PART('day', NOW() - last_sale),
                DATE_PART('day', NOW() - NOW())
            ) AS days_without_sale
        FROM last_sales
        WHERE last_sale IS NULL OR last_sale < NOW() - INTERVAL '30 days'
        ORDER BY days_without_sale DESC;
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            result = cur.fetchall()

    return [
        {
            "id": row[0],
            "product": row[1],
            "last_sale": row[2],
            "days_without_sale": int(row[3]),
        }
        for row in result
    ]
