/* =========================================================
   LÓGICA DEL PROTOTIPO · V4  (bandeja → detalle → acción)
   - Estado en memoria + localStorage de este navegador. Nada sale del navegador.
   - Rutas con #: #/ (bandeja), #/carta/C-01, #/caso/E-07, #/respuesta/R-01, #/escribir/E-07
   ========================================================= */

const CLAVE = 'aclara-correspondencia-v4';
let S;
const ui = {
  carpeta: {},             // carpeta abierta por rol
  confirmar: null,         // confirmación pendiente de una acción de riesgo
  noEntrega: false,        // mostrando el formulario de motivo de no entrega
  foco: null,              // id del elemento que recibe el foco tras redibujar
  verRegistro: false, confirmarReinicio: false,
  borradores: {}, imagenes: {}, modoCarta: {}
};
let aviso = null, temporizador = null;

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hora = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
const caso = codigo => S.casos.find(c => c.codigo === codigo);
const carta = id => S.cartas.find(l => l.id === id);
const respuesta = id => S.respuestas.find(r => r.id === id);
const yo = () => (S.rol === 'Escritora' || S.rol === 'Mediadora') ? S.persona[S.rol] : S.rol;
const valor = id => (document.getElementById(id)?.value || '').trim();
function tomar(id) { const el = document.getElementById(id); if (!el) return ''; const v = el.value.trim(); el.value = ''; delete ui.borradores[id]; return v; }

// Asegura historial en cada carta, respuesta y caso (también en datos de muestra)
function prepararDatos() {
  [...S.cartas, ...S.respuestas, ...S.casos].forEach(x => {
    if (!x.hist) x.hist = x.demo ? [{ hora: 'Antes', quien: 'Demo', texto: `Elemento de muestra precargado («${x.estado}»).` }] : [];
  });
}
function cargar() {
  try { const t = localStorage.getItem(CLAVE); if (t) S = JSON.parse(t); } catch (e) {}
  if (!S) S = estadoInicial();
  prepararDatos();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
  catch (e) { avisar('No se pudo guardar en el navegador (quizá la imagen es muy grande). Los cambios siguen en esta pestaña.', true); }
}
function avisar(texto, error = false) {
  aviso = { texto, error };
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { aviso = null; renderAviso(); }, error ? 9000 : 7000);
}
function marcar(obj, texto, nota = false) { obj.hist.push({ hora: hora(), quien: yo(), texto, nota }); }
function registrar(texto) { S.registro.unshift({ hora: hora(), quien: yo(), texto }); }
// Completa una acción: historial del elemento, registro global, aviso y (por defecto) vuelta a la bandeja
function hecho(texto, { obj, ev, volver = true } = {}) {
  if (obj) marcar(obj, ev || texto);
  registrar(texto); avisar(texto); guardar();
  ui.confirmar = null; ui.noEntrega = false;
  if (volver) ir('#/'); else render();
}
function error(texto) { avisar(texto, true); renderAviso(); }

/* ---------- Rutas ---------- */
function ruta() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  return p[0] ? { tipo: p[0], id: decodeURIComponent(p[1] || '') } : { tipo: 'bandeja' };
}
function ir(h) { if (location.hash === h || (h === '#/' && !location.hash)) render(); else location.hash = h; }

/* =========================================================
   ESTADOS EN PALABRAS (sin colores) Y RESPONSABLE
   ========================================================= */
function estadoCarta(l) {
  switch (l.estado) {
    case 'Borrador': return 'Borrador · sin enviar';
    case 'Requiere cambios': return 'Requiere ajustes';
    case 'Aprobada': return 'Aprobada · falta preparar la entrega';
    case 'Entrega preparada': return l.pasoRef ? `Preparada · ${l.pasoRef.toLowerCase()} · aún no entregada` : 'Preparada para entrega · aún no entregada';
    case 'No entregada': return `No entregada · ${l.motivo}`;
    default: return l.estado;
  }
}
// [responsable ahora, qué sigue después y quién continúa] — no repite los botones
function flujoCarta(l) {
  switch (l.estado) {
    case 'Borrador': return [l.autora, 'Solo la autora la ve. Al enviarla, pasa a revisión de Coordinación.'];
    case 'En revisión': return ['Coordinación', 'Si se aprueba, Coordinación prepara su entrega. Si necesita ajustes, vuelve a la escritora.'];
    case 'Requiere cambios': return [l.autora, 'Al reenviarla, vuelve a revisión de Coordinación.'];
    case 'Aprobada': return ['Coordinación', 'Al prepararla, la mediadora o el referente elegido deberá entregarla en mano.'];
    case 'Entrega preparada':
      if (l.responsable !== REFERENTE) return [l.responsable, 'Tras la visita se registra si se entregó. Si no se pudo, vuelve a Coordinación.'];
      return [REFERENTE, l.pasoRef ? 'Falta registrar la entrega en mano.' : `Primero ${S.modoReferente === 'A' ? 'se confirma la recepción del sobre' : 'se imprime (simulado)'}; después se registra la entrega en mano.`];
    case 'No entregada': return ['Coordinación', 'Coordinación decide si la prepara de nuevo para otra visita.'];
    case 'Entregada en mano': return ['Nadie', 'No quedan pasos: la entrega está completa.'];
    case 'Rechazada': return ['Nadie', 'No quedan pasos: la carta no se entregará.'];
  }
  return ['—', '—'];
}
function flujoRespuesta(r) {
  const c = caso(r.caso), esc_ = c.escritora || 'la escritora del caso';
  switch (r.estado) {
    case 'Versión aprobada (simulado)': return [r.mediadora, `Al enviarla, Coordinación la traspasa a ${esc_} sin modificarla.`];
    case 'En Coordinación': return ['Coordinación', `Coordinación la traspasa a ${esc_}. Nadie puede editarla.`];
    case 'Entregada a la escritora (simulado)': return r.leida ? ['Nadie', 'No quedan pasos: la respuesta fue leída.'] : [esc_, `${esc_} puede leerla. No quedan más pasos.`];
    default: return [r.mediadora, `Solo se envía la versión que ${c.nombre} apruebe. Si el texto cambia, hay que aprobarlo de nuevo.`];
  }
}
function estadoCaso(c) {
  if (c.cerrada) return 'Correspondencia cerrada';
  if (c.ausencia?.estado === 'Ausencia comunicada') return 'Ausencia comunicada';
  if (!c.escritora || !c.mediadora) return 'Falta asignar';
  if (c.ausencia?.estado === 'Suplente asignada') return `Activa · suplente ${c.ausencia.suplente}`;
  return 'Activa';
}
function flujoCaso(c) {
  if (c.cerrada) return ['Nadie', 'No quedan pasos: la correspondencia está cerrada.'];
  if (c.ausencia?.estado === 'Ausencia comunicada') return ['Coordinación', 'Coordinación asigna una suplente o cierra la correspondencia. Mientras, no se escriben cartas.'];
  if (!c.escritora || !c.mediadora) return ['Coordinación', 'Al asignar responsables, el caso aparece en sus bandejas.'];
  return [c.escritora, 'La escritora escribe cuando quiera; cada carta pasa por revisión antes de entregarse.'];
}

/* =========================================================
   PERMISOS: cada rol ve solo lo suyo
   ========================================================= */
function puedeVer(tipo, x) {
  const p = yo();
  if (tipo === 'carta') {
    if (S.rol === 'Coordinación') return x.estado !== 'Borrador';
    if (S.rol === 'Escritora') return x.autora === p;
    if (S.rol === 'Mediadora') return x.responsable === p && (x.estado === 'Entrega preparada' || x.registradoPor === p);
    return x.responsable === REFERENTE && (x.estado === 'Entrega preparada' || x.registradoPor === REFERENTE);
  }
  if (tipo === 'caso') {
    if (S.rol === 'Coordinación') return true;
    if (S.rol === 'Escritora') return x.escritora === p;
    if (S.rol === 'Mediadora') return x.mediadora === p;
    return false;
  }
  if (tipo === 'respuesta') {
    if (S.rol === 'Coordinación') return true;
    if (S.rol === 'Mediadora') return x.mediadora === p;
    if (S.rol === 'Escritora') return x.estado === 'Entregada a la escritora (simulado)' && caso(x.caso).escritora === p;
    return false;
  }
  return false;
}

