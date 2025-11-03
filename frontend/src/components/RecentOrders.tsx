import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Product = {
  name: string;
  qty: number;
  total: number;
};

export type RecentOrder = {
  sale_id: number;
  customer: string;
  channel: string;
  date: string; // ISO string
  amount: number;
  status: string;
  created_at: string;  products: Product[];
};

export default function RecentOrders({
  storeIds,
  dateRange,
  onOrdersLoaded,
}: {
  storeIds?: number[];
  dateRange?: [Date, Date] | null;
  onOrdersLoaded?: (orders: RecentOrder[]) => void;
}) {
  const [allOrders, setAllOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => setPage(1), [storeIds, dateRange]);

  useEffect(() => {
    if (!dateRange) return;

    setIsLoading(true);
    const [start, end] = dateRange;

    const params: any = {
      limit: 9999,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
    if (storeIds?.length) params.store_id = storeIds;

    api
      .get("/sales/recent", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([key, value]) =>
              Array.isArray(value)
                ? value.map((v) => [key, String(v)])
                : [[key, String(value)]]
            )
          ).toString(),
      })
      .then((res) => {
        const rows: RecentOrder[] = (res.data || []).map((sale: any) => ({
          sale_id: sale.sale_id,
          customer: sale.customer,
          channel: sale.channel,
          date: sale.date,
          amount: sale.amount,
          status: sale.status,
          products: sale.products ?? [],
        }));

        const startTs = new Date(start).setHours(0, 0, 0, 0);
        const endTs = new Date(end).setHours(23, 59, 59, 999);

        const filtered = rows.filter((r) => {
          const ts = new Date(r.date).getTime();
          return ts >= startTs && ts <= endTs;
        });

        filtered.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setAllOrders(filtered);
        onOrdersLoaded?.(filtered);
      })
      .finally(() => setIsLoading(false));
  }, [storeIds, dateRange]);

  const pagedOrders = useMemo(() => {
    const from = (page - 1) * pageSize;
    return allOrders.slice(from, from + pageSize);
  }, [allOrders, page]);

  const hasPrev = page > 1;
  const hasNext = page * pageSize < allOrders.length;

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "canceled":
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  /* ✅ NOVO — BADGES DO CANAL */
  const getChannelStyle = (channel: string) => {
    const c = (channel || "").toLowerCase();

    if (c.includes("ifood")) return "bg-red-100 text-red-600 border-red-300";
    if (c.includes("whatsapp")) return "bg-green-100 text-green-600 border-green-300";
    if (c.includes("app")) return "bg-blue-100 text-blue-600 border-blue-300";
    if (c.includes("site") || c.includes("web"))
      return "bg-purple-100 text-purple-600 border-purple-300";

    return "bg-gray-100 text-gray-600 border-gray-300";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 w-full mt-6 p-6">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Pedidos Recentes</h3>
        <span className="text-sm text-gray-500">{allOrders.length} no período</span>
      </div>

      {/* tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b text-gray-600 z-10">
            <tr>
              <th className="px-6 py-3 text-left font-medium w-[18%]">Cliente</th>
              <th className="px-6 py-3 text-left font-medium w-[36%]">Produtos</th>
              <th className="px-6 py-3 text-center font-medium w-[12%]">Canal</th>
              <th className="px-6 py-3 text-center font-medium w-[12%]">Data</th>
              <th className="px-6 py-3 text-right font-medium w-[10%]">Valor</th>
              <th className="px-6 py-3 text-center font-medium w-[12%]">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Carregando pedidos...
                </td>
              </tr>
            ) : pagedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              pagedOrders.map((order, idx) => (
                <tr
                  key={order.sale_id}
                  className={idx % 2 ? "bg-white" : "bg-gray-50/40 hover:bg-gray-50"}
                >
                  <td className="px-6 py-3 font-medium text-gray-800 truncate">
                    {order.customer ?? "Não identificado"}
                  </td>

                  <td className="px-6 py-3">
                    <div className="space-y-1 max-h-15 overflow-y-auto pr-1">
                      {order.products.map((p) => (
                        <div
                          key={`${order.sale_id}-${p.name}`}
                          className="text-gray-700"
                        >
                          <span className="text-gray-500 mr-1">{p.qty}×</span>
                          <span className="truncate inline-block align-bottom max-w-full">
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* ✅ CHANNEL BADGE */}
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`inline-flex px-1 py-1 rounded-full text-xs font-medium border ${getChannelStyle(
                        order.channel
                      )}`}
                    >
                      {order.channel}
                    </span>
                  </td>

                  <td className="px-6 py-3 text-center text-gray-700">
                    {new Date(order.date).toLocaleDateString("pt-BR")}
                  </td>

                  <td className="px-6 py-3 text-right font-semibold text-gray-900">
                    R$ {Number(order.amount || 0).toLocaleString("pt-BR")}
                  </td>

                  <td className="px-10 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      ● {order.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-white rounded-b-2xl">
        <button
          disabled={!hasPrev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ◀ Anterior
        </button>

        <span className="text-sm text-gray-600">
          Página <strong>{page}</strong> /{" "}
          {Math.max(1, Math.ceil(allOrders.length / pageSize))}
        </span>

        <button
          disabled={!hasNext}
          onClick={() => setPage((p) => p + 1)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próxima ▶
        </button>
      </div>
    </div>
  );
}
