import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const chartColors = ["#4f46e5", "#16a34a", "#f59e0b", "#ef4444", "#0891b2", "#7e22ce"];

function normalizeKey(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

function formatLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type Row = {
  day?: string;
  month?: string;
  channel: string;
  store_name: string;
  revenue: number;
  orders: number;
};

type GroupField = "channel" | "store_name" | "TOTAL";

export default function StatsAreaChart({
  storeIds,
  channelIds,
  dateRange,
  onTotalsChange,
  onChannelsRevenue,
  onTemporalData,
  disableChannelFilterForRanking = false,
}: {
  storeIds?: number[];
  channelIds?: number[];
  dateRange?: [Date, Date] | null;
  onTotalsChange?: (revenue: number, orders: number) => void;
  onChannelsRevenue?: (
    ranking: Array<{ channel: string; revenue: number; percentage: number }>
  ) => void;
  onTemporalData?: (sales: Array<{ date: string; total_orders: number }>) => void;
  disableChannelFilterForRanking?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsForRanking, setRowsForRanking] = useState<Row[]>([]);

  const comparingStores = (storeIds?.length ?? 0) > 1;
  const usingDaily = !!dateRange;

  const groupField: GroupField =
    !channelIds?.length ? "TOTAL" : comparingStores ? "store_name" : "channel";

  /** ✅ Busca dados para o gráfico principal */
  useEffect(() => {
    const params: any = {};
    if (storeIds?.length) params.store_id = storeIds;
    if (channelIds?.length) params.channel_id = channelIds;
    if (dateRange) {
      params.start = dateRange[0].toISOString().slice(0, 10);
      params.end = dateRange[1].toISOString().slice(0, 10);
    }

    api
      .get(usingDaily ? "/sales/timeseries/daily" : "/sales/timeseries/monthly", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((it) => [k, String(it)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((res) => {
        setRows(res.data as Row[]);

        if (onTemporalData) {
          onTemporalData(
            res.data.map((r: any) => ({
              date: r.day ?? r.month,
              total_orders: r.orders,
            }))
          );
        }
      })
      .catch(() => setRows([]));
  }, [storeIds, channelIds, dateRange, usingDaily, onTemporalData]);

  /** ✅ Busca ranking lateral */
  useEffect(() => {
    if (!onChannelsRevenue) return;

    const params: any = {};
    if (storeIds?.length) params.store_id = storeIds;
    if (dateRange) {
      params.start = dateRange[0].toISOString().slice(0, 10);
      params.end = dateRange[1].toISOString().slice(0, 10);
    }

    if (!disableChannelFilterForRanking && channelIds?.length)
      params.channel_id = channelIds;

    api
      .get("/sales/timeseries/daily", {
        params,
        paramsSerializer: (p) =>
          new URLSearchParams(
            Object.entries(p).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((it) => [k, String(it)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((res) => setRowsForRanking(res.data as Row[]))
      .catch(() => setRowsForRanking([]));
  }, [storeIds, dateRange, onChannelsRevenue, disableChannelFilterForRanking]);

  /** ✅ Lista dinamicamente os canais ou apenas TOTAL */
  const keys = useMemo(() => {
    if (groupField === "TOTAL") return ["TOTAL"];
    return [...new Set(rows.map((r) => normalizeKey(r[groupField]!)))] as string[];
  }, [rows, groupField]);

  /** ✅ Linha do tempo contínua */
  const timeline = useMemo(() => {
    if (!rows.length) return [];
    if (usingDaily) {
      const start = new Date(rows[0].day!);
      const end = new Date(rows[rows.length - 1].day!);
      const dates: Date[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      return dates.map((d) => d.toISOString().slice(0, 10));
    }
    return [...new Set(rows.map((r) => r.month!))];
  }, [rows, usingDaily]);

  /** ✅ MONTA DATA ACUMULANDO QUANDO TOTAL */
  const data = useMemo(() => {
    const byTime: Record<string, any> = {};

    timeline.forEach((t) => {
      byTime[t] = { time: usingDaily ? formatLabel(t) : t };
    });

    rows.forEach((r) => {
      const timeKey = usingDaily ? r.day! : r.month!;
      const keyRaw = groupField === "TOTAL" ? "TOTAL" : r[groupField]!;
      const key = normalizeKey(keyRaw);

      if (!byTime[timeKey])
        byTime[timeKey] = { time: usingDaily ? formatLabel(timeKey) : timeKey };

      // ✅ CORREÇÃO: soma os valores!
      byTime[timeKey][key] = (byTime[timeKey][key] ?? 0) + r.revenue;
      byTime[timeKey][`${key}_orders`] = (byTime[timeKey][`${key}_orders`] ?? 0) + r.orders;
    });

    return Object.values(byTime);
  }, [rows, timeline, usingDaily, groupField]);

  /** ✅ Totais para os KPIs */
  useEffect(() => {
    if (!onTotalsChange || rows.length === 0) return;
    const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0);
    const totalOrders = rows.reduce((acc, r) => acc + r.orders, 0);
    onTotalsChange(totalRevenue, totalOrders);
  }, [rows, onTotalsChange]);

  /** ✅ Ranking lateral */
  useEffect(() => {
    if (!onChannelsRevenue || rowsForRanking.length === 0) return;

    const grouped = rowsForRanking.reduce((acc: Record<string, number>, r) => {
      acc[r.channel] = (acc[r.channel] ?? 0) + r.revenue;
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((acc, v) => acc + v, 0);

    const ranking = Object.entries(grouped)
      .map(([channel, revenue]) => ({
        channel,
        revenue,
        percentage: (revenue / total) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    onChannelsRevenue(ranking);
  }, [rowsForRanking, onChannelsRevenue]);

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-8 w-full">
      {/* === FATURAMENTO === */}
      <div className="bg-white rounded-xl shadow p-6 flex-1">
        <h3 className="font-semibold mb-4 text-gray-700">Faturamento</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
            <Legend />
            {keys.map((k, i) => (
              <Area
                key={`rev-${k}`}
                dataKey={k}
                name={`${k.replace(/_/g, " ")} (R$)`}
                stroke={chartColors[i % chartColors.length]}
                fill={chartColors[i % chartColors.length]}
                fillOpacity={0.17}
                strokeWidth={3}
                type="monotone"
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* === PEDIDOS === */}
      <div className="bg-white rounded-xl shadow p-6 flex-1">
        <h3 className="font-semibold mb-4 text-gray-700">Pedidos</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={(v: number) => `${v.toLocaleString("pt-BR")} pedidos`} />
            <Legend />
            {keys.map((k, i) => (
              <Area
                key={`orders-${k}`}
                dataKey={`${k}_orders`}
                name={`${k.replace(/_/g, " ")} - pedidos`}
                stroke={chartColors[i % chartColors.length]}
                fill={chartColors[i % chartColors.length]}
                fillOpacity={0.17}
                strokeWidth={3}
                type="monotone"
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
