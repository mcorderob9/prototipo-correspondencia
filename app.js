/* =========================================================
   LÓGICA DEL PROTOTIPO
   - El estado vive en memoria y se guarda en localStorage de este navegador.
   - Nada se envía a ningún servidor.
   ========================================================= */

const CLAVE = 'aclara-correspondencia-v1';
let S;                                   // estado de la demo
const ui = { abiertos: {}, borradores: {}, imagenes: {} };  // estado solo de pantalla
let aviso = null;

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
function avisar(texto, error = false) { aviso = { texto, error }; }
function registrar(texto) { S.registro.unshift({ hora: hora(), quien: yo(), texto }); }
function hecho(texto) { registrar(texto); avisar(texto); guardar(); render(); }
function error(texto) { avisar(texto, true); render(); }
// Lee el valor de un campo y lo vacía (para que no quede como borrador)
function tomar(id) { const el = document.getElementById(id); if (!el) return ''; const v = el.value.trim(); el.value = ''; delete ui.borradores[id]; return v; }
const valor = id => (document.getElementById(id)?.value || '').trim();

/* ---------- Estados en palabras sencillas ---------- */
function textoEstadoCarta(l) {
  if (l.estado === 'No entregada') return `No entregada (${l.motivo})`;
  if (l.estado === 'Entrega preparada' && l.pasoRef) return `Entrega preparada · ${l.pasoRef}`;
  return l.estado;
}
function siguienteCarta(l) {
  switch (l.estado) {
    case 'En revisión': return 'Coordinación (revisar)';
    case 'Requiere cambios': return `${l.autora} (corregir y reenviar)`;
    case 'Rechazada': return 'Nadie · la carta no se entrega';
    case 'Aprobada': return 'Coordinación (preparar entrega)';
    case 'Entrega preparada': return `${l.responsable} (entregar en mano y registrar)`;
    case 'Entregada en mano': return 'Nadie · entrega completada';
    case 'No entregada': return 'Coordinación (decidir nuevo intento)';
  }
  return '—';
}
function estadoCaso(c) {
  if (c.cerrada) return 'Correspondencia cerrada';
  if (c.ausencia?.estado === 'Ausencia comunicada') return 'Ausencia comunicada';
  if (!c.escritora || !c.mediadora) return 'Falta asignar';
  if (c.ausencia?.estado === 'Suplente asignada') return `Suplente asignada (${c.ausencia.suplente})`;
  return 'Activa';
}
function siguienteCaso(c) {
  if (c.cerrada) return 'Nadie · correspondencia cerrada';
  if (c.ausencia?.estado === 'Ausencia comunicada') return 'Coordinación (asignar suplente o cerrar)';
  if (!c.escritora || !c.mediadora) return 'Coordinación (asignar escritora y mediadora)';
  return `${c.escritora} (escribir carta)`;
}
function siguienteRespuesta(r) {
  const c = caso(r.caso);
  if (r.estado === 'Enviada (simulado)') return `${c.escritora || 'Escritora del caso'} (leer respuesta)`;
  if (r.estado === 'Versión aprobada (simulado)') return `${r.mediadora} (enviar respuesta)`;
  return `${r.mediadora} (revisar con ${c.nombre} y registrar aprobación)`;
}
function colorEstado(e) {
  if (/Entregada en mano|Aprobada|Enviada|Activa|Versión aprobada|Suplente asignada|Puedes escribir/.test(e)) return 'verde';
  if (/Entrega preparada/.test(e)) return 'azul';
  if (/Rechazada|cerrada/.test(e)) return 'rojo';
  if (/Requiere cambios|No entregada|Ausencia|Pendiente|Falta/.test(e)) return 'ambar';
  return '';
}
const etiqueta = e => `<span class="estado ${colorEstado(e)}">${esc(e)}</span>`;
const demo = x => x.demo ? ' <span class="demo" title="Carta anterior / de muestra">DEMO</span>' : '';

