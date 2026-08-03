#!/usr/bin/env node
/**
 * Migra las utilidades de Tailwind hardcodeadas en oscuro a los tokens
 * semánticos de globals.css, para que el markup sirva en claro y en oscuro.
 *
 *   node scripts/theme-codemod.mjs --dry            # sólo reporta
 *   node scripts/theme-codemod.mjs                  # aplica
 *   node scripts/theme-codemod.mjs src/app/x.tsx    # limita a esos archivos
 *
 * Sólo toca literales de string (los `className`), nunca el resto del código.
 * `text-white` se preserva cuando el literal que lo contiene también pinta un
 * fondo de acento (volt, azul, un gradiente, o un `bg-${...}` dinámico): ahí el
 * blanco es color sobre el acento, no el color de texto del tema.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Superficies que quedan oscuras en los dos temas y no se migran: la landing
 * (pieza de marketing) y Match Night (fixture, americano, playoffs, cancha en
 * vivo, resultados). A esto se suman en tiempo de ejecución todos los archivos
 * que declaran `theme-night`, y los que se renderizan dentro de uno.
 */
const ALWAYS_DARK = [
    "src/app/LandingPage.tsx",
    "src/app/(main)/tournaments/fixture/",   // componentes montados dentro de un manager
    "src/app/(main)/tournaments/[id]/",      // páginas envueltas en theme-night
    "src/app/(main)/tournaments/PublicTournamentCard.tsx", // póster oscuro a propósito
    "src/app/(main)/admin/cancha-abierta/[id]/",
    "src/app/(main)/cancha-abierta/[id]/",
    "src/app/(main)/admin/reset/",
    "src/app/dev/",
    "src/app/loading-preview/",
];

/**
 * Reemplazos. El orden importa: las variantes con `/opacidad` van antes que el
 * token pelado, o `bg-white/10` se convierte en `bg-surface/10`.
 */
