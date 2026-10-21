/* =========================================================
   LÓGICA DEL PROTOTIPO · V3
   - El estado vive en memoria y se guarda en localStorage de este navegador.
   - Nada se envía a ningún servidor.
   - Las reglas y transiciones son las mismas de V1; cambia la presentación.
   ========================================================= */

const CLAVE = 'aclara-correspondencia-v1';
let S;                                   // estado de la demo
const ui = {                             // estado solo de pantalla (no se guarda)
  abierto: null,          // un solo elemento desplegado a la vez
  confirmar: null,        // confirmación pendiente de una acción de riesgo
  noEntrega: null,        // carta en la que se está indicando el motivo de no entrega
  pestana: 'resolver',    // pestaña de Coordinación
  verRegistro: false,
  confirmarReinicio: false,
  borradores: {}, imagenes: {}
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

function cargar() {
  try { const t = localStorage.getItem(CLAVE); if (t) { S = JSON.parse(t); return; } } catch (e) {}
  S = estadoInicial();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
  catch (e) { avisar('No se pudo guardar en el navegador (quizá la imagen es muy grande). Los cambios siguen en esta pestaña.', true); }
}
function avisar(texto, error = false) {
  aviso = { texto, error };
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { aviso = null; renderAviso(); }, error ? 9000 : 6000);
}
function registrar(texto) { S.registro.unshift({ hora: hora(), quien: yo(), texto }); }
function hecho(texto, cerrar = true) {
  if (cerrar) { ui.abierto = null; ui.confirmar = null; ui.noEntrega = null; }
  registrar(texto); avisar(texto); guardar(); render();
}
function error(texto) { avisar(texto, true); render(); }
// Lee el valor de un campo y lo vacía (para que no quede como borrador)
function tomar(id) { const el = document.getElementById(id); if (!el) return ''; const v = el.value.trim(); el.value = ''; delete ui.borradores[id]; return v; }
const valor = id => (document.getElementById(id)?.value || '').trim();

/* ---------- Estados en palabras sencillas (sin colores) ---------- */
function estadoCarta(l) {
  switch (l.estado) {
    case 'Aprobada': return 'Aprobada · falta preparar la entrega';
    case 'Entrega preparada': return l.pasoRef ? `Preparada · ${l.pasoRef.toLowerCase()} · aún no entregada` : 'Preparada · aún no entregada';
    case 'No entregada': return `No entregada (${l.motivo})`;
    default: return l.estado;
  }
}
function ahoraCarta(l) {
  switch (l.estado) {
    case 'En revisión': return 'Coordinación la revisa';
    case 'Requiere cambios': return `${l.autora} debe corregirla`;
    case 'Rechazada': return 'No se entregará';
    case 'Aprobada': return 'Coordinación prepara la entrega';
    case 'Entrega preparada': return `${l.responsable} debe entregarla y registrarlo`;
    case 'Entregada en mano': return `Registrada por ${l.registradoPor}`;
    case 'No entregada': return 'Coordinación decide un nuevo intento';
  }
  return '';
}
function estadoCaso(c) {
  if (c.cerrada) return 'Correspondencia cerrada';
  if (c.ausencia?.estado === 'Ausencia comunicada') return 'Ausencia comunicada';
  if (!c.escritora || !c.mediadora) return 'Falta asignar';
  if (c.ausencia?.estado === 'Suplente asignada') return `Activa · suplente ${c.ausencia.suplente}`;
  return 'Activa';
}
function ahoraRespuesta(r) {
  const c = caso(r.caso);
  if (r.estado === 'Enviada (simulado)') return `La recibe ${c.escritora || 'la escritora del caso'}`;
  if (r.estado === 'Versión aprobada (simulado)') return `${r.mediadora} puede enviarla`;
  return `${r.mediadora} la revisa con ${c.nombre}`;
}

/* ---------- Piezas de interfaz ---------- */
const est = t => `<span class="estado-texto">${esc(t)}</span>`;
const demo = x => x.demo ? '<span class="demo" title="Carta anterior o de muestra">DEMO</span>' : '';
const para = l => { const c = caso(l.caso); return `${esc(c.nombre)} (${c.codigo})`; };
const opciones = (lista, sel, vacio) =>
  (vacio ? `<option value="">${vacio}</option>` : '') +
  lista.map(p => `<option value="${esc(p)}" ${p === sel ? 'selected' : ''}>${esc(p)}</option>`).join('');
const cabVista = (titulo, texto) => `<div class="vista-cab"><h1>${titulo}</h1><p>${esc(texto)}</p></div>`;

function contenido(l) {
  return l.tipo === 'manuscrita'
    ? `<img class="manuscrita" src="${l.imagen}" alt="Carta manuscrita (imagen de prueba)">`
    : `<blockquote>${esc(l.texto)}</blockquote>`;
}

