/* =========================================================
   DATOS DEL PROTOTIPO — todo es ficticio.
   Edita este archivo para cambiar nombres, casos, textos o motivos.
   Después de editarlo, pulsa «Reiniciar demostración» en la web.
   ========================================================= */

const ESCRITORAS = ['Escritora 1', 'Escritora 2', 'Escritora 3'];
const MEDIADORAS = ['Mediadora 1', 'Mediadora 2'];
const REFERENTE = 'Referente institucional';

const MOTIVOS_NO_ENTREGA = [
  'Persona no encontrada',
  'La persona no quiso recibirla ahora',
  'Persona trasladada',
  'Otro motivo'
];

// Texto de ayuda que aparece bajo el selector de rol
const AYUDA_ROL = {
  'Coordinación': 'Asignas personas, revisas las cartas antes de su entrega y resuelves avisos.',
  'Escritora': 'Escribes a las personas que te asignaron. Cada carta se revisa antes de entregarse. La persona puede no responder.',
  'Mediadora': 'Llevas a tu visita las cartas ya preparadas y registras qué pasó. También gestionas respuestas dictadas.',
  'Referente institucional': 'Recibes en tu institución cartas para entregarlas en mano.'
};

// Imagen ficticia de una carta manuscrita (no es una carta real)
const IMAGEN_EJEMPLO = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">' +
  '<rect width="600" height="400" fill="#fdfaf2"/>' +
  '<g stroke="#cfd8e3">' + [72,112,152,192,232,272,312,352].map(y => `<line x1="0" y1="${y+6}" x2="600" y2="${y+6}"/>`).join('') + '</g>' +
  '<line x1="60" y1="0" x2="60" y2="400" stroke="#e8b4b4"/>' +
  '<g font-family="Bradley Hand, Segoe Print, Comic Sans MS, cursive" font-size="26" fill="#2a3a66">' +
  '<text x="80" y="72">Hola:</text>' +
  '<text x="80" y="152">Le escribo a mano porque me gusta</text>' +
  '<text x="80" y="192">más así. Hoy hice pan amasado y</text>' +
  '<text x="80" y="232">me acordé de las tardes de invierno.</text>' +
  '<text x="80" y="272">Le mando un abrazo.</text>' +
  '<text x="330" y="352">Escritora (ejemplo)</text>' +
  '</g>' +
  '<text x="590" y="392" text-anchor="end" font-family="sans-serif" font-size="14" fill="#999">IMAGEN DE EJEMPLO · DEMO</text>' +
  '</svg>'
);

// Estado inicial de la demostración (lo que vuelve con «Reiniciar demostración»)
function estadoInicial() {
  return {
    rol: 'Coordinación',
    persona: { 'Escritora': 'Escritora 1', 'Mediadora': 'Mediadora 2' },
    modoReferente: 'A',
    casos: [
      { codigo: 'E-07', nombre: 'Elena', lugar: 'Residencia intermedia', visita: 'Jueves por la mañana',
        responde: true, escritora: null, mediadora: null, ausencia: null, cerrada: false },
      { codigo: 'R-03', nombre: 'Raúl', lugar: 'Hospital', visita: 'Jueves por la tarde',
        responde: false, escritora: 'Escritora 1', mediadora: 'Mediadora 2', ausencia: null, cerrada: false }
    ],
    cartas: [
      { id: 'C-01', caso: 'R-03', autora: 'Escritora 1', tipo: 'texto', demo: true, estado: 'En revisión',
        texto: 'Hola, soy Patricia. Me contaron que usted está esperando. Le recomiendo que camine todos los días y que tome agua de manzanilla, a mí me sirvió mucho para dormir. ¿En qué comuna vive su familia? Me gustaría saber más de usted. Un abrazo, Patricia.' },
      { id: 'C-02', caso: 'R-03', autora: 'Escritora 1', tipo: 'texto', demo: true, estado: 'Aprobada',
        texto: 'Hola, Raúl: ¿cómo está? Esta semana estuve escuchando boleros y me acordé de usted. Le mando un saludo grande. No necesita responderme.' },
      { id: 'C-03', caso: 'E-07', autora: 'Escritora anterior (muestra)', tipo: 'texto', demo: true,
        estado: 'Entrega preparada', responsable: 'Mediadora 2',
        texto: 'Querida Elena: este mes florecieron los cardenales de mi jardín y pensé en contarle. ¿Le gustan las flores? Un saludo cariñoso.' },
      { id: 'C-04', caso: 'R-03', autora: 'Escritora 1', tipo: 'texto', demo: true,
        estado: 'Entrega preparada', responsable: 'Mediadora 2',
        texto: 'Hola, Raúl: el fin de semana fui a la feria y había duraznos muy ricos. Espero que tenga una buena semana. Un abrazo.' },
      { id: 'C-05', caso: 'E-07', autora: 'Escritora anterior (muestra)', tipo: 'texto', demo: true,
        estado: 'Entrega preparada', responsable: REFERENTE,
        texto: 'Elena: hoy llovió mucho y me quedé leyendo junto a la ventana. Le deseo una semana tranquila. Cariños.' }
    ],
    respuestas: [
      { id: 'R-01', caso: 'E-07', mediadora: 'Mediadora 2', demo: true, estado: 'Borrador', aprobado: null,
        texto: 'Gracias por su carta. Me gustó que me contara de su jardín. Yo también tenía plantas. Ahora con la diabetes no puedo hacer mucho, pero me gusta mirar por la ventana. Elena.' }
    ],
    registro: [],
    siguienteCarta: 6,
    siguienteRespuesta: 2
  };
}