/* =========================================================
   NIVEL 1 · BANDEJA
   ========================================================= */
const nombreCaso = codigo => { const c = caso(codigo); return `${esc(c.nombre)} (${c.codigo})`; };
function fila({ href, persona, contexto = '', estado, accion }) {
  return `<a class="fila" href="${href}">
    <span class="fila-principal"><span class="fila-persona">${persona}</span>${contexto ? `<span class="fila-contexto">${contexto}</span>` : ''}</span>
    <span class="fila-estado">${esc(estado)}</span>
    <span class="fila-accion">${esc(accion)} <span aria-hidden="true">→</span></span>
  </a>`;
}
const filaCarta = (l, accion, contexto) => fila({
  href: `#/carta/${l.id}`, persona: nombreCaso(l.caso) + demoTag(l),
  contexto: contexto ?? `Carta ${l.id} · de ${esc(l.autora)}`, estado: estadoCarta(l), accion
});
const filaRespuesta = (r, accion) => fila({
  href: `#/respuesta/${r.id}`, persona: nombreCaso(r.caso) + demoTag(r),
  contexto: `Respuesta ${r.id} · registrada por ${esc(r.mediadora)}`, estado: r.estado, accion
});
const filaCaso = (c, accion, href = `#/caso/${c.codigo}`, contexto) => fila({
  href, persona: nombreCaso(c.codigo),
  contexto: contexto ?? `Escritora: ${esc(c.escritora || 'sin asignar')} · Mediadora: ${esc(c.mediadora || 'sin asignar')}`,
  estado: estadoCaso(c), accion
});
const demoTag = x => x.demo ? ' <span class="demo" title="Elemento anterior o de muestra">DEMO</span>' : '';

function bandeja(titulo, carpetas, extra = '') {
  const actual = carpetas.find(c => c.id === ui.carpeta[S.rol]) || carpetas[0];
  const n = c => c.grupos.reduce((s, g) => s + g.filas.length, 0);
  let h = `<div class="bandeja-cab"><div><h1>${titulo}</h1><p>${esc(AYUDA_ROL[S.rol])}</p></div>${extra}</div>`;
  if (carpetas.length > 1) h += `<nav class="carpetas" aria-label="Carpetas">${carpetas.map(c =>
    `<button class="carpeta" data-act="carpeta" data-id="${c.id}" aria-current="${c === actual ? 'page' : 'false'}">${c.titulo}${c.contar ? ` <span class="cuenta">${n(c)}</span>` : ''}</button>`).join('')}</nav>`;
  const grupos = actual.grupos.filter(g => g.filas.length);
  h += grupos.length
    ? grupos.map(g => `<section class="grupo">${g.titulo ? `<h2 class="grupo-titulo">${g.titulo}</h2>` : ''}<div class="lista">${g.filas.join('')}</div></section>`).join('')
    : `<div class="lista"><p class="vacio">${actual.vacio}</p></div>`;
  return h;
}

function bandejaCoordinacion() {
  const ausencias = S.casos.filter(c => c.ausencia?.estado === 'Ausencia comunicada' && !c.cerrada);
  const sinAsignar = S.casos.filter(c => !c.cerrada && (!c.escritora || !c.mediadora) && c.ausencia?.estado !== 'Ausencia comunicada');
  const de = est => S.cartas.filter(l => l.estado === est);
  const resp = est => S.respuestas.filter(r => est.includes(r.estado));
  return bandeja('Coordinación', [
    { id: 'pendientes', titulo: 'Pendientes', contar: true, vacio: 'No tienes pendientes. Cuando haya algo para Coordinación, aparecerá aquí.', grupos: [
      { titulo: 'Incidencias', filas: [
        ...ausencias.map(c => filaCaso(c, 'Resolver aviso', undefined, `${esc(c.ausencia.por)} avisó que no puede continuar`)),
        ...de('No entregada').map(l => filaCarta(l, 'Resolver', `Carta ${l.id} · registró ${esc(l.registradoPor)}`))] },
      { titulo: 'Por asignar', filas: sinAsignar.map(c => filaCaso(c, 'Asignar', undefined, c.responde ? 'Acepta recibir cartas y, si quiere, responder' : 'Acepta recibir cartas; no desea responder')) },
      { titulo: 'Por revisar', filas: de('En revisión').map(l => filaCarta(l, 'Revisar carta')) },
      { titulo: 'Por preparar', filas: de('Aprobada').map(l => filaCarta(l, 'Preparar entrega')) },
      { titulo: 'Respuestas por traspasar', filas: resp(['En Coordinación']).map(r => filaRespuesta(r, 'Traspasar')) }
    ] },
    { id: 'curso', titulo: 'En curso', contar: true, vacio: 'Nada está en manos de otros roles ahora.', grupos: [
      { titulo: 'Con escritoras (ajustes)', filas: de('Requiere cambios').map(l => filaCarta(l, 'Ver')) },
      { titulo: 'En entrega', filas: de('Entrega preparada').map(l => filaCarta(l, 'Ver')) },
      { titulo: 'Respuestas con mediadoras', filas: resp(['Borrador', 'Pendiente de aprobación', 'Versión aprobada (simulado)']).map(r => filaRespuesta(r, 'Ver')) }
    ] },
    { id: 'historial', titulo: 'Historial', vacio: 'Todavía no hay elementos cerrados.', grupos: [
      { titulo: 'Cartas', filas: [...de('Entregada en mano'), ...de('Rechazada')].map(l => filaCarta(l, 'Ver')) },
      { titulo: 'Respuestas', filas: resp(['Entregada a la escritora (simulado)']).map(r => filaRespuesta(r, 'Ver')) },
      { titulo: 'Correspondencias cerradas', filas: S.casos.filter(c => c.cerrada).map(c => filaCaso(c, 'Ver')) }
    ] },
    { id: 'casos', titulo: 'Casos', vacio: 'No hay casos.', grupos: [{ titulo: '', filas: S.casos.map(c => filaCaso(c, c.cerrada ? 'Ver' : 'Ver o cambiar')) }] }
  ]);
}

function bandejaEscritora() {
  const p = yo();
  const mias = est => S.cartas.filter(l => l.autora === p && est.includes(l.estado));
  const porLeer = S.respuestas.filter(r => puedeVer('respuesta', r) && !r.leida);
  const leidas = S.respuestas.filter(r => puedeVer('respuesta', r) && r.leida);
  const personas = S.casos.filter(c => c.escritora === p).map(c => {
    if (c.cerrada) return filaCaso(c, 'Ver', `#/escribir/${c.codigo}`, 'Coordinación cerró esta correspondencia');
    if (c.ausencia?.estado === 'Ausencia comunicada') return filaCaso(c, 'Ver', `#/escribir/${c.codigo}`, 'Avisaste ausencia · Coordinación decide');
    return fila({ href: `#/escribir/${c.codigo}`, persona: nombreCaso(c.codigo),
      contexto: c.responde ? 'Puede responder si quiere' : 'Recibe cartas; prefirió no responder', estado: 'Puedes escribirle', accion: 'Escribir carta' });
  });
  return bandeja(`Hola, ${esc(p)}`, [
    { id: 'pendientes', titulo: 'Pendientes', contar: true, vacio: 'No tienes personas asignadas todavía. Coordinación te asignará una.', grupos: [
      { titulo: 'Para ajustar', filas: mias(['Requiere cambios']).map(l => filaCarta(l, 'Ajustar carta', `Carta ${l.id} · Coordinación pidió ajustes`)) },
      { titulo: 'Borradores', filas: mias(['Borrador']).map(l => filaCarta(l, 'Continuar', `Carta ${l.id} · solo tú la ves`)) },
      { titulo: 'Respuestas para leer', filas: porLeer.map(r => filaRespuesta(r, 'Leer')) },
      { titulo: 'Mis personas', filas: personas }
    ] },
    { id: 'enviadas', titulo: 'Enviadas', vacio: 'Aún no has enviado cartas.', grupos: [
      { titulo: 'Cartas', filas: S.cartas.filter(l => l.autora === p && !['Borrador', 'Requiere cambios'].includes(l.estado)).reverse().map(l => filaCarta(l, 'Ver', `Carta ${l.id} · ahora: ${esc(flujoCarta(l)[0])}`)) },
      { titulo: 'Respuestas leídas', filas: leidas.map(r => filaRespuesta(r, 'Ver')) }
    ] }
  ]);
}