// Elemento de lista resumido. Si tiene «clave», su botón despliega el detalle.
function item({ clave = '', titulo, meta = '', boton = '', clase = 'sec', detalle = '', siempre = false }) {
  const abierto = siempre || (clave && ui.abierto === clave);
  const btn = clave && boton
    ? `<button class="btn ${abierto ? 'texto' : clase}" data-act="abrir" data-id="${clave}" aria-expanded="${!!abierto}">${abierto ? 'Cerrar' : boton}</button>` : '';
  return `<article class="item${abierto && !siempre ? ' abierto' : ''}"${clave ? ` id="item-${clave}"` : ''}>
    <div class="item-cab"><div class="item-texto"><h3 class="item-titulo">${titulo}</h3>${meta ? `<p class="item-meta">${meta}</p>` : ''}</div>${btn}</div>
    ${abierto && detalle ? `<div class="detalle">${typeof detalle === 'function' ? detalle() : detalle}</div>` : ''}
  </article>`;
}
function grupo(titulo, items, vacio = '') {
  if (!items.length && !vacio) return '';
  return `<section class="grupo"><h2 class="grupo-titulo">${titulo}${items.length ? ` (${items.length})` : ''}</h2>
    <div class="lista">${items.length ? items.join('') : `<p class="vacio">${vacio}</p>`}</div></section>`;
}
function confirmacion(clave, texto, boton, acto, id) {
  if (ui.confirmar !== clave) return '';
  return `<div class="confirmacion" role="alertdialog" aria-label="Confirmar acción">
    <p>${texto}</p>
    <div class="acciones"><button class="btn riesgo-lleno" data-act="${acto}" data-id="${id}">${boton}</button>
      <button class="btn texto" data-act="noConfirmar">Cancelar</button></div></div>`;
}

/* =========================================================
   COORDINACIÓN · Por resolver | Casos | Seguimiento
   ========================================================= */
