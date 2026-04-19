"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Sidebar() {
  const pathname = usePathname();
  const { userEmail, logout } = useAuth();

  const navItems = [
    { href: "/documents", label: "Extraccion", icon: "folder_open" },
    { href: "/chat", label: "Consultas IA", icon: "forum", disabled: true, badge: "Fase 2" },
  ];

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low lg:flex">
        <div className="mx-6 mt-6 border-b border-outline-variant/20 pb-4">
          <div className="min-w-0">
            <div className="min-w-0">
              <h2 className="type-h3 truncate leading-tight text-primary">Cognitive Architect</h2>
              <p className="pill-label mt-0.5 text-on-surface-variant">Enterprise Workspace</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 pt-5">
          <Link
            href="/documents"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo Documento
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-2">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant/70"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.label}
                  </div>
                  {item.badge && (
                    <span className="rounded-full border border-outline-variant/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-[0_10px_24px_rgba(0,25,60,0.08)]"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${isActive ? "fill" : ""}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/20 px-4 py-4">
          {userEmail && (
            <div className="mb-3 rounded-xl bg-surface-container p-3">
              <p className="pill-label text-on-surface-variant">
                Conectado como
              </p>
              <p className="mt-1 truncate text-sm font-medium text-primary">{userEmail}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant transition-all hover:bg-error-container/55 hover:text-error"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/20 bg-surface-container-lowest/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium text-on-surface-variant/70"
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium ${
                  isActive
                    ? "bg-primary-fixed text-primary"
                    : "text-on-surface-variant"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? "fill" : ""}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Salir
          </button>
        </div>
      </nav>
    </>
  );
}