function tarjeta({ titulo, estado, siguiente, cuerpo = '', destacada = false, id = '' }) {
  return `<article class="tarjeta${destacada ? ' destacada' : ''}"${id ? ` id="${id}"` : ''}>
    <div class="tarjeta-cab"><h3>${titulo}</h3>${estado ? etiqueta(estado) : ''}</div>
    ${siguiente ? `<p class="estado-linea">Siguiente responsable: <strong>${esc(siguiente)}</strong></p>` : ''}
    ${cuerpo}
  </article>`;
}
function seccion(titulo, items, vacio) {
  return `<h2>${titulo} <span class="cuenta">(${items.length})</span></h2>` +
    (items.length ? items.join('') : `<p class="vacio">${vacio}</p>`);
}
function contenido(l) {
  return l.tipo === 'manuscrita'
    ? `<img class="manuscrita" src="${l.imagen}" alt="Carta manuscrita (imagen de prueba)">`
    : `<blockquote>${esc(l.texto)}</blockquote>`;
}
const para = l => { const c = caso(l.caso); return `${esc(c.nombre)} (${c.codigo})`; };
const opciones = (lista, sel, vacio) =>
  (vacio ? `<option value="">${vacio}</option>` : '') +
  lista.map(p => `<option value="${esc(p)}" ${p === sel ? 'selected' : ''}>${esc(p)}</option>`).join('');

/* =========================================================
   VISTA · COORDINACIÓN
   ========================================================= */
function vistaCoordinacion() {
  let h = '';

  // Avisos e incidentes: ausencias y cartas no entregadas
  const ausencias = S.casos.filter(c => c.ausencia?.estado === 'Ausencia comunicada' && !c.cerrada).map(c => tarjeta({
    titulo: `Aviso de ausencia · ${esc(c.nombre)} (${c.codigo})`, estado: 'Ausencia comunicada', destacada: true,
    siguiente: 'Coordinación (asignar suplente o cerrar)',
    cuerpo: `<p class="instr"><strong>${esc(c.ausencia.por)}</strong> avisó que no puede continuar escribiendo a ${esc(c.nombre)}.</p>
      <label class="campo">Suplente <select id="sup-${c.codigo}">${opciones(ESCRITORAS.filter(e => e !== c.ausencia.por), null)}</select></label>
      <div class="acciones">
        <button class="btn" data-act="suplente" data-id="${c.codigo}">Asignar suplente</button>
        <button class="btn peligro" data-act="cerrar" data-id="${c.codigo}">Cerrar correspondencia</button>
      </div>`
  }));
  const noEntregadas = S.cartas.filter(l => l.estado === 'No entregada').map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l), destacada: true,
    cuerpo: `<p class="instr">${esc(l.registradoPor)} no pudo entregarla. Puedes prepararla de nuevo para otra visita.</p>${formPreparar(l, 'Preparar de nuevo')}`
  }));
  if (ausencias.length || noEntregadas.length)
    h += seccion('Avisos e incidentes', [...ausencias, ...noEntregadas], '');

  // Casos y asignación
  h += seccion('Casos', S.casos.map(c => tarjeta({
    titulo: `${esc(c.nombre)} (${c.codigo})`, estado: estadoCaso(c), siguiente: siguienteCaso(c),
    cuerpo: `<ul class="datos">
        <li>Lugar de espera: ${esc(c.lugar)} <span class="nota">(solo visible para Coordinación)</span></li>
        <li>Visita: ${esc(c.visita)}</li>
        <li>${c.responde ? 'Acepta recibir cartas y, si quiere, responder.' : 'Acepta recibir cartas, pero no desea responder.'}</li>
        <li>Escritora: <strong>${esc(c.escritora || 'sin asignar')}</strong> · Mediadora: <strong>${esc(c.mediadora || 'sin asignar')}</strong></li>
      </ul>
      ${c.cerrada ? '' : `<div class="formulario">
        <label class="campo">Escritora <select id="asig-esc-${c.codigo}">${opciones(ESCRITORAS, c.escritora, '— Sin asignar —')}</select></label>
        <label class="campo">Mediadora <select id="asig-med-${c.codigo}">${opciones(MEDIADORAS, c.mediadora, '— Sin asignar —')}</select></label>
        <div class="acciones"><button class="btn" data-act="asignar" data-id="${c.codigo}">Guardar asignación</button></div>
      </div>`}`
  })), '');

  // Revisión
  h += seccion('Cartas por revisar', S.cartas.filter(l => l.estado === 'En revisión').map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: l.estado, siguiente: siguienteCarta(l),
    cuerpo: `<p class="nota">De: ${esc(l.autora)} · ${l.tipo === 'manuscrita' ? 'Carta manuscrita (imagen)' : 'Carta escrita en la plataforma'}</p>
      ${contenido(l)}
      <label class="campo" for="mot-${l.id}">Motivo o comentario para la escritora</label>
      <textarea id="mot-${l.id}" data-keep placeholder="Obligatorio si devuelves o rechazas"></textarea>
      <div class="acciones">
        <button class="btn" data-act="aprobar" data-id="${l.id}">Aprobar</button>
        <button class="btn sec" data-act="devolver" data-id="${l.id}">Devolver para corregir</button>
        <button class="btn peligro" data-act="rechazar" data-id="${l.id}">Rechazar</button>
      </div>
      <div class="acciones"><button class="btn tenue" disabled>Preparar entrega</button>
        <span class="bloqueo">Bloqueado: primero debe aprobarse.</span></div>`
  })), 'No hay cartas esperando revisión.');

  // Preparar entrega
  h += seccion('Aprobadas: preparar entrega', S.cartas.filter(l => l.estado === 'Aprobada').map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: l.estado, siguiente: siguienteCarta(l),
    cuerpo: `<p class="nota">De: ${esc(l.autora)}</p>${l.comentario ? `<p class="nota">Nota de revisión: ${esc(l.comentario)}</p>` : ''}${formPreparar(l, 'Preparar entrega')}`
  })), 'No hay cartas aprobadas esperando preparación.');

  // En curso
  h += seccion('Entregas preparadas (aún no entregadas)', S.cartas.filter(l => l.estado === 'Entrega preparada').map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l),
    cuerpo: `<p class="nota">Preparar no es entregar: falta que ${esc(l.responsable)} registre la entrega en mano.</p>`
  })), 'No hay entregas en curso.');

  // Historial
  h += seccion('Historial de cartas', S.cartas.filter(l => ['Entregada en mano', 'Rechazada', 'Requiere cambios'].includes(l.estado)).map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l),
    cuerpo: l.comentario ? `<p class="nota">Motivo: ${esc(l.comentario)}</p>` : (l.registradoPor ? `<p class="nota">Registrada por ${esc(l.registradoPor)}</p>` : '')
  })), 'Todavía no hay cartas cerradas o devueltas.');

  return h;
}

