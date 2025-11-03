import { useEffect, useState } from "react";
import { api } from "../services/api";

interface Props {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;
}

type Product = {
  id: number;
  product: string;
  days_without_sale: number; // ✅ agora vem do backend
};

export default function NotSellingProducts({
  storeIds,
  channelIds,
  dateRange,
}: Props) {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

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
      .get("/sales/products/not-selling", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v)
                ? v.map((i) => [k, String(i)])
                : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((res) => {
        // ✅ Ordena do maior para o menor tempo sem vender
        const sorted = [...res.data].sort(
          (a, b) => b.days_without_sale - a.days_without_sale
        );

        setData(sorted);
        setPage(1); // volta para página 1 quando novos dados chegam
      })
      .finally(() => setLoading(false));
  }, [storeIds, channelIds, dateRange]);

  // ✅ itens da página atual
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  const riskLevel = (days: number) => {
    if (days >= 90) return "🔴 Alto risco";
    if (days >= 60) return "🟠 Médio risco";
    return "🟡 Acompanhar";
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-800 mb-3 text-lg">
        🚫 Produtos sem vender há mais de 30 dias
      </h3>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}

      {!loading && paginatedData.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum produto parado ✅</p>
      )}

      {!loading &&
        paginatedData.map((p, i) => (
          <div
            key={p.id}
            className="py-2 border-b px-1 text-gray-700 hover:bg-gray-50 rounded flex justify-between items-center"
          >
            <span>
              {((page - 1) * pageSize) + (i + 1)}. {p.product}
            </span>

            <span className="text-sm text-gray-600 flex items-center gap-2">
              {p.days_without_sale} dias — <strong>{riskLevel(p.days_without_sale)}</strong>
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
            Página {page} de {totalPages}
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