function vistaCoordinacion() {
  const ausencias = S.casos.filter(c => c.ausencia?.estado === 'Ausencia comunicada' && !c.cerrada);
  const noEntregadas = S.cartas.filter(l => l.estado === 'No entregada');
  const sinAsignar = S.casos.filter(c => !c.cerrada && (!c.escritora || !c.mediadora) && c.ausencia?.estado !== 'Ausencia comunicada');
  const porRevisar = S.cartas.filter(l => l.estado === 'En revisión');
  const porPreparar = S.cartas.filter(l => l.estado === 'Aprobada');
  const enEntrega = S.cartas.filter(l => l.estado === 'Entrega preparada');
  const cerradas = S.cartas.filter(l => ['Entregada en mano', 'Rechazada', 'Requiere cambios'].includes(l.estado));
  const nResolver = ausencias.length + noEntregadas.length + sinAsignar.length + porRevisar.length + porPreparar.length;

  let h = cabVista('Coordinación', AYUDA_ROL['Coordinación']);
  h += `<div class="pestanas" role="tablist">${[
    ['resolver', `Por resolver (${nResolver})`],
    ['casos', `Casos (${S.casos.length})`],
    ['seguimiento', `Seguimiento (${enEntrega.length + cerradas.length})`]
  ].map(([k, t]) => `<button class="pestana" role="tab" aria-selected="${ui.pestana === k}" data-act="pestana" data-id="${k}">${t}</button>`).join('')}</div>`;

  if (ui.pestana === 'resolver') {
    if (!nResolver) h += `<p class="vacio">No hay pendientes ahora. Puedes consultar Casos o Seguimiento.</p>`;
    h += grupo('Avisos', [...ausencias.map(itemAusencia), ...noEntregadas.map(itemNoEntregada)]);
    h += grupo('Asignar personas', sinAsignar.map(c => item({
      clave: 'asig-' + c.codigo, titulo: `${esc(c.nombre)} (${c.codigo})`,
      meta: `${est('Falta asignar')} · ${c.responde ? 'Acepta recibir cartas y, si quiere, responder' : 'Acepta recibir cartas, no desea responder'}`,
      boton: 'Asignar', detalle: () => formAsignacion(c)
    })));
    h += grupo('Revisar cartas', porRevisar.map(itemRevisar));
    h += grupo('Preparar entregas', porPreparar.map(l => item({
      clave: 'prep-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
      meta: `${est('Aprobada')} · Visita: ${esc(caso(l.caso).visita)}`,
      boton: 'Preparar entrega', detalle: () => formPreparar(l, 'Preparar entrega')
    })));
  }

  if (ui.pestana === 'casos') {
    h += grupo('Casos', S.casos.map(c => item({
      clave: 'caso-' + c.codigo, titulo: `${esc(c.nombre)} (${c.codigo})`,
      meta: `${est(estadoCaso(c))} · Escritora: ${esc(c.escritora || 'sin asignar')} · Mediadora: ${esc(c.mediadora || 'sin asignar')}`,
      boton: c.cerrada ? 'Ver' : 'Ver o cambiar', detalle: () => formAsignacion(c)
    })));
  }

  if (ui.pestana === 'seguimiento') {
    h += `<p class="nota">Solo consulta: aquí no hay acciones pendientes para Coordinación.</p>`;
    h += grupo('En entrega · preparadas, aún no entregadas', enEntrega.map(l => item({
      titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`, meta: `${est(estadoCarta(l))} · ${esc(ahoraCarta(l))}`
    })), 'No hay entregas en curso.');
    h += grupo('Cerradas o devueltas', cerradas.map(l => item({
      titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
      meta: `${est(estadoCarta(l))} · ${esc(l.comentario ? 'Motivo: ' + l.comentario : ahoraCarta(l))}`
    })), 'Todavía no hay cartas cerradas o devueltas.');
  }
  return h;
}

function itemAusencia(c) {
  return item({
    clave: 'aus-' + c.codigo, titulo: `Aviso de ausencia · ${esc(c.nombre)} (${c.codigo})`,
    meta: `${est('Ausencia comunicada')} · ${esc(c.ausencia.por)} avisó que no puede continuar`,
    boton: 'Resolver aviso', clase: '',
    detalle: () => `<label class="campo"><span class="campo-etiqueta">Escritora suplente</span>
        <select id="sup-${c.codigo}" data-keep>${opciones(ESCRITORAS.filter(e => e !== c.ausencia.por), null)}</select></label>
      <div class="acciones">
        <button class="btn" data-act="suplente" data-id="${c.codigo}">Asignar suplente</button>
        <button class="btn riesgo" data-act="cerrar" data-id="${c.codigo}">Cerrar correspondencia…</button>
      </div>
      ${confirmacion('cerrar-' + c.codigo, `¿Cerrar la correspondencia con ${esc(c.nombre)}? No se podrán escribir más cartas para este caso.`, 'Sí, cerrar correspondencia', 'cerrarSi', c.codigo)}`
  });
}
function itemNoEntregada(l) {
  return item({
    clave: 'noent-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
    meta: `${est('No entregada')} · ${esc(l.motivo)} · registró ${esc(l.registradoPor)}`,
    boton: 'Resolver', detalle: () => formPreparar(l, 'Preparar de nuevo')
  });
}
function itemRevisar(l) {
  return item({
    clave: 'rev-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
    meta: `${est('En revisión')} · De ${esc(l.autora)} · ${l.tipo === 'manuscrita' ? 'manuscrita' : 'escrita en la plataforma'}`,
    boton: 'Revisar carta',
    detalle: () => `${contenido(l)}
      <label class="campo"><span class="campo-etiqueta">Motivo o comentario para la escritora <span class="campo-ayuda">(obligatorio para devolver o rechazar)</span></span>
        <textarea id="mot-${l.id}" data-keep></textarea></label>
      <!-- Sin botón dominante: no inducir la decisión que se quiere observar -->
      <div class="acciones">
        <button class="btn sec" data-act="aprobar" data-id="${l.id}">Aprobar</button>
        <button class="btn sec" data-act="devolver" data-id="${l.id}">Devolver para corregir</button>
        <button class="btn riesgo" data-act="rechazar" data-id="${l.id}">Rechazar…</button>
      </div>
      ${confirmacion('rechazar-' + l.id, '¿Rechazar esta carta? No podrá entregarse y la escritora verá el motivo.', 'Sí, rechazar', 'rechazarSi', l.id)}
      <p class="nota">Una carta aprobada pasa a «Preparar entregas». Ninguna carta se entrega sin revisión.</p>`
  });
}
function formAsignacion(c) {
  return `<ul class="datos">
      <li>Lugar de espera: <strong>${esc(c.lugar)}</strong> (solo visible para Coordinación)</li>
      <li>Visita: <strong>${esc(c.visita)}</strong></li>
      <li>${c.responde ? 'Acepta recibir cartas y, si quiere, responder.' : 'Acepta recibir cartas, pero no desea responder.'}</li>
    </ul>
    ${c.cerrada ? '<p class="nota">La correspondencia está cerrada.</p>' : `
    <label class="campo"><span class="campo-etiqueta">Escritora</span><select id="asig-esc-${c.codigo}">${opciones(ESCRITORAS, c.escritora, '— Sin asignar —')}</select></label>
    <label class="campo"><span class="campo-etiqueta">Mediadora</span><select id="asig-med-${c.codigo}">${opciones(MEDIADORAS, c.mediadora, '— Sin asignar —')}</select></label>
    <div class="acciones"><button class="btn" data-act="asignar" data-id="${c.codigo}">Guardar asignación</button></div>`}`;
}
function formPreparar(l, textoBoton) {
  const c = caso(l.caso);
  return `<p class="nota">De ${esc(l.autora)} · Visita: ${esc(c.visita)}${l.comentario ? ` · Nota de revisión: ${esc(l.comentario)}` : ''}</p>
    <label class="campo"><span class="campo-etiqueta">¿Quién la llevará o recibirá?</span>
      <select id="quien-${l.id}" data-keep>${opciones([...MEDIADORAS, REFERENTE], c.mediadora || 'Mediadora 1')}</select></label>
    <div class="acciones"><button class="btn" data-act="preparar" data-id="${l.id}">${textoBoton}</button></div>
    <p class="nota">Preparar no es entregar: quien la lleve deberá registrar la entrega en mano.</p>`;
}

/* =========================================================
   ESCRITORA · Para corregir → Personas asignadas → Mis cartas
   ========================================================= */
function vistaEscritora() {
  const p = S.persona['Escritora'];
  const misCasos = S.casos.filter(c => c.escritora === p);
  const corregir = S.cartas.filter(l => l.autora === p && l.estado === 'Requiere cambios');
  const otras = S.cartas.filter(l => l.autora === p && l.estado !== 'Requiere cambios').reverse();

  let h = cabVista('Escritora', AYUDA_ROL['Escritora']);
  h += grupo('Cartas para corregir', corregir.map(itemCorregir));
  h += `<section class="grupo"><h2 class="grupo-titulo">Personas asignadas</h2>${misCasos.length
    ? misCasos.map(c => tarjetaPersona(c, p, corregir.length > 0)).join('')
    : `<div class="lista"><p class="vacio">Todavía no tienes personas asignadas. Coordinación te avisará cuando tengas una.</p></div>`}</section>`;
  h += grupo('Mis cartas', otras.map(l => item({
    clave: 'ver-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
    meta: `${est(estadoCarta(l))} · ${esc(ahoraCarta(l))}`, boton: 'Ver carta', clase: 'texto',
    detalle: () => contenido(l) + (l.estado === 'Rechazada' ? `<div class="mensaje alerta"><strong>Motivo del rechazo:</strong> ${esc(l.comentario)}</div>` : '')
  })), 'Aún no has enviado cartas.');
  return h;
}

function tarjetaPersona(c, p, hayCorrecciones) {
  const k = c.codigo;
  const abierto = ['escribir-', 'manuscrita-', 'ausencia-'].find(x => ui.abierto === x + k);
  let h = `<article class="persona-tarjeta" id="item-persona-${k}"><h3>${esc(c.nombre)} (${k})</h3>
    <p class="nota">${c.responde ? 'Puede recibir tus cartas y, si quiere, responder. Es posible que no responda.' : 'Recibe cartas, pero prefirió no responder. Tus cartas igual le llegan.'}</p>`;
  if (c.ausencia?.estado === 'Suplente asignada' && c.ausencia.suplente === p) h += `<p class="nota">Recibes este caso como suplente.</p>`;

  if (c.cerrada) h += `<div class="mensaje">Coordinación cerró esta correspondencia.</div>`;
  else if (c.ausencia?.estado === 'Ausencia comunicada') h += `<div class="mensaje">Avisaste que no puedes continuar. Coordinación decidirá si asigna una suplente o cierra la correspondencia.</div>`;
  else if (!abierto) h += `<div class="acciones">
      <button class="btn ${hayCorrecciones ? 'sec' : ''}" data-act="abrir" data-id="escribir-${k}">Escribir una carta</button>
      <button class="btn sec" data-act="abrir" data-id="manuscrita-${k}">Agregar manuscrita</button>
      <button class="btn texto" data-act="abrir" data-id="ausencia-${k}">Avisar ausencia</button></div>`;
  else if (abierto === 'escribir-') h += `<div class="detalle">
      <label class="campo"><span class="campo-etiqueta">Carta para ${esc(c.nombre)} (${k})</span>
        <textarea id="txt-${k}" data-keep placeholder="Escribe aquí tu carta…"></textarea></label>
      <p class="nota">Pautas: no dar consejos de salud ni pedir datos personales. La carta se revisa antes de entregarse.</p>
      <div class="acciones"><button class="btn" data-act="enviarTexto" data-id="${k}">Enviar a revisión</button>
        <button class="btn texto" data-act="abrir" data-id="escribir-${k}">Cancelar</button></div></div>`;
  else if (abierto === 'manuscrita-') h += `<div class="detalle">
      ${campoImagen('nueva-' + k)}
      <div class="acciones"><button class="btn" data-act="enviarManuscrita" data-id="${k}" ${ui.imagenes['nueva-' + k] ? '' : 'disabled'}>Enviar a revisión</button>
        <button class="btn texto" data-act="abrir" data-id="manuscrita-${k}">Cancelar</button></div>
      ${ui.imagenes['nueva-' + k] ? '' : '<p class="bloqueo">Primero agrega una imagen de la carta.</p>'}</div>`;
  else if (abierto === 'ausencia-') h += `<div class="confirmacion">
      <p>¿Avisar que no puedes continuar escribiendo a ${esc(c.nombre)}? Coordinación decidirá si asigna una suplente o cierra la correspondencia.</p>
      <div class="acciones"><button class="btn riesgo-lleno" data-act="ausencia" data-id="${k}">Sí, avisar ausencia</button>
        <button class="btn texto" data-act="abrir" data-id="ausencia-${k}">Cancelar</button></div></div>`;

  S.respuestas.filter(r => r.caso === k && r.estado === 'Enviada (simulado)').forEach(r => {
    h += `<p class="hecho" style="margin-top:14px">Respuesta de ${esc(c.nombre)} (simulado)</p><blockquote>${esc(r.aprobado)}</blockquote>`;
  });
  return h + '</article>';
}
function itemCorregir(l) {
  return item({
    clave: 'corr-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
    meta: `${est('Requiere cambios')} · Coordinación la devolvió con un comentario`, boton: 'Corregir carta', clase: '',
    detalle: () => `<div class="mensaje"><strong>Comentario de Coordinación:</strong> ${esc(l.comentario)}</div>` +
      (l.tipo === 'texto'
        ? `<label class="campo"><span class="campo-etiqueta">Tu carta</span><textarea id="corr-${l.id}" data-keep>${esc(l.texto)}</textarea></label>`
        : `${contenido(l)}${campoImagen('corr-' + l.id)}<p class="nota">Puedes cambiar la imagen o reenviar la misma.</p>`) +
      `<div class="acciones"><button class="btn" data-act="reenviar" data-id="${l.id}">Reenviar a revisión</button></div>`
  });
}
function campoImagen(clave) {
  const img = ui.imagenes[clave];
  return `<label class="campo"><span class="campo-etiqueta">Foto o escaneo de la carta</span><input type="file" accept="image/*" data-img="${clave}"></label>
    <div class="acciones"><button class="btn sec" data-act="ejemplo" data-id="${clave}">Usar imagen de ejemplo</button></div>
    ${img ? `<img class="manuscrita" style="margin-top:12px" src="${img}" alt="Vista previa de la carta manuscrita">` : ''}
    <p class="nota">La imagen queda solo en este navegador. No se sube a ningún servidor.</p>`;
}

/* =========================================================
   MEDIADORA · Entregas → Respuestas → Mis casos → Ya registrado
   ========================================================= */
function vistaMediadora() {
  const p = S.persona['Mediadora'];
  const entregas = S.cartas.filter(l => l.responsable === p && l.estado === 'Entrega preparada');
  const resps = S.respuestas.filter(r => r.mediadora === p);
  const pendientes = resps.filter(r => r.estado !== 'Enviada (simulado)');
  const enviadas = resps.filter(r => r.estado === 'Enviada (simulado)');
  const registradas = S.cartas.filter(l => l.registradoPor === p);

  let h = cabVista('Mediadora', AYUDA_ROL['Mediadora']);
  h += grupo('Entregas para tu visita', entregas.map(itemEntrega), 'No tienes cartas preparadas para entregar.');
  h += grupo('Respuestas por gestionar', pendientes.map(itemRespuesta), 'No hay respuestas pendientes.');
  h += grupo('Mis casos', S.casos.filter(c => c.mediadora === p).map(c => item({
    titulo: `${esc(c.nombre)} (${c.codigo})`,
    meta: `Visita: ${esc(c.visita)} · ${c.cerrada ? 'Correspondencia cerrada' : (c.responde ? 'Si quiere, puede responder' : 'No desea responder')}` +
      (c.responde && !c.cerrada ? ` · <button class="btn texto" data-act="nuevaRespuesta" data-id="${c.codigo}">Registrar respuesta dictada</button>` : '')
  })), 'No tienes casos asignados.');
  h += grupo('Ya registrado', [
    ...registradas.map(l => item({ titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`, meta: est(estadoCarta(l)) })),
    ...enviadas.map(r => item({
      clave: 'resp-' + r.id, titulo: `Respuesta ${r.id} de ${esc(caso(r.caso).nombre)} (${r.caso})${demo(r)}`,
      meta: est(r.estado), boton: 'Ver', clase: 'texto', detalle: `<blockquote>${esc(r.aprobado)}</blockquote>`
    }))
  ]);
  return h;
}
function itemEntrega(l) {
  const c = caso(l.caso);
  return item({
    clave: 'ent-' + l.id, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`,
    meta: `${est('Preparada · aún no entregada')} · Visita: ${esc(c.visita)}`, boton: 'Registrar entrega',
    detalle: () => ui.noEntrega === l.id
      ? `<label class="campo"><span class="campo-etiqueta">¿Por qué no se pudo entregar?</span>
          <select id="motivo-${l.id}" data-keep>${opciones(MOTIVOS_NO_ENTREGA, MOTIVOS_NO_ENTREGA[0])}</select></label>
        <div class="acciones"><button class="btn" data-act="noEntregada" data-id="${l.id}">Guardar: no entregada</button>
          <button class="btn texto" data-act="noEntregaNo" data-id="${l.id}">Volver</button></div>`
      : `<p style="margin-top:0">¿Qué pasó en la visita?</p>
        <div class="acciones"><button class="btn" data-act="entregada" data-id="${l.id}">Entregada en mano</button>
          <button class="btn sec" data-act="noEntrega" data-id="${l.id}">No se pudo entregar</button></div>
        <p class="nota">El contenido de la carta no se muestra aquí.</p>`
  });
}
function itemRespuesta(r) {
  const c = caso(r.caso);
  return item({
    clave: 'resp-' + r.id, titulo: `Respuesta ${r.id} de ${esc(c.nombre)} (${c.codigo})${demo(r)}`,
    meta: `<span id="rmeta-${r.id}">${metaRespuesta(r)}</span>`, boton: 'Revisar respuesta',
    detalle: () => `<p style="margin-top:0">Lee la respuesta con ${esc(c.nombre)}. Pregúntale si quiere compartirla así o cambiar algo. Solo se envía la versión que la persona apruebe.</p>
      <label class="campo"><span class="campo-etiqueta">Texto de la respuesta</span>
        <textarea id="rtxt-${r.id}" data-resp="${r.id}" placeholder="Escribe lo que la persona dictó…">${esc(r.texto)}</textarea></label>
      <div id="rctl-${r.id}">${controlesRespuesta(r)}</div>`
  });
}
const metaRespuesta = r => `${est(r.estado)} · ${esc(ahoraRespuesta(r))}`;
function controlesRespuesta(r) {
  const aprobada = r.estado === 'Versión aprobada (simulado)' && r.aprobado === r.texto;
  let h = '';
  if (r.estado === 'Pendiente de aprobación')
    h += `<div class="mensaje alerta">El texto cambió después de la aprobación. La aprobación anterior ya no vale: revisa la nueva versión con la persona.</div>`;
  if (aprobada) h += `<p class="hecho">Esta versión está aprobada (simulado).</p>
      <div class="acciones"><button class="btn" data-act="enviarRespuesta" data-id="${r.id}">Enviar respuesta (simulado)</button></div>
      <p class="nota">Si cambias el texto, habrá que volver a aprobarlo.</p>`;
  else h += `<div class="acciones">
      <button class="btn" data-act="aprobarRespuesta" data-id="${r.id}" ${r.texto.trim() ? '' : 'disabled'}>Registrar aprobación de esta versión (simulada)</button>
      <button class="btn sec" data-act="enviarRespuesta" data-id="${r.id}" disabled>Enviar respuesta (simulado)</button></div>
      <p class="bloqueo">Para enviar, primero registra la aprobación de la versión actual.</p>`;
  return h + `<p class="nota">Simulación: registrar aquí no equivale a un consentimiento real.</p>`;
}

/* =========================================================
   REFERENTE INSTITUCIONAL · modalidad explícita + pasos
   ========================================================= */
function vistaReferente() {
  const A = S.modoReferente === 'A';
  let h = cabVista('Referente institucional', AYUDA_ROL['Referente institucional']);
  h += `<section class="grupo"><fieldset><legend class="grupo-titulo">Modalidad en prueba</legend>
    <label class="opcion-radio"><input type="radio" name="modo" value="A" ${A ? 'checked' : ''}>
      <span>A · Recibir sobres ya impresos<small>El sobre llega cerrado. No ves el contenido.</small></span></label>
    <label class="opcion-radio"><input type="radio" name="modo" value="B" ${A ? '' : 'checked'}>
      <span>B · Imprimir en el establecimiento<small>Ves solo cartas ya aprobadas y preparadas, para imprimirlas.</small></span></label>
    </fieldset><p class="nota">Ambas modalidades son alternativas en estudio; ninguna está adoptada.</p></section>`;

  const paso1 = A ? 'Sobre recibido' : 'Impresa (simulado)';
  h += grupo(A ? 'Sobres para entregar' : 'Cartas para imprimir y entregar',
    S.cartas.filter(l => l.responsable === REFERENTE && l.estado === 'Entrega preparada').map(l => {
      const listo = l.pasoRef === paso1;
      return item({
        siempre: true, titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`, meta: est(estadoCarta(l)),
        detalle: `${A ? '' : contenido(l)}<ol class="pasos">
          <li><span class="paso-num ${listo ? 'ok' : ''}">${listo ? '✓' : '1'}</span><div>
            <p style="margin:0 0 6px">${A ? 'Confirmar que llegó el sobre' : 'Imprimir la carta'}</p>
            ${listo ? `<p class="nota" style="margin:0">Hecho.</p>` : `<button class="btn" data-act="${A ? 'sobre' : 'imprimir'}" data-id="${l.id}">${A ? 'Sobre recibido' : 'Simular impresión'}</button>`}</div></li>
          <li><span class="paso-num">2</span><div>
            <p style="margin:0 0 6px">Entregar en mano y registrarlo</p>
            <button class="btn ${listo ? '' : 'sec'}" data-act="entregadaRef" data-id="${l.id}" ${listo ? '' : 'disabled'}>Entregada en mano</button>
            ${listo ? '' : `<p class="bloqueo">Disponible después del paso 1.</p>`}</div></li></ol>`
      });
    }), 'No hay cartas preparadas para tu institución.');

  h += grupo('Entregas registradas', S.cartas.filter(l => l.registradoPor === REFERENTE).map(l => item({
    titulo: `Carta ${l.id} para ${para(l)}${demo(l)}`, meta: est(estadoCarta(l))
  })));
  return h;
}

