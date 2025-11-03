# backend/app/db.py

from psycopg_pool import ConnectionPool
from .settings import settings
import logging

logger = logging.getLogger(__name__)

pool: ConnectionPool | None = None


def init_pool():
    """Inicializa o pool de conexões do PostgreSQL"""
    global pool
    if pool is not None:
        return

    conninfo = (
        f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST.strip()}:{settings.DB_PORT}/{settings.DB_NAME}"
    )

    logger.info(f"🔌 Iniciando conexão com o banco: {conninfo}")

    try:
        pool = ConnectionPool(
            conninfo=conninfo,
            min_size=1,
            max_size=10,
            timeout=10,
        )
        logger.info("✅ Pool de conexão inicializado com sucesso")
    except Exception as e:
        logger.error("❌ Erro ao criar pool de conexão com PostgreSQL")
        logger.error(str(e))
        raise


def get_conn():
    """Retorna uma conexão ativa do pool"""
    if pool is None:
        init_pool()

    try:
        return pool.connection()
    except Exception as e:
        logger.error("❌ Erro ao obter conexão do pool")
        logger.error(str(e))
        raise