function formPreparar(l, textoBoton) {
  const c = caso(l.caso);
  const def = c.mediadora || 'Mediadora 1';
  return `<div class="formulario">
    <label class="campo">¿Quién la llevará o recibirá? <select id="resp-${l.id}">${opciones([...MEDIADORAS, REFERENTE], def)}</select></label>
    <p class="nota">Visita: ${esc(c.visita)}. Preparar no significa entregar.</p>
    <div class="acciones"><button class="btn" data-act="preparar" data-id="${l.id}">${textoBoton}</button></div>
  </div>`;
}

/* =========================================================
   VISTA · ESCRITORA
   ========================================================= */
function vistaEscritora() {
  const p = S.persona['Escritora'];
  const misCasos = S.casos.filter(c => c.escritora === p);
  let h = seccion('Mis personas asignadas', misCasos.map(c => tarjetaCasoEscritora(c, p)),
    `${esc(p)} no tiene personas asignadas. Coordinación debe asignarle un caso (o elige otra escritora arriba).`);

  const mias = S.cartas.filter(l => l.autora === p).slice().reverse();
  h += seccion('Mis cartas', mias.map(l => {
    let cuerpo = contenido(l);
    if (l.estado === 'Requiere cambios') {
      cuerpo = `<div class="comentario"><strong>Comentario de Coordinación:</strong> ${esc(l.comentario)}</div>` +
        (l.tipo === 'texto'
          ? `<label class="campo" for="corr-${l.id}">Corrige tu carta</label><textarea id="corr-${l.id}" data-keep>${esc(l.texto)}</textarea>`
          : `${contenido(l)}${campoImagen('corr-' + l.id, 'Puedes cambiar la imagen o reenviar la misma.')}`) +
        `<div class="acciones"><button class="btn" data-act="reenviar" data-id="${l.id}">Reenviar a revisión</button></div>`;
    } else if (l.estado === 'Rechazada') {
      cuerpo += `<div class="comentario"><strong>Motivo del rechazo:</strong> ${esc(l.comentario)}</div>`;
    }
    return tarjeta({ titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l), cuerpo, destacada: l.estado === 'Requiere cambios' });
  }), 'Aún no has enviado cartas.');
  return h;
}

