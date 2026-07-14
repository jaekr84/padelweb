// Styleguide interno "Match Night" — referencia viva de tokens y utilidades
// para la estética deportiva. Solo para desarrollo: /dev/design

const palette = [
  { name: "carbon-950", cls: "bg-carbon-950", hex: "#05080f" },
  { name: "carbon-900", cls: "bg-carbon-900", hex: "#0a0f1e" },
  { name: "carbon-800", cls: "bg-carbon-800", hex: "#111a2e" },
  { name: "carbon-700", cls: "bg-carbon-700", hex: "#1a2540" },
  { name: "carbon-600", cls: "bg-carbon-600", hex: "#253352" },
  { name: "volt", cls: "bg-volt", hex: "#d4ff3f" },
  { name: "volt-dark", cls: "bg-volt-dark", hex: "#a9d61c" },
  { name: "live", cls: "bg-live", hex: "#ff3b4e" },
  { name: "gold", cls: "bg-gold", hex: "#ffc53d" },
  { name: "silver", cls: "bg-silver", hex: "#c9d4e4" },
  { name: "bronze", cls: "bg-bronze", hex: "#e8925a" },
  { name: "azul-primary", cls: "bg-azul-primary", hex: "#1e40af" },
  { name: "celeste", cls: "bg-celeste", hex: "#0ea5e9" },
  { name: "rojo", cls: "bg-rojo", hex: "#ef4444" },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-grid-carbon text-white p-6 md:p-12 space-y-12">
      <header>
        <p className="label-tech text-[10px] text-celeste-light mb-2">Design System · Interno</p>
        <h1 className="heading-sport text-5xl md:text-7xl">
          Match <span className="text-volt">Night</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400 max-w-xl">
          Tokens y utilidades base para la estética deportiva de A.C.A.P. Todo lo que se ve acá
          está disponible globalmente vía Tailwind y clases de globals.css.
        </p>
      </header>

      {/* Paleta */}
      <section>
        <h2 className="label-tech text-xs text-slate-400 mb-4">01 · Paleta</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {palette.map((c) => (
            <div key={c.name} className="rounded-xl overflow-hidden border border-white/10">
              <div className={`${c.cls} h-16`} />
              <div className="bg-carbon-800 px-3 py-2">
                <p className="text-[11px] font-bold">{c.name}</p>
                <p className="text-scoreboard text-[10px] text-slate-400">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tipografía */}
      <section className="space-y-6">
        <h2 className="label-tech text-xs text-slate-400 mb-4">02 · Tipografía</h2>
        <div className="space-y-2">
          <p className="label-tech text-[10px] text-slate-500">heading-sport (Russo One)</p>
          <p className="heading-sport text-6xl">
            Ranking <span className="text-celeste">General</span>
          </p>
        </div>
        <div className="space-y-2">
          <p className="label-tech text-[10px] text-slate-500">text-scoreboard (Chakra Petch, tabular)</p>
          <div className="flex items-end gap-8">
            <span className="text-scoreboard text-6xl text-volt">6-4</span>
            <span className="text-scoreboard text-6xl">7-5</span>
            <span className="text-scoreboard text-4xl text-slate-500">4900 pts</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="label-tech text-[10px] text-slate-500">label-tech</p>
          <p className="label-tech text-sm text-celeste-light">Fase de grupos · Cancha 3</p>
        </div>
      </section>

      {/* Badges y estados */}
      <section>
        <h2 className="label-tech text-xs text-slate-400 mb-4">03 · Badges y estados</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 bg-live/15 border border-live/40 text-live px-4 py-1.5 rounded-lg">
            <span className="live-dot" />
            <span className="label-tech text-[11px]">En vivo</span>
          </span>
          <span className="badge-slant inline-block bg-volt text-carbon-950 px-4 py-1.5">
            <span className="unskew label-tech text-[11px] inline-block">Racha ×4</span>
          </span>
          <span className="badge-slant inline-block bg-rojo text-white px-4 py-1.5">
            <span className="unskew label-tech text-[11px] inline-block">Final</span>
          </span>
          <span className="inline-flex items-center gap-2 bg-carbon-700 border border-white/10 text-slate-300 px-4 py-1.5 rounded-lg">
            <span className="label-tech text-[11px]">Inscripción</span>
          </span>
        </div>
      </section>

      {/* Cortes y texturas */}
      <section>
        <h2 className="label-tech text-xs text-slate-400 mb-4">04 · Cortes y texturas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="clip-notch bg-carbon-800 border border-white/10 p-6">
            <p className="label-tech text-[10px] text-celeste-light mb-1">clip-notch</p>
            <p className="heading-sport text-2xl">Grupo A</p>
            <p className="text-scoreboard text-sm text-slate-400 mt-2">3 jugadores · 0/3 partidos</p>
          </div>
          <div className="clip-corner-tl bg-gradient-to-br from-rojo to-rojo-dark p-6">
            <p className="label-tech text-[10px] text-white/70 mb-1">clip-corner-tl</p>
            <p className="heading-sport text-2xl">Americano</p>
            <p className="text-scoreboard text-sm text-white/70 mt-2">16 cupos · Libre</p>
          </div>
          <div className="relative clip-corner-br bg-carbon-800 border border-white/10 p-6 overflow-hidden">
            <div className="absolute inset-0 bg-stripes text-volt opacity-[0.07]" />
            <p className="label-tech text-[10px] text-volt mb-1 relative">bg-stripes</p>
            <p className="heading-sport text-2xl relative">Round Robin</p>
            <p className="text-scoreboard text-sm text-slate-400 mt-2 relative">Mixto · Parejas</p>
          </div>
        </div>
      </section>

      {/* Botones */}
      <section>
        <h2 className="label-tech text-xs text-slate-400 mb-4">05 · Botones</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button className="clip-notch cursor-pointer bg-rojo hover:bg-rojo-dark transition-colors duration-200 px-8 py-3 label-tech text-xs text-white">
            Comenzar siguiente
          </button>
          <button className="clip-notch cursor-pointer bg-volt hover:bg-volt-dark transition-colors duration-200 px-8 py-3 label-tech text-xs text-carbon-950">
            Unirse a cancha
          </button>
          <button className="cursor-pointer rounded-xl border border-celeste/40 text-celeste-light hover:bg-celeste/10 transition-colors duration-200 px-8 py-3 label-tech text-xs">
            Ver todos
          </button>
        </div>
      </section>

      {/* Marcador de ejemplo */}
      <section>
        <h2 className="label-tech text-xs text-slate-400 mb-4">06 · Marcador</h2>
        <div className="clip-notch bg-carbon-800 border border-white/10 max-w-md">
          <div className="flex items-center justify-between px-5 py-2 border-b border-white/10">
            <span className="label-tech text-[10px] text-slate-400">Cuartos · Cancha 2</span>
            <span className="inline-flex items-center gap-1.5 text-live label-tech text-[10px]">
              <span className="live-dot" /> En vivo
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Chongma / Michelle</span>
              <span className="text-scoreboard text-2xl text-volt">6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">Hernán / Federico</span>
              <span className="text-scoreboard text-2xl text-slate-500">3</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
