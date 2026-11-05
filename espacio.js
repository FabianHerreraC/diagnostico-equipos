// Espacio de diagnóstico: cinco columnas isométricas (una por herramienta).
// Clic en una columna → la cámara hace zoom y aparecen sus cajitas etiquetadas.
// Clic en una cajita → tarjeta con el dato.
(() => {
  const D = window.DATA;
  const M = D.equipo.meses.length;
  const $ = (s) => document.querySelector(s);

  // ───────── Índices ─────────
  const KIND = { S: "Fortaleza", W: "Debilidad", O: "Oportunidad", T: "Amenaza" };
  const swot = {};
  for (const k of "SWOT") for (const it of D.swot[k]) swot[it.id] = { ...it, k };
  const B = Object.fromEntries(D.batallas.map((b) => [b.id, b]));
  const A = Object.fromEntries(D.acciones.map((a) => [a.id, a]));
  const C = Object.fromEntries(D.competencias.map((c) => [c.id, c]));

  const state = { zoom: null, sel: null, card: false, vb: null };

  // ───────── Utilidades y cálculos ─────────
  const fmt = (n, d = 1) => n.toLocaleString("es", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = (n) => n.toLocaleString("es", { maximumFractionDigits: 0 });
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const bvar = (id) => `var(--${B[id].color})`;
  const monthLabel = (m) => `${D.equipo.meses[m]} ${String(D.equipo.anios[m]).slice(2)}`;
  const active = (a, m) => m >= a.inicio && m < a.inicio + a.dur;
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const tip = (t, b) => `data-tip="${esc(`<b>${t}</b>${b ? `<span>${b}</span>` : ""}`)}"`;

  function battlesOf(id) {
    if (!id) return [];
    if (id.startsWith("opp:")) id = id.slice(4);
    if (B[id]) return [id];
    if (swot[id]) return D.batallas.filter((b) => [...b.opps, ...b.apoya, ...b.corrige, ...b.mitiga].includes(id)).map((b) => b.id);
    if (A[id]) return [A[id].b];
    if (C[id]) return C[id].battles;
    if (id.startsWith("area:")) return [...new Set(D.acciones.filter((a) => a.area === id.slice(5)).map((a) => a.b))];
    return [];
  }
  const score = (o) => { const s = D.oportunidades[o]; return ((0.4 * s.impacto + 0.3 * s.factibilidad + 0.3 * s.alineacion) / 5) * 100; };
  const oppRank = () => D.swot.O.map((o) => o.id).sort((a, b) => score(b) - score(a));
  function demand(area, m) { let t = 0; for (const a of D.acciones) if (a.area === area && active(a, m)) t += a.fte; return t; }
  function areaStats(area) {
    let peak = 0, peakM = 0, red = 0;
    const c = D.capacidad[area];
    for (let m = 0; m < M; m++) { const d = demand(area, m); if (d > peak) { peak = d; peakM = m; } if (d - c > 0.001) red++; }
    return { peak, peakM, red, cap: c, gap: Math.max(0, peak - c) };
  }
  const crossDeps = () => D.acciones.flatMap((a) => a.deps.map((d) => ({ f: A[d], a }))).filter(({ f, a }) => f.b !== a.b || f.area !== a.area);

  // ───────── Geometría isométrica ─────────
  const S = 14, C30 = Math.cos(Math.PI / 6);
  const iso = (x, y, z = 0) => [(x - y) * C30 * S, ((x + y) * 0.5 - z) * S];
  const P = (p) => p.map((v) => v.toFixed(2)).join(",");
  let bbAll, bbCur;
  const grow = (bb, [px, py]) => { bb.x0 = Math.min(bb.x0, px); bb.x1 = Math.max(bb.x1, px); bb.y0 = Math.min(bb.y0, py); bb.y1 = Math.max(bb.y1, py); };
  const newBB = () => ({ x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
  const pts = (arr) => arr.map((q) => { const s = iso(...q); if (bbCur) grow(bbCur, s); return P(s); }).join(" ");

  const TOOLS = [
    { key: "swot", n: "01", t: "SWOT", name: "SWOT", verb: "ver", sec: "s-swot", sx: -40, k: 34, w: 11, h: 7,
      desc: "Fotografía interna (fortalezas, debilidades) y externa (oportunidades, amenazas). Cada cajita es un elemento; las más altas alimentan más batallas." },
    { key: "opp", n: "02", t: "OPORTUNIDADES", name: "Análisis de oportunidades", verb: "priorizar", sec: "s-opp", sx: -18, k: 27, w: 11, h: 9.5,
      desc: "Las oportunidades del SWOT colocadas por impacto (atrás, más) y factibilidad (derecha, más). La altura es el puntaje; el color, la batalla a la que pasan." },
    { key: "mwb", n: "03", t: "MUST WIN BATTLES", name: "Must Win Battles", verb: "elegir", sec: "s-mwb", sx: 5, k: 19, w: 13, h: 13,
      desc: "Las 3 a 5 batallas decisivas para los próximos 18 meses. Los LEDs de cada módulo marcan cuánto ha avanzado su indicador." },
    { key: "plan", n: "04", t: "PLAN INTEGRADO", name: "Integrated Action Plan", verb: "hacer", sec: "s-plan", sx: 28, k: 27, w: 12, h: 9,
      desc: "Cada batalla traducida en acciones sobre 18 meses. Cada cajita es una acción: su largo es el plazo y su grosor, las personas que pide." },
    { key: "cap", n: "05", t: "CAPACIDAD", name: "Capacity Action Plan", verb: "sostener", sec: "s-cap", sx: 49, k: 34, w: 11, h: 5.5,
      desc: "El plan contra la capacidad real. Atrás, las áreas: columna sólida = pico de demanda, jaula punteada = capacidad. Adelante, las competencias: nivel actual frente al requerido." }
  ];
  for (const T of TOOLS) { const u = T.sx / C30; T.x = (u + T.k) / 2 - T.w / 2; T.y = (T.k - u) / 2 - T.w / 2; T.cx = T.x + T.w / 2; T.cy = T.y + T.w / 2; }
  const TT = Object.fromEntries(TOOLS.map((t) => [t.key, t]));

  function cube(x, y, z, w, d, h, o = {}) {
    const top = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
    const lf = [[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x, y + d, z]];
    const rf = [[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y, z]];
    return `<g class="cube ${o.cls || ""}">
      <polygon class="f-l" points="${pts(lf)}" ${o.side ? `style="fill:${o.side}"` : ""}/>
      <polygon class="f-r" points="${pts(rf)}" ${o.side2 || o.side ? `style="fill:${o.side2 || o.side}"` : ""}/>
      <polygon class="f-t" points="${pts(top)}" ${o.top ? `style="fill:${o.top}"` : ""}/></g>`;
  }
  const mtx = { L: [C30, 0.5, 0, 1], T: [C30, 0.5, -C30, 0.5] };
  const faceText = (face, x, y, z, txt, cls) => { const [px, py] = iso(x, y, z); return `<text transform="matrix(${mtx[face].join(" ")} ${px.toFixed(2)} ${py.toFixed(2)})" class="${cls}">${txt}</text>`; };
  const isoRing = (cx, cy, z, R, cls) => { const [px, py] = iso(cx, cy, z); return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(R * 1.2247 * S).toFixed(2)}" ry="${(R * 0.7071 * S).toFixed(2)}" class="${cls}"/>`; };
  const dot = (x, y, z, r, fill, cls = "") => { const [px, py] = iso(x, y, z); return `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${r}" fill="${fill}"${cls ? ` class="${cls}"` : ""}/>`; };
  const line = (a, b, cls) => { const p = iso(...a), q = iso(...b); return `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" class="${cls}"/>`; };
  const screws = (x, y, z, w, d, i = 0.45, r = 1.6) => [[x + i, y + i], [x + w - i, y + i], [x + w - i, y + d - i], [x + i, y + d - i]].map(([a, b]) => dot(a, b, z, r, "var(--iso-ink)")).join("");
  const leds = (T, list) => {
    const x = T.x + T.w, step = Math.min(0.75, (T.w - 4) / Math.max(list.length, 1));
    let s = "";
    for (let i = 0; i < 6; i++) s += line([x, T.y + T.w - 1 - i * 0.32, 2.4], [x, T.y + T.w - 1 - i * 0.32, 1.7], "iso-vent");
    list.forEach((c, i) => { s += dot(x, T.y + T.w - 3.4 - i * step, 1.15, 2.3, c, "led"); });
    return s;
  };
  const pcAttrs = (id, title, body) => `class="pc" data-pick="${id}" data-id="${id}" data-b="${battlesOf(id).join(" ")}" ${tip(title, body)}`;

  // Orden de cajitas por herramienta (para la navegación ‹ › en la tarjeta).
  const ORDER = {
    swot: Object.keys(swot),
    opp: [],
    mwb: D.batallas.map((b) => b.id),
    plan: D.batallas.flatMap((b) => D.acciones.filter((a) => a.b === b.id).sort((p, q) => p.inicio - q.inicio).map((a) => a.id)),
    cap: [...D.areas.map((a) => "area:" + a), ...D.competencias.map((c) => c.id)]
  };
  const toolOf = (id) => id.startsWith("opp:") ? "opp" : swot[id] ? "swot" : B[id] ? "mwb" : A[id] ? "plan" : "cap";

  // ───────── Construcción de la escena ─────────
  const toolBB = {}, topBB = {};
  const anchors = {};

  function buildTool(T) {
    bbCur = toolBB[T.key] = newBB();
    let s = `<g class="platform" data-goto="${T.key}" ${tip(`${T.n} · ${T.name}`, "Clic para entrar")}>
      ${cube(T.x, T.y, 0, T.w, T.w, T.h, { cls: "plat" })}
      ${screws(T.x, T.y, T.h, T.w, T.w)}
      ${faceText("L", T.x + 0.9, T.y + T.w, T.h - 1.5, `${T.n} · ${T.t}`, "iso-lab")}
      ${faceText("L", T.x + 0.9, T.y + T.w, T.h - 2.6, T.verb.toUpperCase(), "iso-sub")}`;
    const ledList = {
      swot: ["var(--cream)", "var(--cream)", "var(--pink)", "var(--pink)"],
      opp: D.swot.O.map((o) => (battlesOf(o.id).length ? "var(--alert)" : "var(--iso-line-2)")),
      mwb: D.batallas.map((b) => bvar(b.id)),
      plan: crossDeps().map((c) => (c.f.b !== c.a.b ? "var(--alert)" : "var(--iso-line-2)")),
      cap: D.areas.map((a) => (areaStats(a).gap > 0.001 ? "var(--alert)" : "var(--iso-line-2)"))
    }[T.key];
    s += leds(T, ledList) + "</g>";
    const plat = bbCur;
    bbCur = topBB[T.key] = newBB();
    grow(bbCur, iso(T.x, T.y, T.h)); grow(bbCur, iso(T.x + T.w, T.y + T.w, T.h)); grow(bbCur, iso(T.x + T.w, T.y, T.h)); grow(bbCur, iso(T.x, T.y + T.w, T.h));
    s += ({ swot: swotTop, opp: oppTop, mwb: mwbTop, plan: planTop, cap: capTop })[T.key](T);
    grow(plat, [bbCur.x0, bbCur.y0]); grow(plat, [bbCur.x1, bbCur.y1]);
    bbCur = null;
    return `<g class="tool t-${T.key}" data-tool="${T.key}">${s}</g>`;
  }

  // 01 · SWOT
  function swotTop(T) {
    const half = T.w / 2, q = { S: [0, 0], W: [1, 0], O: [0, 1], T: [1, 1] };
    const names = { S: "FORTALEZAS", W: "DEBILIDADES", O: "OPORTUNIDADES", T: "AMENAZAS" };
    let s = line([T.x + half, T.y + 0.2, T.h], [T.x + half, T.y + T.w - 0.2, T.h], "iso-engrave") + line([T.x + 0.2, T.y + half, T.h], [T.x + T.w - 0.2, T.y + half, T.h], "iso-engrave");
    for (const k of "SWOT") s += faceText("T", T.x + q[k][0] * half + 0.5, T.y + q[k][1] * half + half - 0.3, T.h, names[k], `lbl lbl-q q-${k}`);
    const tiles = [];
    for (const k of "SWOT") D.swot[k].forEach((it, i) => {
      const x = T.x + q[k][0] * half + 0.5 + (i % 3) * 1.6, y = T.y + q[k][1] * half + 0.45 + Math.floor(i / 3) * 1.55;
      const n = battlesOf(it.id).length, th = 0.35 + n * 0.55;
      tiles.push({ o: x + y, s: `<g ${pcAttrs(it.id, `${it.id} · ${it.t}`, KIND[k])}>${cube(x, y, T.h, 1.1, 1.1, th, { top: `var(--${k}-bg)` })}${faceText("T", x + 0.2, y + 0.78, T.h + th, it.id, "lbl lbl-tile")}</g>` });
      anchors[it.id] = iso(x + 0.55, y + 0.55, T.h + th);
    });
    return s + tiles.sort((a, b) => a.o - b.o).map((t) => t.s).join("");
  }

  // 02 · Oportunidades
  function oppTop(T) {
    const g = 2.2, o0 = 0.6;
    let s = line([T.x + o0 + 2 * g + 0.55, T.y + 0.4, T.h], [T.x + o0 + 2 * g + 0.55, T.y + T.w - 0.4, T.h], "iso-engrave dash") +
            line([T.x + 0.4, T.y + o0 + 2 * g + 0.55, T.h], [T.x + T.w - 0.4, T.y + o0 + 2 * g + 0.55, T.h], "iso-engrave dash");
    s += faceText("T", T.x + 0.6, T.y + T.w - 0.3, T.h, "FACTIBILIDAD →", "lbl lbl-sm");
    const cols = [], seen = {};
    for (const o of D.swot.O) {
      const p = D.oportunidades[o.id], key = p.factibilidad + "-" + p.impacto, dup = (seen[key] = (seen[key] || 0) + 1) - 1;
      const x = Math.min(T.x + o0 + (p.factibilidad - 1) * g + dup * 1.15, T.x + T.w - 1.7), y = T.y + o0 + (5 - p.impacto) * g;
      const sc = score(o.id), h = 0.5 + (sc / 100) * 5.5, bs = battlesOf(o.id), id = "opp:" + o.id;
      cols.push({ o: x + y, s: `<g ${pcAttrs(id, `${o.id} · ${o.t}`, `Puntaje ${fmt0(sc)}`)}>${cube(x, y, T.h, 1.15, 1.15, h, { top: bs.length ? bvar(bs[0]) : "var(--iso-right)" })}${faceText("T", x + 0.2, y + 0.8, T.h + h, o.id, `lbl lbl-col ${bs.length ? "" : "dim"}`)}</g>` });
      anchors[id] = iso(x + 0.57, y + 0.57, T.h + h);
    }
    ORDER.opp = oppRank().map((o) => "opp:" + o);
    return s + cols.sort((a, b) => a.o - b.o).map((c) => c.s).join("");
  }

  // 03 · Must Win Battles
  function mwbTop(T) {
    const m = (T.w - 3) / 2, mh = 1.7, pos = [[0, 0], [1, 0], [0, 1], [1, 1]];
    let s = "";
    D.batallas.forEach((b, i) => {
      const x = T.x + 1 + pos[i][0] * (m + 1), y = T.y + 1 + pos[i][1] * (m + 1), cx = x + m / 2, cy = y + m / 2, z = T.h + mh;
      const prog = Math.round((b.hoy / b.meta) * 5);
      let ledRow = "";
      for (let j = 0; j < 5; j++) ledRow += dot(x + m, y + m - 0.9 - j * 0.55, mh * 0.45, 1.9, j < prog ? "var(--alert)" : "var(--iso-line-2)", "led");
      const words = b.nombre.split(" "), lines = [""];
      for (const w of words) { if ((lines[lines.length - 1] + " " + w).trim().length > 22) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim(); }
      s += `<g ${pcAttrs(b.id, `${b.id} · ${b.nombre}`, b.kpi)}>
        ${cube(x, y, T.h, m, m, mh)}
        ${screws(x, y, z, m, m, 0.35, 1.2)}
        ${isoRing(cx, cy, z, 1.5, "iso-target")}
        ${dot(cx, cy, z, 4.5, bvar(b.id))}
        ${dot(x + m - 0.5, y + 0.5, z, 1.8, bvar(b.id))}
        ${faceText("L", x + 0.45, y + m, T.h + mh * 0.3, b.id, "iso-sub")}
        ${faceText("T", x + 0.45, y + 1.0, z, b.id, "lbl lbl-modid")}
        ${lines.map((l, j) => faceText("T", x + 0.45, y + m - 0.55 - (lines.length - 1 - j) * 0.42, z, l, "lbl lbl-mod")).join("")}
        ${ledRow}
      </g>`;
      anchors[b.id] = iso(cx, cy, z);
    });
    return s;
  }

  // 04 · Plan integrado
  function planTop(T) {
    const L0 = 1.55, cell = (T.w - L0 - 0.5) / M;
    let s = line([T.x + L0 + 12 * cell, T.y + 0.3, T.h], [T.x + L0 + 12 * cell, T.y + T.w - 0.3, T.h], "iso-engrave dash") + line([T.x + L0 - 0.15, T.y + 0.5, T.h], [T.x + L0 - 0.15, T.y + T.w - 0.5, T.h], "iso-engrave");
    for (let m = 0; m < M; m++) s += faceText("T", T.x + L0 + m * cell + 0.12, T.y + T.w - 0.25, T.h, D.equipo.meses[m][0], "lbl lbl-sm");
    s += faceText("T", T.x + L0, T.y + 0.42, T.h, "2027", "lbl lbl-sm") + faceText("T", T.x + L0 + 0.05 + 12 * cell, T.y + 0.42, T.h, "2028", "lbl lbl-sm");
    const rows = ORDER.plan.map((id) => A[id]);
    const rh = (T.w - 1.9) / rows.length;
    rows.forEach((a, j) => {
      const x = T.x + L0 + a.inicio * cell, y = T.y + 0.65 + j * rh, h = 0.15 + a.fte * 0.22;
      s += `<g ${pcAttrs(a.id, `${a.id} · ${a.t}`, `${a.resp} · ${a.dur} meses`)}>${faceText("T", T.x + 0.3, y + rh * 0.78, T.h, a.id, "lbl lbl-strip")}${cube(x, y, T.h, a.dur * cell, rh * 0.74, h, { top: bvar(a.b) })}</g>`;
      anchors[a.id] = iso(x + 0.15, y + rh * 0.37, T.h + h);
    });
    return s;
  }

  // 05 · Capacidad
  function capTop(T) {
    const step = (T.w - 1.2) / D.areas.length, k = 0.85;
    let s = faceText("T", T.x + 0.6, T.y + 0.45, T.h, "ÁREAS · DEMANDA VS. CAPACIDAD", "lbl lbl-sm") +
            faceText("T", T.x + 0.6, T.y + T.w - 2.85, T.h, "COMPETENCIAS · NIVEL VS. REQUERIDO", "lbl lbl-sm") +
            line([T.x + 0.4, T.y + T.w - 3.4, T.h], [T.x + T.w - 0.4, T.y + T.w - 3.4, T.h], "iso-engrave dash");
    D.areas.forEach((ar, i) => {
      const a = areaStats(ar), x = T.x + 0.75 + i * step, y = T.y + 1.3, over = a.gap > 0.001, id = "area:" + ar;
      s += `<g ${pcAttrs(id, ar, `Pico ${fmt(a.peak)} · capacidad ${fmt(a.cap)} FTE`)}>
        ${cube(x, y, T.h, 0.9, 0.9, Math.max(a.peak * k, 0.15), { top: over ? "var(--alert)" : "var(--iso-top)", side: over ? "color-mix(in srgb, var(--alert) 45%, var(--iso-left))" : null, side2: over ? "color-mix(in srgb, var(--alert) 60%, var(--iso-right))" : null })}
        ${cube(x - 0.12, y - 0.12, T.h, 1.14, 1.14, a.cap * k, { cls: "wire" })}
        ${faceText("T", x - 0.05, y + 1.75, T.h, ar.slice(0, 4).toUpperCase(), "lbl lbl-sm")}
      </g>`;
      anchors[id] = iso(x + 0.45, y + 0.45, T.h + a.peak * k);
    });
    const cs = (T.w - 1.2) / D.competencias.length;
    D.competencias.forEach((c, i) => {
      const x = T.x + 0.7 + i * cs, y = T.y + T.w - 1.95, gap = c.actual < c.requerido;
      s += `<g ${pcAttrs(c.id, `${c.id} · ${c.t}`, `Nivel ${c.actual} de ${c.requerido}`)}>
        ${cube(x, y, T.h, 0.8, 0.8, c.actual * 0.45, { top: gap ? "var(--alert)" : "var(--iso-top)" })}
        ${cube(x - 0.1, y - 0.1, T.h, 1.0, 1.0, c.requerido * 0.45, { cls: "wire" })}
        ${faceText("T", x + 0.05, y + 1.5, T.h, c.id, "lbl lbl-sm")}
      </g>`;
      anchors[c.id] = iso(x + 0.4, y + 0.4, T.h + c.actual * 0.45);
    });
    return s;
  }

  function build() {
    bbAll = newBB();
    // Suelo
    let ground = "";
    const xs = TOOLS.map((t) => t.x), ys = TOOLS.map((t) => t.y);
    const gx0 = Math.min(...xs) - 50, gx1 = Math.max(...xs) + 60, gy0 = Math.min(...ys) - 50, gy1 = Math.max(...ys) + 60;
    for (let x = Math.floor(gx0 / 4) * 4; x <= gx1; x += 4) ground += line([x, gy0, 0], [x, gy1, 0], "iso-grid");
    for (let y = Math.floor(gy0 / 4) * 4; y <= gy1; y += 4) ground += line([gx0, y, 0], [gx1, y, 0], "iso-grid");
    const mw = TT.mwb;
    ground += isoRing(mw.cx, mw.cy, 0, 21, "iso-ring") + isoRing(mw.cx, mw.cy, 0, 40, "iso-ring");
    ground += faceText("T", mw.cx - 2, mw.cy - 21.6, 0, "DECIDIR · 18 MESES", "iso-ringlab");
    ground += faceText("T", mw.cx - 2, mw.cy - 40.6, 0, "EJECUTAR Y SOSTENER", "iso-ringlab");
    for (const T of TOOLS) { const m = 1.8; ground += `<polygon points="${pts([[T.x - m, T.y - m, 0], [T.x + T.w + m, T.y - m, 0], [T.x + T.w + m, T.y + T.w + m, 0], [T.x - m, T.y + T.w + m, 0]])}" class="iso-pad"/>`; }
    let road = "";
    for (let i = 0; i < TOOLS.length - 1; i++) {
      const a = TOOLS[i], b = TOOLS[i + 1], vx = b.cx - a.cx, vy = b.cy - a.cy, L = Math.hypot(vx, vy), nx = -vy / L * 1.1, ny = vx / L * 1.1;
      ground += `<polygon points="${pts([[a.cx + nx, a.cy + ny, 0], [b.cx + nx, b.cy + ny, 0], [b.cx - nx, b.cy - ny, 0], [a.cx - nx, a.cy - ny, 0]])}" class="iso-road"/>`;
      ground += line([a.cx, a.cy, 0], [b.cx, b.cy, 0], "iso-roadline");
      road += `${i ? "L" : "M"}${P(iso(a.cx, a.cy))} `;
    }
    road += `L${P(iso(TOOLS[4].cx, TOOLS[4].cy))}`;
    ground += `<circle r="3.2" class="iso-runner"><animateMotion dur="16s" repeatCount="indefinite" path="${road}"/></circle>`;

    // Herramientas (de atrás hacia adelante)
    const tools = {};
    for (const T of TOOLS) tools[T.key] = buildTool(T);
    for (const T of TOOLS) { const b = toolBB[T.key]; grow(bbAll, [b.x0, b.y0]); grow(bbAll, [b.x1, b.y1]); }
    const order = TOOLS.slice().sort((a, b) => a.k - b.k || a.sx - b.sx).map((t) => tools[t.key]).join("");

    // Hilos
    const links = [];
    for (const o of D.swot.O) links.push([o.id, "opp:" + o.id, battlesOf(o.id)]);
    for (const b of D.batallas) {
      for (const o of b.opps) links.push(["opp:" + o, b.id, [b.id]]);
      for (const x of [...b.apoya, ...b.corrige, ...b.mitiga]) links.push([x, b.id, [b.id]]);
    }
    for (const a of D.acciones) { links.push([a.b, a.id, [a.b]]); links.push([a.id, "area:" + a.area, [a.b]]); }
    for (const c of D.competencias) for (const b of c.battles) links.push([b, c.id, [b]]);
    let threads = "";
    for (const [f, t, bs] of links) {
      const p = anchors[f], q = anchors[t];
      if (!p || !q) continue;
      const mx = (p[0] + q[0]) / 2, my = Math.min(p[1], q[1]) - Math.abs(q[0] - p[0]) * 0.22 - 18;
      threads += `<path class="thread" d="M${P(p)} Q${mx.toFixed(1)},${my.toFixed(1)} ${P(q)}" stroke="${bs.length === 1 ? bvar(bs[0]) : "var(--iso-line)"}" data-b="${bs.join(" ")}"/>`;
    }

    // Pines
    const tops = { swot: 2.6, opp: 7.2, mwb: 3.2, plan: 2.2, cap: 5.4 };
    const fteGap = D.areas.reduce((s, a) => s + areaStats(a).gap, 0);
    const pinData = {
      swot: [String(Object.keys(swot).length), "elementos"],
      opp: [`${D.swot.O.filter((o) => battlesOf(o.id).length).length}/${D.swot.O.length}`, "pasan a batallas"],
      mwb: [String(D.batallas.length), "batallas decisivas"],
      plan: [String(D.acciones.length), `acciones · ${crossDeps().filter((c) => c.f.b !== c.a.b).length} cruces`],
      cap: [fteGap > 0.001 ? "−" + fmt(fteGap) : "ok", "FTE de brecha", fteGap > 0.001]
    };
    let pins = "";
    for (const T of TOOLS) {
      const [ax, ay] = iso(T.cx, T.cy, T.h + tops[T.key]);
      const [v, l, alert] = pinData[T.key], w = 100, h = 44, top = ay - 46 - h;
      grow(bbAll, [ax - w / 2, top]); grow(bbAll, [ax + w / 2, top]);
      pins += `<g class="pin ${alert ? "alert" : ""}" data-goto="${T.key}">
        <line x1="${ax.toFixed(1)}" y1="${(top + h).toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" class="pin-lead"/>
        <circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.4" class="pin-foot"/>
        <rect x="${(ax - w / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${w}" height="${h}" rx="22" class="pin-cap"/>
        <text x="${ax.toFixed(1)}" y="${(top + 22).toFixed(1)}" text-anchor="middle" class="pin-v">${v}</text>
        <text x="${ax.toFixed(1)}" y="${(top + 35).toFixed(1)}" text-anchor="middle" class="pin-l">${l}</text>
      </g>`;
    }
    // Arco de ciclo
    const a0 = iso(TT.cap.cx, TT.cap.cy, TT.cap.h + 14), a1 = iso(TT.swot.cx, TT.swot.cy, TT.swot.h + 14), ctrlY = bbAll.y0 - 60;
    const cycle = `<g class="cycle-g"><path d="M${P(a0)} C${P([a0[0] - 120, ctrlY])} ${P([a1[0] + 120, ctrlY])} ${P(a1)}" class="cycle" marker-end="url(#cyc-arr)"/>
      <text x="${((a0[0] + a1[0]) / 2).toFixed(1)}" y="${(ctrlY + 40).toFixed(1)}" text-anchor="middle" class="cycle-lab">siguiente ciclo · lo que aprende la capacidad vuelve a la fotografía</text></g>`;
    grow(bbAll, [a0[0], ctrlY + 26]);

    const ends = Object.values(anchors).map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.4" class="thread-end"/>`).join("");
    $("#scene").innerHTML = `<svg id="svg" class="overview" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Espacio isométrico de las cinco herramientas">
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><line x1="0" y1="0" x2="0" y2="5" class="hatch-line"/></pattern>
        <marker id="cyc-arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="var(--iso-line)" stroke-width="1.2"/></marker>
      </defs>
      <g class="ground">${ground}</g>
      ${cycle}
      <g class="tools">${order}</g>
      <g class="threads">${threads}${ends}</g>
      <g class="pins">${pins}</g>
    </svg>`;
  }

  // ───────── Cámara ─────────
  const svg = () => $("#svg");
  function region() {
    const w = innerWidth, h = innerHeight, mobile = w < 760;
    const top = mobile ? 120 : 150, bottom = mobile ? 76 : 86;
    if (!state.zoom) return { l: 20, t: top, r: w - 20, b: h - bottom };
    if (mobile) return { l: 10, t: top - 10, r: w - 10, b: state.card ? h * 0.5 : h - bottom };
    return { l: 30, t: top, r: w - 430, b: h - bottom };
  }
  function targetVB() {
    let bx;
    if (state.zoom) {
      // Encuadra la superficie de la columna (sus cajitas) y deja asomar un poco del bloque.
      const b = topBB[state.zoom], w = b.x1 - b.x0, h = b.y1 - b.y0;
      bx = { x0: b.x0 - w * 0.06, x1: b.x1 + w * 0.06, y0: b.y0 - h * 0.08, y1: b.y1 + h * 0.3 };
    }
    else { const p = 24; bx = { x0: bbAll.x0 - p, x1: bbAll.x1 + p, y0: bbAll.y0 - p, y1: bbAll.y1 + p }; }
    const r = region(), W = innerWidth, H = innerHeight;
    const s = Math.min((r.r - r.l) / (bx.x1 - bx.x0), (r.b - r.t) / (bx.y1 - bx.y0));
    const vw = W / s, vh = H / s;
    const cx = (bx.x0 + bx.x1) / 2, cy = (bx.y0 + bx.y1) / 2;
    return [cx - ((r.l + r.r) / 2) / s, cy - ((r.t + r.b) / 2) / s, vw, vh];
  }
  let anim;
  function camera(instant) {
    const to = targetVB(), from = state.vb || to;
    cancelAnimationFrame(anim);
    const setVB = (v) => { state.vb = v; svg().setAttribute("viewBox", v.map((n) => n.toFixed(2)).join(" ")); };
    if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) return setVB(to);
    const t0 = performance.now(), dur = 850, ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // Ancho en escala logarítmica (zoom uniforme) y centro lineal.
    const fc = [from[0] + from[2] / 2, from[1] + from[3] / 2], tc = [to[0] + to[2] / 2, to[1] + to[3] / 2], ar = to[3] / to[2];
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      const w = Math.exp(Math.log(from[2]) + (Math.log(to[2]) - Math.log(from[2])) * e), h = w * ar;
      const cx = fc[0] + (tc[0] - fc[0]) * e, cy = fc[1] + (tc[1] - fc[1]) * e;
      setVB([cx - w / 2, cy - h / 2, w, h]);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  // ───────── Navegación ─────────
  function zoomTo(key, { keepCard = false } = {}) {
    state.zoom = key;
    if (!keepCard) { state.card = false; if (!key) state.sel = state.sel && B[state.sel] ? state.sel : null; else state.sel = null; }
    applyUI();
    camera();
  }
  function pick(id) {
    const key = toolOf(id);
    state.sel = id; state.card = true;
    if (state.zoom !== key) { state.zoom = key; applyUI(); camera(); }
    else { applyUI(); if (innerWidth < 760) camera(); }
  }
  function closeCard() { state.card = false; state.sel = null; applyUI(); if (innerWidth < 760) camera(); }

  function applyUI() {
    const s = svg();
    s.classList.toggle("overview", !state.zoom);
    s.classList.toggle("zoomed", !!state.zoom);
    document.body.classList.toggle("zoomed-ui", !!state.zoom);
    s.querySelectorAll(".tool").forEach((g) => g.classList.toggle("on", g.dataset.tool === state.zoom));
    // foco por batallas
    const id = state.sel, fb = new Set(battlesOf(id));
    s.classList.toggle("focusing", !!id);
    s.querySelectorAll("[data-b]").forEach((el) => {
      const bs = (el.getAttribute("data-b") || "").split(" ").filter(Boolean);
      el.classList.toggle("lit", !id || el.dataset.id === id || bs.some((b) => fb.has(b)));
    });
    s.querySelectorAll(".pc").forEach((el) => el.classList.toggle("picked", el.dataset.pick === id && state.card));
    renderHUD(); renderCard();
  }

  // ───────── HUD ─────────
  function renderHUD() {
    const T = state.zoom && TT[state.zoom];
    $("#crumb-cur").textContent = T ? `${T.n} · ${T.name}` : "";
    $("#tools-nav").innerHTML = TOOLS.map((t) => `<button class="tn ${state.zoom === t.key ? "on" : ""}" data-goto="${t.key}"><span class="n">${t.n}</span><span class="t">${t.key === "opp" ? "Oportunidades" : t.key === "plan" ? "Plan" : t.key === "cap" ? "Capacidad" : t.name}</span></button>`).join("");
    $("#chips").innerHTML = `<button class="chip ${!state.sel || state.card ? "on" : ""}" data-chip="">Todas</button>` +
      D.batallas.map((b) => `<button class="chip ${state.sel === b.id && !state.card ? "on" : ""}" data-chip="${b.id}"><i class="bdot" style="background:${bvar(b.id)}"></i>${b.nombre}</button>`).join("");
    const cap = $("#caption");
    if (T) {
      cap.innerHTML = `<h1 class="cap-title"><span class="n">${T.n}</span>${T.name}</h1><p class="cap-sub">${T.desc}</p>`;
      return;
    }
    const id = state.sel, bs = battlesOf(id);
    if (!id || !bs.length) {
      cap.innerHTML = `<h1 class="cap-title">Del diagnóstico a la capacidad: cinco columnas, un solo hilo</h1>
        <p class="cap-sub">${D.equipo.nombre} · ${D.equipo.horizonte}. Haz clic en una columna para entrar en esa herramienta, o elige una batalla abajo para ver su hilo.</p>`;
      return;
    }
    const sw = new Set(), op = new Set();
    bs.forEach((b) => { const x = B[b]; x.opps.forEach((o) => { sw.add(o); op.add(o); }); [...x.apoya, ...x.corrige, ...x.mitiga].forEach((s) => sw.add(s)); });
    const acts = D.acciones.filter((a) => bs.includes(a.b)), areas = new Set(acts.map((a) => a.area));
    const red = [...areas].filter((a) => areaStats(a).gap > 0.001);
    cap.innerHTML = `<h1 class="cap-title">${bs.map((b) => `<i class="bdot" style="background:${bvar(b)}"></i> ${B[b].nombre}`).join(" · ")}</h1>
      <ol class="chain"><li><b>${sw.size}</b> en SWOT</li><li><b>${op.size}</b> oportunidad${op.size === 1 ? "" : "es"}</li><li><b>${bs.length}</b> batalla</li><li><b>${acts.length}</b> acciones</li>
      <li><b>${areas.size}</b> áreas${red.length ? `, <span class="red">${red.length} sin capacidad</span>` : ""}</li></ol>`;
  }

  // ───────── Tarjeta ─────────
  const lk = (id) => {
    let t = "", lab = id;
    if (id.startsWith("opp:")) { lab = id.slice(4); t = "priorización"; }
    else if (swot[id]) t = swot[id].t;
    else if (B[id]) t = B[id].nombre;
    else if (A[id]) t = A[id].t;
    else if (C[id]) t = C[id].t;
    else if (id.startsWith("area:")) { lab = "Área"; t = id.slice(5); }
    const d = B[id] ? `<i class="bdot" style="background:${bvar(id)}"></i>` : "";
    return `<button class="k-link" data-pick="${id}">${d}<b>${lab}</b> ${t}</button>`;
  };
  const sec = (t, ids) => (ids.length ? `<div class="k-sec"><h4>${t}</h4><div class="k-links">${ids.map(lk).join("")}</div></div>` : "");
  const kv = (rows) => `<dl class="k-kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const bar = (lab, v, max, color, mark, txt) => `<div class="bar-row"><span class="lab">${lab}</span><span class="trk"><i style="width:${(v / max) * 100}%;background:${color}"></i>${mark != null ? `<s style="left:calc(${(mark / max) * 100}% - 1px)"></s>` : ""}</span><span class="v">${txt ?? v}</span></div>`;
  const thread = (bs) => sec("Alimenta", bs);

  function renderCard() {
    const el = $("#card");
    const id = state.sel;
    if (!state.card || !id) { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); return; }
    el.classList.add("open"); el.setAttribute("aria-hidden", "false");
    const key = toolOf(id), list = ORDER[key], i = list.indexOf(id), T = TT[key];
    let tag = "", title = "", body = "";
    if (swot[id]) {
      const it = swot[id];
      tag = `<span class="tag ${it.k}">${id}</span>${KIND[it.k]}`; title = it.t;
      body = `<p class="k-desc">${it.d}</p>`;
      const role = { opps: "La persigue", apoya: "Se apoya en ella", corrige: "La corrige", mitiga: "La mitiga" };
      for (const [k, t] of Object.entries(role)) body += sec(t, D.batallas.filter((b) => b[k].includes(id)).map((b) => b.id));
      if (!battlesOf(id).length) body += `<p class="k-desc" style="margin-top:14px">Ninguna batalla la toma. Se queda en el diagnóstico.</p>`;
      if (it.k === "O") body += sec("Ver en la priorización", ["opp:" + id]);
    } else if (id.startsWith("opp:")) {
      const o = id.slice(4), p = D.oportunidades[o], sc = score(o), rank = oppRank().indexOf(o) + 1;
      tag = `<span class="tag O">${o}</span>Oportunidad · #${rank} de ${D.swot.O.length}`; title = swot[o].t;
      body = `<div class="big"><span class="v">${fmt0(sc)}</span><span class="u">puntaje de 100<br>impacto 40% · factibilidad 30% · alineación 30%</span></div>
        <div class="bars">${bar("Impacto", p.impacto, 5, "var(--pink)")}${bar("Factibilidad", p.factibilidad, 5, "var(--pink)")}${bar("Alineación", p.alineacion, 5, "var(--pink)")}</div>
        <p class="k-desc" style="margin-top:14px">${p.nota}</p>`;
      body += battlesOf(o).length ? sec("Pasa a", battlesOf(o)) : `<p class="k-desc">No pasa a ninguna batalla.</p>`;
      body += sec("En el SWOT", [o]);
    } else if (B[id]) {
      const b = B[id], acts = D.acciones.filter((a) => a.b === id);
      let peak = 0;
      for (let m = 0; m < M; m++) peak = Math.max(peak, acts.filter((a) => active(a, m)).reduce((s, a) => s + a.fte, 0));
      tag = `<span class="tag">${id}</span>Must Win Battle · 18 meses`; title = b.nombre;
      body = `<p class="k-desc">${b.ambicion}</p>
        <div class="big"><span class="v">${fmt0(b.hoy)} → ${fmt0(b.meta)}</span><span class="u">${b.unidad === "%" ? "%" : b.unidad}<br>${b.kpi}</span></div>
        <div class="bars">${bar("Avance", b.hoy, b.meta, bvar(id), null, fmt0((b.hoy / b.meta) * 100) + "%")}</div>
        <div class="k-sec">${kv([["Acciones", acts.length], ["Pico de personas", fmt(peak) + " FTE"], ["Presupuesto", fmt0(acts.reduce((s, a) => s + a.kusd, 0)) + " kUSD"], ["Áreas", [...new Set(acts.map((a) => a.area))].join(", ")]])}</div>`;
      body += sec("Persigue", b.opps) + sec("Se apoya en", b.apoya) + sec("Corrige", b.corrige) + sec("Mitiga", b.mitiga) + sec("Acciones", acts.map((a) => a.id));
    } else if (A[id]) {
      const a = A[id], after = D.acciones.filter((x) => x.deps.includes(id)).map((x) => x.id);
      tag = `<span class="tag">${id}</span>Acción`; title = a.t;
      body = kv([["Responsable", a.resp], ["Área", a.area], ["Plazo", `${monthLabel(a.inicio)} → ${monthLabel(a.inicio + a.dur - 1)} · ${a.dur} meses`], ["Personas", fmt(a.fte) + " FTE"], ["Recursos", fmt0(a.kusd) + " kUSD"], ["Indicador", a.kpi]]);
      body += sec("Batalla", [a.b]) + sec("Depende de", a.deps) + sec("La esperan", after) + sec("Su área", ["area:" + a.area]);
    } else if (id.startsWith("area:")) {
      const ar = id.slice(5), st = areaStats(ar), max = Math.max(st.peak, st.cap) * 1.1;
      tag = `<span class="tag">Área</span>Capacidad`; title = ar;
      body = `<div class="big"><span class="v">${st.gap > 0.001 ? `<span class="hl">−${fmt(st.gap)}</span>` : "ok"}</span><span class="u">${st.gap > 0.001 ? `FTE que faltan en el pico<br>${st.red} meses por encima de su capacidad` : "la capacidad alcanza<br>todo el horizonte"}</span></div>
        <div class="bars">${bar("Pico demanda", st.peak, max, st.gap > 0.001 ? "var(--alert)" : "var(--ink-3)", st.cap, fmt(st.peak))}${bar("Capacidad", st.cap, max, "var(--line-2)", null, fmt(st.cap))}</div>
        <div class="k-sec">${kv([["Mes pico", monthLabel(st.peakM)]])}</div>`;
      body += sec("Acciones que la ocupan", D.acciones.filter((a) => a.area === ar).map((a) => a.id));
      const decs = D.decisiones.filter((d) => d.area === ar);
      if (decs.length) body += `<div class="k-sec"><h4>Decisiones posibles</h4>${decs.map((d) => `<p class="k-desc" style="margin:0 0 6px">${{ contratar: "Contratar", dejar: "Dejar de hacer", desarrollar: "Desarrollar" }[d.tipo]}: ${d.t} <span style="color:var(--ink-3)">(+${fmt(d.fte)} FTE)</span></p>`).join("")}</div>`;
    } else if (C[id]) {
      const c = C[id], gap = c.requerido - c.actual;
      tag = `<span class="tag">${id}</span>Competencia`; title = c.t;
      body = `<div class="big"><span class="v">${gap > 0 ? `<span class="hl">${c.actual} / ${c.requerido}</span>` : `${c.actual} / ${c.requerido}`}</span><span class="u">nivel actual / requerido (0–5)<br>${gap > 0 ? `faltan ${gap} nivel${gap > 1 ? "es" : ""}` : "al nivel requerido"}</span></div>
        <div class="bars">${bar("Nivel", c.actual, 5, gap > 0 ? "var(--alert)" : "var(--ink-3)", c.requerido, c.actual)}</div>`;
      body += sec("La exige", c.battles);
      const decs = D.decisiones.filter((d) => d.sube && d.sube[id]);
      if (decs.length) body += `<div class="k-sec"><h4>Cómo cerrar la brecha</h4>${decs.map((d) => `<p class="k-desc" style="margin:0 0 6px">${{ contratar: "Contratar", dejar: "Dejar de hacer", desarrollar: "Desarrollar" }[d.tipo]}: ${d.t} <span style="color:var(--ink-3)">(→ ${d.sube[id]})</span></p>`).join("")}</div>`;
    }
    const bs = battlesOf(id);
    const ledsHtml = `<div class="k-leds">${D.batallas.map((b) => `<i class="${bs.includes(b.id) ? "on" : ""}" style="${bs.includes(b.id) ? `background:${bvar(b.id)}` : ""}" title="${esc(B[b.id].nombre)}"></i>`).join("")}</div>`;
    $("#card-body").innerHTML = `
      <div class="k-head"><div class="k-type">${tag}</div>
        <div class="k-nav"><button data-step="-1" aria-label="Anterior">←</button><button data-step="1" aria-label="Siguiente">→</button><button class="x" data-close aria-label="Cerrar">×</button></div></div>
      <h2 class="k-title">${title}</h2>${ledsHtml}${body}
      <div class="k-foot"><span>${i + 1} de ${list.length} · ${T.name}</span><a href="detalle.html#${T.sec}">Ver análisis completo →</a></div>`;
  }

  // ───────── Eventos ─────────
  document.addEventListener("click", (e) => {
    const st = e.target.closest("[data-step]");
    if (st) { const key = toolOf(state.sel), l = ORDER[key], i = l.indexOf(state.sel); pick(l[(i + +st.dataset.step + l.length) % l.length]); return; }
    if (e.target.closest("[data-close]")) { closeCard(); return; }
    const chip = e.target.closest("[data-chip]");
    if (chip) { state.sel = chip.dataset.chip || null; state.card = false; if (state.zoom) { state.zoom = null; camera(); } applyUI(); return; }
    const pk = e.target.closest("[data-pick]");
    if (pk && !state.zoom && pk.closest("#scene")) { zoomTo(toolOf(pk.dataset.pick)); return; }
    if (pk) { pick(pk.dataset.pick); return; }
    const go = e.target.closest("[data-goto]");
    if (go) { const k = go.dataset.goto; if (state.zoom === k && !go.classList.contains("tn")) return; zoomTo(state.zoom === k ? null : k); return; }
    if (e.target.closest("#home")) { zoomTo(null); return; }
    // clic en el vacío de la escena
    if (e.target.closest("#scene")) { if (state.card) closeCard(); else if (state.zoom) zoomTo(null); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (state.card) closeCard(); else if (state.zoom) zoomTo(null); else if (state.sel) { state.sel = null; applyUI(); } }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const d = e.key === "ArrowRight" ? 1 : -1;
      if (state.card) { const l = ORDER[toolOf(state.sel)], i = l.indexOf(state.sel); pick(l[(i + d + l.length) % l.length]); }
      else { const i = TOOLS.findIndex((t) => t.key === state.zoom); zoomTo(TOOLS[(i + d + TOOLS.length) % TOOLS.length].key); }
    }
  });
  addEventListener("resize", () => camera(true));

  const tipEl = $("#tip");
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    // En vista general, la plataforma completa da el tooltip; dentro de una columna, cada cajita.
    if (!t || (t.classList.contains("pc") && !state.zoom)) { tipEl.classList.remove("show"); return; }
    tipEl.innerHTML = t.getAttribute("data-tip"); tipEl.classList.add("show");
  });
  document.addEventListener("mousemove", (e) => {
    if (!tipEl.classList.contains("show")) return;
    const r = tipEl.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  });

  build();
  applyUI();
  camera(true);
})();
