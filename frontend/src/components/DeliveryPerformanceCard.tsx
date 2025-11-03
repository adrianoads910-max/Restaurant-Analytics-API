import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type DeliveryStat = {
  weekday: number;
  hour: number;
  avg_delivery_minutes: number;
};

interface DeliveryPerformanceProps {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;
}

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DeliveryPerformanceCard({
  storeIds,
  channelIds,
  dateRange,
}: DeliveryPerformanceProps) {
  const [data, setData] = useState<DeliveryStat[]>([]);
  const [loading, setLoading] = useState(true);

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
      .get("/sales/delivery/performance", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((i) => [k, String(i)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [storeIds, channelIds, dateRange]);

  /** ✅ Agrupando por dia da semana */
  const groupedChartData = useMemo(() => {
    const grouped: Record<number, { total: number; count: number }> = {};

    data.forEach((d) => {
      grouped[d.weekday] = grouped[d.weekday] || { total: 0, count: 0 };
      grouped[d.weekday].total += d.avg_delivery_minutes;
      grouped[d.weekday].count += 1;
    });

    return Object.keys(grouped).map((weekday) => ({
      label: weekdayLabels[Number(weekday)],
      avg: grouped[Number(weekday)].total / grouped[Number(weekday)].count,
    }));
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <h3 className="font-semibold text-gray-800 mb-2">⏱ Tempo Médio de Entrega</h3>
      <p className="text-xs text-gray-500 mb-4">Média por dia da semana (minutos)</p>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}
      {!loading && groupedChartData.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum dado encontrado</p>
      )}

      {!loading && groupedChartData.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={groupedChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toFixed(0)} min`} />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
