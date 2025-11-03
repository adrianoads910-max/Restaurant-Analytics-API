import type { ReactNode } from "react";


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-6 hidden md:block">
        <h1 className="text-2xl font-bold text-indigo-600">Analytics</h1>

        <nav className="mt-8 space-y-4 text-gray-600">
          <a href="/" className="flex items-center gap-2 hover:text-indigo-600">
            📊 Dashboard
          </a>
          <a href="/margin" className="flex items-center gap-2 hover:text-indigo-600">
            💰 Margem por Produto
          </a>
        </nav>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
