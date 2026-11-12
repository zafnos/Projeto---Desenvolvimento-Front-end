/*
 * Mapa ilustrado do campus UNIPÊ — renderizador em SVG (JavaScript puro, sem dependências).
 *
 * Uso:
 *   CampusMap.render(document.querySelector('#mapa'), CAMPUS_DATA, { rotacao: 22 });
 *
 * Todo o desenho é gerado a partir de `campus-data.js`:
 *   - coordenadas em "unidades de planta" (1 unidade ≈ 0,74 m), vindas da imagem de satélite;
 *   - cada prédio é um conjunto de "partes" (retângulos com altura e tipo de telhado);
 *   - a projeção é axonométrica (vista aérea oblíqua, como o maps.sau.edu).
 *
 * Cada prédio vira <g class="predio" data-id="..." data-nome="..." data-quadra="...">,
 * então dá para ligar eventos (clique, hover, tooltip) com JS/CSS comum.
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    rotacao: 22,          // graus: gira o campus na tela
    inclinacao: 0.62,     // seno do ângulo de visão (0.5 = mais rasante, 0.8 = mais de cima)
    exagero: 1.15,        // multiplica as alturas
    margem: 60,           // margem em volta do limite do campus (unidades de tela)
    neblina: true,        // esmaece o entorno, como no mapa da SAU
    panZoom: true,        // arrastar / roda do mouse / pinça
    seed: 11,
  };

  const PAL = {
    grama: '#8cbf5a', gramaClara: '#a6cf6e', seco: '#b8bd7c', mata: '#3f6b32',
    pav: '#dcd8cf', pavBorda: '#c3beb2', meioFio: '#ece9e2',
    parede: [241, 233, 219], janela: '#5d6f80', vidro: '#8fb3cc',
    telha: [204, 104, 60], metal: [158, 165, 171], cinza: [142, 149, 156], branco: [234, 236, 238],
    sombra: 'rgba(24,46,30,0.30)', neblina: '#dfe6ea',
    pista: '#dedad2', pistaFaixa: '#f3f1ec', campo: '#86b252', campoListra: '#92bb5e',
    agua: '#4fb8e6', aguaRaia: '#e8f7ff', deck: '#e8e1d2',
    areia2: '#dccfa6', trilha: '#eee6c9', arbusto: '#a9b272', painel: '#3d7db6',
    quadraBasquete: '#4c87b9', quadraCimento: '#cfd2cc', areia: '#e8d9b0',
  };
  const CARROS = ['#f4f4f4', '#f4f4f4', '#d6d9dc', '#9aa1a8', '#2b2f33', '#2b2f33', '#a83232', '#2f5d9c', '#e6e2d6'];
  const ARVORES = [
    ['#2f5f2a', '#4f8a3a', '#7fb555'],
    ['#2a5426', '#467d33', '#6ea64a'],
    ['#38662c', '#5b9a3f', '#93c562'],
    ['#2c4f2c', '#3f7140', '#679c5c'],
  ];

  // ---------- utilidades ----------
  const rgb = (c, f = 1) => `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`;
  const fx = n => Math.round(n * 10) / 10;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function norm(v) { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  function render(svg, data, opts = {}) {
    const o = Object.assign({}, DEFAULTS, opts);
    const rand = rng(o.seed);
    const th = o.rotacao * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
    const k = o.inclinacao, hz = Math.sqrt(1 - k * k) * o.exagero;
    const lim = data.limite;
    const cx = lim.reduce((a, p) => a + p[0], 0) / lim.length;
    const cy = lim.reduce((a, p) => a + p[1], 0) / lim.length;

    // planta -> planta girada (x1,y1) ; y1 maior = mais perto de quem olha
    const R = (x, y) => [cs * (x - cx) - sn * (y - cy), sn * (x - cx) + cs * (y - cy)];
    const S = (x1, y1, z = 0) => [x1, y1 * k - z * hz];
    const P = (x, y, z = 0) => { const r = R(x, y); return S(r[0], r[1], z); };
    const pts = arr => arr.map(p => fx(p[0]) + ',' + fx(p[1])).join(' ');
    const groundMatrix = `matrix(${cs},${k * sn},${-sn},${k * cs},${-cs * cx + sn * cy},${k * (-sn * cx - cs * cy)})`;

    // luz (direção "para a luz" no espaço girado): vem do alto à esquerda, por trás
    const LUZ = norm([-0.55, -0.35, 0.78]);
    const VIEW = [0, Math.sqrt(1 - k * k), k];
    const SOMB = [0.62, 0.34]; // deslocamento da sombra por unidade de altura (espaço girado)

    // ---------- viewBox ----------
    const limS = lim.map(p => P(p[0], p[1]));
    let minX = Math.min(...limS.map(p => p[0])) - o.margem, maxX = Math.max(...limS.map(p => p[0])) + o.margem;
    let minY = Math.min(...limS.map(p => p[1])) - o.margem - 20, maxY = Math.max(...limS.map(p => p[1])) + o.margem;
    const vb = [minX, minY, maxX - minX, maxY - minY];

    const BIG = [vb[0] - vb[2] * 2, vb[1] - vb[3] * 2, vb[2] * 5, vb[3] * 5];
    const bigRect = extra => `<rect x="${fx(BIG[0])}" y="${fx(BIG[1])}" width="${fx(BIG[2])}" height="${fx(BIG[3])}" ${extra}/>`;
    const cS = P(cx, cy);
    const grow = (f, z) => lim.map(p => { const q = P(p[0], p[1], z); return [cS[0] + (q[0] - cS[0]) * f, cS[1] + (q[1] - cS[1]) * f]; });
    const UPM = data.meta.unitsPerMeter || 1.359;
    const out = [];
    out.push(`<defs>
      <filter id="cm-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="cm-soft"><feGaussianBlur stdDeviation="0.8"/></filter>
      <filter id="cm-blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
      <mask id="cm-mask2" maskUnits="userSpaceOnUse" x="${BIG[0]}" y="${BIG[1]}" width="${BIG[2]}" height="${BIG[3]}">
        ${bigRect('fill="#fff"')}
        <polygon points="${pts(grow(1.5, 0))}" fill="#000" filter="url(#cm-blur2)"/>
      </mask>
      <mask id="cm-mask" maskUnits="userSpaceOnUse" x="${BIG[0]}" y="${BIG[1]}" width="${BIG[2]}" height="${BIG[3]}">
        ${bigRect('fill="#fff"')}
        <g filter="url(#cm-blur)" fill="#000">
          <polygon points="${pts(lim.map(p => P(p[0], p[1], 0)))}"/>
          <polygon points="${pts(lim.map(p => P(p[0], p[1], 14)))}"/>
        </g>
      </mask>
      ${ARVORES.map((c, i) => `
      <radialGradient id="cm-tg${i}" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stop-color="${c[2]}"/><stop offset="0.55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/>
      </radialGradient>
      <g id="cm-t${i}">
        <circle cx="0.18" cy="0.12" r="0.92" fill="${c[0]}"/>
        <circle cx="-0.28" cy="0.18" r="0.62" fill="url(#cm-tg${i})"/>
        <circle cx="0.3" cy="-0.05" r="0.66" fill="url(#cm-tg${i})"/>
        <circle cx="-0.05" cy="-0.32" r="0.66" fill="url(#cm-tg${i})"/>
      </g>`).join('')}
      <g id="cm-palm">
        ${[0, 52, 104, 156, 208, 260, 312].map(a => `<path d="M0 0Q${fx(2.2 * Math.cos(a * Math.PI / 180))} ${fx(2.2 * Math.sin(a * Math.PI / 180) * 0.6 - 1.2)} ${fx(4.2 * Math.cos(a * Math.PI / 180))} ${fx(4.2 * Math.sin(a * Math.PI / 180) * 0.6 + 0.9)}" stroke="${a % 104 ? '#3f7a32' : '#5d9a3e'}" stroke-width="1.15" fill="none" stroke-linecap="round"/>`).join('')}
        <circle r="0.7" fill="#6b5a3a"/>
      </g>
    </defs>`);
    out.push(bigRect(`fill="${PAL.neblina}"`));

    // ---------- CHÃO (desenhado em coordenadas de planta com uma única matriz) ----------
    const W = data.meta.width, H = data.meta.height, EXT = data.meta.ext || 0;
    const g = [];
    g.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${PAL.grama}"/>`);
    // entorno a leste: areal com trilhas e arbustos (como na foto de satélite)
    g.push(`<rect x="${W - 3}" y="-200" width="${EXT + 500}" height="${H + 400}" fill="${PAL.areia2}"/>`);
    {
      let d = '', bl = '';
      for (let i = 0; i < 46; i++) {
        const x = W + 8 + rand() * (EXT + 220), y = rand() * H, rx = 7 + rand() * 16, ry = 5 + rand() * 11;
        bl += `<ellipse cx="${fx(x)}" cy="${fx(y)}" rx="${fx(rx)}" ry="${fx(ry)}" transform="rotate(${Math.round(rand() * 180)} ${fx(x)} ${fx(y)})"/>`;
      }
      for (let i = 0; i < 9; i++) {
        let x = W + 15 + rand() * (EXT + 150), y = rand() * H, ang = rand() * 6.28;
        const pt = [];
        for (let j = 0; j < 26; j++) { pt.push([x, y]); ang += (rand() - 0.5) * 1.5; x += Math.cos(ang) * 13; y += Math.sin(ang) * 13; if (x < W + 8) { x = W + 8; ang = -ang; } }
        d += `M${fx(pt[0][0])} ${fx(pt[0][1])}`;
        for (let j = 1; j < pt.length - 1; j++) d += `Q${fx(pt[j][0])} ${fx(pt[j][1])} ${fx((pt[j][0] + pt[j + 1][0]) / 2)} ${fx((pt[j][1] + pt[j + 1][1]) / 2)}`;
      }
      g.push(`<g fill="${PAL.arbusto}" opacity="0.55">${bl}</g><path d="${d}" stroke="${PAL.trilha}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`);
    }
    // contornos vetorizados da foto, arredondados com curvas quadráticas
    const suave = d => d.replace(/M([^MZ]+)Z/g, (m, body) => {
      const n = body.trim().split(/\s+/).map(Number), q = [];
      for (let i = 0; i + 1 < n.length; i += 2) q.push([n[i], n[i + 1]]);
      if (q.length < 5) return m;
      const mid = (u, v) => fx((u[0] + v[0]) / 2) + ' ' + fx((u[1] + v[1]) / 2);
      let r = 'M' + mid(q[q.length - 1], q[0]);
      for (let i = 0; i < q.length; i++) r += 'Q' + q[i][0] + ' ' + q[i][1] + ' ' + mid(q[i], q[(i + 1) % q.length]);
      return r + 'Z';
    });
    g.push(`<path d="${suave(data.chao.seco)}" fill="${PAL.seco}" opacity="0.7"/>`);
    g.push(`<path d="${suave(data.chao.mata)}" fill="${PAL.mata}"/>`);
    g.push(`<path d="${suave(data.chao.pavimento)}" fill="${PAL.pav}" stroke="${PAL.pavBorda}" stroke-width="0.7" vector-effect="non-scaling-stroke" fill-rule="evenodd"/>`);
    // rodovia BR-230 (via marginal + 2 pistas de 3 faixas) e mata do outro lado
    const RD = data.meta.rodovia || { y0: 1003, inclinacao: 0.19 };
    const ry = (x, off) => RD.y0 + x * RD.inclinacao + off;
    const X0 = -300, X1 = W + EXT + 300;
    const band = (o0, o1, extra) => `<polygon points="${X0},${fx(ry(X0, o0))} ${X1},${fx(ry(X1, o0))} ${X1},${fx(ry(X1, o1))} ${X0},${fx(ry(X0, o1))}" ${extra}/>`;
    g.push(band(66, 400, `fill="${PAL.mata}"`));
    g.push(band(1, 66, `fill="#8f9196"`));
    g.push(band(1, 11, `fill="#a3a5a8"`));
    g.push(band(12.5, 14.5, `fill="${PAL.grama}"`));
    g.push(band(37, 40, `fill="${PAL.grama}"`));
    const lanePath = off => `M${X0} ${fx(ry(X0, off))}L${X1} ${fx(ry(X1, off))}`;
    g.push(`<path d="${[22.5, 29.5, 47.5, 54.5].map(lanePath).join('')}" stroke="#fff" stroke-width="0.5" stroke-dasharray="4 5" opacity="0.85" fill="none"/>`);
    g.push(`<path d="${lanePath(6)}" stroke="#f2c14e" stroke-width="0.4" stroke-dasharray="3 3" fill="none"/>`);
    g.push(`<path d="${[15.5, 36, 41, 64.5].map(lanePath).join('')}" stroke="#eceae4" stroke-width="0.45" fill="none"/>`);
    const rodAng = Math.atan(RD.inclinacao) * 180 / Math.PI;
    for (const off of [3.5, 8.5, 19, 26, 33, 44, 51, 58]) {
      for (let t = X0 + rand() * 30; t < X1; t += 12 + rand() * 38) g.push(car(t, ry(t, off), rodAng, rand));
    }
    // lago
    if (data.lago) g.push(`<polygon points="${pts(data.lago)}" fill="#4e8fa0" stroke="#7fae6a" stroke-width="2.2" stroke-linejoin="round"/><polygon points="${pts(data.lago)}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="0.5" transform="translate(-1.5,-1.5)"/>`);
    // superfícies esportivas
    for (const s of data.superficies) g.push(superficie(s));
    // estacionamentos com carros
    for (const p of data.estacionamentos) g.push(estacionamento(p, rand));
    out.push(`<g class="chao" transform="${groundMatrix}">${g.join('')}</g>`);

    // ---------- OBJETOS 3D ----------
    const partsU = [], shB = [];
    const addPart = (g0, sibs, wrap) => {
      const r = parte(g0, sibs);
      r.key += (g0.p.bias || 0) * 0.01;
      r.html = wrap(r.svg);
      partsU.push(r); shB.push(r.shadow);
    };
    for (const b of data.predios) {
      const tint = 0.96 + 0.07 * rand();
      const gs = b.parts.map(p => geom(p, tint));
      for (const g0 of gs) addPart(g0, gs.filter(x => x !== g0), svgP => `<g class="predio-parte" data-id="${b.id}" data-nome="${b.nome}" data-quadra="${b.quadra}">${svgP}</g>`);
    }
    for (const c of data.casas) {
      addPart(geom({ cx: c[0], cy: c[1], L: c[2], W: c[3], ang: c[4], h: 4.2 * UPM * 0.9, kind: 'hip', roof: 'telha', casa: true }, 0.92 + 0.14 * rand()), [], svgP => `<g class="casa">${svgP}</g>`);
    }
    const nP = partsU.length;
    // árvores e palmeiras (descarta as que caírem dentro de algum prédio)
    const trees = [];
    const addTree = (x, y, r, palm) => {
      const q = R(x, y);
      for (const p of partsU) if (q[0] > p.minX1 - 1 && q[0] < p.maxX1 + 1 && q[1] > p.minY1 - 1 && q[1] < p.maxY1 + 1 && inPoly(q[0], q[1], p.footX)) return;
      trees.push({ x1: q[0], y1: q[1], r, key: q[1], palm, t: Math.abs(Math.round(x * 7 + y * 13)) % ARVORES.length });
    };
    for (const [x, y, r] of data.arvores) addTree(x, y, r, false);
    for (const [x, y] of (data.palmeiras || [])) addTree(x, y, 2.6, true);

    // quem fica na frente de quem: compara as plantas ao longo da linha de visada
    const pred = Array.from({ length: nP + trees.length }, () => []);
    for (let i = 0; i < nP; i++) for (let j = i + 1; j < nP; j++) {
      const A = partsU[i], B = partsU[j];
      const x0 = Math.max(A.minX1, B.minX1), x1 = Math.min(A.maxX1, B.maxX1);
      if (x1 - x0 < 0.3) continue;
      if (A.minY1 - B.maxY1 > A.htop * hz / k + 4 || B.minY1 - A.maxY1 > B.htop * hz / k + 4) continue;
      let v = 0;
      for (let q = 1; q <= 7; q++) {
        const x = x0 + (x1 - x0) * q / 8, ya = yRange(A.foot, x), yb = yRange(B.foot, x);
        if (!ya || !yb) continue;
        if (ya[0] >= yb[1] - 0.4) v += 1; else if (yb[0] >= ya[1] - 0.4) v -= 1;
        else v += 0.5 * Math.sign((ya[0] + ya[1]) - (yb[0] + yb[1]));
      }
      if (v > 0) pred[i].push(j); else if (v < 0) pred[j].push(i);
    }
    const shT = [];
    trees.forEach((t, ti) => {
      const i = nP + ti;
      const alt = t.palm ? (8.5 * UPM * hz + 4) / k : ((t.r * 0.85 + 2.2) * hz + t.r) / k + 2;
      for (let j = 0; j < nP; j++) {
        const p = partsU[j];
        if (t.x1 + t.r < p.minX1 || t.x1 - t.r > p.maxX1) continue;
        const cobre = p.htop * hz / k + t.r + 2;
        if (t.y1 - p.maxY1 > alt || p.minY1 - t.y1 > cobre) continue;
        const yr = yRange(p.foot, Math.max(p.minX1, Math.min(p.maxX1, t.x1)));
        if (!yr) continue;
        if (t.y1 >= (yr[0] + yr[1]) / 2) { if (t.y1 - yr[1] < alt) pred[i].push(j); }
        else if (yr[0] - t.y1 < cobre) pred[j].push(i);
      }
      const sr = t.palm ? 6 : t.r * 1.4;
      const [sx, sy] = S(t.x1 + SOMB[0] * sr, t.y1 + SOMB[1] * sr);
      const rr = t.palm ? 3 : t.r;
      shT.push(`M${fx(sx - rr)} ${fx(sy)}a${rr} ${fx(rr * k)} 0 1 0 ${fx(2 * rr)} 0a${rr} ${fx(rr * k)} 0 1 0 ${fx(-2 * rr)} 0`);
    });
    out.push(`<g class="sombras" opacity="0.3" fill="#182e1e"><path d="${shB.join('')}"/><path d="${shT.join('')}"/></g>`);

    const treeHtml = t => {
      const [X, Y] = S(t.x1, t.y1, 0);
      if (t.palm) {
        const top = Y - 8.5 * UPM * hz;
        return `<path d="M${fx(X)} ${fx(Y)}Q${fx(X + 1)} ${fx((Y + top) / 2)} ${fx(X + 0.6)} ${fx(top)}" stroke="#8a7350" stroke-width="0.8" fill="none"/><use href="#cm-palm" transform="translate(${fx(X + 0.6)},${fx(top)})"/>`;
      }
      const cyT = Y - (t.r * 0.85 + 2.2) * hz;
      return `<rect x="${fx(X - 0.5)}" y="${fx(cyT)}" width="1" height="${fx(Y - cyT)}" fill="#5b4632"/><use href="#cm-t${t.t}" transform="translate(${fx(X)},${fx(cyT)}) scale(${t.r})"/>`;
    };
    const keys = partsU.map(p => p.key).concat(trees.map(t => t.key));
    const idx = keys.map((_, i) => i).sort((a, b) => keys[a] - keys[b]);
    const state = new Uint8Array(keys.length), ordem = [];
    const visit = i => {
      if (state[i]) return;
      state[i] = 1;
      const pr = pred[i];
      if (pr.length) { pr.sort((a, b) => keys[a] - keys[b]); for (const j of pr) if (!state[j]) visit(j); }
      state[i] = 2; ordem.push(i);
    };
    for (const i of idx) visit(i);
    out.push(`<g class="objetos">${ordem.map(i => i < nP ? partsU[i].html : treeHtml(trees[i - nP])).join('')}</g>`);

    if (o.neblina) {
      out.push(bigRect(`class="neblina" fill="${PAL.neblina}" opacity="0.55" mask="url(#cm-mask)" pointer-events="none"`));
      out.push(bigRect(`class="neblina" fill="${PAL.neblina}" opacity="0.95" mask="url(#cm-mask2)" pointer-events="none"`));
    }

    svg.setAttribute('viewBox', vb.map(fx).join(' '));
    svg.innerHTML = out.join('');
    if (o.panZoom) panZoom(svg, vb);
    const geo = data.meta.geo;
    const fromLatLng = (lat, lng, z = 0) => {
      const a = geo.ang * Math.PI / 180, c0 = Math.cos(-geo.lat * Math.PI / 180);
      const E = (lng - geo.lng) * 111320 * c0, N = (lat - geo.lat) * 111320;
      const dx = (Math.cos(a) * E + Math.sin(a) * N) / geo.m, dy = (-Math.sin(a) * E + Math.cos(a) * N) / geo.m;
      return P(geo.cx + dx, geo.cy - dy, z);
    };
    const n0 = fromLatLng(geo.lat, geo.lng), n1 = fromLatLng(geo.lat + 0.0005, geo.lng);
    const norte = Math.atan2(n1[0] - n0[0], -(n1[1] - n0[1])) * 180 / Math.PI; // graus, horário a partir do "para cima" da tela
    return { viewBox: vb, project: P, fromLatLng, norte, pontos: (data.pontos || []).map(p => ({ ...p, tela: P(p.xy[0], p.xy[1], 0) })) };

    // ====================================================================
    function frontAt(foot, x) {
      let best = null;
      for (let i = 0; i < foot.length; i++) {
        const a = foot[i], b = foot[(i + 1) % foot.length];
        if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
        const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        best = best === null ? y : Math.max(best, y);
      }
      return best;
    }

    function car(x, y, ang, rnd) {
      const c = CARROS[Math.floor(rnd() * CARROS.length)];
      return `<g transform="translate(${fx(x)},${fx(y)}) rotate(${fx(ang)})"><rect x="-3" y="-1.25" width="6" height="2.5" rx="0.8" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="0.25"/><rect x="-1.2" y="-0.95" width="2.6" height="1.9" rx="0.5" fill="rgba(40,55,70,.55)"/></g>`;
    }

    function rectCorners(p, grow = 0) {
      const a = p.ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const hl = p.L / 2 + grow, hw = p.W / 2 + grow;
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [p.cx + su * hl * ux + sv * hw * vx, p.cy + su * hl * uy + sv * hw * vy]);
    }

    function superficie(s) {
      const a = s.ang;
      const T = `translate(${s.cx},${s.cy}) rotate(${a})`;
      if (s.kind === 'pista') {
        const L = s.L, Wd = s.W, rr = Wd / 2, inn = 9.5;
        const stad = (l, w) => { const r = w / 2, h = l / 2 - r; return `M${-h} ${-r}H${h}A${r} ${r} 0 0 1 ${h} ${r}H${-h}A${r} ${r} 0 0 1 ${-h} ${-r}Z`; };
        let lanes = '';
        for (let i = 1; i < 6; i++) lanes += `<path d="${stad(L - i * 3.2, Wd - i * 3.2)}" fill="none" stroke="${PAL.pistaFaixa}" stroke-width="0.35"/>`;
        const capR = rr - inn, fl = (L - 2 * rr) + 2 * capR * 0.62, fw = Wd - 2 * inn - 27;
        let stripes = '';
        for (let i = 0; i < 10; i++) if (i % 2) stripes += `<rect x="${-fl / 2 + i * fl / 10}" y="${-fw / 2}" width="${fl / 10}" height="${fw}" fill="${PAL.campoListra}"/>`;
        const xe = fl / 2, xt = L / 2 - inn;
        const yy = Math.sqrt(Math.max(0, capR * capR - (xe - (L / 2 - rr)) ** 2));
        const capD = s.extremos ? `<path d="M${-xe} ${-yy}A${capR} ${capR} 0 0 0 ${-xe} ${yy}Z" fill="${PAL.pista}"/>` : '';
        const capT = s.extremos ? `<g fill="${PAL.pista}">
            <path d="M${xe + 1.5} -3L${xe + 15} -9L${xe + 12} -21Z"/><path d="M${xe + 1.5} 3L${xe + 15} 9L${xe + 12} 21Z"/>
            <rect x="${xe}" y="-1.3" width="${xt - xe - 1.5}" height="2.6"/></g>` : '';
        return `<g transform="${T}">
          <path d="${stad(L + 4, Wd + 4)}" fill="#c9c4b9"/>
          <path d="${stad(L, Wd)}" fill="${PAL.pista}"/>${lanes}
          <path d="${stad(L - 2 * inn, Wd - 2 * inn)}" fill="${PAL.campo}"/>${capD}
          <rect x="${-fl / 2}" y="${-fw / 2}" width="${fl}" height="${fw}" fill="${PAL.campo}"/>
          <g>${stripes}</g>${capT}
          <g fill="none" stroke="#f3f6ee" stroke-width="0.6">
            <rect x="${-fl / 2}" y="${-fw / 2}" width="${fl}" height="${fw}"/>
            <line x1="0" y1="${-fw / 2}" x2="0" y2="${fw / 2}"/><circle r="9"/>
            <rect x="${-fl / 2}" y="${-20}" width="18" height="40"/><rect x="${fl / 2 - 18}" y="${-20}" width="18" height="40"/>
          </g></g>`;
      }
      const x = -s.L / 2, y = -s.W / 2;
      if (s.kind === 'piscina') {
        let r = '';
        for (let i = 1; i < 6; i++) r += `<line x1="${x + 1.5}" y1="${y + i * s.W / 6}" x2="${-x - 1.5}" y2="${y + i * s.W / 6}" stroke="${PAL.aguaRaia}" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>`;
        return `<g transform="${T}"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}" fill="${PAL.agua}" stroke="#fff" stroke-width="0.8"/>${r}</g>`;
      }
      if (s.kind === 'deck') return `<g transform="${T}"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}" fill="${PAL.deck}" stroke="#d1c8b5" stroke-width="0.5"/></g>`;
      if (s.kind === 'areia') return `<g transform="${T}"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}" fill="${PAL.areia}" stroke="#fff" stroke-width="0.6"/><line x1="${x}" y1="0" x2="${-x}" y2="0" stroke="#fff" stroke-width="0.5" transform="rotate(90)"/></g>`;
      if (s.kind === 'campo') {
        let st = '';
        for (let i = 0; i < 8; i++) if (i % 2) st += `<rect x="${x + i * s.L / 8}" y="${y}" width="${s.L / 8}" height="${s.W}" fill="${PAL.campoListra}"/>`;
        return `<g transform="${T}"><rect x="${x - 3}" y="${y - 3}" width="${s.L + 6}" height="${s.W + 6}" fill="${PAL.campo}"/>${st}<g fill="none" stroke="#f3f6ee" stroke-width="0.6"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}"/><line x1="0" y1="${y}" x2="0" y2="${-y}"/><circle r="8"/><rect x="${x}" y="-16" width="15" height="32"/><rect x="${-x - 15}" y="-16" width="15" height="32"/></g></g>`;
      }
      // quadras
      if (s.surf === 'poli') {
        let c = '';
        for (const k of [-1, 1]) { const ox = k * s.L / 4; c += `<rect x="${ox - s.L / 4 + 2.5}" y="${y + 3}" width="${s.L / 2 - 5}" height="${s.W - 6}"/><line x1="${ox}" y1="${y + 3}" x2="${ox}" y2="${-y - 3}"/><circle cx="${ox}" cy="0" r="2.6"/>`; }
        return `<g transform="${T}"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}" fill="#d9dcd7" stroke="#c4c7c1" stroke-width="0.6"/><g fill="none" stroke="#fff" stroke-width="0.45">${c}</g></g>`;
      }
      const cor = s.surf === 'basquete' ? PAL.quadraBasquete : PAL.quadraCimento;
      const inner = s.surf === 'basquete'
        ? `<rect x="${x + 4}" y="${y + 4}" width="${s.L - 8}" height="${s.W - 8}" fill="#d77a43"/><g fill="none" stroke="#fff" stroke-width="0.45"><rect x="${x + 4}" y="${y + 4}" width="${s.L - 8}" height="${s.W - 8}"/><line x1="${x + 4}" y1="0" x2="${-x - 4}" y2="0"/><circle r="3.5"/></g>`
        : `<g fill="none" stroke="#fff" stroke-width="0.45"><rect x="${x + 3}" y="${y + 3}" width="${s.L - 6}" height="${s.W - 6}"/><line x1="${x + 3}" y1="0" x2="${-x - 3}" y2="0"/></g>`;
      return `<g transform="${T}"><rect x="${x}" y="${y}" width="${s.L}" height="${s.W}" fill="${cor}"/>${inner}</g>`;
    }

    function estacionamento(p, rnd) {
      const a = p.rows_ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const poly = p.poly;
      const c0 = poly.reduce((s, q) => [s[0] + q[0] / poly.length, s[1] + q[1] / poly.length], [0, 0]);
      const loc = poly.map(q => [(q[0] - c0[0]) * ux + (q[1] - c0[1]) * uy, (q[0] - c0[0]) * vx + (q[1] - c0[1]) * vy]);
      const mnU = Math.min(...loc.map(q => q[0])), mxU = Math.max(...loc.map(q => q[0]));
      const mnV = Math.min(...loc.map(q => q[1])), mxV = Math.max(...loc.map(q => q[1]));
      let s = `<polygon points="${pts(poly)}" fill="#cfcac0"/>`;
      let lines = '', cars = '';
      for (let v = mnV + 7; v < mxV - 5; v += 19) {
        for (const dv of [-3.2, 3.2]) {
          for (let u = mnU + 3; u < mxU - 3; u += 3.6) {
            const X = c0[0] + u * ux + (v + dv) * vx, Y = c0[1] + u * uy + (v + dv) * vy;
            if (!inPoly(X, Y, poly)) continue;
            lines += `M${fx(X + 1.8 * ux - 3 * dv / 3.2 * vx)} ${fx(Y + 1.8 * uy - 3 * dv / 3.2 * vy)}l${fx(vx * dv / 3.2 * 3)} ${fx(vy * dv / 3.2 * 3)}`;
            if (rnd() < 0.55) cars += car(X, Y, p.rows_ang + 90, rnd);
          }
        }
      }
      return s + `<path d="${lines}" stroke="#f2efe8" stroke-width="0.35" fill="none"/>` + cars;
    }

    // ---------- prédios ----------
    function face(poly3, cor, extra = '') {
      return `<polygon points="${pts(poly3.map(q => S(q[0], q[1], q[2])))}" fill="${cor}" ${extra}/>`;
    }
    function shade(n) {
      const d = n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2];
      return 0.62 + 0.5 * Math.max(0, d);
    }
    function normal3(a, b, c) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
      if (n[2] < 0) n = n.map(x => -x);
      return n;
    }
    function wall(a, b, h0, h1, casa, plain) {
      // a,b no espaço girado; parede vertical voltada para fora
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const n = [dy / len, -dx / len, 0];
      if (n[1] * VIEW[1] <= 1e-6) return '';
      const f = 0.66 + 0.4 * Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1]) + 0.08;
      let s = face([[a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1]], rgb(PAL.parede, f));
      // janelas
      const fl = Math.max(1, Math.round((h1 - h0) / (casa ? 99 : 4.6)));
      const fh = (h1 - h0) / fl; let d = '';
      const step = casa ? 5 : 3.4, ww = casa ? 1.6 : 1.9;
      const nWin = plain ? 0 : Math.floor((len - 3) / step);
      if (nWin >= 1) {
        const off = (len - nWin * step) / 2 + (step - ww) / 2;
        for (let i = 0; i < fl; i++) {
          const z0 = h0 + i * fh + fh * 0.38, z1 = h0 + i * fh + fh * 0.76;
          for (let j = 0; j < nWin; j++) {
            const t0 = (off + j * step) / len, t1 = (off + j * step + ww) / len;
            const p0 = [a[0] + dx * t0, a[1] + dy * t0], p1 = [a[0] + dx * t1, a[1] + dy * t1];
            const q = [S(p0[0], p0[1], z0), S(p1[0], p1[1], z0), S(p1[0], p1[1], z1), S(p0[0], p0[1], z1)];
            d += `M${q.map(v => fx(v[0]) + ' ' + fx(v[1])).join('L')}Z`;
          }
        }
        s += `<path d="${d}" fill="${PAL.janela}" opacity="${(0.55 + 0.25 * (1 - f)).toFixed(2)}"/>`;
      }
      // faixa de base
      s += face([[a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h0 + 0.6], [a[0], a[1], h0 + 0.6]], 'rgba(90,80,70,.35)');
      return s;
    }

    function yRange(foot, x) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < foot.length; i++) {
        const a = foot[i], b = foot[(i + 1) % foot.length];
        if ((a[0] - x) * (b[0] - x) > 0) continue;
        if (a[0] === b[0]) { lo = Math.min(lo, a[1], b[1]); hi = Math.max(hi, a[1], b[1]); continue; }
        const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
      return hi >= lo ? [lo, hi] : null;
    }
    function sinal(poly) { let A = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p[0] * q[1] - q[0] * p[1]; } return A >= 0 ? 1 : -1; }
    // trecho [t0,t1] do segmento a->b que fica dentro de um polígono convexo
    function segInside(a, b, poly) {
      const sg = sinal(poly), dx = b[0] - a[0], dy = b[1] - a[1];
      let t0 = 0, t1 = 1;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ey = q[1] - p[1];
        const f0 = sg * (ex * (a[1] - p[1]) - ey * (a[0] - p[0])), f1 = sg * (ex * dy - ey * dx);
        if (Math.abs(f1) < 1e-9) { if (f0 < 0) return null; continue; }
        const t = -f0 / f1;
        if (f1 > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
        if (t1 - t0 < 1e-6) return null;
      }
      return [t0, t1];
    }
    function clipBy(poly, f) {
      const r = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
        if (fa >= 0) r.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); r.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      return r;
    }
    function clipConvex(sub, clip) {
      const sg = sinal(clip); let r = sub;
      for (let i = 0; i < clip.length && r.length >= 3; i++) {
        const p = clip[i], q = clip[(i + 1) % clip.length];
        r = clipBy(r, v => sg * ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0])));
      }
      return r.length >= 3 ? r : [];
    }
    function area2(poly) { let A = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p[0] * q[1] - q[0] * p[1]; } return Math.abs(A); }

    // geometria de uma parte (planta girada, faces do telhado com a equação do plano)
    function geom(p, tint = 1) {
      const h = p.h, c = R(p.cx, p.cy), a = p.ang * Math.PI / 180;
      const U = [cs * Math.cos(a) - sn * Math.sin(a), sn * Math.cos(a) + cs * Math.sin(a)], V = [-U[1], U[0]];
      const at = (su, sv, z, grow = 0) => [c[0] + su * (p.L / 2 + grow) * U[0] + sv * (p.W / 2 + grow) * V[0], c[1] + su * (p.L / 2 + grow) * U[1] + sv * (p.W / 2 + grow) * V[1], z];
      const atAbs = (du, dv, z) => [c[0] + du * U[0] + dv * V[0], c[1] + du * U[1] + dv * V[1], z];
      const ring = gr => [at(-1, -1, 0, gr), at(1, -1, 0, gr), at(1, 1, 0, gr), at(-1, 1, 0, gr)].map(q => [q[0], q[1]]);
      const foot = ring(0), kind = p.kind || 'hip';
      const base = PAL[p.roof === 'metal' ? 'metal' : p.roof === 'cinza' ? 'cinza' : p.roof === 'branco' ? 'branco' : 'telha'];
      const longU = p.ridge === 'v' ? false : p.ridge === 'u' ? true : p.L >= p.W;
      const xs = foot.map(q => q[0]), ys = foot.map(q => q[1]);
      const g = { p, h, c, at, atAbs, foot, footX: ring(0.35), kind, base, longU, tint, htop: h, rh: 0, faces: null,
        minX1: Math.min(...xs), maxX1: Math.max(...xs), minY1: Math.min(...ys), maxY1: Math.max(...ys) };
      if (kind === 'hip' || kind === 'gable') {
        const ov = p.casa ? 0.6 : 1.2, span = longU ? p.W : p.L;
        const rh = kind === 'hip' ? Math.min(span * 0.24, 9) : Math.min(span * 0.22, 8);
        const A = at(-1, -1, h, ov), B = at(1, -1, h, ov), C = at(1, 1, h, ov), D = at(-1, 1, h, ov);
        let R1, R2, F;
        if (kind === 'hip') {
          const hl = Math.max((longU ? p.L : p.W) / 2 - span / 2, 0);
          R1 = longU ? atAbs(-hl, 0, h + rh) : atAbs(0, -hl, h + rh); R2 = longU ? atAbs(hl, 0, h + rh) : atAbs(0, hl, h + rh);
          F = longU ? [[A, B, R2, R1], [D, C, R2, R1], [A, D, R1], [B, C, R2]] : [[A, D, R2, R1], [B, C, R2, R1], [A, B, R1], [D, C, R2]];
        } else {
          R1 = longU ? at(-1, 0, h + rh, ov) : at(0, -1, h + rh, ov); R2 = longU ? at(1, 0, h + rh, ov) : at(0, 1, h + rh, ov);
          F = longU ? [[A, B, R2, R1], [D, C, R2, R1]] : [[A, D, R2, R1], [B, C, R2, R1]];
        }
        g.faces = F.map(f => {
          const n = normal3(f[0], f[1], f[2]);
          return { pts: f, cor: rgb(base, shade(n) * tint), plane: [-n[0] / n[2], -n[1] / n[2], f[0][2] + (n[0] * f[0][0] + n[1] * f[0][1]) / n[2]] };
        });
        g.R1 = R1; g.R2 = R2; g.rh = rh; g.htop = h + rh;
      }
      return g;
    }

    // desenha uma parte; `sibs` são as outras partes do mesmo prédio (para unir telhados e esconder paredes internas)
    function parte(g, sibs) {
      const { p, h, c, at, atAbs, foot, kind, base, longU, tint } = g;
      let svg = '', htop = g.htop, floatShadow = false;
      const near = sibs.filter(s => !(s.minX1 > g.maxX1 + 2 || s.maxX1 < g.minX1 - 2 || s.minY1 > g.maxY1 + 2 || s.maxY1 < g.minY1 - 2));
      const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

      const walls = () => {
        let s = '';
        for (let i = 0; i < 4; i++) {
          const a = foot[i], b = foot[(i + 1) % 4];
          if (!near.length) { s += wall(a, b, 0, h, p.casa); continue; }
          const cuts = [0, 1], ivs = [];
          for (const sb of near) {
            const iv = segInside(a, b, sb.footX);
            if (iv) { ivs.push([iv[0], iv[1], sb.h >= h - 0.8 ? Infinity : sb.h + sb.rh * 0.35]); cuts.push(iv[0], iv[1]); }
          }
          cuts.sort((x, y) => x - y);
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          let run = null;
          const flush = () => { if (run && (run[1] - run[0]) * len > 0.4) s += wall(lerp2(a, b, run[0]), lerp2(a, b, run[1]), run[2], h, p.casa, run[2] > 0); run = null; };
          for (let j = 0; j < cuts.length - 1; j++) {
            const ta = cuts[j], tb = cuts[j + 1];
            if (tb - ta < 1e-4) continue;
            const tm = (ta + tb) / 2; let z0 = 0;
            for (const iv of ivs) if (tm > iv[0] && tm < iv[1]) z0 = Math.max(z0, iv[2]);
            if (z0 >= h) { flush(); continue; }
            if (run && run[2] === z0) run[1] = tb; else { flush(); run = [ta, tb, z0]; }
          }
          flush();
        }
        return s;
      };
      const roofFaces = faces => faces
        .map(f => ({ f, d: f.pts.reduce((s, q) => s + q[1] * VIEW[1] + q[2] * VIEW[2], 0) / f.pts.length }))
        .sort((x, y) => x.d - y.d)
        .map(({ f }) => face(f.pts, f.cor || rgb(base, shade(normal3(f.pts[0], f.pts[1], f.pts[2])) * tint), f.extra || '')).join('');
      // união de telhados: onde o telhado de uma parte vizinha é mais alto, ele aparece por cima
      const uniao = () => {
        let s = '';
        for (const sb of near) {
          if (!sb.faces) continue;
          for (const G of sb.faces) for (const F of g.faces) {
            let poly = clipConvex(G.pts, F.pts);
            if (poly.length < 3) continue;
            const d0 = G.plane[0] - F.plane[0], d1 = G.plane[1] - F.plane[1], d2 = G.plane[2] - F.plane[2];
            poly = clipBy(poly, q => d0 * q[0] + d1 * q[1] + d2 - 0.03);
            if (poly.length < 3 || area2(poly) < 0.5) continue;
            s += face(poly.map(q => [q[0], q[1], G.plane[0] * q[0] + G.plane[1] * q[1] + G.plane[2]]), G.cor, `stroke="${G.cor}" stroke-width="0.2" stroke-linejoin="round"`);
          }
        }
        return s;
      };
      const post = (q, z0, z1, w = 0.45) => `<polygon points="${pts([S(q[0] - w, q[1], z0), S(q[0] + w, q[1], z0), S(q[0] + w, q[1], z1), S(q[0] - w, q[1], z1)])}" fill="${rgb(PAL.parede, 0.9)}"/>`;

      if (kind === 'hip' || kind === 'gable') {
        svg += walls();
        if (kind === 'gable') {
          const rh = g.rh;
          const ends = longU ? [[at(-1, -1, h), at(-1, 1, h), at(-1, 0, h + rh)], [at(1, -1, h), at(1, 1, h), at(1, 0, h + rh)]]
            : [[at(-1, -1, h), at(1, -1, h), at(0, -1, h + rh)], [at(-1, 1, h), at(1, 1, h), at(0, 1, h + rh)]];
          for (const e of ends) {
            const nn = [e[2][0] - c[0], e[2][1] - c[1]], ln = Math.hypot(nn[0], nn[1]);
            if (nn[1] <= 0 || near.some(sb => inPoly(e[2][0], e[2][1], sb.footX))) continue;
            svg += face(e, rgb(PAL.parede, 0.7 + 0.35 * Math.max(0, (nn[0] * LUZ[0] + nn[1] * LUZ[1]) / ln)));
          }
        }
        svg += roofFaces(g.faces);
        if (!p.casa) svg += ridgeLine(g.R1, g.R2) + tileLines(g.faces.slice(0, 2));
        if (p.painel || p.solar) svg += painel(g.faces.slice(0, 2));
        svg += uniao();
      } else if (kind === 'canopy') {
        floatShadow = true;
        const rh = Math.min(p.W, p.L) * 0.2; htop = h + rh;
        for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1]]) svg += post(at(su * 0.82, sv * 0.75, 0), 0, h - 1.2);
        let band = '';
        const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (let i = 0; i < 4; i++) {
          const A = at(...cn[i], h, 0.6), B = at(...cn[(i + 1) % 4], h, 0.6);
          const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy); if (-dx / len <= 0) continue;
          band += face([[A[0], A[1], h - 1.6], [B[0], B[1], h - 1.6], [B[0], B[1], h], [A[0], A[1], h]], '#2f5f9e');
          band += face([[A[0], A[1], h - 1.7], [B[0], B[1], h - 1.7], [B[0], B[1], h - 1.5], [A[0], A[1], h - 1.5]], '#f3f0ea');
        }
        const A = at(-1, -1, h, 1.4), B = at(1, -1, h, 1.4), C = at(1, 1, h, 1.4), D = at(-1, 1, h, 1.4);
        const hl = Math.max(0, p.L / 2 - p.W / 2), R1 = atAbs(-hl, 0, h + rh), R2 = atAbs(hl, 0, h + rh);
        svg += band + roofFaces([{ pts: [A, B, R2, R1] }, { pts: [D, C, R2, R1] }, { pts: [A, D, R1] }, { pts: [B, C, R2] }]) + ridgeLine(R1, R2);
      } else if (kind === 'placa') {
        for (let i = 0; i < 4; i++) svg += wall(foot[i], foot[(i + 1) % 4], 0, h, false, true);
        svg += face([at(-1, -1, h), at(1, -1, h), at(1, 1, h), at(-1, 1, h)], '#f7f6f2');
        const f0 = at(-0.9, 1, h * 0.25), f1 = at(0.9, 1, h * 0.25), f2 = at(0.9, 1, h * 0.55), f3 = at(-0.9, 1, h * 0.55);
        if (f0[1] > c[1]) { svg += face([f0, f1, f2, f3], '#2f5f9e'); const L0 = S(...at(-0.55, 1, h * 0.75)); svg += `<circle cx="${fx(L0[0])}" cy="${fx(L0[1])}" r="0.9" fill="#2f5f9e"/>`; }
      } else if (kind === 'slab') {
        floatShadow = true;
        const zA = h, zB = p.z1 != null ? p.z1 * UPM : h, th2 = 0.9;
        htop = Math.max(zA, zB) + 1.2;
        const zAt = su => zA + (zB - zA) * (su + 1) / 2;
        const n = Math.max(2, Math.round(p.L / 9));
        for (let i = 0; i <= n; i++) { const su = -1 + 2 * i / n, z = zAt(su) - th2; if (z > 0.8) svg += post(at(su, 0, 0), 0, z, 0.55); }
        const T = [at(-1, -1, zA), at(1, -1, zB), at(1, 1, zB), at(-1, 1, zA)], Bt = T.map(q => [q[0], q[1], q[2] - th2]);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, dx = T[j][0] - T[i][0], dy = T[j][1] - T[i][1], len = Math.hypot(dx, dy); if (-dx / len > 0.02) svg += face([Bt[i], Bt[j], T[j], T[i]], rgb([200, 200, 196], 0.85)); }
        svg += face(T, '#c9cbc6');
        let d = '';
        for (const sv of [-1, 1]) { const a1 = S(...at(-1, sv * 0.95, zA + 1.2)), b1 = S(...at(1, sv * 0.95, zB + 1.2)); d += `M${fx(a1[0])} ${fx(a1[1])}L${fx(b1[0])} ${fx(b1[1])}`; }
        svg += `<path d="${d}" stroke="#7d8790" stroke-width="0.35" fill="none"/>`;
      } else if (kind === 'flat') {
        const top = [at(-1, -1, h, 0.3), at(1, -1, h, 0.3), at(1, 1, h, 0.3), at(-1, 1, h, 0.3)];
        const inset = [at(-1, -1, h, -1.5), at(1, -1, h, -1.5), at(1, 1, h, -1.5), at(-1, 1, h, -1.5)];
        svg += walls() + face(top, rgb(base, 1.05 * tint)) + face(inset, rgb(base, 0.95 * tint), `stroke="${rgb(base, 0.8)}" stroke-width="0.4"`);
        const box = (du, dv, s) => {
          const b = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => atAbs(du + i * s, dv + j * s * 0.7, h));
          const t = b.map(q => [q[0], q[1], h + 1.6]);
          let r = '';
          for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, dx = b[j][0] - b[i][0], dy = b[j][1] - b[i][1]; if (-dx > 0.01 * Math.hypot(dx, dy)) r += face([b[i], b[j], t[j], t[i]], rgb(base, dy > 0 ? 0.9 : 0.75)); }
          return r + face(t, rgb(base, 1.12));
        };
        svg += box(-p.L * 0.2, 0, 2.2) + box(p.L * 0.18, p.W * 0.1, 1.6);
      } else if (kind === 'arch') {
        const span = longU ? p.W : p.L, rh = span * 0.16, N = 10;
        htop = h + rh;
        const prof = i => { const t = -1 + 2 * i / N; return [t, h + rh * (1 - t * t)]; };
        const fcs = [];
        for (let i = 0; i < N; i++) {
          const [t0, z0] = prof(i), [t1, z1] = prof(i + 1);
          fcs.push({ pts: longU ? [at(-1, t0, z0, 0.8), at(1, t0, z0, 0.8), at(1, t1, z1, 0.8), at(-1, t1, z1, 0.8)] : [at(t0, -1, z0, 0.8), at(t0, 1, z0, 0.8), at(t1, 1, z1, 0.8), at(t1, -1, z1, 0.8)] });
        }
        let ends = '';
        for (const sgn of [-1, 1]) {
          const ptsE = [];
          for (let i = 0; i <= N; i++) { const [t, z] = prof(i); ptsE.push(longU ? at(sgn, t, z) : at(t, sgn, z)); }
          ptsE.push(longU ? at(sgn, 1, 0) : at(1, sgn, 0)); ptsE.push(longU ? at(sgn, -1, 0) : at(-1, sgn, 0));
          const mid = longU ? at(sgn, 0, 0) : at(0, sgn, 0);
          if (mid[1] - c[1] > 0) ends += face(ptsE, rgb(PAL.parede, 0.88));
        }
        svg += walls() + ends + roofFaces(fcs);
        let d = '';
        for (let j = 1; j < 12; j++) {
          const s0 = -1 + 2 * j / 12; let seg = '';
          for (let i = 0; i <= N; i++) { const [t, z] = prof(i); const q = longU ? at(s0, t, z, 0.8) : at(t, s0, z, 0.8); const v = S(q[0], q[1], q[2]); seg += (i ? 'L' : 'M') + fx(v[0]) + ' ' + fx(v[1]); }
          d += seg;
        }
        svg += `<path d="${d}" stroke="rgba(255,255,255,.35)" stroke-width="0.35" fill="none"/>`;
      } else if (kind === 'patio') {
        const iL = p.iL, iW = p.iW, ov = 1.2;
        const wU = (p.L - iL) / 2, wV = (p.W - iW) / 2, rh = Math.min(Math.min(wU, wV) * 0.25, 7);
        htop = h + rh;
        const ring = (du, dv, z) => [atAbs(-du, -dv, z), atAbs(du, -dv, z), atAbs(du, dv, z), atAbs(-du, dv, z)];
        const O = ring(p.L / 2 + ov, p.W / 2 + ov, h), I = ring(iL / 2 - 0.6, iW / 2 - 0.6, h);
        const Mr = ring((p.L / 2 + iL / 2) / 2, (p.W / 2 + iW / 2) / 2, h + rh);
        const Ig = ring(iL / 2, iW / 2, 0), It = ring(iL / 2, iW / 2, h);
        svg += walls();
        const fcs = [];
        if (p.miolo) {
          // sem pátio: anel de telha em volta de uma cobertura metálica central (EVA)
          for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; fcs.push({ pts: [O[i], O[j], Mr[j], Mr[i]] }); }
          svg += roofFaces(fcs) + face(Mr, rgb(base, shade([0, 0, 1]) * tint));
          const mu = (p.L / 2 + iL / 2) / 2 * 0.86, mv = (p.W / 2 + iW / 2) / 2, zt = h + rh + 0.1, lv = p.W >= p.L;
          const pm = (al, ac) => lv ? atAbs(ac * mu, al * mv, zt) : atAbs(al * (p.L / 2 + iL / 2) / 2, ac * mv * 0.86, zt);
          for (const [a0, a1] of [[-0.95, -0.04], [0.04, 0.95]]) {
            svg += face([pm(a0, -1), pm(a0, 1), pm(a1, 1), pm(a1, -1)], PAL.painel, 'stroke="#2c5f8f" stroke-width="0.3"');
            let d2 = '';
            for (let t = 1; t < 6; t++) { const al = a0 + (a1 - a0) * t / 6, a1s = S(...pm(al, -1)), b1s = S(...pm(al, 1)); d2 += `M${fx(a1s[0])} ${fx(a1s[1])}L${fx(b1s[0])} ${fx(b1s[1])}`; }
            const m0 = S(...pm(a0, 0)), m1 = S(...pm(a1, 0));
            svg += `<path d="${d2}M${fx(m0[0])} ${fx(m0[1])}L${fx(m1[0])} ${fx(m1[1])}" stroke="rgba(255,255,255,.3)" stroke-width="0.25" fill="none"/>`;
          }
        } else {
          svg += face(Ig, PAL.gramaClara);
          for (let i = 0; i < 4; i++) {
            const a0 = Ig[i], b0 = Ig[(i + 1) % 4], dx = b0[0] - a0[0];
            if (dx > 0) svg += face([a0, b0, It[(i + 1) % 4], It[i]], rgb(PAL.parede, 0.78));
          }
          for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; fcs.push({ pts: [O[i], O[j], Mr[j], Mr[i]] }); fcs.push({ pts: [Mr[i], Mr[j], I[j], I[i]] }); }
          svg += roofFaces(fcs);
        }
        let d = '';
        for (let i = 0; i < 4; i++) { const a0 = S(...Mr[i]), b0 = S(...Mr[(i + 1) % 4]); d += `M${fx(a0[0])} ${fx(a0[1])}L${fx(b0[0])} ${fx(b0[1])}`; }
        svg += `<path d="${d}" stroke="${rgb(base, 1.25)}" stroke-width="0.5" fill="none"/>`;
      }

      // sombra no chão
      const sh = floatShadow ? foot.map(q => [q[0] + SOMB[0] * htop, q[1] + SOMB[1] * htop])
        : foot.concat(foot.map(q => [q[0] + SOMB[0] * htop, q[1] + SOMB[1] * htop]));
      const hl = hull(sh).map(q => S(q[0], q[1], 0));
      const shadow = 'M' + hl.map(v => fx(v[0]) + ' ' + fx(v[1])).join('L') + 'Z';
      return { svg, shadow, foot, footX: g.footX, htop, key: c[1], minX1: g.minX1, maxX1: g.maxX1, minY1: g.minY1, maxY1: g.maxY1 };

      function ridgeLine(r1, r2) {
        const a1 = S(...r1), b1 = S(...r2);
        return `<path d="M${fx(a1[0])} ${fx(a1[1])}L${fx(b1[0])} ${fx(b1[1])}" stroke="${rgb(base, 1.3)}" stroke-width="0.6"/>`;
      }
      function tileLines(fcs) {
        let d = '';
        for (const f of fcs) {
          const [A, B, C2, D2] = f.pts;
          for (let t = 0.25; t < 1; t += 0.25) {
            const p0 = A.map((v, i) => v + (D2[i] - v) * t), p1 = B.map((v, i) => v + (C2[i] - v) * t);
            const a1 = S(...p0), b1 = S(...p1);
            d += `M${fx(a1[0])} ${fx(a1[1])}L${fx(b1[0])} ${fx(b1[1])}`;
          }
        }
        return `<path d="${d}" stroke="rgba(90,35,15,.16)" stroke-width="0.35" fill="none"/>`;
      }
      // cobertura metálica azul sobre as duas águas principais (EVA)
      function painel(fcs) {
        let s = '';
        const lerp = (P1, P2, t) => P1.map((v, i) => v + (P2[i] - v) * t);
        for (const f of fcs) {
          const [A, B, C2, D2] = f.pts;
          const pt = (u, t) => lerp(lerp(A, B, u), lerp(D2, C2, u), t);
          for (const [u0, u1] of [[0.14, 0.47], [0.53, 0.86]]) {
            const q = [pt(u0, 0.22), pt(u1, 0.22), pt(u1, 0.9), pt(u0, 0.9)];
            s += face(q, rgb([61, 125, 182], shade(normal3(q[0], q[1], q[2]))), 'stroke="#2c5f8f" stroke-width="0.3"');
            let d = '';
            for (let t = 1; t < 5; t++) { const a1 = S(...lerp(q[0], q[1], t / 5)), b1 = S(...lerp(q[3], q[2], t / 5)); d += `M${fx(a1[0])} ${fx(a1[1])}L${fx(b1[0])} ${fx(b1[1])}`; }
            s += `<path d="${d}" stroke="rgba(255,255,255,.3)" stroke-width="0.25"/>`;
          }
        }
        return s;
      }
    }
  }

  // ---------- arrastar / zoom (sem nenhum controle visível) ----------
  function panZoom(svg, vb0) {
    let vb = vb0.slice();
    const set = () => svg.setAttribute('viewBox', vb.join(' '));
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const s = Math.max(vb[2] / r.width, vb[3] / r.height); return [vb[0] + (cx - r.left - (r.width - vb[2] / s) / 2) * s, vb[1] + (cy - r.top - (r.height - vb[3] / s) / 2) * s]; };
    const zoom = (f, cx, cy) => {
      const nw = Math.min(vb0[2] * 1.2, Math.max(vb0[2] / 8, vb[2] * f)); f = nw / vb[2];
      const [px, py] = toSvg(cx, cy);
      vb = [px - (px - vb[0]) * f, py - (py - vb[1]) * f, vb[2] * f, vb[3] * f]; set();
    };
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    const ptrs = new Map(); let last = null, lastD = null;
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); last = null; lastD = null; svg.classList.add('arrastando'); });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      const ps = [...ptrs.values()];
      const mid = ps.reduce((a, p) => [a[0] + p[0] / ps.length, a[1] + p[1] / ps.length], [0, 0]);
      if (last) {
        const r = svg.getBoundingClientRect(), s = Math.max(vb[2] / r.width, vb[3] / r.height);
        vb[0] -= (mid[0] - last[0]) * s; vb[1] -= (mid[1] - last[1]) * s; set();
      }
      if (ps.length === 2) {
        const d = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
        if (lastD) zoom(lastD / d, mid[0], mid[1]);
        lastD = d;
      }
      last = mid;
    });
    const up = e => { ptrs.delete(e.pointerId); last = null; lastD = null; if (!ptrs.size) svg.classList.remove('arrastando'); };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('dblclick', () => { vb = vb0.slice(); set(); });
  }

  global.CampusMap = { render, DEFAULTS, PAL };
})(typeof window !== 'undefined' ? window : globalThis);
