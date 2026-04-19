import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-outline-variant/20 bg-surface-container-low py-12">
      <div className="page-shell grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <span className="type-h3 text-primary">
            Cognitive Architect
          </span>
          <p className="type-body max-w-xl text-on-surface-variant">
            Plataforma de inteligencia documental para extraccion, validacion y
            consulta semantica de datos criticos en tiempo real.
          </p>
          <p className="text-xs uppercase tracking-[0.14em] text-primary/70">
            © 2026 Cognitive Architect. Precision documental empresarial.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:justify-items-end">
          <Link
            href="#"
            className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/80 transition-colors hover:text-primary"
          >
            Privacidad
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/80 transition-colors hover:text-primary"
          >
            Terminos
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/80 transition-colors hover:text-primary"
          >
            API Docs
          </Link>
          <Link
            href="#"
            className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/80 transition-colors hover:text-primary"
          >
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
