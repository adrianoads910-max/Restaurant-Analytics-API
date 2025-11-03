// ✅ src/components/TrendingProductsCard.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";

type Trending = {
  product: string;
  qty: number;
  revenue: number;
};

interface TrendingProductsProps {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;

  /** ✨ NOVO — retorna para o Overview o produto mais vendido no período */
  onBestProduct?: (products: Trending[]) => void;
}

export default function TrendingProductsCard({
  storeIds,
  channelIds,
  dateRange,
  onBestProduct,
}: TrendingProductsProps) {
  const [data, setData] = useState<Trending[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ paginação
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(data.length / pageSize);

  useEffect(() => {
    if (!dateRange) return;

    const [start, end] = dateRange;

    const params: any = {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };

    if (storeIds.length > 0) params.store_id = storeIds;
    if (channelIds.length > 0) params.channel_id = channelIds;

    setLoading(true);

    api
      .get("/sales/products/trending", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((i) => [k, String(i)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((r) => {
        // ✅ ordena já na resposta
        const sorted = [...r.data].sort((a, b) => b.qty - a.qty);
        setData(sorted);
        setPage(1);

        /** ✅ devolve para o Overview o top da lista */
        if (onBestProduct) onBestProduct(sorted);
      })
      .finally(() => setLoading(false));
  }, [storeIds, channelIds, dateRange]);

  // ✅ calcula os itens da página atual
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <h3 className="font-semibold text-gray-800 mb-4">
        🏆 Produtos Mais Vendidos (Período Selecionado)
      </h3>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}

      {!loading && paginatedData.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum produto em destaque</p>
      )}

      {!loading &&
        paginatedData.map((item, i) => (
          <div
            key={i}
            className="flex justify-between py-2 border-b hover:bg-gray-50 rounded-md px-1"
          >
            <span>
              {((page - 1) * pageSize) + (i + 1)}. {item.product}
            </span>
            <span className="font-semibold text-gray-700">
              {item.qty} vendas
            </span>
          </div>
        ))}

      {/* ✅ Paginação */}
      {data.length > pageSize && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
          >
            ◀ Anterior
          </button>

          <span className="text-sm text-gray-600">
            Página {page} de {totalPages} — Exibindo {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, data.length)} de {data.length}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
          >
            Próximo ▶
          </button>
        </div>
      )}
    </div>
  );
}
