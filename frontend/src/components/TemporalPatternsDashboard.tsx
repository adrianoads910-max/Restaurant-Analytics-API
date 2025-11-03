// ✅ src/components/TemporalPatternsDashboard.tsx

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
} from "recharts";

type Props = {
  intraday: Array<{ label: string; value: number }>;
  weekly: Array<{ label: string; value: number }>;
  monthly: Array<{ label: string; current: number; previous: number; variation: number }>;
};

const colorForWeekly = (v: number) => {
  if (v >= 30) return "#16a34a";
  if (v >= 5) return "#60a5fa";
  if (v >= 0) return "#facc15";
  return "#ef4444";
};

export default function TemporalPatternsDashboard({ intraday, weekly, monthly }: Props) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

      {/* ========= INTRA-DIA ========= */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-800 font-semibold text-sm">Padrões Intra-dia</h3>
        <p className="text-xs text-gray-500 mb-2">Distribuição por hora</p>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={intraday}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========= SEMANAL ========= */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-800 font-semibold text-sm">Padrões Semanais</h3>
        <p className="text-xs text-gray-500 mb-2">Variação vs média</p>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              fillOpacity={1}
              stroke="#fff"
              strokeWidth={1}
              shape={(props: any) => {
                const { x, y, width, height, value } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    ry={6}
                    fill={colorForWeekly(value)}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ========= MENSAL ========= */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-gray-800 font-semibold text-sm">Padrões Mensais</h3>
        <p className="text-xs text-gray-500 mb-2">Comparação com período anterior</p>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(val: any, key) =>
                key === "variation" ? `${val}%` : val.toLocaleString("pt-BR")
              }
            />

            <Bar
              dataKey="current"
              name="Atual"
              fill="#34d399"
              radius={[6, 6, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="Anterior"
              stroke="#6b7280"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="variation"
              name="%"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              yAxisId={1}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}