function tarjetaCasoEscritora(c, p) {
  const comunicada = c.ausencia?.estado === 'Ausencia comunicada';
  let estado = 'Puedes escribir', siguiente = `${p} (escribir carta)`, cuerpo = '';
  cuerpo += `<p class="instr">${c.responde
    ? 'Puede recibir tus cartas y, si quiere, responder. Es posible que no responda.'
    : 'Recibe cartas, pero prefirió no responder. Tus cartas igual le llegan.'}</p>`;
  if (c.ausencia?.estado === 'Suplente asignada' && c.ausencia.suplente === p)
    cuerpo += `<p class="nota">Recibes este caso como suplente.</p>`;

  if (c.cerrada) {
    estado = 'Correspondencia cerrada'; siguiente = 'Nadie';
    cuerpo += `<p class="nota">Coordinación cerró esta correspondencia.</p>`;
  } else if (comunicada) {
    estado = 'Ausencia comunicada'; siguiente = 'Coordinación (asignar suplente o cerrar)';
    cuerpo += `<div class="comentario">Avisaste que no puedes continuar. Coordinación decidirá cómo seguir.</div>`;
  } else {
    const k = c.codigo;
    cuerpo += `<div class="acciones">
      <button class="btn" data-act="abrir" data-id="escribir-${k}">Escribir carta</button>
      <button class="btn sec" data-act="abrir" data-id="manuscrita-${k}">Agregar manuscrita</button>
      <button class="btn tenue" data-act="abrir" data-id="ausencia-${k}">Avisar que no puedo continuar</button>
    </div>`;
    if (ui.abiertos['escribir-' + k]) cuerpo += `<div class="formulario">
      <label class="campo" for="txt-${k}">Para: ${k}</label>
      <textarea id="txt-${k}" data-keep placeholder="Escribe aquí tu carta…"></textarea>
      <p class="nota">Pautas: no dar consejos de salud ni pedir datos personales. Tu carta será revisada antes de entregarse.</p>
      <div class="acciones"><button class="btn" data-act="enviarTexto" data-id="${k}">Enviar a revisión</button>
        <button class="btn tenue" data-act="abrir" data-id="escribir-${k}">Cancelar</button></div></div>`;
    if (ui.abiertos['manuscrita-' + k]) cuerpo += `<div class="formulario">
      ${campoImagen('nueva-' + k, 'La imagen queda solo en este navegador. No se sube a ningún servidor.')}
      <div class="acciones"><button class="btn" data-act="enviarManuscrita" data-id="${k}" ${ui.imagenes['nueva-' + k] ? '' : 'disabled'}>Enviar a revisión</button>
        <button class="btn tenue" data-act="abrir" data-id="manuscrita-${k}">Cancelar</button></div></div>`;
    if (ui.abiertos['ausencia-' + k]) cuerpo += `<div class="formulario">
      <p class="instr">Coordinación recibirá tu aviso y decidirá si asigna una suplente o cierra la correspondencia. ¿Confirmas?</p>
      <div class="acciones"><button class="btn peligro" data-act="ausencia" data-id="${k}">Avisar ausencia</button>
        <button class="btn tenue" data-act="abrir" data-id="ausencia-${k}">Cancelar</button></div></div>`;
  }

  const recibidas = S.respuestas.filter(r => r.caso === c.codigo && r.estado === 'Enviada (simulado)');
  recibidas.forEach(r => { cuerpo += `<p class="nota"><strong>Respuesta recibida (simulado):</strong></p><blockquote>${esc(r.aprobado)}</blockquote>`; });

  return tarjeta({ titulo: `${esc(c.nombre)} (${c.codigo})`, estado, siguiente, cuerpo });
}

function campoImagen(clave, nota) {
  const img = ui.imagenes[clave];
  return `<label class="campo">Foto o escaneo de la carta <input type="file" accept="image/*" data-img="${clave}"></label>
    <div class="acciones"><button class="btn sec" data-act="ejemplo" data-id="${clave}">Usar imagen de ejemplo</button></div>
    ${img ? `<img class="manuscrita" src="${img}" alt="Vista previa de la carta manuscrita">` : '<p class="nota">Aún no hay imagen.</p>'}
    <p class="nota">${nota}</p>`;
}

