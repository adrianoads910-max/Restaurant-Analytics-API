# backend/app/routers/insights.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from app.services.ai_service import (
    generate_ai,
    PROMPT_TRENDING,
    PROMPT_PERFORMANCE,
    PROMPT_ALERTAS,
)

router = APIRouter()


# ================================
# 🔹 MODELO DO PAYLOAD RECEBIDO
# ================================
class InsightsRequest(BaseModel):
    block1: Dict[str, Any]  # produto mais vendido / mês / entrega
    block2: Dict[str, Any]  # ticket / revenue / performance
    block3: Dict[str, Any]  # churn / cancelamentos / produto parado


# ====================================================
# ✅ INSIGHTS AUTOMÁTICOS (SEM IA)
# ====================================================
def auto_insight_trending(block1: dict) -> str:
    produto_dia = block1.get("best_today") or "—"

    trending_mes = block1.get("trending_month", [])
    produto_mes = (
        trending_mes[0].get("product")
        if trending_mes and isinstance(trending_mes[0], dict)
        else "—"
    )

    delivery_time = block1.get("delivery_time")

    return f"""
## ✅ Destaques do dia (Oportunidades)
- 🥇 Produto mais vendido hoje: **{produto_dia}**
- 📅 Mais vendido no período: **{produto_mes}**
- 🚚 Tempo médio de entrega: **{delivery_time or '—'} min**
""".strip()



def auto_insight_performance(block2: dict) -> str:
    revenue = block2.get("total_revenue", 0)
    clients = block2.get("total_clients", 0)
    performance = block2.get("performance", 0)
    avg_ticket = block2.get("avg_ticket", 0)

    trend = "⬆️ aumento" if performance > 0 else "⬇️ queda"

    return f"""
## 📊 Performance (Ticket / Receita)
- Faturamento total: **R$ {revenue:,.2f}**
- Ticket médio: **R$ {avg_ticket:,.2f}**
- Variação do período: **{performance}% ({trend})**
""".strip()


def auto_insight_alert(block3: dict) -> str:
    produtos = block3.get("not_selling_products", [])
    produto_parado = produtos[0]["product_name"] if produtos else None
    canceled = block3.get("canceled_orders", 0)
    churn = block3.get("retention_risk_clients", 0)

    txt = "## ⚠️ Alertas (Riscos Identificados)\n"

    if produto_parado:
        txt += f"- 🚫 Produto parado: **{produto_parado}**\n"

    if canceled > 3:
        txt += f"- ❗ Cancelamentos elevados: **{canceled} pedidos**\n"

    if churn > 0:
        txt += f"- 👥 Clientes em risco de churn: **{churn}**\n"

    return txt.strip()


# ====================================================
# ✅ ENDPOINT
# ====================================================
@router.post("/insights")
async def insights(payload: InsightsRequest):
    try:
        # Tenta gerar com IA
        try:
            trending = await generate_ai(PROMPT_TRENDING, payload.block1)
            performance = await generate_ai(PROMPT_PERFORMANCE, payload.block2)
            alerts = await generate_ai(PROMPT_ALERTAS, payload.block3)

        # Se falhar: gera insights automáticos
        except Exception as e:
            print("⚠️ IA indisponível — usando fallback automático:", str(e))

            trending = auto_insight_trending(payload.block1)
            performance = auto_insight_performance(payload.block2)
            alerts = auto_insight_alert(payload.block3)

        return {
            "success": True,
            "insights": {
                "highlights": trending,
                "performance": performance,
                "alerts": alerts,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao gerar insights: {str(e)}"
        )
