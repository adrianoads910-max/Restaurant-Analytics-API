import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";

type LostCustomer = {
  customer: string;
  total_orders: number;
  last_order: string;
};

interface LostCustomersProps {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;
}

export default function LostCustomersCard({
  storeIds,
  channelIds,
  dateRange,
}: LostCustomersProps) {
  const [data, setData] = useState<LostCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  /** paginação */
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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
      .get("/sales/customers/lost", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((i) => [k, String(i)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((res) => {
        setData(res.data);
        setPage(1); // reset ao trocar filtros
      })
      .finally(() => setLoading(false));
  }, [storeIds, channelIds, dateRange]);

  /** Página atual com slice */
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [page, data]);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <h3 className="font-semibold text-gray-800 mb-3">👤 Clientes Perdidos</h3>
      <p className="text-sm text-gray-500 mb-4">
        Clientes fiéis (3+ compras) que não voltam há ≥ 30 dias.
      </p>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}
      {!loading && data.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum cliente perdido 🎉</p>
      )}

      <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {paginatedData.map((c) => (
          <li
            key={c.customer}
            className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 rounded-md p-2 transition cursor-pointer"
          >
            <span className="font-medium">{c.customer}</span>
            <span className="text-xs text-gray-500">
              {c.total_orders} pedidos •{" "}
              {new Date(c.last_order).toLocaleDateString("pt-BR")}
            </span>
          </li>
        ))}
      </ul>

      {/* PAGINADOR */}
      {data.length > PAGE_SIZE && (
        <div className="flex justify-between pt-4 mt-2 border-t">
          <button
            disabled={page === 1}
            className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => setPage((p) => p - 1)}
          >
            ◀ Anterior
          </button>

          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima ▶
          </button>
        </div>
      )}
    </div>
  );
}
