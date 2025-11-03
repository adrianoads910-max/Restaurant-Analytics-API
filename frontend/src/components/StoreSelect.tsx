import { useState, useEffect } from "react";
import { api } from "../services/api";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";

type Store = {
  id: number;
  name: string;
};

// ✅ Ícones por loja (personalize como quiser)
const storeIcons: Record<string, string> = {
  "Loja Centro": "🏪",
  "Loja Shopping": "🛍️",
  "Loja Delivery": "🍔",
  "Loja Express": "⚡",
};

export default function StoreSelect({
  onChange,
}: {
  onChange: (storeIds: number[]) => void;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    api.get<Store[]>("/metadata/stores").then((res) => setStores(res.data));
  }, []);

  const handleChange = (event: any) => {
    const ids = event.target.value as number[];
    setSelected(ids);
    onChange(ids);
  };

  return (
    <div className="flex flex-col gap-2 mt-6">
      <FormControl fullWidth size="small">
        <InputLabel sx={{ color: "#cbd5e1" }}>Selecionar Restaurantes</InputLabel>

        <Select<number[]>
          multiple
          value={selected}
          onChange={handleChange}
          label="Selecionar Restaurantes"
          displayEmpty
          sx={{
            color: "white",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "10px",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.15)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.25)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4f46e5",
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: "#1f2937",
                color: "white",
              },
            },
          }}
          renderValue={(selectedIds) => {
            const selectedStores = stores.filter((s) =>
              (selectedIds as number[]).includes(s.id)
            );

            return selectedStores
              .map((s) => `${storeIcons[s.name] ?? "🏢"} ${s.name}`)
              .join(", ");
          }}
        >
          {stores.map((store) => (
            <MenuItem key={store.id} value={store.id}>
              <Checkbox checked={selected.includes(store.id)} />
              <span className="mr-2 text-xl">
                {storeIcons[store.name] ?? "🏢"}
              </span>
              <ListItemText primary={store.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