/* =========================================================
   ACCIONES (mismas reglas que V1)
   ========================================================= */
const acciones = {
  // Controles de la demo
  rol(r) { S.rol = r; ui.abierto = ui.confirmar = ui.noEntrega = null; aviso = null; guardar(); render(); window.scrollTo(0, 0); },
  pestana(k) { ui.pestana = k; ui.abierto = ui.confirmar = null; render(); },
  abrir(k) {
    ui.abierto = ui.abierto === k ? null : k; ui.confirmar = null; ui.noEntrega = null; render();
    const el = document.getElementById('item-' + k) || document.getElementById('item-persona-' + k.split('-').slice(1).join('-'));
    if (ui.abierto && el) el.scrollIntoView({ block: 'nearest' });
  },
  noConfirmar() { ui.confirmar = null; render(); },
  registro() {
    ui.verRegistro = !ui.verRegistro; $('#opciones').open = false; render();
    if (ui.verRegistro) $('#registro-panel').scrollIntoView({ block: 'start' });
  },
  reiniciar() { ui.confirmarReinicio = true; renderOpciones(); },
  reiniciarNo() { ui.confirmarReinicio = false; renderOpciones(); },
  reiniciarSi() {
    S = estadoInicial();
    Object.assign(ui, { abierto: null, confirmar: null, noEntrega: null, pestana: 'resolver', confirmarReinicio: false, borradores: {}, imagenes: {} });
    document.querySelectorAll('[data-keep]').forEach(t => t.value = '');
    $('#opciones').open = false;
    avisar('Demostración reiniciada. Todo volvió al estado inicial.');
    guardar(); render(); window.scrollTo(0, 0);
  },

  // Coordinación
  asignar(k) {
    const c = caso(k);
    c.escritora = valor('asig-esc-' + k) || null;
    c.mediadora = valor('asig-med-' + k) || null;
    hecho(`Asignación guardada para ${c.nombre} (${k}): ${c.escritora || 'sin escritora'} y ${c.mediadora || 'sin mediadora'}.`);
  },
  aprobar(id) { revisar(id, 'Aprobada'); },
  devolver(id) { revisar(id, 'Requiere cambios'); },
  rechazar(id) {
    if (!valor('mot-' + id)) return error('Escribe el motivo antes de rechazar la carta.');
    ui.confirmar = 'rechazar-' + id; render();
  },
  rechazarSi(id) { revisar(id, 'Rechazada'); },
  preparar(id) {
    const l = carta(id);
    if (!['Aprobada', 'No entregada'].includes(l.estado)) return error('Solo se puede preparar una carta aprobada.');
    l.responsable = valor('quien-' + id); l.estado = 'Entrega preparada'; l.pasoRef = null; l.registradoPor = null; l.motivo = null;
    delete ui.borradores['quien-' + id];
    hecho(`Carta ${id} preparada. La llevará o recibirá ${l.responsable}. Aún no está entregada.`);
  },
  suplente(k) {
    const c = caso(k), s = valor('sup-' + k);
    c.escritora = s; c.ausencia = { ...c.ausencia, estado: 'Suplente asignada', suplente: s };
    delete ui.borradores['sup-' + k];
    hecho(`${s} queda como suplente para ${c.nombre} (${k}).`);
  },
  cerrar(k) { ui.confirmar = 'cerrar-' + k; render(); },
  cerrarSi(k) {
    const c = caso(k);
    c.cerrada = true; c.ausencia = { ...(c.ausencia || {}), estado: 'Correspondencia cerrada' };
    hecho(`Correspondencia con ${c.nombre} (${k}) cerrada.`);
  },

  // Escritora
  enviarTexto(k) {
    const texto = valor('txt-' + k);
    if (!texto) return error('Escribe algo antes de enviar.');
    tomar('txt-' + k);
    crearCarta(k, { tipo: 'texto', texto });
  },
  ejemplo(clave) { ui.imagenes[clave] = IMAGEN_EJEMPLO; render(); },
  enviarManuscrita(k) {
    const img = ui.imagenes['nueva-' + k];
    if (!img) return error('Primero agrega una imagen o usa la de ejemplo.');
    delete ui.imagenes['nueva-' + k];
    crearCarta(k, { tipo: 'manuscrita', imagen: img });
  },
  reenviar(id) {
    const l = carta(id);
    if (l.estado !== 'Requiere cambios') return;
    if (l.tipo === 'texto') { const t = valor('corr-' + id); if (!t) return error('La carta no puede quedar vacía.'); tomar('corr-' + id); l.texto = t; }
    else if (ui.imagenes['corr-' + id]) { l.imagen = ui.imagenes['corr-' + id]; delete ui.imagenes['corr-' + id]; }
    l.comentario = null; l.estado = 'En revisión';
    hecho(`Carta ${id} corregida y enviada de nuevo a revisión.`);
  },
  ausencia(k) {
    const c = caso(k);
    c.ausencia = { estado: 'Ausencia comunicada', por: S.persona['Escritora'] };
    hecho(`Aviso enviado: ${S.persona['Escritora']} no puede continuar con ${c.nombre} (${k}). Coordinación decidirá.`);
  },

  // Mediadora y referente
  entregada(id) { registrarEntrega(id, l => l.estado === 'Entrega preparada'); },
  entregadaRef(id) {
    const paso = S.modoReferente === 'A' ? 'Sobre recibido' : 'Impresa (simulado)';
    registrarEntrega(id, l => l.estado === 'Entrega preparada' && l.pasoRef === paso);
  },
  noEntrega(id) { ui.noEntrega = id; render(); },
  noEntregaNo() { ui.noEntrega = null; render(); },
  noEntregada(id) {
    const l = carta(id);
    if (l.estado !== 'Entrega preparada') return error('Solo se registra sobre una carta preparada.');
    l.motivo = valor('motivo-' + id); l.estado = 'No entregada'; l.registradoPor = yo();
    delete ui.borradores['motivo-' + id];
    hecho(`Carta ${id}: no entregada (${l.motivo}). Coordinación verá el aviso.`);
  },
  sobre(id) { pasoReferente(id, 'Sobre recibido', 'sobre recibido. Falta registrar la entrega en mano.'); },
  imprimir(id) { pasoReferente(id, 'Impresa (simulado)', 'impresión simulada. Falta registrar la entrega en mano.'); },

  // Respuestas
  nuevaRespuesta(k) {
    const id = 'R-' + String(S.siguienteRespuesta++).padStart(2, '0');
    S.respuestas.unshift({ id, caso: k, mediadora: S.persona['Mediadora'], estado: 'Borrador', aprobado: null, texto: '' });
    hecho(`Respuesta ${id} creada para ${caso(k).nombre} (${k}).`);
    acciones.abrir('resp-' + id);
  },
  aprobarRespuesta(id) {
    const r = respuesta(id);
    if (!r.texto.trim() || r.estado === 'Enviada (simulado)') return;
    r.aprobado = r.texto; r.estado = 'Versión aprobada (simulado)';
    hecho(`Respuesta ${id}: aprobación de esta versión registrada (simulado).`, false);
  },
  enviarRespuesta(id) {
    const r = respuesta(id);
    if (r.estado !== 'Versión aprobada (simulado)' || r.aprobado !== r.texto) return error('No se puede enviar: la versión actual no está aprobada.');
    r.estado = 'Enviada (simulado)';
    hecho(`Respuesta ${id} enviada (simulado) con la versión aprobada.`);
  }
};

