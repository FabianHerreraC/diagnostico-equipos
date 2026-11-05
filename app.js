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
  const H = Object.fromEntries(D.herramientas.map((h) => [h.id, h]));
  const DEC = Object.fromEntries(D.decisiones.map((d) => [d.id, d]));
  const owners = [...new Set(D.acciones.map((a) => a.resp))];

  const state = {
    sel: null,
    weights: { impacto: 40, factibilidad: 30, alineacion: 30 },
    dec: new Set(),
    area: "Todas"
  };

  // ───────── Utilidades ─────────
  const fmt = (n, d = 1) => n.toLocaleString("es", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = (n) => n.toLocaleString("es", { maximumFractionDigits: 0 });
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const bvar = (id) => `var(--${B[id].color})`;
  const dots = (bs) => bs.length ? bs.map((b) => `<i class="bdot" style="background:${bvar(b)}"></i>`).join("") : `<i class="bdot none"></i>`;
  const monthLabel = (m) => `${D.equipo.meses[m]} ${String(D.equipo.anios[m]).slice(2)}`;
  const active = (a, m) => m >= a.inicio && m < a.inicio + a.dur;
  const tip = (title, body) => `data-tip="${esc(`<b>${title}</b>${body ? `<span>${body}</span>` : ""}`)}"`;

  function battlesOf(id) {
    if (!id) return [];
    if (B[id]) return [id];
    if (swot[id]) return D.batallas.filter((b) => [...b.opps, ...b.apoya, ...b.corrige, ...b.mitiga].includes(id)).map((b) => b.id);
    if (A[id]) return [A[id].b];
    if (C[id]) return C[id].battles;
    if (H[id]) return H[id].battles;
    if (DEC[id]) return DEC[id].battles;
    if (id.startsWith("area:")) return [...new Set(D.acciones.filter((a) => a.area === id.slice(5)).map((a) => a.b))];
    if (id.startsWith("resp:")) return [...new Set(D.acciones.filter((a) => a.resp === id.slice(5)).map((a) => a.b))];
    return [];
  }
  const bAttr = (id) => `data-b="${battlesOf(id).join(" ")}" data-id="${id}"`;

  // ───────── Cálculos ─────────
  const score = (o) => {
    const w = state.weights, s = D.oportunidades[o];
    const tot = w.impacto + w.factibilidad + w.alineacion || 1;
    return ((w.impacto * s.impacto + w.factibilidad * s.factibilidad + w.alineacion * s.alineacion) / tot / 5) * 100;
  };
  const activeDecs = () => D.decisiones.filter((d) => state.dec.has(d.id));

  function demand(area, m) {
    const out = {};
    for (const b of D.batallas) out[b.id] = 0;
    for (const a of D.acciones) if ((area === "Todas" || a.area === area) && active(a, m)) out[a.b] += a.fte;
    return out;
  }
  function cap(area, m) {
    const areas = area === "Todas" ? D.areas : [area];
    let c = areas.reduce((s, ar) => s + (D.capacidad[ar] || 0), 0);
    for (const d of activeDecs()) if (d.fte && areas.includes(d.area) && m >= (d.desde || 0)) c += d.fte;
    return c;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

  function areaStats(area) {
    let peak = 0, peakM = 0, red = 0, worst = 0;
    for (let m = 0; m < M; m++) {
      const dm = sum(demand(area, m)), cp = cap(area, m);
      if (dm > peak) { peak = dm; peakM = m; }
      if (dm - cp > 0.001) red++;
      worst = Math.max(worst, dm - cp);
    }
    return { peak, peakM, red, gap: worst, base: D.capacidad[area] ?? cap(area, 0), capNow: cap(area, M - 1) };
  }
  const skillLevel = (c) => Math.max(c.actual, ...activeDecs().filter((d) => d.sube && d.sube[c.id]).map((d) => d.sube[c.id]));
  // Tiempo del responsable: cuántas acciones lidera a la vez (3 o más = sobrecarga).
  const ownerLoad = (o, m) => D.acciones.filter((a) => a.resp === o && active(a, m)).length;
  const OVER = 3;
  function budget() {
    const plan = {};
    for (const b of D.batallas) plan[b.id] = 0;
    for (const a of D.acciones) plan[a.b] += a.kusd;
    const decs = activeDecs();
    const cost = decs.filter((d) => d.kusd > 0).reduce((s, d) => s + d.kusd, 0);
    const save = decs.filter((d) => d.kusd < 0).reduce((s, d) => s - d.kusd, 0);
    const planTot = sum(plan);
    return { plan, planTot, cost, save, total: planTot + cost - save, avail: D.equipo.presupuesto };
  }

  // ───────── Cabecera y barra ─────────
  function renderHeader() {
    $("#team-name").textContent = D.equipo.nombre;
    $("#team-meta").textContent = `${D.equipo.organizacion} · Horizonte ${D.equipo.horizonte}`;
    $("#battle-chips").innerHTML =
      `<button class="chip ${state.sel ? "" : "on"}" data-chip="">Todas</button>` +
      D.batallas.map((b) => `<button class="chip ${state.sel === b.id ? "on" : ""}" data-chip="${b.id}"><i class="dot" style="background:${bvar(b.id)}"></i>${b.nombre}</button>`).join("");
  }
  function renderSteps() {
    const gaps = D.areas.filter((a) => areaStats(a).gap > 0.001).length + D.competencias.filter((c) => skillLevel(c) < c.requerido).length;
    const steps = [
      ["s-swot", "01", "SWOT", Object.keys(swot).length],
      ["s-opp", "02", "Oportunidades", D.swot.O.length],
      ["s-mwb", "03", "Must Win Battles", D.batallas.length],
      ["s-plan", "04", "Plan integrado", D.acciones.length],
      ["s-cap", "05", "Capacidad", `${gaps} brechas`]
    ];
    $("#steps").innerHTML = steps.map(([id, n, t, c]) => `<li><a href="#${id}" data-step="${id}"><span class="n">${n}</span>${t}<span class="c">${c}</span></a></li>`).join("");
  }

  // ───────── 1. SWOT ─────────
  function renderSwot() {
    const meta = { S: ["Fortalezas", "interno"], W: ["Debilidades", "interno"], O: ["Oportunidades", "externo"], T: ["Amenazas", "externo"] };
    $("#swot").innerHTML = "SWOT".split("").map((k) => `
      <div class="quad ${k}">
        <h3><span class="tag">${k}</span>${meta[k][0]}<span class="side">${meta[k][1]}</span></h3>
        <div class="items">${D.swot[k].map((it) => `
          <button class="item" data-sel="${it.id}" ${bAttr(it.id)}>
            <span class="id">${it.id}</span>
            <span><span class="t">${it.t}</span><span class="d">${it.d}</span></span>
          </button>`).join("")}
        </div>
      </div>`).join("");
  }

  // ───────── 2. Oportunidades ─────────
  function renderWeights() {
    const labels = { impacto: "Impacto", factibilidad: "Factibilidad", alineacion: "Alineación estratégica" };
    $("#weights").innerHTML = Object.keys(labels).map((k) => `
      <label>
        <span>Peso · ${labels[k]} <b id="w-${k}">${state.weights[k]}</b></span>
        <input type="range" min="0" max="100" step="5" value="${state.weights[k]}" data-weight="${k}">
      </label>`).join("");
  }

  function renderOppTable() {
    const rows = D.swot.O.map((o) => ({ o, s: score(o.id) })).sort((a, b) => b.s - a.s);
    const pips = (id, key) => {
      const v = D.oportunidades[id][key];
      return `<span class="pips">${[1, 2, 3, 4, 5].map((n) => `<button class="pip ${n <= v ? "on" : ""}" data-pip="${id}|${key}|${n}" aria-label="${key} ${n}"></button>`).join("")}</span>`;
    };
    $("#opp-table").innerHTML = `
      <table class="otable">
        <thead><tr><th>#</th><th>Oportunidad</th><th class="hide-sm">Impacto</th><th class="hide-sm">Factib.</th><th class="hide-sm">Alin.</th><th>Puntaje</th><th>→ MWB</th></tr></thead>
        <tbody>${rows.map(({ o, s }, i) => {
          const bs = battlesOf(o.id);
          return `<tr data-sel="${o.id}" ${bAttr(o.id)}>
            <td class="rank">${i + 1}</td>
            <td class="name">${o.t}<small>${D.oportunidades[o.id].nota}</small></td>
            <td class="hide-sm">${pips(o.id, "impacto")}</td>
            <td class="hide-sm">${pips(o.id, "factibilidad")}</td>
            <td class="hide-sm">${pips(o.id, "alineacion")}</td>
            <td><div class="score"><div class="bar-bg"><div class="bar-fg" style="width:${s}%"></div></div><b>${fmt0(s)}</b></div></td>
            <td class="to-mwb ${bs.length ? "" : "no"}">${bs.length ? bs.join(" · ") : "queda fuera"}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  }

  function renderOppChart() {
    const W = 560, Hh = 440, ml = 46, mr = 18, mt = 18, mb = 44;
    const x = (v) => ml + ((v - 0.5) / 5) * (W - ml - mr);
    const y = (v) => Hh - mb - ((v - 0.5) / 5) * (Hh - mt - mb);
    const mid = 3;
    let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Matriz impacto por factibilidad">`;
    // cuadrantes
    s += `<rect x="${x(mid)}" y="${y(5.5)}" width="${x(5.5) - x(mid)}" height="${y(mid) - y(5.5)}" fill="var(--O-bg)" rx="6"/>`;
    const q = [
      [x(5.4), y(5.35), "end", "Prioridad"],
      [x(0.6), y(5.35), "start", "Apuesta estratégica"],
      [x(5.4), y(0.75), "end", "Victoria rápida"],
      [x(0.6), y(0.75), "start", "Descartar o posponer"]
    ];
    for (const [qx, qy, an, t] of q) s += `<text x="${qx}" y="${qy}" text-anchor="${an}" class="g-month" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">${t}</text>`;
    for (let v = 1; v <= 5; v++) {
      s += `<line x1="${x(v)}" x2="${x(v)}" y1="${y(0.5)}" y2="${y(5.5)}" class="l-grid" stroke-dasharray="${v === mid ? "" : "2 4"}"/>`;
      s += `<line y1="${y(v)}" y2="${y(v)}" x1="${x(0.5)}" x2="${x(5.5)}" class="l-grid" stroke-dasharray="${v === mid ? "" : "2 4"}"/>`;
      s += `<text x="${x(v)}" y="${Hh - mb + 16}" text-anchor="middle" class="l-axis">${v}</text>`;
      s += `<text x="${ml - 10}" y="${y(v) + 4}" text-anchor="end" class="l-axis">${v}</text>`;
    }
    s += `<text x="${(W + ml) / 2}" y="${Hh - 8}" text-anchor="middle" class="g-sub">Factibilidad →</text>`;
    s += `<text transform="translate(14 ${(Hh - mb + mt) / 2}) rotate(-90)" text-anchor="middle" class="g-sub">Impacto →</text>`;
    // burbujas (con desplazamiento si coinciden)
    const seen = {};
    const pts = D.swot.O.map((o) => {
      const p = D.oportunidades[o.id];
      const key = `${p.factibilidad}-${p.impacto}`;
      const n = (seen[key] = (seen[key] || 0) + 1) - 1;
      return { o, p, dx: n * 26, dy: n * -10 };
    }).sort((a, b) => b.p.alineacion - a.p.alineacion);
    for (const { o, p, dx, dy } of pts) {
      const bs = battlesOf(o.id);
      const fill = bs.length ? bvar(bs[0]) : "var(--ink-3)";
      const r = 8 + p.alineacion * 4.2;
      const cx = x(p.factibilidad) + dx, cy = y(p.impacto) + dy;
      s += `<g class="g-row" data-sel="${o.id}" ${bAttr(o.id)} ${tip(`${o.id} · ${o.t}`, `Impacto ${p.impacto} · Factibilidad ${p.factibilidad} · Alineación ${p.alineacion} · Puntaje ${fmt0(score(o.id))}${bs.length ? " · → " + bs.map((b) => B[b].nombre).join(", ") : " · fuera de las batallas"}`)}>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity="${bs.length ? 0.85 : 0.35}" stroke="var(--surface)" stroke-width="2" class="${state.sel === o.id ? "sel" : ""}"/>
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font:600 11px var(--mono);fill:#fff">${o.id}</text>
      </g>`;
    }
    s += `</svg>`;
    $("#opp-chart").innerHTML = s;
  }

  // ───────── 3. MWB ─────────
  function renderMwb() {
    const ref = (id) => `<button class="ref ${id[0]}" data-sel="${id}" ${tip(`${id} · ${swot[id].t}`, KIND[id[0]])}>${id}</button>`;
    $("#mwb").innerHTML = D.batallas.map((b) => {
      const acts = D.acciones.filter((a) => a.b === b.id);
      let peak = 0;
      for (let m = 0; m < M; m++) peak = Math.max(peak, acts.filter((a) => active(a, m)).reduce((s, a) => s + a.fte, 0));
      const kusd = acts.reduce((s, a) => s + a.kusd, 0);
      const pct = b.meta ? (b.hoy / b.meta) * 100 : 0;
      const u = b.unidad === "%" ? "%" : "";
      return `<article class="battle" style="--bc:${bvar(b.id)}" data-sel="${b.id}" ${bAttr(b.id)}>
        <div><div class="bid">${b.id} · 18 meses</div><h3>${b.nombre}</h3></div>
        <p class="amb">${b.ambicion}</p>
        <div class="kpi">
          <div class="lab">${b.kpi}</div>
          <div class="vals"><span class="from">${fmt0(b.hoy)}${u}</span>→<span class="to">${fmt0(b.meta)}${u}</span>${u ? "" : `<span class="from">${b.unidad}</span>`}</div>
          <div class="track"><i style="width:${Math.max(pct, 2)}%"></i></div>
        </div>
        <dl class="links">
          <div><dt>Persigue</dt><dd>${b.opps.map(ref).join("")}</dd></div>
          <div><dt>Se apoya</dt><dd>${b.apoya.map(ref).join("")}</dd></div>
          <div><dt>Corrige</dt><dd>${b.corrige.map(ref).join("")}</dd></div>
          <div><dt>Mitiga</dt><dd>${b.mitiga.map(ref).join("")}</dd></div>
        </dl>
        <div class="foot-stats"><span>${acts.length} acciones</span><span>${fmt(peak)} FTE pico</span><span>${fmt0(kusd)} kUSD</span></div>
      </article>`;
    }).join("");
  }

  // ───────── 4. Plan integrado ─────────
  function renderGantt() {
    const W = 1160, LW = 330, colW = (W - LW - 12) / M, headH = 46, groupH = 34, rowH = 30;
    const rows = [];
    let yy = headH;
    for (const b of D.batallas) {
      rows.push({ type: "g", b, y: yy }); yy += groupH;
      for (const a of D.acciones.filter((a) => a.b === b.id).sort((p, q) => p.inicio - q.inicio)) { rows.push({ type: "a", a, y: yy }); yy += rowH; }
    }
    const Ht = yy + 8;
    const pos = {};
    for (const r of rows) if (r.type === "a") pos[r.a.id] = { x1: LW + r.a.inicio * colW, x2: LW + (r.a.inicio + r.a.dur) * colW, y: r.y + rowH / 2 };

    let s = `<svg viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Cronograma del plan integrado">
      <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink-3)"/></marker>
      <marker id="arr-x" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink)"/></marker></defs>`;
    // cabecera de meses
    for (let m = 0; m < M; m++) {
      const xm = LW + m * colW;
      if (m === 0 || D.equipo.anios[m] !== D.equipo.anios[m - 1]) s += `<text x="${xm + 4}" y="16" class="g-year">${D.equipo.anios[m]}</text>`;
      s += `<text x="${xm + colW / 2}" y="36" text-anchor="middle" class="g-month">${D.equipo.meses[m]}</text>`;
      s += `<line x1="${xm}" x2="${xm}" y1="${headH - 4}" y2="${Ht}" stroke="var(--line)" stroke-width="${m % 6 === 0 ? 1.2 : 0.6}"/>`;
    }
    s += `<text x="12" y="36" class="g-month">ACCIÓN · RESPONSABLE · ÁREA</text>`;
    for (const r of rows) {
      if (r.type === "g") {
        s += `<g class="g-row" data-sel="${r.b.id}" ${bAttr(r.b.id)}>
          <rect x="0" y="${r.y}" width="${W}" height="${groupH}" fill="transparent" class="g-bg"/>
          <rect x="12" y="${r.y + 12}" width="10" height="10" rx="5" fill="${bvar(r.b.id)}"/>
          <text x="30" y="${r.y + 22}" class="g-group" fill="${bvar(r.b.id)}">${r.b.id} · ${r.b.nombre}</text></g>`;
      } else {
        const a = r.a, p = pos[a.id], sel = state.sel === a.id;
        s += `<g class="g-row" data-sel="${a.id}" ${bAttr(a.id)} ${tip(`${a.id} · ${a.t}`, `${a.resp} · ${a.area}<br>${monthLabel(a.inicio)} → ${monthLabel(a.inicio + a.dur - 1)} · ${fmt(a.fte)} FTE · ${fmt0(a.kusd)} kUSD<br>KPI: ${a.kpi}${a.deps.length ? "<br>Depende de: " + a.deps.join(", ") : ""}`)}>
          <rect x="0" y="${r.y}" width="${W}" height="${rowH}" fill="transparent" class="g-bg"/>
          <text x="30" y="${r.y + 13}" class="g-label"><tspan class="g-sub" style="font-family:var(--mono)">${a.id}</tspan>  ${a.t}</text>
          <text x="30" y="${r.y + 25}" class="g-sub">${a.resp} · ${a.area}</text>
          <rect x="${p.x1 + 1}" y="${p.y - 8}" width="${p.x2 - p.x1 - 2}" height="16" rx="5" fill="${bvar(a.b)}" fill-opacity="${0.35 + a.fte * 0.3}" class="${sel ? "sel" : ""}"/>
          <text x="${p.x1 + 7}" y="${p.y + 4}" style="font:500 10.5px var(--mono);fill:var(--ink)">${fmt(a.fte)} FTE · ${fmt0(a.kusd)}k</text>
        </g>`;
      }
    }
    // dependencias
    for (const a of D.acciones) for (const d of a.deps) {
      const from = pos[d], to = pos[a.id];
      const cross = A[d].b !== a.b;
      const x1 = from.x2, y1 = from.y, x2 = to.x1, y2 = to.y;
      const k = Math.max(24, Math.abs(x2 - x1) / 2);
      s += `<path class="g-dep ${cross ? "cross" : ""}" data-b="${[...new Set([A[d].b, a.b])].join(" ")}" data-id="dep:${d}-${a.id}" d="M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2 - 2},${y2}" marker-end="url(#${cross ? "arr-x" : "arr"})"/>`;
    }
    s += `</svg>`;
    $("#gantt").innerHTML = s;
  }

  function renderMatrix() {
    let max = 0;
    const cnt = {};
    for (const ar of D.areas) { cnt[ar] = {}; for (const b of D.batallas) { const n = D.acciones.filter((a) => a.area === ar && a.b === b.id).length; cnt[ar][b.id] = n; max = Math.max(max, n); } }
    $("#matrix").innerHTML = `<table class="matrix">
      <thead><tr><th></th>${D.batallas.map((b) => `<th style="color:${bvar(b.id)}">${b.id}</th>`).join("")}<th>Σ</th></tr></thead>
      <tbody>${D.areas.map((ar) => {
        const nb = D.batallas.filter((b) => cnt[ar][b.id] > 0).length;
        const tot = sum(cnt[ar]);
        return `<tr class="${nb >= 3 ? "multi" : ""}">
          <td class="lab" data-sel="area:${ar}" ${bAttr("area:" + ar)} style="cursor:pointer">${ar}${nb >= 3 ? `<b>nodo · ${nb} batallas</b>` : ""}</td>
          ${D.batallas.map((b) => {
            const n = cnt[ar][b.id];
            return `<td data-b="${b.id}" ${tip(`${ar} en ${b.nombre}`, n ? D.acciones.filter((a) => a.area === ar && a.b === b.id).map((a) => `${a.id} ${a.t}`).join("<br>") : "Sin acciones")} style="background:${n ? `color-mix(in srgb, ${bvar(b.id)} ${18 + (n / max) * 52}%, transparent)` : "var(--surface-2)"}">${n || ""}</td>`;
          }).join("")}
          <td class="tot">${tot}</td></tr>`;
      }).join("")}</tbody></table>`;
  }

  function crossDeps() {
    const list = [];
    for (const a of D.acciones) for (const d of a.deps) {
      const f = A[d];
      if (f.b !== a.b || f.area !== a.area) list.push({ f, a, xb: f.b !== a.b });
    }
    return list.sort((p, q) => q.xb - p.xb);
  }
  function renderCross() {
    const list = crossDeps();
    $("#cross").innerHTML = `<div class="cross-list">${list.map(({ f, a, xb }) => `
      <div class="cross-item" data-sel="${a.id}" data-b="${[...new Set([f.b, a.b])].join(" ")}" data-id="${a.id}">
        <div class="a"><span><b>${f.id}</b> ${f.t}</span></div>
        <div class="arrow">→</div>
        <div class="a"><span><b>${a.id}</b> ${a.t}</span></div>
        <div class="why">${xb ? `entre batallas ${f.b} → ${a.b}` : `misma batalla`} · ${f.area} → ${a.area} · ${f.resp.split(" ")[0]} → ${a.resp.split(" ")[0]}</div>
      </div>`).join("")}</div>`;
  }

  // ───────── 5. Capacidad ─────────
  function tileStats() {
    const areaGaps = D.areas.map((a) => ({ a, ...areaStats(a) })).filter((x) => x.gap > 0.001);
    const fteGap = areaGaps.reduce((s, x) => s + x.gap, 0);
    const skillGaps = D.competencias.filter((c) => skillLevel(c) < c.requerido);
    const over = owners.filter((o) => { for (let m = 0; m < M; m++) if (ownerLoad(o, m) >= OVER) return true; return false; });
    const bu = budget();
    const missing = D.herramientas.filter((h) => h.estado === "falta");
    const uncovered = missing.filter((h) => !h.cubre);
    const tiles = [
      ["Personas", fteGap > 0 ? `−${fmt(fteGap)} FTE` : "Cubierto", areaGaps.length ? `${areaGaps.length} áreas por debajo en su pico` : "Todas las áreas alcanzan", fteGap > 1 ? "bad" : fteGap > 0 ? "warn" : "ok"],
      ["Competencias", `${skillGaps.length} / ${D.competencias.length}`, skillGaps.length ? "competencias aún bajo el nivel requerido" : "Todas al nivel requerido", skillGaps.length > 2 ? "bad" : skillGaps.length ? "warn" : "ok"],
      ["Tiempo", `${over.length}`, over.length ? `liderando ${OVER}+ acciones a la vez: ${over.map((o) => o.split(" ")[0]).join(", ")}` : "Nadie sobrecargado", over.length > 1 ? "bad" : over.length ? "warn" : "ok"],
      ["Presupuesto", `${fmt0(bu.total)}k`, `de ${fmt0(bu.avail)} kUSD disponibles (${bu.total > bu.avail ? "+" : ""}${fmt0(bu.total - bu.avail)}k)`, bu.total > bu.avail * 1.05 ? "bad" : bu.total > bu.avail ? "warn" : "ok"],
      ["Herramientas", `${missing.length} faltan`, uncovered.length ? `${uncovered.length} sin acción que las resuelva` : "todas cubiertas por una acción", uncovered.length ? "warn" : "ok"]
    ];
    return tiles.map(([l, v, s, st]) => ({ l, v, s, st }));
  }
  function renderTiles() {
    $("#tiles").innerHTML = tileStats().map(({ l, v, s, st }) => `<div class="tile ${st}"><div class="lab">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join("");
  }

  function renderAreaSeg() {
    $("#area-seg").innerHTML = ["Todas", ...D.areas].map((a) => `<button class="${state.area === a ? "on" : ""}" data-area="${a}">${a}</button>`).join("");
  }

  function renderLoad() {
    const W = 1000, Hh = 250, ml = 40, mr = 10, mt = 14, mb = 34;
    const area = state.area;
    const dem = [...Array(M)].map((_, m) => demand(area, m));
    const caps = [...Array(M)].map((_, m) => cap(area, m));
    const maxY = Math.max(...dem.map(sum), ...caps) * 1.15 || 1;
    const bw = (W - ml - mr) / M;
    const y = (v) => Hh - mb - (v / maxY) * (Hh - mt - mb);
    let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Carga mensual frente a capacidad">`;
    const step = maxY > 8 ? 2 : maxY > 4 ? 1 : 0.5;
    for (let v = 0; v <= maxY; v += step) s += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="l-grid"/><text x="${ml - 6}" y="${y(v) + 3}" text-anchor="end" class="l-axis">${fmt(v, v % 1 ? 1 : 0)}</text>`;
    for (let m = 0; m < M; m++) {
      const x0 = ml + m * bw;
      if (sum(dem[m]) - caps[m] > 0.001) s += `<rect x="${x0}" y="${mt}" width="${bw}" height="${Hh - mt - mb}" class="l-over"/>`;
      let acc = 0;
      for (const b of D.batallas) {
        const v = dem[m][b.id];
        if (!v) continue;
        s += `<rect x="${x0 + 4}" y="${y(acc + v)}" width="${bw - 8}" height="${y(acc) - y(acc + v)}" fill="${bvar(b.id)}" data-b="${b.id}" rx="2"/>`;
        acc += v;
      }
      s += `<text x="${x0 + bw / 2}" y="${Hh - mb + 14}" text-anchor="middle" class="l-axis">${D.equipo.meses[m]}</text>`;
      if (m === 0 || m === 12) s += `<text x="${x0 + bw / 2}" y="${Hh - mb + 27}" text-anchor="middle" class="l-axis" style="fill:var(--ink-2)">${D.equipo.anios[m]}</text>`;
    }
    // línea de capacidad (escalonada)
    let p = "";
    for (let m = 0; m < M; m++) p += `${m ? "L" : "M"}${ml + m * bw},${y(caps[m])} L${ml + (m + 1) * bw},${y(caps[m])} `;
    s += `<path d="${p}" class="l-cap"/>`;
    s += `<text x="${W - mr}" y="${y(caps[M - 1]) - 6}" text-anchor="end" class="l-axis" style="fill:var(--ink)">capacidad ${fmt(caps[M - 1])} FTE</text>`;
    // zonas de tooltip
    for (let m = 0; m < M; m++) {
      const d = dem[m], tot = sum(d), gap = tot - caps[m];
      const body = D.batallas.filter((b) => d[b.id]).map((b) => `${b.id} ${fmt(d[b.id])}`).join(" · ") + `<br>Demanda ${fmt(tot)} · Capacidad ${fmt(caps[m])}${gap > 0.001 ? ` · <b style="display:inline">faltan ${fmt(gap)}</b>` : ""}`;
      s += `<rect x="${ml + m * bw}" y="${mt}" width="${bw}" height="${Hh - mt - mb}" fill="transparent" ${tip(`${monthLabel(m)} · ${area}`, body)}/>`;
    }
    s += `</svg>`;
    $("#load-chart").innerHTML = s;

    $("#area-table").innerHTML = `<table class="atable">
      <thead><tr><th>Área</th><th class="hide-sm">Capacidad base</th><th>Capacidad</th><th>Pico</th><th class="hide-sm">Mes pico</th><th class="hide-sm">Meses en rojo</th><th>Brecha</th></tr></thead>
      <tbody>${D.areas.map((ar) => {
        const st = areaStats(ar);
        return `<tr class="${state.area === ar ? "on" : ""}" data-area="${ar}" ${bAttr("area:" + ar)}>
          <td>${ar}</td><td class="hide-sm">${fmt(st.base)}</td><td>${fmt(st.capNow)}</td><td>${fmt(st.peak)}</td><td class="hide-sm">${monthLabel(st.peakM)}</td><td class="hide-sm">${st.red}</td>
          <td><span class="gap-pill ${st.gap > 0.001 ? "bad" : "ok"}">${st.gap > 0.001 ? "−" + fmt(st.gap) : "ok"}</span></td></tr>`;
      }).join("")}</tbody></table>`;
  }

  function renderSkills() {
    const w = 150, x = (v) => 6 + (v / 5) * (w - 12);
    $("#skills").innerHTML = D.competencias.map((c) => {
      const lvl = skillLevel(c), ok = lvl >= c.requerido;
      const svg = `<svg viewBox="0 0 ${w} 18" preserveAspectRatio="none">
        <line x1="${x(0)}" x2="${x(5)}" y1="9" y2="9" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>
        <line x1="${x(c.actual)}" x2="${x(c.requerido)}" y1="9" y2="9" stroke="var(--accent)" stroke-width="4"/>
        ${lvl > c.actual ? `<line x1="${x(c.actual)}" x2="${x(lvl)}" y1="9" y2="9" stroke="var(--ink)" stroke-width="4"/>` : ""}
        <circle cx="${x(c.requerido)}" cy="9" r="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 1.5"/>
        <circle cx="${x(c.actual)}" cy="9" r="4.5" fill="var(--ink-3)"/>
        ${lvl > c.actual ? `<circle cx="${x(lvl)}" cy="9" r="6" fill="none" stroke="var(--ink)" stroke-width="2"/>` : ""}
      </svg>`;
      return `<div class="skill" data-sel="${c.id}" ${bAttr(c.id)} ${tip(c.t, `Actual ${c.actual} · Requerido ${c.requerido}${lvl > c.actual ? ` · Con decisiones ${lvl}` : ""}`)}>
        <span class="nm">${c.t}</span>${svg}
        <span class="st ${ok ? "ok" : lvl > c.actual ? "warn" : "bad"}">${ok ? "ok" : `−${c.requerido - lvl}`}</span></div>`;
    }).join("");
  }

  function renderOwners() {
    const cell = (v) => v >= OVER ? `var(--accent)` : v === 2 ? `var(--accent-soft)` : v ? `color-mix(in srgb, var(--ink) 14%, transparent)` : "var(--surface-2)";
    $("#owners").innerHTML = `<table class="heat">
      <thead><tr><th></th>${D.equipo.meses.map((m) => `<th>${m[0]}</th>`).join("")}</tr></thead>
      <tbody>${owners.map((o) => `<tr>
        <td class="lab" data-sel="resp:${o}" ${bAttr("resp:" + o)}>${o}</td>
        ${[...Array(M)].map((_, m) => {
          const v = ownerLoad(o, m);
          const acts = D.acciones.filter((a) => a.resp === o && active(a, m));
          return `<td class="${v >= OVER ? "over" : ""}" data-b="${[...new Set(acts.map((a) => a.b))].join(" ")}" style="background:${cell(v)}" ${tip(`${o} · ${monthLabel(m)}`, acts.length ? `${v} acciones en paralelo<br>${acts.map((a) => `${a.id} ${a.t}`).join("<br>")}` : "Sin acciones")}>${v > 1 ? v : ""}</td>`;
        }).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function renderBudget() {
    const bu = budget();
    const scale = Math.max(bu.planTot + bu.cost, bu.avail) * 1.04;
    const pct = (v) => (v / scale) * 100;
    $("#budget").innerHTML = `
      <p class="small">Plan de acción + decisiones de capacidad frente a ${fmt0(bu.avail)} kUSD disponibles.</p>
      <div class="budget-bar">
        ${D.batallas.map((b) => `<i data-b="${b.id}" style="width:${pct(bu.plan[b.id])}%;background:${bvar(b.id)}" ${tip(b.nombre, fmt0(bu.plan[b.id]) + " kUSD")}></i>`).join("")}
        <i style="width:${pct(bu.cost)}%;background:var(--ink-3)" ${tip("Decisiones de capacidad", fmt0(bu.cost) + " kUSD")}></i>
        <span class="limit" style="left:${pct(bu.avail)}%"></span>
      </div>
      <div class="budget-legend">
        ${D.batallas.map((b) => `<div data-b="${b.id}"><span><i class="sw" style="background:${bvar(b.id)}"></i>${b.id} · ${b.nombre}</span><span>${fmt0(bu.plan[b.id])}</span></div>`).join("")}
        <div><span><i class="sw" style="background:var(--ink-3)"></i>Contratar y desarrollar</span><span>+${fmt0(bu.cost)}</span></div>
        <div><span><i class="sw" style="background:var(--line-2)"></i>Ahorro por dejar de hacer</span><span>−${fmt0(bu.save)}</span></div>
        <div class="total"><span>Total vs. disponible</span><span style="${bu.total > bu.avail ? "background:var(--accent);color:#1a1a1a;padding:0 5px;border-radius:4px" : ""}">${fmt0(bu.total)} / ${fmt0(bu.avail)}</span></div>
      </div>`;
  }

  function renderTools() {
    $("#tools").innerHTML = `<p class="small">Qué existe, qué se usa a medias y qué falta. Si una acción del plan la resuelve, se indica.</p>` +
      D.herramientas.map((h) => `<div class="tool" data-sel="${h.id}" ${bAttr(h.id)}>
        <span class="nm">${h.t}</span><span class="badge ${h.estado}">${h.estado}</span>
        <span class="cov">${h.cubre ? `la resuelve ${h.cubre} · ${A[h.cubre].t}` : h.estado === "existe" ? "lista para usar" : "sin acción asignada en el plan"}</span>
      </div>`).join("");
  }

  function renderDecisions() {
    const cols = [["desarrollar", "Desarrollar", "subir competencias"], ["contratar", "Contratar", "sumar capacidad"], ["dejar", "Dejar de hacer", "liberar tiempo y dinero"]];
    $("#decisions").innerHTML = cols.map(([k, t, sub]) => `
      <div class="dcol"><h4>${t} <small>${sub}</small></h4>
        ${D.decisiones.filter((d) => d.tipo === k).map((d) => {
          const fx = [];
          if (d.fte) fx.push(`+${fmt(d.fte)} FTE ${d.area}${d.desde ? " desde " + monthLabel(d.desde) : ""}`);
          if (d.sube) for (const [c, v] of Object.entries(d.sube)) fx.push(`${C[c].t} → ${v}`);
          fx.push(d.kusd > 0 ? `${fmt0(d.kusd)}k costo` : d.kusd < 0 ? `${fmt0(-d.kusd)}k ahorro` : "sin costo");
          return `<div class="dec ${state.dec.has(d.id) ? "on" : ""}" data-dec="${d.id}" ${bAttr(d.id)}>
            <button class="switch" aria-label="Activar ${esc(d.t)}" aria-pressed="${state.dec.has(d.id)}"></button>
            <div><div class="t">${d.t}</div><div class="fx">${fx.join(" · ")}</div></div></div>`;
        }).join("")}
      </div>`).join("");
  }

  // ───────── Panel de detalle ─────────
  function link(id) {
    let label = id, cls = "A", txt = "";
    if (swot[id]) { cls = id[0]; txt = swot[id].t; }
    else if (B[id]) { txt = B[id].nombre; }
    else if (A[id]) { txt = A[id].t; }
    else if (C[id]) { txt = C[id].t; }
    else if (H[id]) { txt = H[id].t; }
    else if (DEC[id]) { txt = DEC[id].t; }
    else if (id.startsWith("area:") || id.startsWith("resp:")) { label = id.startsWith("area:") ? "Área" : "Resp."; txt = id.slice(5); }
    const dot = B[id] ? `<i class="bdot" style="background:${bvar(id)}"></i>` : "";
    return `<button class="dr-link" data-sel="${id}">${dot}<span class="ref ${cls}">${label}</span>${txt}</button>`;
  }
  const sec = (title, ids) => ids.length ? `<div class="dr-sec"><h4>${title}</h4><div class="dr-list">${ids.map(link).join("")}</div></div>` : "";
  const kv = (pairs) => `<dl class="dr-kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;

  function renderDrawer() {
    const id = state.sel, el = $("#drawer");
    if (!id) { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); return; }
    el.classList.add("open"); el.setAttribute("aria-hidden", "false");
    const bs = battlesOf(id);
    const thread = bs.length ? `<div class="dr-thread">Hilo: ${bs.map((b) => B[b].nombre).join(" · ")}</div>` : `<div class="dr-thread">No alimenta ninguna batalla</div>`;
    let h = "";
    if (swot[id]) {
      const it = swot[id];
      h = `<div class="dr-type">${KIND[it.k]} · ${id}</div><h2 class="dr-title">${it.t}</h2><p class="dr-desc">${it.d}</p>${thread}`;
      if (it.k === "O") {
        const o = D.oportunidades[id];
        h += kv([["Impacto", o.impacto + " / 5"], ["Factibilidad", o.factibilidad + " / 5"], ["Alineación", o.alineacion + " / 5"], ["Puntaje", fmt0(score(id)) + " / 100"], ["Lectura", o.nota]]);
      }
      const role = { opps: "La persigue", apoya: "Se apoya en ella", corrige: "La corrige", mitiga: "La mitiga" };
      for (const [k, t] of Object.entries(role)) h += sec(t, D.batallas.filter((b) => b[k].includes(id)).map((b) => b.id));
      h += sec("Acciones que la trabajan", D.acciones.filter((a) => bs.includes(a.b)).map((a) => a.id));
    } else if (B[id]) {
      const b = B[id], acts = D.acciones.filter((a) => a.b === id);
      h = `<div class="dr-type">Must Win Battle · ${id}</div><h2 class="dr-title">${b.nombre}</h2><p class="dr-desc">${b.ambicion}</p>`;
      h += kv([["Indicador", b.kpi], ["Hoy → meta", `${fmt0(b.hoy)} → ${fmt0(b.meta)} ${b.unidad}`], ["Acciones", acts.length], ["Presupuesto", fmt0(acts.reduce((s, a) => s + a.kusd, 0)) + " kUSD"], ["Áreas", [...new Set(acts.map((a) => a.area))].join(", ")]]);
      h += sec("Persigue", b.opps) + sec("Se apoya en", b.apoya) + sec("Corrige", b.corrige) + sec("Mitiga", b.mitiga);
      h += sec("Acciones", acts.map((a) => a.id));
      h += sec("Competencias que exige", D.competencias.filter((c) => c.battles.includes(id)).map((c) => c.id));
      h += sec("Decisiones de capacidad", D.decisiones.filter((d) => d.battles.includes(id)).map((d) => d.id));
    } else if (A[id]) {
      const a = A[id];
      h = `<div class="dr-type">Acción · ${id}</div><h2 class="dr-title">${a.t}</h2>${thread}`;
      h += kv([["Responsable", a.resp], ["Área", a.area], ["Plazo", `${monthLabel(a.inicio)} → ${monthLabel(a.inicio + a.dur - 1)} (${a.dur} meses)`], ["Dedicación", fmt(a.fte) + " FTE"], ["Recursos", fmt0(a.kusd) + " kUSD"], ["Indicador", a.kpi]]);
      h += sec("Depende de", a.deps) + sec("La esperan", D.acciones.filter((x) => x.deps.includes(id)).map((x) => x.id));
      h += sec("Herramienta que resuelve", D.herramientas.filter((t) => t.cubre === id).map((t) => t.id));
      h += sec("Ver", ["area:" + a.area, "resp:" + a.resp]);
    } else if (C[id]) {
      const c = C[id], lvl = skillLevel(c);
      h = `<div class="dr-type">Competencia · ${id}</div><h2 class="dr-title">${c.t}</h2>${thread}`;
      h += kv([["Nivel actual", c.actual + " / 5"], ["Requerido", c.requerido + " / 5"], ["Con decisiones", lvl + " / 5"], ["Brecha", lvl >= c.requerido ? "cerrada" : `faltan ${c.requerido - lvl} niveles`]]);
      h += sec("Decisiones que la suben", D.decisiones.filter((d) => d.sube && d.sube[id]).map((d) => d.id));
    } else if (H[id]) {
      const t = H[id];
      h = `<div class="dr-type">Herramienta · ${id}</div><h2 class="dr-title">${t.t}</h2>${thread}`;
      h += kv([["Estado", t.estado], ["Resolución", t.cubre ? `${t.cubre} · ${A[t.cubre].t}` : "sin acción en el plan"]]);
      if (t.cubre) h += sec("Acción", [t.cubre]);
    } else if (DEC[id]) {
      const d = DEC[id];
      const tipo = { desarrollar: "Desarrollar", contratar: "Contratar", dejar: "Dejar de hacer" }[d.tipo];
      h = `<div class="dr-type">Decisión · ${tipo}</div><h2 class="dr-title">${d.t}</h2>${thread}`;
      h += kv([["Estado", state.dec.has(id) ? "activa" : "inactiva"], ["Capacidad", d.fte ? `+${fmt(d.fte)} FTE en ${d.area} desde ${monthLabel(d.desde || 0)}` : "—"], ["Presupuesto", d.kusd > 0 ? `${fmt0(d.kusd)} kUSD de costo` : d.kusd < 0 ? `${fmt0(-d.kusd)} kUSD de ahorro` : "sin impacto"]]);
      if (d.sube) h += sec("Competencias que eleva", Object.keys(d.sube));
      if (d.area) h += sec("Área", ["area:" + d.area]);
    } else if (id.startsWith("area:")) {
      const ar = id.slice(5), st = areaStats(ar);
      h = `<div class="dr-type">Área</div><h2 class="dr-title">${ar}</h2>${thread}`;
      h += kv([["Capacidad base", fmt(st.base) + " FTE"], ["Con decisiones", fmt(st.capNow) + " FTE"], ["Pico de demanda", `${fmt(st.peak)} FTE en ${monthLabel(st.peakM)}`], ["Meses en rojo", st.red], ["Brecha máxima", st.gap > 0.001 ? fmt(st.gap) + " FTE" : "ninguna"]]);
      h += sec("Acciones del área", D.acciones.filter((a) => a.area === ar).map((a) => a.id));
      h += sec("Decisiones que le suman capacidad", D.decisiones.filter((d) => d.area === ar).map((d) => d.id));
    } else if (id.startsWith("resp:")) {
      const o = id.slice(5);
      let peak = 0, pm = 0;
      for (let m = 0; m < M; m++) { const v = ownerLoad(o, m); if (v > peak) { peak = v; pm = m; } }
      h = `<div class="dr-type">Responsable</div><h2 class="dr-title">${o}</h2>${thread}`;
      h += kv([["Pico", `${peak} acciones en paralelo en ${monthLabel(pm)}`], ["Lectura", peak >= OVER ? "Sobrecargado: redistribuir o secuenciar acciones" : peak === 2 ? "Al límite: vigilar" : "Carga sostenible"]]);
      h += sec("Acciones a su cargo", D.acciones.filter((a) => a.resp === o).map((a) => a.id));
    }
    $("#drawer-body").innerHTML = h;
  }

  // ───────── Foco / hilo ─────────
  function applyFocus() {
    scene.renderCaption();
    const id = state.sel;
    document.body.classList.toggle("focusing", !!id);
    const fb = new Set(battlesOf(id));
    const extra = new Set([id]);
    if (id && A[id]) { A[id].deps.forEach((d) => extra.add(d)); D.acciones.filter((x) => x.deps.includes(id)).forEach((x) => extra.add(x.id)); }
    document.querySelectorAll("[data-b]").forEach((el) => {
      const bs = (el.getAttribute("data-b") || "").split(" ").filter(Boolean);
      const lit = !id || extra.has(el.getAttribute("data-id")) || bs.some((b) => fb.has(b));
      el.classList.toggle("lit", lit);
    });
    document.querySelectorAll(".sel").forEach((el) => { if (el.tagName !== "circle" && el.tagName !== "rect") el.classList.remove("sel"); });
    if (id) document.querySelectorAll(`[data-sel="${CSS.escape(id)}"]`).forEach((el) => { if (el.tagName !== "g" && !el.classList.contains("dr-link") && !el.classList.contains("ref")) el.classList.add("sel"); });
  }

  const scene = { renderScene() {}, renderCaption() {} };

  function renderAll() {
    scene.renderScene();
    renderHeader(); renderSteps(); renderSwot();
    renderOppTable(); renderOppChart(); renderMwb();
    renderGantt(); renderMatrix(); renderCross();
    renderTiles(); renderAreaSeg(); renderLoad(); renderSkills(); renderOwners(); renderBudget(); renderTools(); renderDecisions();
    renderDrawer(); applyFocus(); markStep();
  }

  function select(id, { drawer = true } = {}) {
    state.sel = state.sel === id && drawer ? null : id || null;
    state.drawer = drawer;
    renderHeader(); renderOppChart(); renderGantt();
    if (drawer) renderDrawer(); else { $("#drawer").classList.remove("open"); }
    applyFocus();
  }

  // ───────── Eventos ─────────
  document.addEventListener("click", (e) => {
    const pip = e.target.closest("[data-pip]");
    if (pip) {
      e.stopPropagation();
      const [id, key, n] = pip.dataset.pip.split("|");
      D.oportunidades[id][key] = +n;
      renderOppTable(); renderOppChart(); scene.renderScene(); if (state.sel) renderDrawer(); applyFocus();
      return;
    }
    const chip = e.target.closest("[data-chip]");
    if (chip) { const id = chip.dataset.chip; state.sel = id || null; $("#drawer").classList.remove("open"); renderHeader(); renderOppChart(); renderGantt(); applyFocus(); return; }
    const dec = e.target.closest("[data-dec]");
    if (dec) {
      const id = dec.dataset.dec;
      state.dec.has(id) ? state.dec.delete(id) : state.dec.add(id);
      scene.renderScene(); renderSteps(); renderTiles(); renderLoad(); renderSkills(); renderBudget(); renderDecisions(); renderDrawer(); applyFocus(); markStep();
      return;
    }
    const ar = e.target.closest("[data-area]");
    if (ar) { state.area = ar.dataset.area; renderAreaSeg(); renderLoad(); applyFocus(); return; }
    const sel = e.target.closest("[data-sel]");
    if (sel) {
      const id = sel.dataset.sel;
      if (sel.classList.contains("dr-link") || sel.classList.contains("ref")) { state.sel = id; renderHeader(); renderOppChart(); renderGantt(); renderDrawer(); applyFocus(); }
      else select(id);
      return;
    }
    const go = e.target.closest("[data-goto]");
    if (go) { document.getElementById(go.dataset.goto).scrollIntoView({ behavior: "smooth" }); return; }
  });
  $("#drawer-close").addEventListener("click", () => { state.sel = null; renderHeader(); renderOppChart(); renderGantt(); renderDrawer(); applyFocus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.sel) { state.sel = null; renderHeader(); renderOppChart(); renderGantt(); renderDrawer(); applyFocus(); } });
  $("#dec-all").addEventListener("click", (e) => { e.stopPropagation(); D.decisiones.forEach((d) => state.dec.add(d.id)); renderAll(); });
  $("#dec-none").addEventListener("click", (e) => { e.stopPropagation(); state.dec.clear(); renderAll(); });
  document.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.weight;
    if (!k) return;
    state.weights[k] = +e.target.value;
    $("#w-" + k).textContent = e.target.value;
    renderOppTable(); renderOppChart(); scene.renderScene(); applyFocus();
  });

  // tooltip
  const tipEl = $("#tip");
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) { tipEl.classList.remove("show"); return; }
    tipEl.innerHTML = t.getAttribute("data-tip");
    tipEl.classList.add("show");
  });
  document.addEventListener("mousemove", (e) => {
    if (!tipEl.classList.contains("show")) return;
    const r = tipEl.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  });

  // paso activo según scroll
  let current = "s-swot";
  function markStep() { document.querySelectorAll("[data-step]").forEach((a) => a.classList.toggle("on", a.dataset.step === current)); }
  const io = new IntersectionObserver((ents) => {
    for (const en of ents) if (en.isIntersecting) { current = en.target.id; markStep(); }
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".stage").forEach((s) => io.observe(s));

  renderWeights();
  renderAll();
})();
