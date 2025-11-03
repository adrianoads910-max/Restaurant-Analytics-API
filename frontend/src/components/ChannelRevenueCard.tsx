type ChannelRanking = {
  channel: string;
  revenue: number;
  percentage: number;
};

// ✅ Mapeamento de logos por canal
const channelIcons: Record<string, string> = {
  "iFood": "/ifood.svg",
  "Rappi": "/rappi_logo.svg",
  "Uber Eats": "/uber-eats.svg",
  "Presencial": "/ponto-de-venda.png",
  "App Próprio": "/smartphone.png",
  "WhatsApp": "/whatsapp.svg",
};

export default function ChannelRevenueCard({ ranking }: { ranking: ChannelRanking[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm border border-gray-100">
      <h3 className="font-semibold text-lg mb-5 text-gray-800 flex items-center gap-2">
        📊 % de Vendas por Canal
      </h3>

      <div className="flex flex-col gap-4">
        {ranking.map((item, index) => (
          <div key={item.channel} className="flex flex-col gap-1">
            
            {/* Canal + percentual */}
            <div className="flex justify-between items-center">
              
              <span className="flex items-center gap-2 font-medium text-gray-700">
                <img
                  src={channelIcons[item.channel] ?? "/default.svg"}
                  alt={item.channel}
                  className="w-6 h-6 object-contain"
                />
                <span>{item.channel}</span>
              </span>

              <span className="font-semibold text-gray-800">
                {item.percentage.toFixed(0)}%
              </span>
            </div>

            {/* Barra animada */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  background:
                    ["#3b82f6", "#0ea5e9", "#6366f1", "#22c55e", "#f97316"][index] ?? "#3b82f6",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