function revisar(id, estado) {
  const l = carta(id);
  if (l.estado !== 'En revisión') return;
  const motivo = valor('mot-' + id);
  if (estado !== 'Aprobada' && !motivo) return error('Escribe el motivo antes de devolver o rechazar la carta.');
  tomar('mot-' + id);
  l.estado = estado; l.comentario = motivo || null;
  const texto = { 'Aprobada': 'aprobada. Ya puede prepararse su entrega', 'Requiere cambios': 'devuelta a la escritora para corregir', 'Rechazada': 'rechazada. No se entregará' }[estado];
  hecho(`Carta ${id} ${texto}.`);
}
function crearCarta(k, datos) {
  const id = 'C-' + String(S.siguienteCarta++).padStart(2, '0');
  S.cartas.push({ id, caso: k, autora: S.persona['Escritora'], estado: 'En revisión', ...datos });
  hecho(`Carta ${id} enviada a revisión. Coordinación la revisará antes de cualquier entrega.`);
}
function registrarEntrega(id, valida) {
  const l = carta(id);
  if (!valida(l)) return error('Esta carta aún no puede marcarse como entregada.');
  l.estado = 'Entregada en mano'; l.registradoPor = yo();
  hecho(`Carta ${id} registrada como entregada en mano a ${caso(l.caso).nombre}.`);
}
function pasoReferente(id, paso, texto) {
  const l = carta(id);
  if (l.estado !== 'Entrega preparada' || l.pasoRef) return;
  l.pasoRef = paso;
  hecho(`Carta ${id}: ${texto}`);
}
function cambiarModo(m) {
  if (S.modoReferente === m) return;
  S.modoReferente = m;
  S.cartas.forEach(l => { if (l.responsable === REFERENTE && l.estado === 'Entrega preparada') l.pasoRef = null; });
  hecho(`Modalidad en prueba: ${m === 'A' ? 'A · Recibir sobres ya impresos' : 'B · Imprimir en el establecimiento'}.`);
}

