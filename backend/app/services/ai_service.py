# backend/app/services/ai_service.py

from groq import Groq
from app.settings import settings

client = Groq(api_key=settings.GROQ_API_KEY)

# ---------------- PROMPTS PARA IA ---------------- #

PROMPT_TRENDING = """
Você é um consultor sênior de BI para restaurantes.

Use SOMENTE os dados enviados e responda:

📌 Pergunta:
➡️ "Qual produto vende mais por canal, dia da semana e horário?"

Formato (markdown):

## 🚀 Destaques (Produtos mais vendidos)
- Produto X é o mais vendido no canal Y às quintas à noite.
- Se houver tendência por horário, comportamento, repita.

⚠️ Regras:
- Não explique o processo.
- Se os dados forem insuficientes, FAÇA inferência.
Dados recebidos:
{{DATA}}
"""

PROMPT_PERFORMANCE = """
Você é um consultor sênior de BI especializado em performance.

Use SOMENTE os dados enviados.

📌 Pergunta:
➡️ O ticket médio está subindo ou caindo? Por canal ou por loja?

Formato (markdown):

## 📊 Performance (Ticket / Receita / Comparação)
- Ticket médio está (subindo/caindo) no canal X.
- Loja Y está performando melhor.
- Explique em 1 frase a tendência.

Dados recebidos:
{{DATA}}
"""

PROMPT_ALERTAS = """
Você é consultor sênior de BI.

Use SOMENTE os dados enviados.

📌 Pergunta:
➡️ Quais produtos estão sem venda e quais clientes estão com risco de churn?

Formato (markdown):

## ⚠️ Alertas (Riscos Identificados)
- Produto X está sem vender há N dias.
- Y clientes compraram 3+ vezes e não voltam há 30 dias.
- Cancelamentos elevados no canal Z.

Dados recebidos:
{{DATA}}
"""


# ---------------- FALLBACK (SEM IA) ---------------- #

def fallback_trending(data: dict) -> str:
    trending = data.get("trending_products", [])
    if not trending:
        return "## 🚀 Destaques\n- Nenhum produto com alta demanda no período."
    top = trending[0]["product"] if isinstance(trending[0], dict) else trending[0]
    return f"""
## 🚀 Destaques (Produtos mais vendidos)
- {top} está liderando as vendas no período analisado.
- Continue promovendo este item nos principais canais.
"""

def fallback_performance(data: dict) -> str:
    revenue = data.get("total_revenue", 0)
    avg = data.get("avg_ticket", 0)
    perf = data.get("performance", 0)

    variation = "subindo ✅" if perf >= 0 else "caindo ⚠️"

    return f"""
## 📊 Performance
- Receita total no período: **R$ {revenue:,.2f}**
- Ticket médio: **R$ {avg:,.2f}**
- A performance está **{variation} ({perf}%)**
"""

def fallback_alertas(data: dict) -> str:
    churn = data.get("retention_risk_clients", 0)
    cancel = data.get("canceled_orders", 0)

    return f"""
## ⚠️ Alertas
- {churn} clientes compraram 3+ vezes e estão inativos (risco de churn).
- {cancel} cancelamentos identificados no período.
"""


# ---------------- FUNÇÃO PRINCIPAL ---------------- #

async def generate_ai(prompt_template: str, data: dict) -> str:
    """
    Se der limite 429 / sem chave / erro, gera fallback automaticamente.
    """

    prompt = prompt_template.replace("{{DATA}}", str(data))

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "Você é um consultor de BI especialista em restaurantes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content

    except Exception as e:
        print("⚠️ IA indisponível. Usando fallback.", e)

        if prompt_template == PROMPT_TRENDING:
            return fallback_trending(data)

        elif prompt_template == PROMPT_PERFORMANCE:
            return fallback_performance(data)

        elif prompt_template == PROMPT_ALERTAS:
            return fallback_alertas(data)

        return "⚠️ Não foi possível gerar insights."