const RULES = [
    // --- Fondos de la escala carbón (la variante /opacidad va primero) ---
    [/\bbg-carbon-950\/(\d+)\b/g, "bg-background/$1"],
    [/\bbg-carbon-900\/(\d+)\b/g, "bg-background/$1"],
    [/\bbg-carbon-800\/(\d+)\b/g, "bg-card/$1"],
    [/\bbg-carbon-700\/(\d+)\b/g, "bg-muted/$1"],
    [/\bbg-carbon-950\b(?!\/)/g, "bg-background"],
    [/\bbg-carbon-900\b(?!\/)/g, "bg-background"],
    [/\bbg-carbon-800\b(?!\/)/g, "bg-card"],
    [/\bbg-carbon-700\b(?!\/)/g, "bg-muted"],
    [/\bhover:bg-carbon-800\b(?!\/)/g, "hover:bg-card"],
    [/\bhover:bg-carbon-700\b(?!\/)/g, "hover:bg-muted"],
    [/\bhover:bg-carbon-600\b(?!\/)/g, "hover:bg-muted"],

    // --- Superficies translúcidas (incluye la sintaxis arbitraria /[0.03]) ---
    [/\bbg-white\/\[0?\.0(?:[1-5])\]/g, "bg-surface"],
    [/\bbg-white\/\[0?\.(?:0[6-9]|1\d?)\]/g, "bg-surface-raised"],
    [/\bbg-white\/(?:3|4|5|6|8)\b/g, "bg-surface"],
    [/\bbg-white\/(?:10|12|15|20|25)\b/g, "bg-surface-raised"],
    [/\bhover:bg-white\/(?:3|4|5|6|8)\b/g, "hover:bg-surface"],
    [/\bhover:bg-white\/(?:10|12|15|20|25|30|40)\b/g, "hover:bg-surface-raised"],
    [/\bgroup-hover:bg-white\/(?:10|12|15|20|25|30)\b/g, "group-hover:bg-surface-raised"],

    // --- Hairlines ---
    [/\bborder-white\/(?:5|8|10|12|15)\b/g, "border-hairline"],
    [/\bborder-white\/(?:20|25|30|40)\b/g, "border-hairline-strong"],
    [/\bhover:border-white\/(?:5|8|10|12|15)\b/g, "hover:border-hairline"],
    [/\bhover:border-white\/(?:20|25|30|40)\b/g, "hover:border-hairline-strong"],
    [/\bgroup-hover:border-white\/\d+\b/g, "group-hover:border-hairline-strong"],
    [/\bdivide-white\/(?:5|8|10|12|15)\b/g, "divide-hairline"],
    [/\bring-white\/(?:5|8|10|12|15)\b/g, "ring-hairline"],
    [/\bring-white\/(?:20|25|30|40)\b/g, "ring-hairline-strong"],

    // --- Texto secundario ---
    [/\btext-slate-(?:200|300|400)\/(\d+)\b/g, "text-muted-foreground/$1"],
    [/\btext-slate-(?:500|600)\/(\d+)\b/g, "text-subtle/$1"],
    [/\btext-slate-(?:200|300|400)\b(?!\/)/g, "text-muted-foreground"],
    [/\btext-slate-(?:500|600)\b(?!\/)/g, "text-subtle"],
    [/\bhover:text-slate-(?:200|300|400)\b(?!\/)/g, "hover:text-muted-foreground"],
    [/\bgroup-hover:text-slate-(?:200|300|400)\b(?!\/)/g, "group-hover:text-muted-foreground"],
    [/\bplaceholder:text-slate-(?:400|500|600)\b/g, "placeholder:text-subtle"],
    [/\bplaceholder-slate-(?:400|500|600)\b/g, "placeholder:text-subtle"],

    /* --- Pantallas que nunca se pasaron a oscuro (detalle de partido, prompt
       de notificaciones, Select): hoy están rotas en dark. Tematizarlas las
       arregla en los dos temas. --- */
    [/\bbg-slate-950\/(\d+)\b/g, "bg-background/$1"],
    [/\bbg-slate-900\/(\d+)\b/g, "bg-background/$1"],
    [/\bbg-slate-950\b(?!\/)/g, "bg-background"],
    [/\bbg-slate-900\b(?!\/)/g, "bg-background"],
    [/\bbg-slate-800\b(?!\/)/g, "bg-card"],
    [/\bborder-slate-(?:700|800|900)\b(?!\/)/g, "border-hairline"],
    [/\bbg-slate-(?:50|100)\b(?!\/)/g, "bg-muted"],
    [/\bhover:bg-slate-(?:50|100|200)\b(?!\/)/g, "hover:bg-muted"],
    [/\bbg-slate-200\b(?!\/)/g, "bg-muted"],
    [/\bborder-slate-(?:50|100|200)\b(?!\/)/g, "border-border"],
    [/\bborder-slate-200\/(\d+)\b/g, "border-border/$1"],
    [/\btext-slate-(?:700|800)\b(?!\/)/g, "text-muted-foreground"],
    [/\bhover:text-slate-(?:700|800|900)\b(?!\/)/g, "hover:text-foreground"],
];

/**
 * Colores de texto que sólo se convierten si el literal NO pinta un fondo de
 * acento. Sobre `bg-volt` o `bg-azul-primary` el blanco (o el carbón) es color
 * *sobre el acento*, fijo en ambos temas; tematizarlo lo volvería ilegible.
 * `text-carbon-950` fuera de un acento es el botón invertido: fondo claro con
 * texto oscuro en dark, y al revés en light.
 */
