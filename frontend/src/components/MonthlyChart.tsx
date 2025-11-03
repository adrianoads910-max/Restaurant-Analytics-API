import { Bar } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function MonthlyChart() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    api.get("/sales/timeseries/monthly").then((res) => {
      const labels = res.data.map((x: any) => x.month);
      const revenue = res.data.map((x: any) => x.revenue);

      setChartData({
        labels,
        datasets: [
          {
            label: "Vendas (R$)",
            data: revenue,
          },
        ],
      });
    });
  }, []);

  if (!chartData) return <p>Carregando gráfico...</p>;

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
      }}
    />
  );
}
