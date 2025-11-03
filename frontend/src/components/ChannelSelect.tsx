import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Check } from "lucide-react";

interface Channel {
  id: number;
  name: string;
}

// ✅ Mapeamento de logos (arquivos dentro de /public)
const channelIcons: Record<string, string> = {
  presencial: "/ponto-de-venda.png",
  ifood: "/ifood.svg",
  rappi: "/rappi_logo.svg",
  "uber eats": "/uber-eats.svg",
  whatsapp: "/whatsapp.svg",
  "app próprio": "/smartphone.png",
};

// ✅ Agora retorna img em vez de emoji
const getIcon = (name: string) => {
  const key = name.toLowerCase();
  const icon = channelIcons[key];

  if (!icon) return null;

  return (
    <img
      src={icon}
      alt={name}
      className="w-5 h-5 object-contain"
    />
  );
};

export default function ChannelSelect({
  onChange,
}: {
  onChange: (ids: number[]) => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    api.get("/metadata/channels").then((res) => {
      setChannels(res.data);
    });
  }, []);

  const toggle = (id: number) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];

    setSelected(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3 p-2">

      <div className="flex flex-col gap-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => toggle(channel.id)}
            className={`
              flex items-center justify-between w-full px-3 py-2 rounded-lg border shadow-sm transition
              ${
                selected.includes(channel.id)
                  ? "bg-blue-600 !text-white border-blue-600"
                  : "bg-white !text-gray-700 border-gray-300 hover:bg-gray-100"
              }
            `}
          >
            <div className="flex items-center gap-3">
              {getIcon(channel.name)}
              <span className="text-sm">{channel.name}</span>
            </div>

            {selected.includes(channel.id) && <Check size={18} />}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <button
          className="text-xs !text-red-500 font-medium underline self-end"
          onClick={() => {
            setSelected([]);
            onChange([]);
          }}
        >
          Limpar seleção
        </button>
      )}
    </div>
  );
}