const ON_SURFACE_TEXT_RULES = [
    // El prefijo de variante se captura en $1 en vez de listar cada `hover:`:
    // la guarda necesita ver el prefijo del match completo, y una regla sin
    // prefijo volvería a matchear dentro de `hover:text-white` salteándola.
    [/((?:[a-z-]+:)*)text-white\/(\d+)\b/g, "$1text-foreground/$2"],
    [/((?:[a-z-]+:)*)text-white\b(?!\/)/g, "$1text-foreground"],
    // Texto casi blanco (diseño oscuro) y texto casi negro (diseño claro):
    // los dos extremos son el color de texto principal de su tema.
    [/((?:[a-z-]+:)*)text-slate-(?:50|100)\b(?!\/)/g, "$1text-foreground"],
    [/((?:[a-z-]+:)*)text-slate-(?:900|950)\b(?!\/)/g, "$1text-foreground"],
    [/((?:[a-z-]+:)*)border-white\b(?!\/)/g, "$1border-hairline-strong"],
];

/**
 * `bg-white` sólido entra acá a propósito: es el botón invertido del diseño
 * oscuro y necesita revisión a mano, no una conversión automática.
 */
const ACCENT_BG =
    /(?:^|[\s"'`{(])((?:[a-z-]+:)*)(?:bg|from|via|to)-(?:\$\{|gradient-|white\b(?!\/)|volt|azul|celeste|rojo|rosa|live|gold|silver|bronze|emerald|green|blue|red|amber|orange|purple|indigo|sky|cyan|pink|violet|teal|yellow|fuchsia|lime|rose)/g;

/**
 * Prefijos de variante bajo los que el literal pinta un fondo de acento.
 * `bg-volt` devuelve "" (el fondo base es el acento, así que todo el texto del
 * elemento va sobre él); `hover:bg-volt` devuelve "hover:" — sólo el texto con
 * ese mismo prefijo va sobre el acento, el color base sigue siendo del tema.
 */
function accentPrefixes(context) {
    const found = new Set();
    ACCENT_BG.lastIndex = 0;
    let m;
    while ((m = ACCENT_BG.exec(context)) !== null) found.add(m[1]);
    return found;
}

/** Prefijo de variante de una clase: `group-hover:text-white` → `group-hover:`. */
const variantPrefix = (cls) => (cls.match(/^(?:[a-z-]+:)*/) || [""])[0];

/**
 * Recorre los literales de string del archivo y aplica `fn` al texto de cada
 * uno. Para los template literals, el texto entre `${...}` se procesa por
 * separado pero recibe el literal entero como contexto, para poder ver un
 * `bg-${...}` dinámico que quede en otro tramo.
 */
function mapStringLiterals(src, fn) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        const ch = src[i];

        // Comentarios: se copian tal cual, no son código con clases.
        if (ch === "/" && src[i + 1] === "/") {
            const end = src.indexOf("\n", i);
            const stop = end === -1 ? src.length : end;
            out += src.slice(i, stop);
            i = stop;
            continue;
        }
        if (ch === "/" && src[i + 1] === "*") {
            const end = src.indexOf("*/", i);
            const stop = end === -1 ? src.length : end + 2;
            out += src.slice(i, stop);
            i = stop;
            continue;
        }

        if (ch === '"' || ch === "'") {
            const { raw, end } = readQuoted(src, i, ch);
            const body = raw.slice(1, -1);
            out += ch + fn(body, body) + ch;
            i = end;
            continue;
        }

        if (ch === "`") {
            const { raw, end } = readTemplate(src, i);
            out += rewriteTemplate(raw, fn);
            i = end;
            continue;
        }

        out += ch;
        i++;
    }
    return out;
}

function readQuoted(src, start, quote) {
    let i = start + 1;
    while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        if (src[i] === "\n") break; // string sin cerrar: cortar acá
        i++;
    }
    return { raw: src.slice(start, i), end: i };
}

/** Lee un template literal completo, balanceando los `${ ... }` anidados. */
function readTemplate(src, start) {
    let i = start + 1;
    while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "`") { i++; break; }
        if (src[i] === "$" && src[i + 1] === "{") {
            i += 2;
            let depth = 1;
            while (i < src.length && depth > 0) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === "`") { i = readTemplate(src, i).end; continue; }
                if (src[i] === '"' || src[i] === "'") { i = readQuoted(src, i, src[i]).end; continue; }
                if (src[i] === "{") depth++;
                if (src[i] === "}") depth--;
                i++;
            }
            continue;
        }
        i++;
    }
    return { raw: src.slice(start, i), end: i };
}