/* ---------- Edición de respuestas: anula la aprobación al cambiar el texto ---------- */
function alEditarRespuesta(t) {
  const r = respuesta(t.dataset.resp);
  if (!r || r.estado === 'Enviada (simulado)') return;
  const antes = r.estado;
  r.texto = t.value;
  if (r.aprobado !== null && r.texto !== r.aprobado) {
    r.aprobado = null; r.estado = 'Pendiente de aprobación';
    registrar(`Respuesta ${r.id}: texto editado después de aprobar. Aprobación anulada.`);
  }
  guardar();
  document.getElementById('rctl-' + r.id).innerHTML = controlesRespuesta(r);
  document.getElementById('rmeta-' + r.id).innerHTML = metaRespuesta(r);
  if (antes !== r.estado) renderRegistro();
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
  // Guarda lo que se estaba escribiendo para no perderlo al redibujar
  document.querySelectorAll('[data-keep]').forEach(t => { ui.borradores[t.id] = t.value; });

  document.querySelectorAll('.roles [data-act="rol"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === S.rol));
  const conPersona = S.rol === 'Escritora' || S.rol === 'Mediadora';
  $('#persona-wrap').hidden = !conPersona;
  if (conPersona) {
    const lista = S.rol === 'Escritora' ? ESCRITORAS : MEDIADORAS;
    const campo = S.rol === 'Escritora' ? 'escritora' : 'mediadora';
    $('#persona').innerHTML = lista.map(p => {
      const n = S.casos.filter(c => c[campo] === p && !c.cerrada).length;
      return `<option value="${esc(p)}" ${p === S.persona[S.rol] ? 'selected' : ''}>${esc(p)} · ${n} ${n === 1 ? 'caso' : 'casos'}</option>`;
    }).join('');
  }

  $('#vista').innerHTML = ({
    'Coordinación': vistaCoordinacion, 'Escritora': vistaEscritora,
    'Mediadora': vistaMediadora, 'Referente institucional': vistaReferente
  })[S.rol]();

  document.querySelectorAll('[data-keep]').forEach(t => {
    if (t.id in ui.borradores && (t.tagName === 'TEXTAREA' || [...t.options].some(o => o.value === ui.borradores[t.id]))) t.value = ui.borradores[t.id];
  });
  $('#registro-panel').hidden = !ui.verRegistro;
  renderOpciones(); renderAviso(); renderRegistro();
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
acciones.cerrarAviso = () => { aviso = null; renderAviso(); };
function renderRegistro() {
  $('#registro').innerHTML = S.registro.length
    ? S.registro.map(x => `<li><span class="hora">${esc(x.hora)} · ${esc(x.quien)}:</span> ${esc(x.texto)}</li>`).join('')
    : '<li>Sin acciones todavía.</li>';
}

/* ---------- Eventos ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  acciones[b.dataset.act](b.dataset.id);
});
document.addEventListener('input', e => { if (e.target.dataset.resp) alEditarRespuesta(e.target); });
document.addEventListener('change', e => {
  if (e.target.id === 'persona') {
    S.persona[S.rol] = e.target.value; ui.abierto = ui.confirmar = ui.noEntrega = null; aviso = null;
    guardar(); render();
  }
  if (e.target.name === 'modo') cambiarModo(e.target.value);
  const clave = e.target.dataset.img;
  if (clave && e.target.files[0]) leerImagen(e.target.files[0], url => {
    if (!url) return error('No se pudo leer la imagen.');
    ui.imagenes[clave] = url; render();
  });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#opciones').open) { $('#opciones').open = false; ui.confirmarReinicio = false; renderOpciones(); } });

cargar();
render();
