# Cambios UX · V2.1 del prototipo de correspondencia

**Fecha:** 21-10-2026 · **Base:** versión publicada de bandeja → detalle → acción (etiqueta `v4-bandeja-publicada`, recuperable). Iteración menor: se mantienen la lógica, los estados, las rutas, los casos ficticios y la estética.

## Ajuste 1 · Revisión de cartas: el motivo aparece solo cuando corresponde
- Al abrir «Revisar carta» se ven la carta completa y **tres decisiones del mismo peso**: «Aprobar carta», «Pedir ajustes…» y «Rechazar…». Ninguna está destacada como la correcta y **no hay campo de comentario a la vista**.
- **Aprobar carta:** aprueba de inmediato, sin comentario y con las mismas reglas de antes.
- **Pedir ajustes…:** abre un bloque con «¿Qué debe cambiar?», marcado como obligatorio e interno (no se agrega a la carta), y los botones «Confirmar solicitud» y «Cancelar». No se puede confirmar vacío.
- **Rechazar…:** abre una confirmación roja, distinta del bloque anterior, con «Motivo del rechazo» obligatorio y los botones «Confirmar rechazo» y «Cancelar». Cancelar no cambia nada.
- **Foco:** al abrir un bloque pasa al campo de texto. Al cancelar vuelve al botón que lo abrió. Si se intenta confirmar vacío, el foco queda en el campo.
- **Sin cambios:** la validación (`revisar()`), los estados, el historial y los efectos entre roles. El aviso de aprobación ahora dice quién sigue: «Ahora Coordinación debe preparar su entrega».

## Ajuste 2 · Panel lateral: jerarquía y concisión
1. **Estado actual** y **Responsable ahora** van arriba, en texto destacado.
2. **Qué sigue:** una frase breve sobre lo que pasa después y quién continúa. Reemplaza a «Próximo paso», que repetía los botones. Ejemplo: «Si se aprueba, Coordinación prepara su entrega. Si necesita ajustes, vuelve a la escritora».
3. **Datos secundarios** (Para, De, Lugar de espera, Visita) en letra menor y en dos columnas. Son los mismos datos de antes para cada rol: **no se amplió ningún permiso**.
4. **Historial y notas internas** sigue contraído por defecto.
- Se redujeron los separadores. En escritorio el panel sigue a la derecha; bajo 820 px pasa debajo del contenido.

## Ajuste 3 · Selector de roles: exclusivo del prototipo
- En la cabecera se agregó la etiqueta discreta **«Vista de prueba · cambiar rol»**, con borde punteado, que también da nombre al grupo de botones para los lectores de pantalla. «Persona» pasa a llamarse **«Persona ficticia»**.
- El selector sigue completo, incluidas Escritora 1–3 y Mediadora 1–2. No se agregaron login, cuentas ni pantallas.

## Archivos modificados
`app.js` (revisión, panel, textos de «qué sigue», foco) · `estilos.css` (panel, bloque de decisión, etiqueta de prueba) · `index.html` (cabecera, versión `?v=5`) · `GUIA.md` · este archivo.

## Para una fase posterior (no implementado)
En una versión de mayor fidelidad, cada persona **ingresaría con su propia identidad** y vería **solo la interfaz y las tareas de su rol**, sin un selector de roles de demostración.

Eso requiere identificar a cada usuario, separar los permisos en un servidor y aplicar criterios de seguridad y privacidad acordes a la información de las personas acompañadas. **Ocultar pestañas o botones en el navegador no es control de acceso:** en este prototipo, los «permisos por rol» solo simulan qué vería cada persona, y cualquiera puede cambiar de rol. Esa fase debería diseñarse junto con la definición institucional de quién opera la plataforma, que hoy está abierta.