/* =========================================================
   VISTA · MEDIADORA
   ========================================================= */
function vistaMediadora() {
  const p = S.persona['Mediadora'];
  let h = '';

  h += seccion('Entregas para tu visita', S.cartas.filter(l => l.responsable === p && l.estado === 'Entrega preparada').map(l => {
    const c = caso(l.caso);
    let cuerpo = `<ul class="datos"><li>Visita: ${esc(c.visita)}</li></ul>
      <p class="nota">El contenido no se muestra aquí. Entrega el sobre en mano y registra qué pasó.</p>
      <div class="acciones">
        <button class="btn" data-act="entregada" data-id="${l.id}">Entregada en mano</button>
        <button class="btn sec" data-act="abrir" data-id="noent-${l.id}">No entregada</button>
      </div>`;
    if (ui.abiertos['noent-' + l.id]) cuerpo += `<div class="formulario">
      <label class="campo">Motivo <select id="noent-${l.id}">${opciones(MOTIVOS_NO_ENTREGA, MOTIVOS_NO_ENTREGA[0])}</select></label>
      <div class="acciones"><button class="btn" data-act="noEntregada" data-id="${l.id}">Guardar: no entregada</button></div></div>`;
    return tarjeta({ titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l), cuerpo });
  }), 'No tienes cartas preparadas para entregar. Solo aparecen aquí cartas revisadas y preparadas por Coordinación.');

  h += seccion('Respuestas', S.respuestas.filter(r => r.mediadora === p).map(tarjetaRespuesta), 'No hay respuestas registradas.');

  h += seccion('Mis casos', S.casos.filter(c => c.mediadora === p).map(c => tarjeta({
    titulo: `${esc(c.nombre)} (${c.codigo})`, estado: c.cerrada ? 'Correspondencia cerrada' : '',
    cuerpo: `<ul class="datos"><li>Visita: ${esc(c.visita)}</li>
      <li>${c.responde ? 'Si quiere, puede responder. No tiene obligación de hacerlo.' : 'No desea responder.'}</li></ul>
      ${c.responde && !c.cerrada ? `<div class="acciones"><button class="btn sec" data-act="nuevaRespuesta" data-id="${c.codigo}">Registrar respuesta dictada</button></div>` : ''}`
  })), `${esc(p)} no tiene casos asignados.`);

  h += seccion('Resultados que registraste', S.cartas.filter(l => l.registradoPor === p).map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l)
  })), 'Aún no registras entregas.');
  return h;
}

function tarjetaRespuesta(r) {
  const c = caso(r.caso), enviada = r.estado === 'Enviada (simulado)';
  return `<article class="tarjeta">
    <div class="tarjeta-cab"><h3>Respuesta ${r.id} de ${esc(c.nombre)} (${c.codigo})${demo(r)}</h3></div>
    <p class="instr">${enviada ? 'Esta es la versión enviada.' : `Lee la respuesta con ${esc(c.nombre)}. Pregúntale si quiere compartirla así o cambiar algo. Solo se envía la versión que la persona apruebe.`}</p>
    <textarea id="rtxt-${r.id}" data-resp="${r.id}" ${enviada ? 'readonly' : ''} placeholder="Escribe lo que la persona dictó…">${esc(r.texto)}</textarea>
    <div id="rctl-${r.id}">${controlesRespuesta(r)}</div>
    <p class="nota">Simulación: registrar aquí no equivale a un consentimiento real.</p>
  </article>`;
}
function controlesRespuesta(r) {
  const enviada = r.estado === 'Enviada (simulado)';
  const aprobada = r.estado === 'Versión aprobada (simulado)' && r.aprobado === r.texto;
  let h = `<p class="estado-linea">Estado: ${etiqueta(r.estado)}</p>
    <p class="estado-linea">Siguiente responsable: <strong>${esc(siguienteRespuesta(r))}</strong></p>`;
  if (r.estado === 'Pendiente de aprobación')
    h += `<div class="comentario">El texto cambió después de la aprobación. La aprobación anterior ya no vale: revisa la nueva versión con la persona.</div>`;
  if (!enviada) h += `<div class="acciones">
      <button class="btn sec" data-act="aprobarRespuesta" data-id="${r.id}" ${aprobada || !r.texto.trim() ? 'disabled' : ''}>Registrar aprobación de esta versión (simulada)</button>
      <button class="btn" data-act="enviarRespuesta" data-id="${r.id}" ${aprobada ? '' : 'disabled'}>Enviar respuesta (simulado)</button>
    </div>
    ${aprobada ? '' : '<p class="bloqueo">«Enviar» se habilita solo cuando la versión actual está aprobada.</p>'}`;
  return h;
}

