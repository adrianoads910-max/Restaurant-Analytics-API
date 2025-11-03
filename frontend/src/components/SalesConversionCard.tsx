import { useMemo } from "react";

type Order = {
  status: string;
  amount: number;
};

export default function SalesConversionCard({ orders }: { orders: Order[] }) {
  const { completed, canceled, total, percentage } = useMemo(() => {
    const completedStatuses = ["completed", "delivered"];
    const canceledStatuses = ["canceled", "cancelled"];

    const completed = orders.filter((o) =>
      completedStatuses.includes(o.status.toLowerCase())
    ).length;

    const canceled = orders.filter((o) =>
      canceledStatuses.includes(o.status.toLowerCase())
    ).length;

    const total = completed + canceled;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      completed,
      canceled,
      total,
      percentage: Number(percentage.toFixed(1)),
    };
  }, [orders]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        💠 Taxa de Conversão
      </h3>
      <p className="text-sm text-gray-500">Pedidos concluídos vs cancelados</p>

      {/* Gráfico circular estilizado */}
      <div className="flex justify-center py-2">
        <div className="relative h-44 w-44"> {/* ⬆ Aumentei o tamanho */}
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="14"
              fill="transparent"
            />
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke="url(#grad)"
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={`${percentage * 4.4} 999`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>

          <span className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-gray-900">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Informações abaixo */}
      <div className="text-center">
        <p className="text-sm text-gray-700 font-medium">
          {completed}/{total} pedidos concluídos
        </p>
        <p className="text-xs text-gray-400">{canceled} cancelados</p>
      </div>

      {/* Resumo numerado */}
      <div className="grid grid-cols-3 mt-4 text-center text-sm">
        <div>
          <span className="text-gray-500">Total</span>
          <p className="font-semibold">{total}</p>
        </div>
        <div>
          <span className="text-gray-500">Concluídos</span>
          <p className="font-semibold text-green-600">{completed}</p>
        </div>
        <div>
          <span className="text-gray-500">Cancelados</span>
          <p className="font-semibold text-red-600">{canceled}</p>
        </div>
      </div>
    </div>
  );
}
