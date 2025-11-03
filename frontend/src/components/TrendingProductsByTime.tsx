// ✅ src/components/TrendingProductsByTime.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

const HOUR_BUCKETS = [
  { label: "00-06h", start: 0, end: 6 },
  { label: "06-11h", start: 6, end: 11 },
  { label: "11-15h", start: 11, end: 15 },
  { label: "15-19h", start: 15, end: 19 },
  { label: "19-23h", start: 19, end: 23 },
  { label: "23-24h", start: 23, end: 24 },
];

/** ✅ Tooltip customizado (mostra nome e qtde) */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white shadow-xl rounded-lg border p-3 text-xs">
      <strong>{label}</strong>
      <div className="mt-1 flex flex-col gap-1">
        <p className="text-green-600">
          🟢 <strong>{row.topName}</strong> ({row.top} vendas)
        </p>
        <p className="text-red-600">
          🔴 <strong>{row.worstName}</strong> ({row.worst} vendas)
        </p>
      </div>
    </div>
  );
};

export default function TrendingProductsByTime({
  storeIds,
  channelIds,
  dateRange,
  /** ✨ NOVO — devolve para Overview o produto mais vendido hoje */
  onBestProductToday,
}: {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;
  onBestProductToday?: (product: string) => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!dateRange) return;

    const [start, end] = dateRange;
    setLoading(true);

    try {
      const res = await api.get("/sales/products/trending/hourly", {
        params: {
          store_id: storeIds,
          channel_id: channelIds,
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((i) => [k, String(i)]) : [[k, String(v)]]
            )
          ).toString(),
      });

      const formatted = HOUR_BUCKETS.map((bucket) => {
        const found = res.data.find(
          (item: any) =>
            item.start_hour === bucket.start && item.end_hour === bucket.end
        );

        return {
          label: bucket.label,
          top: found?.top_product?.qty ?? 0,
          worst: found?.worst_product?.qty ?? 0,
          topName: found?.top_product?.product ?? "—",
          worstName: found?.worst_product?.product ?? "—",
        };
      });

      setData(formatted);

      /** ✅ devolve o produto mais vendido do dia */
      const firstTop = formatted.find((b) => b.top > 0);
      if (firstTop && onBestProductToday) {
        onBestProductToday(firstTop.topName);
      }
    } catch (e) {
      console.error("Erro ao carregar TrendingProductsByTime:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [storeIds, channelIds, dateRange]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-800 mb-2 text-lg flex items-center gap-2">
        🕒 Produtos por Faixa de Horário (Top x Flop)
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Mostra o produto mais vendido e o menos vendido em cada período do dia
      </p>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}
      {!loading && data.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum dado encontrado</p>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Bar dataKey="top" name="Mais vendido" fill="#16a34a" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="top" position="top" />
            </Bar>
            <Bar dataKey="worst" name="Menos vendido" fill="#dc2626" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="worst" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
