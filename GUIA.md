# Guía rápida · Prototipo de correspondencia V3 (testeo con voluntarios)

**Solo datos ficticios. No se envía nada a nadie. El estado se guarda solo en este navegador.**

## Abrir
- Enlace publicado, o doble clic en `index.html` (Chrome, Safari o Firefox). No necesita internet.
- Usa **siempre el mismo navegador y computador** durante una sesión: el cambio de rol muestra los cambios porque todo queda guardado ahí.

## Antes de cada participante
1. Arriba a la derecha: **Opciones de prueba → Reiniciar demostración… → Sí, reiniciar**.
2. Comprueba: rol *Coordinación*, pestaña *Por resolver (3)*, Elena (E-07) en «Asignar personas».

## Durante la prueba (controles de quien facilita)
- **Rol** (bajo el título): Coordinación · Escritora · Mediadora · Referente.
- En Escritora y Mediadora aparece **Persona** (por ejemplo, *Escritora 2 · 1 caso*). Si una tarea no aparece, revisa que esté elegida la persona asignada al caso.
- **Opciones de prueba → Ver registro de la demostración**: lista de acciones con hora y rol (evidencia). Ocúltalo antes de pasar el computador al voluntario.
- Tras cada acción aparece un aviso breve abajo de la pantalla.

## Cómo está organizada cada vista
- **Coordinación:** pestañas *Por resolver* (avisos → asignar → revisar → preparar), *Casos* y *Seguimiento* (solo consulta).
- **Escritora:** *Cartas para corregir* (solo si hay) → *Personas asignadas* → *Mis cartas*.
- **Mediadora:** *Entregas para tu visita* → *Respuestas por gestionar* → *Mis casos* → *Ya registrado*.
- **Referente:** primero se elige la *Modalidad en prueba* (A o B); luego, dos pasos numerados.

Cada elemento se abre con su botón y solo hay uno abierto a la vez. Lo escrito no se pierde al cambiar de rol o de pestaña.

## Las ocho tareas (en orden recomendado)
| N.º | Rol / persona | Dónde mirar |
|---|---|---|
| 1 | Coordinación | Por resolver → Asignar personas → Elena → **Asignar** → **Guardar asignación** |
| 2 | Escritora (la asignada a Elena) | **Escribir una carta** → **Enviar a revisión** |
| 3 | Escritora | **Agregar manuscrita** → foto propia o **Usar imagen de ejemplo** → **Enviar a revisión** |
| 4 | Coordinación | Revisar cartas → C-01 (Patricia) → **Revisar carta**: motivo + Aprobar / Devolver para corregir / Rechazar… |
| 5 | Coordinación | Preparar entregas → **Preparar entrega** → elegir quién la lleva |
| 6 | Mediadora 2 | C-03 **Registrar entrega → Entregada en mano** · C-04 **Registrar entrega → No se pudo entregar** → *Persona no encontrada* |
| 7 | Mediadora 2 | R-01 → **Revisar respuesta** → **Registrar aprobación…** → **Enviar respuesta (simulado)**. Si se edita el texto, la aprobación se anula |
| 8 | Escritora de Elena → Coordinación | **Avisar ausencia** → Coordinación: Avisos → **Resolver aviso** → **Asignar suplente** o **Cerrar correspondencia…** |
| Extra | Referente institucional | Modalidad **A** (sobre impreso) o **B** (imprimir allí). Probar una por participante |

Las cartas marcadas **DEMO** son anteriores o de muestra, para no depender de tareas previas.

## Qué observar (evidencia para decidir cambios)
- ¿Encuentra sus pendientes sin ayuda? ¿Entiende quién actúa después?
- ¿Detecta el consejo de salud y la pregunta por la comuna en C-01? (Aprobar y Devolver tienen el mismo peso visual, a propósito.)
- ¿Distingue «Preparada · aún no entregada» de «Entregada en mano»?
- ¿Revisa con la persona el dato de salud de R-01 antes de enviar? ¿Nota que editar anula la aprobación?
- ¿Cuántos pasos o dudas tuvo en cada tarea?

> Pendiente: vincular cada tarea con su requerimiento de la **MLD vigente**.

## Modificar textos o casos
Edita `datos.js` (nombres, casos, cartas de muestra, motivos) y luego reinicia la demostración. La V1 queda recuperable en la etiqueta `v1-prototipo` del repositorio.
