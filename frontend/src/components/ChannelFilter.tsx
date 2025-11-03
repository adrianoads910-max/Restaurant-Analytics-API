import { useState } from "react";
import { Check } from "lucide-react";

type Channel = {
  id: number;
  name: string;
  icon: string; // ✅ agora é um path de imagem
};

// ✅ Mapeamento de logos (os arquivos devem estar em /public)
const channels: Channel[] = [
  { id: 1, name: "Presencial", icon: "/ponto-de-venda.png" },
  { id: 2, name: "iFood", icon: "/ifood.svg" },
  { id: 3, name: "Rappi", icon: "/rappi_logo.svg" },
  { id: 4, name: "Uber Eats", icon: "/uber-eats.svg" },
  { id: 5, name: "WhatsApp", icon: "/whatsapp.svg" },
  { id: 6, name: "App Próprio", icon: "/smartphone.png" },
];

export default function ChannelFilter({
  onChange,
}: {
  onChange: (selectedIds: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  function toggleChannel(id: number) {
    const updated = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];

    setSelected(updated);
    onChange(updated);
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-2">Canais</h3>

      <div className="flex flex-col gap-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => toggleChannel(channel.id)}
            className={`
              flex w-full items-center justify-between p-2 rounded-lg border text-left transition-all
              ${selected.includes(channel.id)
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"}
            `}
          >
            <div className="flex items-center gap-3">
              {/* ✅ Ícone agora é imagem */}
              <img
                src={channel.icon}
                alt={channel.name}
                className="w-6 h-6 object-contain"
              />
              <span className="text-sm">{channel.name}</span>
            </div>

            {selected.includes(channel.id) && (
              <Check size={18} className="text-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
