# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .settings import settings
from .db import init_pool
from .routers import sales, metadata, insights 
from fastapi.responses import JSONResponse
from fastapi.requests import Request


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="🚀 Analytics Foodservice Backend API",
    )

    # CORS (permite o frontend acessar a API)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,  # ✅ origem do front  
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Conexão com banco no startup
    @app.on_event("startup")
    def on_startup():
        init_pool()
        print("✅ PostgreSQL connection pool initialized")

    # Endpoint básico para teste
    @app.get("/health")
    def health():
        return {"status": "ok", "message": "API running"}

    # Registro das rotas
    app.include_router(sales.router, prefix=settings.API_PREFIX)
    app.include_router(metadata.router, prefix=settings.API_PREFIX)
    app.include_router(insights.router, prefix=settings.API_PREFIX)


    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        print("🔥 ERRO NÃO TRATADO:", exc)
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)},
        )
    return app


app = create_app()
