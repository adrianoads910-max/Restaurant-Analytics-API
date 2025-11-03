// components/InsightBadge.tsx
import React from "react";
import { marked } from "marked";

interface InsightBadgeProps {
  text?: string;
}

export default function InsightBadge({ text }: InsightBadgeProps) {
  if (!text) return null;

  const blocks = text.split("##").slice(1); // quebra pelos headers markdown

  const parseBlock = (block: string) => {
    const [title, ...contentLines] = block.split("\n");
    const content = contentLines.join("\n");

    return {
      title: title.trim(),
      content: marked.parse(content.trim()),
    };
  };

  const parsedBlocks = blocks.map(parseBlock);

  // ✅ detecta tema pelo título
  const getStyle = (title: string) => {
    const t = title.toLowerCase();

    if (t.includes("alerta") || t.includes("risco")) {
      return "border-red-500/40 bg-red-50 text-red-700";
    }

    if (t.includes("performance") || t.includes("ticket") || t.includes("receita")) {
      return "border-yellow-500/40 bg-yellow-50 text-yellow-800";
    }

    if (t.includes("destaque") || t.includes("produto") || t.includes("top")) {
      return "border-green-500/40 bg-green-50 text-green-800";
    }

    return "border-gray-300 bg-white text-gray-800";
  };

  return (
    <div className="grid grid-cols-1 gap-4 mt-4">

      {parsedBlocks.map(({ title, content }, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl border shadow-sm transition transform hover:scale-[1.01] duration-200 ${getStyle(title)}`}
        >
          <h3 className="font-bold text-lg mb-2">{title}</h3>

          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      ))}

    </div>
  );
}