function bandejaMediadora() {
  const p = yo();
  const resps = S.respuestas.filter(r => r.mediadora === p);
  return bandeja(`Hola, ${esc(p)}`, [
    { id: 'pendientes', titulo: 'Pendientes', contar: true, vacio: 'No tienes entregas ni respuestas pendientes.', grupos: [
      { titulo: 'Entregas para tu visita', filas: S.cartas.filter(l => l.responsable === p && l.estado === 'Entrega preparada')
        .map(l => filaCarta(l, 'Registrar entrega', `Carta ${l.id} · Visita: ${esc(caso(l.caso).visita)}`)) },
      { titulo: 'Respuestas por gestionar', filas: resps.filter(r => ['Borrador', 'Pendiente de aprobación', 'Versión aprobada (simulado)'].includes(r.estado)).map(r => filaRespuesta(r, 'Revisar respuesta')) }
    ] },
    { id: 'casos', titulo: 'Mis casos', vacio: 'No tienes casos asignados.', grupos: [{ titulo: '', filas: S.casos.filter(c => c.mediadora === p)
      .map(c => filaCaso(c, 'Ver caso', undefined, `Visita: ${esc(c.visita)} · ${c.responde ? 'puede responder si quiere' : 'no desea responder'}`)) }] },
    { id: 'historial', titulo: 'Historial', vacio: 'Aún no registras entregas ni respuestas.', grupos: [
      { titulo: 'Entregas registradas', filas: S.cartas.filter(l => l.registradoPor === p).map(l => filaCarta(l, 'Ver')) },
      { titulo: 'Respuestas enviadas', filas: resps.filter(r => ['En Coordinación', 'Entregada a la escritora (simulado)'].includes(r.estado)).map(r => filaRespuesta(r, 'Ver')) }
    ] }
  ]);
}

function bandejaReferente() {
  const selector = `<label class="modalidad">Modalidad en prueba
    <select id="modo-ref">
      <option value="A" ${S.modoReferente === 'A' ? 'selected' : ''}>A · Recibir sobres ya impresos</option>
      <option value="B" ${S.modoReferente === 'B' ? 'selected' : ''}>B · Imprimir en el establecimiento</option>
    </select><span class="nota">Alternativas en estudio; ninguna está adoptada.</span></label>`;
  return bandeja('Referente institucional', [
    { id: 'pendientes', titulo: 'Pendientes', contar: true, vacio: 'No hay cartas preparadas para tu institución.', grupos: [{ titulo: S.modoReferente === 'A' ? 'Sobres por entregar' : 'Cartas por imprimir y entregar',
      filas: S.cartas.filter(l => l.responsable === REFERENTE && l.estado === 'Entrega preparada').map(l => filaCarta(l, l.pasoRef ? 'Registrar entrega' : (S.modoReferente === 'A' ? 'Confirmar recepción' : 'Imprimir'), `Carta ${l.id}`)) }] },
    { id: 'historial', titulo: 'Historial', vacio: 'Aún no registras entregas.', grupos: [{ titulo: '', filas: S.cartas.filter(l => l.registradoPor === REFERENTE).map(l => filaCarta(l, 'Ver', `Carta ${l.id}`)) }] }
  ], selector);
}

/* =========================================================
   NIVEL 2 · DETALLE (contenido al centro + panel de contexto)
   ========================================================= */
function contenido(l) {
  return l.tipo === 'manuscrita'
    ? `<img class="manuscrita" src="${l.imagen}" alt="Carta manuscrita (imagen de prueba)">`
    : `<div class="carta-texto">${esc(l.texto)}</div>`;
}
const opciones = (lista, sel, vacio) => (vacio ? `<option value="">${vacio}</option>` : '') +
  lista.map(p => `<option value="${esc(p)}" ${p === sel ? 'selected' : ''}>${esc(p)}</option>`).join('');

