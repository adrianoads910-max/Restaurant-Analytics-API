import { useEffect, useState } from "react";
import { api } from "../services/api";

type StoreAPI = {
  id: number;
  name: string;
};

type RankedStore = {
  id: number;
  name: string;
  revenue: number;
  percentage: number;
};

export default function StoreRankingCard({
  storeIds,
  dateRange,
  channelIds,
}: {
  storeIds: number[];
  dateRange: [Date, Date] | null;
  channelIds?: number[];
}) {
  const [ranking, setRanking] = useState<RankedStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateRange) return;

    const fetchRanking = async () => {
      setLoading(true);

      try {
        const [start, end] = dateRange;

        // ✅ busca lista de lojas
        const stores: StoreAPI[] = await api
          .get("/metadata/stores")
          .then((r) => r.data);

        const filteredStores =
          storeIds.length === 0
            ? stores
            : stores.filter((s) => storeIds.includes(s.id));

        const rankingData: RankedStore[] = [];

        for (const store of filteredStores) {
          const params: any = {
            store_id: store.id,
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          };

          if (channelIds?.length) params.channel_id = channelIds;

          // ✅ usa o endpoint correto das vendas
          const revenue = await api
            .get("/sales/timeseries/daily", {
              params,
              paramsSerializer: (p) =>
                new URLSearchParams(
                  Object.entries(p).flatMap(([k, v]) =>
                    Array.isArray(v) ? v.map((it) => [k, String(it)]) : [[k, String(v)]]
                  )
                ).toString(),
            })
            .then((res) =>
              res.data.reduce(
                (sum: number, item: { revenue: number }) => sum + item.revenue,
                0
              )
            )
            .catch(() => 0);

          rankingData.push({
            id: store.id,
            name: store.name,
            revenue,
            percentage: 0,
          });
        }

        rankingData.sort((a, b) => b.revenue - a.revenue);

        const total = rankingData.reduce((sum, s) => sum + s.revenue, 0);

        // ✅ corrigido: tipagem do callback explícita
        const normalizedRanking = rankingData.map((s: RankedStore) => ({
          ...s,
          percentage: total > 0 ? Number(((s.revenue / total) * 100).toFixed(1)) : 0,
        }));

        setRanking(normalizedRanking);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [storeIds, dateRange, channelIds]);

  return (
  <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm transition-all hover:shadow-xl">

    <h3 className="font-semibold text-xl mb-5 flex items-center gap-2 text-gray-800">
      🏆 Ranking das Lojas
    </h3>

    {loading && (
      <p className="text-gray-500 text-sm animate-pulse">Calculando ranking...</p>
    )}

    {!loading && ranking.length === 0 && (
      <p className="text-gray-500 text-sm">Nenhum dado para o período.</p>
    )}

    {!loading && ranking.length > 0 && (
      <ul className="space-y-3">
        {ranking.map((store, index) => (
          <li
            key={store.id}
            className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3 w-64 truncate font-medium text-gray-800">
              {index < 3 ? (
                <span className="text-2xl">
                  {["🥇", "🥈", "🥉"][index]}
                </span>
              ) : (
                <span className="text-sm font-bold text-gray-400 w-6 text-center">
                  {index + 1}
                </span>
              )}

              <span className="truncate">{store.name}</span>
            </div>

            <div className="flex items-center gap-4 w-80 justify-end">
              {/* barra percentual */}
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${store.percentage}%`,
                    background:
                      index === 0
                        ? "linear-gradient(to right, #ffd700, #ffcc00)" // ouro
                        : index === 1
                        ? "linear-gradient(to right, #c0c0c0, #d9d9d9)" // prata
                        : index === 2
                        ? "linear-gradient(to right, #cd7f32, #b87333)" // bronze
                        : "#3b82f6",
                  }}
                />
              </div>

              <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                {store.percentage}%
              </span>

              <span className="text-sm text-gray-600 font-medium w-28 text-right">
                R$ {store.revenue.toLocaleString("pt-BR")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);
}