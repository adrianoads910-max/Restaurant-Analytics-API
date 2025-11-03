
# 🍽️ Restaurant Analytics — IA + Dashboard + API


## 📊 Sobre o Projeto

Dashboard moderno para análise de vendas e performance de restaurantes.

✅ Backend FastAPI calcula métricas e pode usar IA (Groq) para insights  
✅ Frontend React exibe gráficos e insights em blocos  
✅ Se a IA atingir limite, o sistema gera insights automáticos com base nos dados

---

## 🔥 Funcionalidades

| Módulo | Função |
|--------|--------|
| **Vendas** | performance, faturamento, canais, lojas |
| **Produtos** | trending do período, trending por horário, produtos sem venda |
| **Conversão** | ticket médio, clientes, churn, cancelamentos |
| **IA (Groq)** | responde perguntas tipo: *"qual produto vende mais na quinta à noite?"* |
| **Fallback automático** | Se a IA indisponível, gera insight local baseado no banco |

---

## 📦 Tecnologias

| Backend | Frontend | IA / Dados |
|---------|----------|------------|
| Python • FastAPI • Pydantic | React • TypeScript • Tailwind • Recharts | Groq LLM API |
| PostgreSQL / Firebird / MySQL (plugável) | RSuite date range picker | Insights automáticos |

---

## 🧩 Estrutura

```

/backend
app/
routers/
services/
main.py
/frontend
src/components/
src/pages/Overview.tsx

````

---

# 🚀 Como rodar

## ✅ 1. Backend

➡️ Instalar dependências

```bash
cd backend
pip install -r requirements.txt
````

➡️ Criar arquivo `.env`

```
GROQ_API_KEY=xxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
```

➡️ Rodar

```bash
uvicorn app.main:app --reload
```

📍 API disponível em:

```
http://localhost:8000
```

📍 Documentação interativa:

```
http://localhost:8000/docs
```

---

## ✅ 2. Frontend

```bash
cd frontend
npm install
npm start
```

📍 Dashboard:

```
http://localhost:3000
```

---

## 🔗 Principais Endpoints da API

| Endpoint                              | Função               |
| ------------------------------------- | -------------------- |
| `GET /metadata/stores`                | lojas                |
| `GET /metadata/channels`              | canais               |
| `GET /sales/products/trending`        | top produtos         |
| `GET /sales/products/trending/hourly` | produtos por horário |
| `POST /insights`                      | gera insights via IA |

### Exemplo — produtos mais vendidos

```bash
curl -X GET "http://localhost:8000/sales/products/trending?start=2024-01-01&end=2024-01-31"
```

### Exemplo — gerar insights (block1/2/3)

```bash
curl -X POST "http://localhost:8000/insights" \
-H "Content-Type: application/json" \
-d '{
  "block1": { "best_today": "Pizza", "trending_month": [], "delivery_time": 27 },
  "block2": { "total_revenue": 15000, "total_clients": 120, "performance": 12.5, "avg_ticket": 42.50 },
  "block3": { "not_selling_products": [], "canceled_orders": 3, "retention_risk_clients": 1 }
}'
```

Retorno:

```json
{
  "success": true,
  "insights": {
    "highlights": "✅ Destaques...",
    "performance": "📊 Performance...",
    "alerts": "⚠ Alertas..."
  }
}
```

---

# 🐳 Deploy com Docker (Backend + Frontend)

## 🔧 Backend Dockerfile

```dockerfile
FROM python:3.12
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔧 Frontend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

## 🧪 docker-compose.yml

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
```

---

## 👨‍💻 Autor

**Adriano ADS**
📌 Fullstack & BI for Restaurants
🔗 [https://github.com/adrianoads910-max](https://github.com/adrianoads910-max)


```