function panel({ estado, flujo, datos = [], hist, notas = false, notaDe = '', extra = '' }) {
  const [resp, sigue] = flujo;
  const visibles = hist ? hist.filter(e => notas || !e.nota) : [];
  // Jerarquía: estado y responsable → qué sigue → datos secundarios → historial (contraído)
  return `<aside class="contexto" aria-label="Estado y seguimiento">
    <dl class="ctx-principal">
      <div><dt>Estado actual</dt><dd>${esc(estado)}</dd></div>
      <div><dt>Responsable ahora</dt><dd>${esc(resp)}</dd></div>
    </dl>
    <p class="ctx-sigue"><span class="ctx-etq">Qué sigue</span>${esc(sigue)}</p>
    ${datos.length ? `<dl class="ctx-meta">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${extra}
    ${hist ? `<details class="historial"><summary>Historial${notas ? ' y notas internas' : ''} (${visibles.length})</summary>
      <ol>${visibles.slice().reverse().map(e => `<li class="${e.nota ? 'es-nota' : ''}"><span class="hora">${esc(e.hora)} · ${esc(e.quien)}</span>${e.nota ? '<span class="etq-nota">Nota interna</span>' : ''}<span>${esc(e.texto)}</span></li>`).join('') || '<li>Sin movimientos.</li>'}</ol>
      ${notas ? `<div class="nota-interna">
        <label class="campo"><span class="campo-etiqueta">Nota interna <span class="campo-ayuda">(solo equipo; no forma parte de la carta)</span></span>
          <textarea id="nota-${notaDe}" data-keep rows="2"></textarea></label>
        <button class="btn sec" data-act="nota" data-id="${notaDe}">Agregar nota interna</button></div>` : ''}
    </details>` : ''}
  </aside>`;
}

function pagina({ sobre, titulo, cuerpo, accion = '', panelHTML }) {
  const carpeta = ({ pendientes: 'Pendientes', curso: 'En curso', historial: 'Historial', casos: S.rol === 'Mediadora' ? 'Mis casos' : 'Casos', enviadas: 'Enviadas' })[ui.carpeta[S.rol] || 'pendientes'] || 'la bandeja';
  return `<a class="volver" href="#/">← Volver a ${carpeta}</a>
    <div class="detalle-grid">
      <article class="principal">
        <p class="sobretitulo">${sobre}</p>
        <h1 tabindex="-1">${titulo}</h1>
        ${cuerpo}
        ${accion ? `<section class="accion" aria-label="Acción">${accion}</section>` : ''}
      </article>
      ${panelHTML}
    </div>`;
}
function noDisponible() {
  return `<a class="volver" href="#/">← Volver a la bandeja</a>
    <div class="lista"><p class="vacio">Esto no está disponible para el rol «${esc(yo())}». Puede que corresponda a otra persona o que ya no esté pendiente.</p></div>`;
}
function confirmacion(clave, texto, boton, acto, id) {
  if (ui.confirmar !== clave) return '';
  return `<div class="confirmacion" role="alertdialog" aria-label="Confirmar acción"><p>${texto}</p>
    <div class="acciones"><button class="btn riesgo-lleno" data-act="${acto}" data-id="${id}">${boton}</button>
    <button class="btn texto" data-act="noConfirmar">Cancelar</button></div></div>`;
}
function campoImagen(clave) {
  const img = ui.imagenes[clave];
  return `<label class="campo"><span class="campo-etiqueta">Foto o escaneo de la carta</span><input type="file" accept="image/*" data-img="${clave}"></label>
    <div class="acciones"><button class="btn sec" data-act="ejemplo" data-id="${clave}">Usar imagen de ejemplo</button></div>
    ${img ? `<img class="manuscrita" src="${img}" alt="Vista previa de la carta manuscrita">` : ''}
    <p class="nota">La imagen queda solo en este navegador. No se sube a ningún servidor.</p>`;
}

/* ---------- Detalle de carta (varía por rol y estado) ---------- */
function detalleCarta(l) {
  if (!l || !puedeVer('carta', l)) return noDisponible();
  const c = caso(l.caso);
  const equipo = S.rol === 'Coordinación' || S.rol === 'Mediadora';
  const datos = [['Para', nombreCaso(c.codigo)]];
  if (S.rol !== 'Escritora') datos.push(['De', esc(l.autora)]);
  if (S.rol === 'Coordinación') datos.push(['Lugar de espera', esc(c.lugar) + ' <span class="nota">(solo Coordinación)</span>']);
  if (S.rol !== 'Referente institucional') datos.push(['Visita', esc(c.visita)]);
  const panelHTML = panel({ estado: estadoCarta(l), flujo: flujoCarta(l), datos, hist: l.hist, notas: equipo, notaDe: 'carta:' + l.id });
  const sobre = `Carta ${l.id} · para ${nombreCaso(c.codigo)}${demoTag(l)}`;
  let titulo = 'Carta', cuerpo = contenido(l), accion = '';

  if (S.rol === 'Escritora' && ['Borrador', 'Requiere cambios'].includes(l.estado)) {
    titulo = l.estado === 'Borrador' ? 'Continuar borrador' : 'Ajustar carta';
    cuerpo = (l.estado === 'Requiere cambios' ? `<div class="indicacion"><span class="etq">Indicación de Coordinación · no forma parte de la carta</span>${esc(l.comentario)}</div>` : '') +
      (l.tipo === 'texto'
        ? `<label class="campo"><span class="campo-etiqueta">Texto de la carta</span><textarea id="txt-${l.id}" data-keep class="editor">${esc(l.texto)}</textarea></label>`
        : `${contenido(l)}${campoImagen(l.id)}`);
    accion = `<div class="acciones"><button class="btn" data-act="enviarCarta" data-id="${l.id}">${l.estado === 'Borrador' ? 'Enviar a revisión' : 'Reenviar a revisión'}</button>
      ${l.estado === 'Borrador' ? `<button class="btn sec" data-act="guardarCarta" data-id="${l.id}">Guardar borrador</button>` : ''}</div>
      <p class="nota">Pautas: no dar consejos de salud ni pedir datos personales. La carta se revisa antes de entregarse.</p>`;
  }
  else if (S.rol === 'Escritora' && l.estado === 'Rechazada') {
    titulo = 'Carta rechazada';
    cuerpo += `<div class="indicacion"><span class="etq">Motivo de Coordinación</span>${esc(l.comentario)}</div>`;
  }
  else if (S.rol === 'Coordinación' && l.estado === 'En revisión') {
    titulo = 'Revisar carta';
    // Tres decisiones sin botón dominante: no inducir la decisión que se quiere observar.
    // El campo de indicación aparece solo al pedir ajustes o rechazar.
    const abierto = ui.confirmar === 'ajustes-' + l.id ? 'ajustes' : ui.confirmar === 'rechazar-' + l.id ? 'rechazar' : null;
    const campoMotivo = (etq, ayuda) => `<label class="campo"><span class="campo-etiqueta">${etq} <span class="campo-ayuda">${ayuda}</span></span>
        <textarea id="mot-${l.id}" data-keep rows="3" aria-required="true"></textarea></label>`;
    accion = !abierto
      ? `<p class="pregunta" id="dec-titulo">Decisión de revisión</p>
        <div class="acciones" role="group" aria-labelledby="dec-titulo">
          <button class="btn sec" id="dec-aprobar-${l.id}" data-act="aprobar" data-id="${l.id}">Aprobar carta</button>
          <button class="btn sec" id="dec-ajustes-${l.id}" data-act="devolver" data-id="${l.id}" aria-haspopup="true">Pedir ajustes…</button>
          <button class="btn riesgo" id="dec-rechazar-${l.id}" data-act="rechazar" data-id="${l.id}" aria-haspopup="true">Rechazar…</button>
        </div>`
      : abierto === 'ajustes'
      ? `<div class="bloque-decision" role="region" aria-label="Pedir ajustes">
          <p class="pregunta">Pedir ajustes a ${esc(l.autora)}</p>
          ${campoMotivo('¿Qué debe cambiar?', '(obligatorio · indicación interna, no se agrega a la carta)')}
          <div class="acciones"><button class="btn" data-act="devolverSi" data-id="${l.id}">Confirmar solicitud</button>
            <button class="btn texto" data-act="cancelarDecision" data-id="${l.id}:ajustes">Cancelar</button></div>
        </div>`
      : `<div class="confirmacion" role="region" aria-label="Rechazar carta">
          <p><strong>¿Rechazar esta carta?</strong> No podrá entregarse y ${esc(l.autora)} verá el motivo.</p>
          ${campoMotivo('Motivo del rechazo', '(obligatorio)')}
          <div class="acciones"><button class="btn riesgo-lleno" data-act="rechazarSi" data-id="${l.id}">Confirmar rechazo</button>
            <button class="btn texto" data-act="cancelarDecision" data-id="${l.id}:rechazar">Cancelar</button></div>
        </div>`;
  }
  else if (S.rol === 'Coordinación' && ['Aprobada', 'No entregada'].includes(l.estado)) {
    titulo = l.estado === 'Aprobada' ? 'Preparar entrega' : 'Resolver entrega fallida';
    if (l.estado === 'No entregada') cuerpo = `<div class="indicacion alerta"><span class="etq">Incidencia</span>${esc(l.registradoPor)} no pudo entregarla: ${esc(l.motivo)}.</div>` + cuerpo;
    accion = `<label class="campo"><span class="campo-etiqueta">¿Quién la llevará o recibirá?</span>
        <select id="quien-${l.id}" data-keep>${opciones([...MEDIADORAS, REFERENTE], c.mediadora || 'Mediadora 1')}</select></label>
      <div class="acciones"><button class="btn" data-act="preparar" data-id="${l.id}">${l.estado === 'Aprobada' ? 'Preparar entrega' : 'Preparar de nuevo'}</button></div>
      <p class="nota">Preparar no es entregar: quien la lleve deberá registrar la entrega en mano.</p>`;
  }
  else if (S.rol === 'Mediadora') {
    titulo = l.estado === 'Entrega preparada' ? 'Registrar entrega' : 'Entrega registrada';
    cuerpo = `<p class="nota">El contenido de la carta no se muestra a la mediadora.</p>`;
    if (l.estado === 'Entrega preparada') accion = ui.noEntrega
      ? `<label class="campo"><span class="campo-etiqueta">¿Por qué no se pudo entregar?</span>
          <select id="motivo-${l.id}" data-keep>${opciones(MOTIVOS_NO_ENTREGA, MOTIVOS_NO_ENTREGA[0])}</select></label>
        <div class="acciones"><button class="btn" data-act="noEntregada" data-id="${l.id}">Guardar: no se pudo entregar</button>
          <button class="btn texto" data-act="noEntregaNo">Volver</button></div>`
      : `<p class="pregunta">¿Qué pasó en la visita?</p>
        <div class="acciones"><button class="btn" data-act="entregada" data-id="${l.id}">Entregada en mano</button>
          <button class="btn sec" data-act="noEntrega">No se pudo entregar</button></div>`;
  }
  else if (S.rol === 'Referente institucional') {
    const A = S.modoReferente === 'A', paso1 = A ? 'Sobre recibido' : 'Impresa (simulado)', listo = l.pasoRef === paso1;
    titulo = l.estado === 'Entrega preparada' ? (A ? 'Sobre por entregar' : 'Carta por imprimir y entregar') : 'Entrega registrada';
    cuerpo = `<p class="nota">Modalidad en prueba: ${A ? 'A · Recibir sobres ya impresos' : 'B · Imprimir en el establecimiento'}.</p>` +
      (A ? `<p>Sobre cerrado para ${nombreCaso(c.codigo)}. No ves su contenido.</p>` : contenido(l));
    if (l.estado === 'Entrega preparada') accion = `<ol class="pasos">
        <li><span class="paso-num ${listo ? 'ok' : ''}">${listo ? '✓' : '1'}</span><div><p>${A ? 'Confirmar que llegó el sobre' : 'Imprimir la carta'}</p>
          ${listo ? '<p class="nota">Hecho.</p>' : `<button class="btn" data-act="${A ? 'sobre' : 'imprimir'}" data-id="${l.id}">${A ? 'Sobre recibido' : 'Simular impresión'}</button>`}</div></li>
        <li><span class="paso-num">2</span><div><p>Entregarla en mano y registrarlo</p>
          <button class="btn ${listo ? '' : 'sec'}" data-act="entregadaRef" data-id="${l.id}" ${listo ? '' : 'disabled'}>Entregada en mano</button>
          ${listo ? '' : '<p class="bloqueo">Disponible después del paso 1.</p>'}</div></li></ol>`;
  }
  return pagina({ sobre, titulo, cuerpo, accion, panelHTML });
}

/* ---------- Escribir carta nueva (Escritora) ---------- */
function detalleEscribir(c) {
  if (!c || !puedeVer('caso', c)) return noDisponible();
  const k = c.codigo, modo = ui.modoCarta[k] || 'texto';
  const bloqueado = c.cerrada || c.ausencia?.estado === 'Ausencia comunicada';
  const extra = bloqueado ? '' : `<div class="contexto-extra">
      ${ui.confirmar === 'ausencia-' + k
        ? `<div class="confirmacion"><p>¿Avisar que no puedes continuar escribiendo a ${esc(c.nombre)}? Coordinación decidirá si asigna una suplente o cierra la correspondencia.</p>
          <div class="acciones"><button class="btn riesgo-lleno" data-act="ausencia" data-id="${k}">Sí, avisar ausencia</button>
          <button class="btn texto" data-act="noConfirmar">Cancelar</button></div></div>`
        : `<p class="nota">¿No puedes continuar con ${esc(c.nombre)}?</p><button class="btn texto" data-act="pedirAusencia" data-id="${k}">Avisar ausencia</button>`}</div>`;
  const panelHTML = panel({
    estado: bloqueado ? estadoCaso(c) : 'Carta nueva · sin guardar',
    flujo: bloqueado ? flujoCaso(c) : ['Tú', 'Al enviarla, Coordinación la revisa antes de cualquier entrega. Un borrador solo lo ves tú.'],
    datos: [['Para', nombreCaso(k)], ['Sobre la persona', c.responde ? 'Puede responder si quiere. Es posible que no responda.' : 'Recibe cartas, pero prefirió no responder.']],
    extra
  });
  if (bloqueado) return pagina({ sobre: `Persona asignada`, titulo: nombreCaso(k),
    cuerpo: `<div class="indicacion"><span class="etq">Estado</span>${c.cerrada ? 'Coordinación cerró esta correspondencia.' : 'Avisaste que no puedes continuar. Coordinación decidirá si asigna una suplente o cierra la correspondencia.'}</div>`, panelHTML });

  const sw = (m, t) => `<button class="segmento" data-act="modoCarta" data-id="${k}:${m}" aria-pressed="${modo === m}">${t}</button>`;
  const cuerpo = `<div class="segmentos" role="group" aria-label="Tipo de carta">${sw('texto', 'Escribir aquí')}${sw('manuscrita', 'Carta manuscrita (imagen)')}</div>` +
    (modo === 'texto'
      ? `<label class="campo"><span class="campo-etiqueta">Texto de la carta</span><textarea id="txt-nueva-${k}" data-keep class="editor" placeholder="Escribe aquí tu carta…"></textarea></label>`
      : campoImagen('nueva-' + k));
  const accion = `<div class="acciones"><button class="btn" data-act="enviarNueva" data-id="${k}">Enviar a revisión</button>
      <button class="btn sec" data-act="guardarNueva" data-id="${k}">Guardar borrador</button></div>
    <p class="nota">Pautas: no dar consejos de salud ni pedir datos personales. La carta se revisa antes de entregarse.</p>`;
  return pagina({ sobre: 'Carta nueva', titulo: `Escribir a ${esc(c.nombre)}`, cuerpo, accion, panelHTML });
}

/* ---------- Detalle de caso (Coordinación / Mediadora) ---------- */
function detalleCaso(c) {
  if (S.rol === 'Escritora' && c) return detalleEscribir(c);
  if (!c || !puedeVer('caso', c)) return noDisponible();
  const coord = S.rol === 'Coordinación';
  const datos = [];
  if (coord) datos.push(['Lugar de espera', esc(c.lugar) + ' <span class="nota">(solo Coordinación)</span>']);
  datos.push(['Visita', esc(c.visita)], ['Responder', c.responde ? 'Acepta recibir cartas y, si quiere, responder' : 'Acepta recibir cartas; no desea responder']);
  if (!coord) datos.push(['Escritora', esc(c.escritora || 'sin asignar')]);
  const panelHTML = panel({ estado: estadoCaso(c), flujo: flujoCaso(c), datos, hist: coord ? c.hist : null });
  let titulo = nombreCaso(c.codigo), cuerpo = '', accion = '';

  if (coord) {
    const comunicada = c.ausencia?.estado === 'Ausencia comunicada' && !c.cerrada;
    if (comunicada) {
      titulo = `Resolver aviso de ausencia`;
      cuerpo = `<div class="indicacion alerta"><span class="etq">Incidencia</span>${esc(c.ausencia.por)} avisó que no puede continuar escribiendo a ${esc(c.nombre)}.</div>`;
      accion = `<label class="campo"><span class="campo-etiqueta">Escritora suplente</span>
          <select id="sup-${c.codigo}" data-keep>${opciones(ESCRITORAS.filter(e => e !== c.ausencia.por), null)}</select></label>
        <div class="acciones"><button class="btn" data-act="suplente" data-id="${c.codigo}">Asignar suplente</button>
          <button class="btn riesgo" data-act="cerrar" data-id="${c.codigo}">Cerrar correspondencia…</button></div>
        ${confirmacion('cerrar-' + c.codigo, `¿Cerrar la correspondencia con ${esc(c.nombre)}? No se podrán escribir más cartas para este caso.`, 'Sí, cerrar correspondencia', 'cerrarSi', c.codigo)}`;
    } else if (c.cerrada) {
      cuerpo = `<p>La correspondencia con ${esc(c.nombre)} está cerrada.</p>`;
    } else {
      titulo = (!c.escritora || !c.mediadora) ? `Asignar responsables` : `Responsables del caso`;
      cuerpo = `<p>${esc(c.nombre)} (${c.codigo}). Elige quién le escribirá y quién llevará las cartas en sus visitas.</p>`;
      accion = `<label class="campo"><span class="campo-etiqueta">Escritora</span><select id="asig-esc-${c.codigo}">${opciones(ESCRITORAS, c.escritora, '— Sin asignar —')}</select></label>
        <label class="campo"><span class="campo-etiqueta">Mediadora</span><select id="asig-med-${c.codigo}">${opciones(MEDIADORAS, c.mediadora, '— Sin asignar —')}</select></label>
        <div class="acciones"><button class="btn" data-act="asignar" data-id="${c.codigo}">Guardar asignación</button></div>`;
    }
  } else {
    cuerpo = `<p>Tu caso como mediadora. No ves información clínica.</p>`;
    if (c.responde && !c.cerrada) accion = `<p class="pregunta">¿${esc(c.nombre)} dictó una respuesta en la visita?</p>
      <div class="acciones"><button class="btn" data-act="nuevaRespuesta" data-id="${c.codigo}">Registrar respuesta dictada</button></div>`;
    else if (!c.responde) cuerpo += `<p class="nota">${esc(c.nombre)} no desea responder.</p>`;
  }
  return pagina({ sobre: coord ? 'Caso' : 'Mi caso', titulo, cuerpo, accion, panelHTML });
}

/* ---------- Detalle de respuesta ---------- */
function detalleRespuesta(r) {
  if (!r || !puedeVer('respuesta', r)) return noDisponible();
  const c = caso(r.caso);
  const editable = S.rol === 'Mediadora' && ['Borrador', 'Pendiente de aprobación', 'Versión aprobada (simulado)'].includes(r.estado);
  const equipo = S.rol !== 'Escritora';
  const panelHTML = `<div id="rpanel-${r.id}">${panel({ estado: r.estado, flujo: flujoRespuesta(r), datos: [['De', nombreCaso(c.codigo)], ['Registrada por', esc(r.mediadora)]], hist: r.hist, notas: equipo, notaDe: 'respuesta:' + r.id })}</div>`;
  const sobre = `Respuesta ${r.id} · de ${nombreCaso(c.codigo)}${demoTag(r)}`;
  if (editable) {
    const cuerpo = `<p>Lee la respuesta con ${esc(c.nombre)}. Pregúntale si quiere compartirla así o cambiar algo. Solo se envía la versión que la persona apruebe.</p>
      <label class="campo"><span class="campo-etiqueta">Texto de la respuesta</span>
        <textarea id="rtxt-${r.id}" data-resp="${r.id}" class="editor" placeholder="Escribe lo que la persona dictó…">${esc(r.texto)}</textarea></label>`;
    return pagina({ sobre, titulo: 'Revisar respuesta', cuerpo, accion: `<div id="rctl-${r.id}">${controlesRespuesta(r)}</div>`, panelHTML });
  }
  const texto = `<div class="carta-texto">${esc(r.aprobado ?? r.texto)}</div>`;
  if (S.rol === 'Coordinación' && r.estado === 'En Coordinación') return pagina({ sobre, titulo: 'Traspasar respuesta',
    cuerpo: texto + `<p class="nota">Es la versión que ${esc(c.nombre)} aprobó. No se puede editar aquí.</p>`,
    accion: `<div class="acciones"><button class="btn" data-act="traspasar" data-id="${r.id}">Traspasar a ${esc(c.escritora || 'la escritora')} (simulado)</button></div>`, panelHTML });
  return pagina({ sobre, titulo: S.rol === 'Escritora' ? `Respuesta de ${esc(c.nombre)}` : 'Respuesta', cuerpo: texto + (S.rol === 'Escritora' ? '<p class="nota">Simulación: en el servicio real llegaría en papel, a través de Coordinación.</p>' : ''), panelHTML });
}
function controlesRespuesta(r) {
  const aprobada = r.estado === 'Versión aprobada (simulado)' && r.aprobado === r.texto;
  let h = r.estado === 'Pendiente de aprobación'
    ? `<div class="indicacion alerta"><span class="etq">Aprobación anulada</span>El texto cambió después de la aprobación. Revisa la nueva versión con la persona.</div>` : '';
  h += aprobada
    ? `<p class="hecho">Esta versión está aprobada (simulado).</p>
      <div class="acciones"><button class="btn" data-act="enviarRespuesta" data-id="${r.id}">Enviar a Coordinación (simulado)</button></div>
      <p class="nota">Si cambias el texto, habrá que volver a aprobarlo.</p>`
    : `<div class="acciones"><button class="btn" data-act="aprobarRespuesta" data-id="${r.id}" ${r.texto.trim() ? '' : 'disabled'}>Registrar aprobación de esta versión (simulada)</button>
      <button class="btn sec" disabled>Enviar a Coordinación (simulado)</button></div>
      <p class="bloqueo">Para enviar, primero registra la aprobación de la versión actual.</p>`;
  return h + `<p class="nota">Simulación: registrar aquí no equivale a un consentimiento real.</p>`;
}

/* =========================================================
   NIVEL 3 · ACCIONES (reglas de V1 + borrador, notas y traspaso)
   ========================================================= */
const acciones = {
  // Controles de la demo
  rol(r) { S.rol = r; ui.confirmar = null; ui.noEntrega = false; aviso = null; guardar(); ir('#/'); },
  carpeta(k) { ui.carpeta[S.rol] = k; render(); },
  noConfirmar() { ui.confirmar = null; render(); },
  registro() { ui.verRegistro = !ui.verRegistro; $('#opciones').open = false; render(); if (ui.verRegistro) $('#registro-panel').scrollIntoView({ block: 'start' }); },
  reiniciar() { ui.confirmarReinicio = true; renderOpciones(); },
  reiniciarNo() { ui.confirmarReinicio = false; renderOpciones(); },
  reiniciarSi() {
    S = estadoInicial(); prepararDatos();
    Object.assign(ui, { carpeta: {}, confirmar: null, noEntrega: false, confirmarReinicio: false, borradores: {}, imagenes: {}, modoCarta: {} });
    document.querySelectorAll('[data-keep]').forEach(t => t.value = '');
    $('#opciones').open = false;
    avisar('Demostración reiniciada. Todo volvió al estado inicial.');
    guardar(); ir('#/');
  },
  cerrarAviso() { aviso = null; renderAviso(); },

  // Notas internas (Coordinación y Mediadora)
  nota(ref) {
    const [tipo, id] = ref.split(':'), obj = tipo === 'carta' ? carta(id) : respuesta(id);
    const t = valor('nota-' + ref);
    if (!t) return error('Escribe la nota antes de agregarla.');
    tomar('nota-' + ref); marcar(obj, t, true);
    registrar(`Nota interna en ${id}.`); avisar('Nota interna agregada. No forma parte de la carta.'); guardar(); render();
    document.querySelector('.historial')?.setAttribute('open', '');
  },

  // Coordinación
  asignar(k) {
    const c = caso(k);
    c.escritora = valor('asig-esc-' + k) || null; c.mediadora = valor('asig-med-' + k) || null;
    hecho(`Asignación guardada: ${c.nombre} (${k}) ahora aparece en la bandeja de ${c.escritora || 'ninguna escritora'} y de ${c.mediadora || 'ninguna mediadora'}.`,
      { obj: c, ev: `Asignó a ${c.escritora || 'nadie'} (escritora) y ${c.mediadora || 'nadie'} (mediadora).` });
  },
  aprobar(id) { revisar(id, 'Aprobada'); },
  // Pedir ajustes y Rechazar abren su propio bloque con el campo obligatorio
  devolver(id) { ui.confirmar = 'ajustes-' + id; ui.foco = 'mot-' + id; render(); },
  rechazar(id) { ui.confirmar = 'rechazar-' + id; ui.foco = 'mot-' + id; render(); },
  devolverSi(id) { revisar(id, 'Requiere cambios'); },
  rechazarSi(id) { revisar(id, 'Rechazada'); },
  cancelarDecision(v) {
    const [id, cual] = v.split(':');
    tomar('mot-' + id); ui.confirmar = null; ui.foco = `dec-${cual}-${id}`; render();
  },
  preparar(id) {
    const l = carta(id);
    if (!['Aprobada', 'No entregada'].includes(l.estado)) return error('Solo se puede preparar una carta aprobada.');
    l.responsable = valor('quien-' + id); l.estado = 'Entrega preparada'; l.pasoRef = null; l.registradoPor = null; l.motivo = null;
    delete ui.borradores['quien-' + id];
    hecho(`Carta ${id} preparada para entrega (aún no entregada). Ahora ${l.responsable} debe entregarla en mano y registrarlo.`, { obj: l, ev: `Preparó la entrega. Responsable: ${l.responsable}.` });
  },
  suplente(k) {
    const c = caso(k), s = valor('sup-' + k);
    c.escritora = s; c.ausencia = { ...c.ausencia, estado: 'Suplente asignada', suplente: s };
    delete ui.borradores['sup-' + k];
    hecho(`${s} queda como suplente: ${c.nombre} (${k}) ahora aparece en su bandeja.`, { obj: c, ev: `Asignó suplente: ${s}.` });
  },
  cerrar(k) { ui.confirmar = 'cerrar-' + k; render(); },
  cerrarSi(k) {
    const c = caso(k);
    c.cerrada = true; c.ausencia = { ...(c.ausencia || {}), estado: 'Correspondencia cerrada' };
    hecho(`Correspondencia con ${c.nombre} (${k}) cerrada. No quedan tareas pendientes para este caso.`, { obj: c, ev: 'Cerró la correspondencia.' });
  },
  traspasar(id) {
    const r = respuesta(id), c = caso(r.caso);
    if (r.estado !== 'En Coordinación' || r.aprobado !== r.texto) return error('Solo se traspasa una respuesta con su versión aprobada.');
    r.estado = 'Entregada a la escritora (simulado)'; r.leida = false;
    hecho(`Respuesta ${id} traspasada (simulado). Ahora ${c.escritora || 'la escritora'} puede leerla en su bandeja.`, { obj: r, ev: `Traspasó la versión aprobada a ${c.escritora}.` });
  },

  // Escritora
  modoCarta(v) { const [k, m] = v.split(':'); ui.modoCarta[k] = m; render(); },
  ejemplo(clave) { ui.imagenes[clave] = IMAGEN_EJEMPLO; render(); },
  enviarNueva(k) { nuevaCarta(k, 'En revisión'); },
  guardarNueva(k) { nuevaCarta(k, 'Borrador'); },
  enviarCarta(id) {
    const l = carta(id);
    if (!['Borrador', 'Requiere cambios'].includes(l.estado)) return;
    if (!leerEdicion(l)) return;
    const reenvio = l.estado === 'Requiere cambios';
    l.comentario = null; l.estado = 'En revisión';
    hecho(`Carta ${id} ${reenvio ? 'reenviada' : 'enviada'} a revisión. Ahora está pendiente de Coordinación.`, { obj: l, ev: reenvio ? 'Ajustó y reenvió a revisión.' : 'Envió a revisión.' });
  },
  guardarCarta(id) {
    const l = carta(id);
    if (l.estado !== 'Borrador' || !leerEdicion(l)) return;
    hecho(`Borrador ${id} guardado. Sigue en tus pendientes; nadie más lo ve.`, { obj: l, ev: 'Guardó el borrador.' });
  },
  pedirAusencia(k) { ui.confirmar = 'ausencia-' + k; render(); },
  ausencia(k) {
    const c = caso(k);
    c.ausencia = { estado: 'Ausencia comunicada', por: yo() };
    hecho(`Aviso enviado. Ahora Coordinación decide si asigna una suplente o cierra la correspondencia con ${c.nombre}.`, { obj: c, ev: 'Avisó que no puede continuar.' });
  },

  // Mediadora y referente
  entregada(id) { registrarEntrega(id, l => l.estado === 'Entrega preparada' && l.responsable === yo()); },
  entregadaRef(id) {
    const paso = S.modoReferente === 'A' ? 'Sobre recibido' : 'Impresa (simulado)';
    registrarEntrega(id, l => l.estado === 'Entrega preparada' && l.pasoRef === paso);
  },
  noEntrega() { ui.noEntrega = true; render(); },
  noEntregaNo() { ui.noEntrega = false; render(); },
  noEntregada(id) {
    const l = carta(id);
    if (l.estado !== 'Entrega preparada') return error('Solo se registra sobre una carta preparada.');
    l.motivo = valor('motivo-' + id); l.estado = 'No entregada'; l.registradoPor = yo();
    delete ui.borradores['motivo-' + id];
    hecho(`No entrega registrada (${l.motivo}). Ahora Coordinación decide un nuevo intento.`, { obj: l, ev: `No se pudo entregar: ${l.motivo}.` });
  },
  sobre(id) { pasoReferente(id, 'Sobre recibido', 'Sobre recibido. Falta registrar la entrega en mano.'); },
  imprimir(id) { pasoReferente(id, 'Impresa (simulado)', 'Impresión simulada. Falta registrar la entrega en mano.'); },

  // Respuestas
  nuevaRespuesta(k) {
    const id = 'R-' + String(S.siguienteRespuesta++).padStart(2, '0');
    const r = { id, caso: k, mediadora: yo(), estado: 'Borrador', aprobado: null, texto: '', hist: [] };
    S.respuestas.unshift(r);
    hecho(`Respuesta ${id} creada. Escribe lo que la persona dictó.`, { obj: r, ev: 'Registró una respuesta dictada.', volver: false });
    ir('#/respuesta/' + id);
  },
  aprobarRespuesta(id) {
    const r = respuesta(id);
    if (!r.texto.trim() || !['Borrador', 'Pendiente de aprobación'].includes(r.estado)) return;
    r.aprobado = r.texto; r.estado = 'Versión aprobada (simulado)';
    hecho(`Aprobación de la versión registrada (simulado). Ya puedes enviarla a Coordinación.`, { obj: r, ev: 'Registró la aprobación de esta versión.', volver: false });
  },
  enviarRespuesta(id) {
    const r = respuesta(id);
    if (r.estado !== 'Versión aprobada (simulado)' || r.aprobado !== r.texto) return error('No se puede enviar: la versión actual no está aprobada.');
    r.estado = 'En Coordinación';
    hecho(`Respuesta ${id} enviada a Coordinación (simulado). Ahora Coordinación la traspasa a la escritora.`, { obj: r, ev: 'Envió la versión aprobada a Coordinación.' });
  }
};

function revisar(id, estado) {
  const l = carta(id);
  if (l.estado !== 'En revisión') return;
  const motivo = valor('mot-' + id);
  if (estado !== 'Aprobada' && !motivo) { error('Escribe la indicación antes de pedir ajustes o rechazar la carta.'); document.getElementById('mot-' + id)?.focus(); return; }
  tomar('mot-' + id);
  l.estado = estado; l.comentario = motivo || null;
  const t = {
    'Aprobada': [`Carta ${id} aprobada. Ahora Coordinación debe preparar su entrega (está en «Por preparar»).`, 'Aprobó la carta.'],
    'Requiere cambios': [`Carta ${id} devuelta. Ahora ${l.autora} debe ajustarla.`, `Pidió ajustes: ${motivo}`],
    'Rechazada': [`Carta ${id} rechazada. No se entregará; ${l.autora} verá el motivo.`, `Rechazó la carta: ${motivo}`]
  }[estado];
  hecho(t[0], { obj: l, ev: t[1] });
}
function leerEdicion(l) {
  if (l.tipo === 'texto') { const t = valor('txt-' + l.id); if (!t) { error('La carta no puede quedar vacía.'); return false; } tomar('txt-' + l.id); l.texto = t; }
  else if (ui.imagenes[l.id]) { l.imagen = ui.imagenes[l.id]; delete ui.imagenes[l.id]; }
  return true;
}
function nuevaCarta(k, estado) {
  const modo = ui.modoCarta[k] || 'texto';
  const datos = { tipo: modo };
  if (modo === 'texto') { const t = valor('txt-nueva-' + k); if (!t) return error('Escribe algo antes de continuar.'); tomar('txt-nueva-' + k); datos.texto = t; }
  else { const img = ui.imagenes['nueva-' + k]; if (!img) return error('Primero agrega una imagen o usa la de ejemplo.'); delete ui.imagenes['nueva-' + k]; datos.imagen = img; }
  const id = 'C-' + String(S.siguienteCarta++).padStart(2, '0');
  const l = { id, caso: k, autora: yo(), estado, hist: [], ...datos };
  S.cartas.push(l);
  ui.modoCarta[k] = 'texto';
  if (estado === 'Borrador') hecho(`Borrador ${id} guardado. Sigue en tus pendientes; nadie más lo ve.`, { obj: l, ev: 'Creó un borrador.' });
  else hecho(`Carta ${id} enviada a revisión. Ahora está pendiente de Coordinación.`, { obj: l, ev: `Escribió${modo === 'manuscrita' ? ' (manuscrita)' : ''} y envió a revisión.` });
}
function registrarEntrega(id, valida) {
  const l = carta(id);
  if (!valida(l)) return error('Esta carta aún no puede marcarse como entregada.');
  l.estado = 'Entregada en mano'; l.registradoPor = yo();
  hecho(`Entrega registrada: carta ${id} entregada en mano a ${caso(l.caso).nombre}. No quedan pasos pendientes.`, { obj: l, ev: 'Registró la entrega en mano.' });
}
function pasoReferente(id, paso, texto) {
  const l = carta(id);
  if (l.estado !== 'Entrega preparada' || l.pasoRef) return;
  l.pasoRef = paso;
  hecho(texto, { obj: l, volver: false });
}
function cambiarModo(m) {
  if (S.modoReferente === m) return;
  S.modoReferente = m;
  S.cartas.forEach(l => { if (l.responsable === REFERENTE && l.estado === 'Entrega preparada') l.pasoRef = null; });
  hecho(`Modalidad en prueba: ${m === 'A' ? 'A · Recibir sobres ya impresos' : 'B · Imprimir en el establecimiento'}.`, { volver: false });
}

/* ---------- Edición de respuestas: anula la aprobación al cambiar el texto ---------- */
function alEditarRespuesta(t) {
  const r = respuesta(t.dataset.resp);
  if (!r || !['Borrador', 'Pendiente de aprobación', 'Versión aprobada (simulado)'].includes(r.estado)) return;
  const antes = r.estado;
  r.texto = t.value;
  if (r.aprobado !== null && r.texto !== r.aprobado) {
    r.aprobado = null; r.estado = 'Pendiente de aprobación';
    marcar(r, 'Texto editado después de aprobar: aprobación anulada.');
    registrar(`Respuesta ${r.id}: texto editado después de aprobar. Aprobación anulada.`);
  }
  guardar();
  document.getElementById('rctl-' + r.id).innerHTML = controlesRespuesta(r);
  if (antes !== r.estado) {
    document.getElementById('rpanel-' + r.id).innerHTML = panel({ estado: r.estado, flujo: flujoRespuesta(r), datos: [['De', nombreCaso(r.caso)], ['Registrada por', esc(r.mediadora)]], hist: r.hist, notas: true, notaDe: 'respuesta:' + r.id });
    renderRegistro();
  }
}

/* ---------- Imagen manuscrita: vista previa local, reducida ---------- */
function leerImagen(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => cb(null);
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* =========================================================
   RENDER
   ========================================================= */
function render() {
  document.querySelectorAll('[data-keep]').forEach(t => { ui.borradores[t.id] = t.value; });

  document.querySelectorAll('.roles [data-act="rol"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === S.rol));
  const conPersona = S.rol === 'Escritora' || S.rol === 'Mediadora';
  $('#persona-wrap').hidden = !conPersona;
  if (conPersona) {
    const lista = S.rol === 'Escritora' ? ESCRITORAS : MEDIADORAS, campo = S.rol === 'Escritora' ? 'escritora' : 'mediadora';
    $('#persona').innerHTML = lista.map(p => {
      const n = S.casos.filter(c => c[campo] === p && !c.cerrada).length;
      return `<option value="${esc(p)}" ${p === S.persona[S.rol] ? 'selected' : ''}>${esc(p)} · ${n} ${n === 1 ? 'caso' : 'casos'}</option>`;
    }).join('');
  }

  const r = ruta();
  $('#vista').innerHTML =
    r.tipo === 'carta' ? detalleCarta(carta(r.id)) :
    r.tipo === 'caso' ? detalleCaso(caso(r.id)) :
    r.tipo === 'escribir' ? detalleEscribir(caso(r.id)) :
    r.tipo === 'respuesta' ? detalleRespuesta(respuesta(r.id)) :
    ({ 'Coordinación': bandejaCoordinacion, 'Escritora': bandejaEscritora, 'Mediadora': bandejaMediadora, 'Referente institucional': bandejaReferente })[S.rol]();

  document.querySelectorAll('[data-keep]').forEach(t => {
    if (t.id in ui.borradores && (t.tagName === 'TEXTAREA' || [...t.options].some(o => o.value === ui.borradores[t.id]))) t.value = ui.borradores[t.id];
  });
  $('#registro-panel').hidden = !ui.verRegistro;
  renderOpciones(); renderAviso(); renderRegistro();
  if (ui.foco) { document.getElementById(ui.foco)?.focus(); ui.foco = null; }
}
function renderOpciones() {
  $('#opciones-menu').innerHTML = ui.confirmarReinicio
    ? `<p>Se borrarán todas las acciones y volverán los casos iniciales.</p>
       <div class="acciones"><button class="btn riesgo-lleno" data-act="reiniciarSi">Sí, reiniciar</button>
       <button class="btn texto" data-act="reiniciarNo">Cancelar</button></div>`
    : `<button class="btn texto" data-act="registro">${ui.verRegistro ? 'Ocultar' : 'Ver'} registro de la demostración</button>
       <button class="btn texto" data-act="reiniciar">Reiniciar demostración…</button>`;
}
function renderAviso() {
  $('#aviso').innerHTML = aviso
    ? `<div class="aviso${aviso.error ? ' error' : ''}"><span>${esc(aviso.texto)}</span><button data-act="cerrarAviso" aria-label="Cerrar aviso">Cerrar</button></div>` : '';
}
function renderRegistro() {
  $('#registro').innerHTML = S.registro.length
    ? S.registro.map(x => `<li><span class="hora">${esc(x.hora)} · ${esc(x.quien)}:</span> ${esc(x.texto)}</li>`).join('')
    : '<li>Sin acciones todavía.</li>';
}

/* ---------- Eventos ---------- */
window.addEventListener('hashchange', () => {
  ui.confirmar = null; ui.noEntrega = false;
  const r = ruta();
  // Abrir una respuesta traspasada la marca como leída por la escritora
  if (r.tipo === 'respuesta' && S.rol === 'Escritora') {
    const x = respuesta(r.id);
    if (x && puedeVer('respuesta', x) && !x.leida) { x.leida = true; marcar(x, 'Leyó la respuesta.'); registrar(`Respuesta ${x.id} leída.`); guardar(); }
  }
  render(); window.scrollTo(0, 0);
  if (r.tipo !== 'bandeja') $('#vista h1')?.focus({ preventScroll: true });
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  acciones[b.dataset.act](b.dataset.id);
});
document.addEventListener('input', e => { if (e.target.dataset.resp) alEditarRespuesta(e.target); });
document.addEventListener('change', e => {
  if (e.target.id === 'persona') { S.persona[S.rol] = e.target.value; ui.confirmar = null; aviso = null; guardar(); ir('#/'); }
  if (e.target.id === 'modo-ref') cambiarModo(e.target.value);
  const clave = e.target.dataset.img;
  if (clave && e.target.files[0]) leerImagen(e.target.files[0], url => {
    if (!url) return error('No se pudo leer la imagen.');
    ui.imagenes[clave] = url; render();
  });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#opciones').open) { $('#opciones').open = false; ui.confirmarReinicio = false; renderOpciones(); } });

cargar();
render();
