import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

type Ticket = {
  store: string;
  channel: string;
  ticket: number;
};

interface AvgTicketCardProps {
  storeIds: number[];
  channelIds: number[];
  dateRange: [Date, Date] | null;
}

// ✅ Mapeamento de logos por canal (arquivos na pasta /public)
const channelIcons: Record<string, string> = {
  "ifood": "/ifood.svg",
  "uber eats": "/uber-eats.svg",
  "rappi": "/rappi_logo.svg",
  "presencial": "/ponto-de-venda.png",
  "app próprio": "/smartphone.png",
  "whatsapp": "/whatsapp.svg",
  "99food": "/99food.svg",
};

const getChannelIcon = (name: string) => {
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

export default function AvgTicketCard({
  storeIds,
  channelIds,
  dateRange,
}: AvgTicketCardProps) {
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState<number>(0);

  const queryParams = useMemo(() => {
    if (!dateRange) return null;

    const [start, end] = dateRange;

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      ...(storeIds.length > 0 && { store_id: storeIds }),
      ...(channelIds.length > 0 && { channel_id: channelIds }),
    };
  }, [storeIds, channelIds, dateRange]);

  useEffect(() => {
    if (!queryParams) return;

    setLoading(true);

    api
      .get("/sales/ticket", {
        params: queryParams,
        paramsSerializer: (params) =>
          new URLSearchParams(
            Object.entries(params).flatMap(([k, v]) =>
              Array.isArray(v) ? v.map((i) => [k, String(i)]) : [[k, String(v)]]
            )
          ).toString(),
      })
      .then((res) => {
        setData(res.data);

        const totalAvg =
          res.data.reduce((acc: number, cur: Ticket) => acc + cur.ticket, 0) /
          (res.data.length || 1);

        setAverage(totalAvg);
      })
      .finally(() => setLoading(false));
  }, [queryParams]);

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <h3 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
        💰 Ticket Médio
      </h3>

      <div className="w-32 mx-auto mb-3">
        <CircularProgressbar
          value={average}
          maxValue={100}
          text={`R$ ${average.toFixed(2)}`}   
          styles={buildStyles({
            textColor: "#000",
            pathColor: "#007bff",
            trailColor: "#d6d6d6",
            textSize: "14px",
          })}
        />
      </div>

      <p className="text-center text-xs text-gray-500 mb-4">
        Ticket médio total considerando filtros aplicados
      </p>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}

      {!loading && data.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum dado encontrado</p>
      )}

      <div className="space-y-3 mt-4">
        {data.map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 border-b hover:bg-gray-50 rounded-md px-1 transition"
          >
            <div className="flex items-center gap-3">
              {getChannelIcon(item.channel)}

              <div>
                <p className="font-medium">{item.store}</p>
                <span className="text-xs text-gray-500">{item.channel}</span>
              </div>
            </div>

            <span className="font-semibold text-blue-600">
              R$ {item.ticket.toFixed(2)}  {/* ✅ DUAS CASAS */}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