/* =========================================================
   VISTA · REFERENTE INSTITUCIONAL
   ========================================================= */
function vistaReferente() {
  const A = S.modoReferente === 'A';
  let h = `<h2>Escenario a probar</h2>
    <div class="escenarios">
      <button class="rol" data-act="modo" data-id="A" aria-pressed="${A}">A · Recibir sobre impreso</button>
      <button class="rol" data-act="modo" data-id="B" aria-pressed="${!A}">B · Imprimir en establecimiento</button>
    </div>
    <p class="nota">${A ? 'Recibes un sobre cerrado, ya impreso. Confirmas que llegó y luego que lo entregaste en mano.'
      : 'Recibes una carta ya aprobada y preparada. La imprimes allí y luego la entregas en mano.'} Es una hipótesis en estudio, no una decisión.</p>`;

  h += seccion(A ? 'Sobres para entregar' : 'Cartas para imprimir y entregar',
    S.cartas.filter(l => l.responsable === REFERENTE && l.estado === 'Entrega preparada').map(l => {
      const paso = A ? 'Sobre recibido' : 'Impresa (simulado)';
      const listo = l.pasoRef === paso;
      const cuerpo = (A ? `<p class="instr">Sobre cerrado para ${para(l)}.</p>` : `<p class="nota">Carta aprobada por Coordinación:</p>${contenido(l)}`) +
        `<div class="acciones">
          <button class="btn sec" data-act="${A ? 'sobre' : 'imprimir'}" data-id="${l.id}" ${l.pasoRef ? 'disabled' : ''}>${A ? 'Sobre recibido' : 'Simular impresión'}</button>
          <button class="btn" data-act="entregadaRef" data-id="${l.id}" ${listo ? '' : 'disabled'}>Entregada en mano</button>
        </div>
        ${listo ? '' : `<p class="bloqueo">Primero: ${A ? 'confirma que recibiste el sobre' : 'simula la impresión'}.</p>`}`;
      return tarjeta({ titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l), cuerpo });
    }), 'No hay cartas preparadas para tu institución.');

  h += seccion('Entregas que registraste', S.cartas.filter(l => l.registradoPor === REFERENTE).map(l => tarjeta({
    titulo: `${l.id} para ${para(l)}${demo(l)}`, estado: textoEstadoCarta(l), siguiente: siguienteCarta(l)
  })), 'Aún no registras entregas.');
  return h;
}

/* =========================================================
   ACCIONES (cada botón tiene una consecuencia visible)
   ========================================================= */
