// ===========================================
// ✅ Overview.tsx — Completo e Atualizado
// ===========================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

import StoreSelect from "../components/StoreSelect";
import ChannelSelect from "../components/ChannelSelect";
import StatsAreaChart from "../components/StatsAreaChart";
import ChartCard from "../components/ChartCard";
import ChannelRevenueCard from "../components/ChannelRevenueCard";
import TemporalPatternsDashboard from "../components/TemporalPatternsDashboard";
import RecentOrders, { type RecentOrder } from "../components/RecentOrders";
import SalesConversionCard from "../components/SalesConversionCard";
import StoreRankingCard from "../components/StoreRankingCard";
import LostCustomersCard from "../components/LostCustomersCard";
import AvgTicketCard from "../components/AvgTicketCard";
import DeliveryPerformanceCard from "../components/DeliveryPerformanceCard";
import TrendingProductsCard from "../components/TrendingProductsCard";
import TrendingProductsByTime from "../components/TrendingProductsByTime";
import NotSellingProducts from "../components/NotSellingProducts";
import InsightBadge from "../components/InsightBadge";

import { DateRangePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";

type TotalsFromChart = {
  revenue: number;
  orders: number;
};

export default function Overview() {
  const [stores, setStores] = useState<number[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [channelIds, setChannelIds] = useState<number[]>([]);
  const [channelsRanking, setChannelsRanking] = useState<
    Array<{ channel: string; revenue: number; percentage: number }>
  >([]);

  const [ordersFromTable, setOrdersFromTable] = useState<RecentOrder[]>([]);
  const [chartTotals, setChartTotals] = useState<TotalsFromChart>({
    revenue: 0,
    orders: 0,
  });

  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [performance, setPerformance] = useState<number>(0);

  const [temporalData, setTemporalData] = useState<
    Array<{ date: string; total_orders: number; total_revenue?: number }>
  >([]);

  // ✅ valores vindos dos componentes (NOVOS)
  const [bestProductOfPeriod, setBestProductOfPeriod] = useState<string>("—");
  const [bestProductToday, setBestProductToday] = useState<string>("—");
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);

  const [insightsBlocks, setInsightsBlocks] = useState<{
    highlights?: string;
    performance?: string;
    alerts?: string;
  }>({});

  // ✅ Carrega lojas
  useEffect(() => {
    api.get("/metadata/stores").then((r) => setStoresList(r.data));
  }, []);

  const handleChartTotals = useCallback((revenue: number, orders: number) => {
    setChartTotals({ revenue, orders });
  }, []);

  // -----------------------------
  // ✅ PADRÕES TEMPORAIS (GRÁFICOS)
  // -----------------------------
  const intraday = useMemo(() => {
    const totalOrders = temporalData.reduce(
      (sum, r) => sum + (r?.total_orders ?? 0),
      0
    );
    const BUCKETS = [
      { label: "00-06h", pct: 2 },
      { label: "06-11h", pct: 8 },
      { label: "11-15h", pct: 35 },
      { label: "15-19h", pct: 10 },
      { label: "19-23h", pct: 40 },
      { label: "23-24h", pct: 5 },
    ];
    return BUCKETS.map((b) => ({
      label: b.label,
      value: Math.floor((totalOrders * b.pct) / 100),
    }));
  }, [temporalData]);

  const weekly = useMemo(() => {
    const grouped: Record<number, number> = {};
    temporalData.forEach((row) => {
      const day = new Date(row.date).getDay();
      grouped[day] = (grouped[day] || 0) + row.total_orders;
    });
    const mapDay = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return Object.entries(grouped).map(([d, total]) => ({
      label: mapDay[Number(d)],
      value: total,
    }));
  }, [temporalData]);

  const monthly = useMemo(() => {
    if (!temporalData.length) return [];
    const grouped = temporalData.reduce<
      Record<number, { orders: number; revenue: number }>
    >((acc, row) => {
      const month = new Date(row.date).getMonth();
      if (!acc[month]) acc[month] = { orders: 0, revenue: 0 };
      acc[month].orders += row.total_orders ?? 0;
      acc[month].revenue += row.total_revenue ?? 0;
      return acc;
    }, {});
    const months = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    const mapMonth = [
      "Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez",
    ];
    return months.map((m) => ({
      label: mapMonth[m],
      current: grouped[m].orders,
      variation: null,
    }));
  }, [temporalData]);

  // -----------------------------
  // ✅ PERFORMANCE DO PERÍODO
  // -----------------------------
  useEffect(() => {
    if (!dateRange) return;

    const [start, end] = dateRange;
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    prevStart.setDate(start.getDate() - diffDays);
    prevEnd.setDate(end.getDate() - diffDays);

    const params = { store_id: stores, channel_id: channelIds };

    Promise.all([
      api.get("/sales/overview", {
        params: {
          ...params,
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
      }),
      api.get("/sales/overview", {
        params: {
          ...params,
          start: prevStart.toISOString().slice(0, 10),
          end: prevEnd.toISOString().slice(0, 10),
        },
      }),
    ])
      .then(([curr, prev]) => {
        const current = curr.data?.faturamento ?? 0;
        const previous = prev.data?.faturamento ?? 0;

        if (previous === 0 && current > 0) return setPerformance(100);
        if (previous === 0 && current === 0) return setPerformance(0);

        setPerformance(
          Number((((current - previous) / previous) * 100).toFixed(1))
        );
      })
      .catch(() => setPerformance(0));
  }, [stores, channelIds, dateRange]);

  // ======================================================
  // ✅ ENVIA OS DADOS PARA O BACKEND GERAR INSIGHTS (com IA)
  // ======================================================
  useEffect(() => {
    if (!dateRange) return;

    const block1 = {
      best_today: bestProductToday,
      trending_month: [{ produto: bestProductOfPeriod }],
      delivery_time: deliveryTime,
    };

    const block2 = {
      total_revenue: chartTotals.revenue,
      total_clients: chartTotals.orders,
      performance,
      avg_ticket: chartTotals.revenue / (chartTotals.orders || 1),
    };

    const block3 = {
      not_selling_products: ordersFromTable.filter((o) => !o.total),
      canceled_orders: ordersFromTable.filter((o) =>
        ["canceled", "cancelled"].includes(o?.status?.toLowerCase() ?? "")
      ).length,
      retention_risk_clients: ordersFromTable.filter(
        (o) => (o?.orders_count ?? 0) >= 3
      ).length,
    };

    api
      .post("/insights", { block1, block2, block3 })
      .then((res) => setInsightsBlocks(res.data.insights))
      .catch(() => setInsightsBlocks({}));
  }, [
    stores,
    channelIds,
    dateRange,
    chartTotals,
    performance,
    bestProductToday,
    bestProductOfPeriod,
    deliveryTime,
    ordersFromTable,
  ]);

  // ======================================================
  // ✅ RENDERIZAÇÃO
  // ======================================================

  return (
    <main className="min-h-screen w-full flex bg-gray-200">

      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl p-6 fixed top-0 left-0 h-screen border-r border-gray-700 flex flex-col gap-6 text-gray-200">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-100">
          <span className="text-amber-400 text-3xl">⚙</span> Filtros
        </h2>

        <div className="bg-gray-800/40 rounded-xl border border-gray-700 shadow-inner p-4 flex flex-col gap-4">
          <label className="text-sm text-gray-300 font-medium">Período</label>
          <div className="rs-picker rs-picker-date text-gray-900">
            <DateRangePicker
              placeholder="Selecionar período"
              format="dd/MM/yyyy"
              className="w-full"
              onChange={(val) => setDateRange(val as any)}
            />
          </div>

          <label className="text-sm text-gray-300 font-medium mt-2">Lojas</label>
          <StoreSelect onChange={setStores} />

          <label className="text-sm text-gray-300 font-medium mt-2">Canais</label>
          <div className="text-gray-900">
            <ChannelSelect onChange={setChannelIds} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 p-6 overflow-y-auto ml-64">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <ChartCard title="Clientes" value={chartTotals.orders.toLocaleString("pt-BR")} icon={<span>👥</span>} variation={performance} />
          <ChartCard title="Vendas" value={`R$ ${chartTotals.revenue.toLocaleString("pt-BR")}`} icon={<span>🛒</span>} variation={performance} />
          <ChartCard title="Performance" value={`${performance}%`} icon={<span>📈</span>} variation={performance} />
          <ChartCard
            title="Cancelados"
            value={ordersFromTable.filter((o) =>
              ["canceled", "cancelled"].includes(o?.status?.toLowerCase() ?? "")
            ).length.toLocaleString("pt-BR")}
            icon={<span>❌</span>}
            variation={performance}
          />
        </div>

        {/* ✅ Insight bloco 1 */}
        <div className="mb-6">

        <InsightBadge text={insightsBlocks.highlights} />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <SalesConversionCard orders={ordersFromTable} />
          <ChannelRevenueCard ranking={channelsRanking} />
          <StoreRankingCard storeIds={stores} dateRange={dateRange} />
        </div>

        <StatsAreaChart
          storeIds={stores}
          channelIds={channelIds}
          dateRange={dateRange}
          onTotalsChange={handleChartTotals}
          onChannelsRevenue={setChannelsRanking}
          onTemporalData={setTemporalData}
        />

        <TemporalPatternsDashboard intraday={intraday} weekly={weekly} monthly={monthly} />

        {/* ✅ Insight bloco 2 */}
        <div className="mb-6">

        <InsightBadge text={insightsBlocks.performance} />
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <LostCustomersCard storeIds={stores} channelIds={channelIds} dateRange={dateRange} />
          <AvgTicketCard storeIds={stores} channelIds={channelIds} dateRange={dateRange} />
          <DeliveryPerformanceCard
            storeIds={stores}
            channelIds={channelIds}
            dateRange={dateRange}
            onAvgTime={(avg) => setDeliveryTime(avg)}
          />
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <TrendingProductsCard
            storeIds={stores}
            channelIds={channelIds}
            dateRange={dateRange}
            onBestProduct={(list) =>
              setBestProductOfPeriod(list?.[0]?.product ?? "—")
            }
          />

          <TrendingProductsByTime
            storeIds={stores}
            channelIds={channelIds}
            dateRange={dateRange}
            onBestProductToday={(prod) => setBestProductToday(prod)}
          />

          <NotSellingProducts storeIds={stores} channelIds={channelIds} dateRange={dateRange} />
        </div>

        {/* ✅ Insight bloco 3 */}
        <InsightBadge text={insightsBlocks.alerts} />

        <RecentOrders storeIds={stores} dateRange={dateRange} onOrdersLoaded={setOrdersFromTable} />
      </section>
    </main>
  );
}
