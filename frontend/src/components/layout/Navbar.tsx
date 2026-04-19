"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const marketingLinks = [
    { href: "/#soluciones", label: "Soluciones" },
    { href: "/#seguridad", label: "Seguridad" },
    { href: "/#precios", label: "Precios" },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="type-brand text-primary transition-transform active:scale-[0.98]"
            onClick={() => setMenuOpen(false)}
          >
            Cognitive Architect
          </Link>

          <div className="hidden items-center rounded-full border border-outline-variant/20 bg-surface-container-low px-4 py-2 transition-colors focus-within:border-outline md:flex">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              className="w-48 border-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                href="/documents"
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  pathname.startsWith("/documents")
                    ? "bg-primary-fixed text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                }`}
              >
                Extraccion
              </Link>
              <Link
                href="/documents"
                className="rounded-md bg-gradient-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[0_10px_20px_rgba(0,25,60,0.16)] transition-all hover:opacity-95"
              >
                Abrir Workspace
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-gradient-to-br from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[0_10px_20px_rgba(0,25,60,0.16)] transition-all hover:opacity-95"
              >
                Comenzar
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-low text-primary md:hidden"
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined text-[20px]">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-outline-variant/20 bg-surface-container-lowest/95 px-4 py-4 md:hidden">
          <div className="space-y-2">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/documents"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-md border border-outline-variant/25 px-4 py-2 text-center text-sm font-semibold text-primary"
                >
                  Extraccion
                </Link>
                <Link
                  href="/documents"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-on-primary"
                >
                  Workspace
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-md border border-outline-variant/25 px-4 py-2 text-center text-sm font-semibold text-primary"
                >
                  Iniciar Sesion
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-on-primary"
                >
                  Comenzar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