const acciones = {
  reiniciar() {
    if (!confirm('¿Reiniciar la demostración? Se borran todas las acciones y vuelven los casos iniciales.')) return;
    S = estadoInicial(); ui.abiertos = {}; ui.borradores = {}; ui.imagenes = {};
    document.querySelectorAll('textarea[data-keep]').forEach(t => t.value = '');
    avisar('Demostración reiniciada. Todo volvió al estado inicial.');
    guardar(); render(); window.scrollTo(0, 0);
  },
  rol(r) { S.rol = r; ui.abiertos = {}; avisar(`Ahora pruebas el rol: ${r}.`); guardar(); render(); },
  modo(m) {
    if (S.modoReferente === m) return;
    S.modoReferente = m;
    S.cartas.forEach(l => { if (l.responsable === REFERENTE && l.estado === 'Entrega preparada') l.pasoRef = null; });
    hecho(`Escenario del referente cambiado a ${m === 'A' ? 'A · Recibir sobre impreso' : 'B · Imprimir en establecimiento'}.`);
  },
  abrir(k) { ui.abiertos[k] = !ui.abiertos[k]; render(); },

  // Coordinación
  asignar(k) {
    const c = caso(k);
    c.escritora = valor('asig-esc-' + k) || null;
    c.mediadora = valor('asig-med-' + k) || null;
    hecho(`Asignación guardada para ${k}: ${c.escritora || 'sin escritora'} y ${c.mediadora || 'sin mediadora'}.`);
  },
  aprobar(id) { revisar(id, 'Aprobada'); },
  devolver(id) { revisar(id, 'Requiere cambios'); },
  rechazar(id) { revisar(id, 'Rechazada'); },
  preparar(id) {
    const l = carta(id);
    if (!['Aprobada', 'No entregada'].includes(l.estado)) return error('Solo se puede preparar una carta aprobada.');
    l.responsable = valor('resp-' + id); l.estado = 'Entrega preparada'; l.pasoRef = null; l.registradoPor = null; l.motivo = null;
    hecho(`${id}: entrega preparada. La llevará o recibirá ${l.responsable}. Aún no está entregada.`);
  },
  suplente(k) {
    const c = caso(k), s = valor('sup-' + k);
    c.escritora = s; c.ausencia = { ...c.ausencia, estado: 'Suplente asignada', suplente: s };
    hecho(`${k}: suplente asignada (${s}). Desde ahora escribe a ${c.nombre}.`);
  },
  cerrar(k) {
    const c = caso(k);
    c.cerrada = true; c.ausencia = { ...(c.ausencia || {}), estado: 'Correspondencia cerrada' };
    hecho(`${k}: correspondencia cerrada.`);
  },

  // Escritora
  enviarTexto(k) {
    const texto = tomar('txt-' + k);
    if (!texto) return error('Escribe algo antes de enviar.');
    crearCarta(k, { tipo: 'texto', texto });
    ui.abiertos['escribir-' + k] = false;
  },
  ejemplo(clave) { ui.imagenes[clave] = IMAGEN_EJEMPLO; render(); },
  enviarManuscrita(k) {
    const img = ui.imagenes['nueva-' + k];
    if (!img) return error('Primero elige una imagen o usa la de ejemplo.');
    delete ui.imagenes['nueva-' + k]; ui.abiertos['manuscrita-' + k] = false;
    crearCarta(k, { tipo: 'manuscrita', imagen: img });
  },
  reenviar(id) {
    const l = carta(id);
    if (l.estado !== 'Requiere cambios') return;
    if (l.tipo === 'texto') { const t = tomar('corr-' + id); if (!t) return error('La carta no puede quedar vacía.'); l.texto = t; }
    else if (ui.imagenes['corr-' + id]) { l.imagen = ui.imagenes['corr-' + id]; delete ui.imagenes['corr-' + id]; }
    l.comentario = null; l.estado = 'En revisión';
    hecho(`${id} corregida y reenviada a revisión.`);
  },
  ausencia(k) {
    const c = caso(k);
    c.ausencia = { estado: 'Ausencia comunicada', por: S.persona['Escritora'] };
    ui.abiertos['ausencia-' + k] = false;
    hecho(`${S.persona['Escritora']} avisó que no puede continuar con ${k}. Coordinación debe decidir.`);
  },

  // Mediadora y referente
  entregada(id) { registrarEntrega(id, l => l.estado === 'Entrega preparada'); },
  entregadaRef(id) {
    const paso = S.modoReferente === 'A' ? 'Sobre recibido' : 'Impresa (simulado)';
    registrarEntrega(id, l => l.estado === 'Entrega preparada' && l.pasoRef === paso);
  },
  noEntregada(id) {
    const l = carta(id);
    if (l.estado !== 'Entrega preparada') return error('Solo se registra sobre una carta preparada.');
    l.motivo = valor('noent-' + id); l.estado = 'No entregada'; l.registradoPor = yo();
    ui.abiertos['noent-' + id] = false;
    hecho(`${id}: no entregada (${l.motivo}). Coordinación verá el aviso.`);
  },
  sobre(id) { pasoReferente(id, 'Sobre recibido', 'sobre recibido. Falta registrar la entrega en mano.'); },
  imprimir(id) { pasoReferente(id, 'Impresa (simulado)', 'impresión simulada. Falta registrar la entrega en mano.'); },

  // Respuestas
  nuevaRespuesta(k) {
    const id = 'R-' + String(S.siguienteRespuesta++).padStart(2, '0');
    S.respuestas.unshift({ id, caso: k, mediadora: S.persona['Mediadora'], estado: 'Borrador', aprobado: null, texto: '' });
    hecho(`Respuesta ${id} creada para ${k}. Escribe lo que la persona dictó.`);
  },
  aprobarRespuesta(id) {
    const r = respuesta(id);
    if (!r.texto.trim() || r.estado === 'Enviada (simulado)') return;
    r.aprobado = r.texto; r.estado = 'Versión aprobada (simulado)';
    hecho(`${id}: aprobación de esta versión registrada (simulado).`);
  },
  enviarRespuesta(id) {
    const r = respuesta(id);
    if (r.estado !== 'Versión aprobada (simulado)' || r.aprobado !== r.texto) return error('No se puede enviar: la versión actual no está aprobada.');
    r.estado = 'Enviada (simulado)';
    hecho(`${id}: respuesta enviada (simulado) con la versión aprobada.`);
  }
};

