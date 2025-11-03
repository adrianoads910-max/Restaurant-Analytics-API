import React from "react";

interface ChartCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variation?: number; // % positivo ou negativo
}

export default function ChartCard({ title, value, icon, variation }: ChartCardProps) {
  const positive = variation !== undefined && variation >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-all">
      
      {/* Ícone topo */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 text-gray-700 text-2xl">
        {icon}
      </div>

      {/* Título */}
      <span className="text-gray-500 text-sm">{title}</span>

      {/* Valor principal */}
      <h2 className="text-3xl font-bold tracking-tight">{value}</h2>

      {/* Badge de variação */}
      {variation !== undefined && (
        <div
          className={`w-fit px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
            positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <span>{positive ? "▲" : "▼"}</span>
          {Math.abs(variation).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