/**
 * Reescribe un template literal: los tramos de texto pasan por `fn`, y las
 * expresiones `${...}` se recorren de nuevo (pueden contener más literales,
 * típicamente las dos ramas de un ternario).
 */
function rewriteTemplate(raw, fn) {
    const context = raw;
    let out = "`";
    let i = 1;
    let span = "";
    while (i < raw.length - 1) {
        if (raw[i] === "\\") { span += raw.slice(i, i + 2); i += 2; continue; }
        if (raw[i] === "$" && raw[i + 1] === "{") {
            out += fn(span, context);
            span = "";
            let depth = 1, j = i + 2;
            while (j < raw.length && depth > 0) {
                if (raw[j] === "\\") { j += 2; continue; }
                if (raw[j] === "`") { j = readTemplate(raw, j).end; continue; }
                if (raw[j] === '"' || raw[j] === "'") { j = readQuoted(raw, j, raw[j]).end; continue; }
                if (raw[j] === "{") depth++;
                if (raw[j] === "}") depth--;
                j++;
            }
            out += "${" + mapStringLiterals(raw.slice(i + 2, j - 1), fn) + "}";
            i = j;
            continue;
        }
        span += raw[i];
        i++;
    }
    out += fn(span, context) + "`";
    return out;
}

function transform(src) {
    const stats = new Map();
    const bump = (k, n) => stats.set(k, (stats.get(k) || 0) + n);

    const out = mapStringLiterals(src, (text, context) => {
        // Sólo tocar tramos que parezcan listas de clases.
        if (!/[a-z]-|^\s*$/.test(text)) return text;

        const apply = (input, [re, to], guard) =>
            input.replace(re, (m, ...groups) => {
                if (guard && guard(m)) {
                    bump("texto sobre acento preservado (revisar a mano)", 1);
                    return m;
                }
                const result = to.replace(/\$(\d)/g, (_, n) => groups[Number(n) - 1] ?? "");
                bump(`${m} → ${result}`, 1);
                return result;
            });

        const accents = accentPrefixes(context);
        const onAccent = (cls) => accents.has("") || accents.has(variantPrefix(cls));

        let next = text;
        for (const rule of RULES) next = apply(next, rule);
        for (const rule of ON_SURFACE_TEXT_RULES) next = apply(next, rule, onAccent);
        return next;
    });

    return { out, stats };
}

// --- CLI ---
const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const explicit = argv.filter((a) => !a.startsWith("--"));

// Los archivos pasados a mano se procesan tal cual: la exclusión es para el
// barrido completo, no para una corrección puntual.
const files = explicit.length
    ? explicit
    : execSync("find src -name '*.tsx' -o -name '*.ts'", { encoding: "utf8" })
          .trim().split("\n")
          .filter((f) => f && !ALWAYS_DARK.some((p) => f.includes(p)))
          // Un archivo que declara `theme-night` es una superficie Match Night.
          .filter((f) => !readFileSync(f, "utf8").includes("theme-night"));

const totals = new Map();
let changedFiles = 0;

for (const file of files) {
    const src = readFileSync(file, "utf8");
    const { out, stats } = transform(src);
    if (out === src) continue;
    changedFiles++;
    for (const [k, v] of stats) totals.set(k, (totals.get(k) || 0) + v);
    if (!dry) writeFileSync(file, out);
    const n = [...stats.values()].reduce((a, b) => a + b, 0);
    console.log(`${String(n).padStart(4)}  ${file}`);
}

console.log(`\n--- ${dry ? "DRY RUN" : "APLICADO"}: ${changedFiles} archivos ---`);
for (const [k, v] of [...totals].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(v).padStart(5)}  ${k}`);
}