function revisar(id, estado) {
  const l = carta(id);
  if (l.estado !== 'En revisión') return;
  const motivo = valor('mot-' + id);
  if (estado !== 'Aprobada' && !motivo) return error('Escribe el motivo antes de devolver o rechazar la carta.');
  tomar('mot-' + id);
  l.estado = estado; l.comentario = motivo || null;
  hecho(`${id}: ${estado.toLowerCase()}${motivo ? ` · Motivo: ${motivo}` : ''}.`);
}
function crearCarta(k, datos) {
  const id = 'C-' + String(S.siguienteCarta++).padStart(2, '0');
  S.cartas.push({ id, caso: k, autora: S.persona['Escritora'], estado: 'En revisión', ...datos });
  hecho(`${id} enviada a revisión. Coordinación debe revisarla antes de cualquier entrega.`);
}
function registrarEntrega(id, valida) {
  const l = carta(id);
  if (!valida(l)) return error('Esta carta aún no puede marcarse como entregada.');
  l.estado = 'Entregada en mano'; l.registradoPor = yo();
  hecho(`${id}: entregada en mano a ${caso(l.caso).nombre}.`);
}
function pasoReferente(id, paso, texto) {
  const l = carta(id);
  if (l.estado !== 'Entrega preparada' || l.pasoRef) return;
  l.pasoRef = paso;
  hecho(`${id}: ${texto}`);
}

/* ---------- Edición de respuestas: anula la aprobación al cambiar el texto ---------- */
function alEditarRespuesta(t) {
  const r = respuesta(t.dataset.resp);
  if (!r || r.estado === 'Enviada (simulado)') return;
  const antes = r.estado;
  r.texto = t.value;
  if (r.aprobado !== null && r.texto !== r.aprobado) {
    r.aprobado = null; r.estado = 'Pendiente de aprobación';
    registrar(`${r.id}: texto editado después de aprobar. Aprobación anulada.`);
  }
  guardar();
  document.getElementById('rctl-' + r.id).innerHTML = controlesRespuesta(r);
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
  document.querySelectorAll('textarea[data-keep]').forEach(t => { ui.borradores[t.id] = t.value; });

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
  $('#rol-ayuda').textContent = AYUDA_ROL[S.rol];
  $('#aviso').innerHTML = aviso ? `<div class="aviso${aviso.error ? ' error' : ''}">${aviso.error ? '⚠ ' : '✓ '}${esc(aviso.texto)}</div>` : '';

  $('#vista').innerHTML = ({
    'Coordinación': vistaCoordinacion, 'Escritora': vistaEscritora,
    'Mediadora': vistaMediadora, 'Referente institucional': vistaReferente
  })[S.rol]();

  document.querySelectorAll('textarea[data-keep]').forEach(t => { if (t.id in ui.borradores) t.value = ui.borradores[t.id]; });
  renderRegistro();
}
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
    S.persona[S.rol] = e.target.value; ui.abiertos = {};
    avisar(`Ahora pruebas como ${e.target.value}.`); guardar(); render();
  }
  const clave = e.target.dataset.img;
  if (clave && e.target.files[0]) leerImagen(e.target.files[0], url => {
    if (!url) return error('No se pudo leer la imagen.');
    ui.imagenes[clave] = url; render();
  });
});

cargar();
render();
