/**
 * Noticias del periódico interno — catálogo fijo en código.
 * Ya no se sincronizan desde el gestor.
 *
 * kinds: portada | interior | breve | editorial | proximamente
 *
 * Secciones en NoticiasPage:
 *   - portada → primera plana
 *   - breve sortOrder < 20 → «Ya funciona»
 *   - breve sortOrder >= 20 → «Lo nuevo»
 *   - proximamente → «Lo que se viene»
 */
import { BRAND_NAME } from "./raptorBrand.js";

export const APP_NEWS_CATALOG = [
  {
    id: 1,
    gestorNewsId: null,
    title: `${BRAND_NAME}: más claro en el día a día`,
    subtitle:
      "Pedidos entre apps, cierre de caja con diferencia y mantenimiento con aviso visual",
    body:
      "Esta edición resume lo que más usás, lo que acabamos de mejorar y lo que se viene.\n\n" +
      "Arriba va la primera plana. Debajo: novedades recientes, lo que ya corre bien en el local, y al final el roadmap.",
    kind: "portada",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 0,
  },

  // ── Ya funciona (módulos / secciones más usados) ──
  {
    id: 2,
    gestorNewsId: null,
    title: "Pedidos e inventario",
    subtitle: "Clientes, proveedores y enlace entre EdDeli · Store · Tienda",
    body:
      "Gestión de pedidos de clientes y a proveedor, con envío entre sistemas cuando el proveedor o cliente está enlazado.\n\n" +
      "Es una de las piezas más usadas para mantener el stock y la operación alineada entre apps.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 10,
  },
  {
    id: 3,
    gestorNewsId: null,
    title: "Turno y caja",
    subtitle: "Abrir, cobrar y cerrar el día con control",
    body:
      "Abrí turno, cobrá en mostrador y cerrá con arqueo.\n\n" +
      "Si hay diferencia de caja, el sistema te pide omitirla o registrar un ingreso o egreso antes de cerrar, y podés ver pendientes.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 11,
  },
  {
    id: 4,
    gestorNewsId: null,
    title: "Finanzas y movimientos",
    subtitle: "Ingresos, egresos y seguimiento del dinero",
    body:
      "La sección de finanzas concentra movimientos e ingresos/egresos del negocio.\n\n" +
      "Sirve para revisar el día a día sin salir del flujo operativo.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 12,
  },
  {
    id: 5,
    gestorNewsId: null,
    title: "Operación diaria",
    subtitle: "Ventas, stock, cobranzas y comprobantes",
    body:
      "El núcleo del local: ventas, inventario, cobranzas y comprobantes.\n\n" +
      "Diseñado para el ritmo del mostrador y el backoffice en la misma app.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 13,
  },

  // ── Lo nuevo (mejoras recientes) ──
  {
    id: 6,
    gestorNewsId: null,
    title: "Pedidos entre apps en producción",
    subtitle: "Enlace estable EdDeli ↔ Store ↔ Tienda",
    body:
      "Se corrigió el envío de pedidos entre sistemas en el servidor.\n\n" +
      "Los peers apuntan al dominio institucional (no a localhost), así el push funciona igual que en local cuando está bien configurado.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 20,
  },
  {
    id: 7,
    gestorNewsId: null,
    title: "Cierre de turno con diferencia",
    subtitle: "Omitir, ingreso o egreso antes de cerrar",
    body:
      "Si el arqueo no cuadra, el modal te obliga a resolver: omitir, registrar ingreso o egreso.\n\n" +
      "También podés consultar diferencias pendientes sin cerrar a ciegas.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 21,
  },
  {
    id: 8,
    gestorNewsId: null,
    title: "Cambio de rol sin recargar todo",
    subtitle: "Más rápido al pasar de un perfil a otro",
    body:
      "Al cambiar de rol (por ejemplo Empleado ↔ Administrador) la app ya no fuerza una recarga completa.\n\n" +
      "Seguís en contexto y el menú se actualiza al instante.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 22,
  },
  {
    id: 9,
    gestorNewsId: null,
    title: "Mantenimiento con aviso claro",
    subtitle: "Estados del gestor · Programador sin bloqueo",
    body:
      "Cuando el gestor marca un módulo o sección en mantenimiento, el resto de roles ve una pantalla con animación (martillo y yunque).\n\n" +
      "El rol Programador puede entrar igual: los estados de mantenimiento / próximamente / oculto no lo bloquean.",
    kind: "breve",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 23,
  },

  // ── Lo que se viene ──
  {
    id: 10,
    gestorNewsId: null,
    title: "Reporte financiero: mejoras y gráficas",
    subtitle: "Más claridad en números y visualizaciones",
    body:
      "Se trabajará en la sección de reporte financiero: mejores gráficas, lecturas más claras y apoyo para decidir con datos del día a día.",
    kind: "proximamente",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 90,
  },
  {
    id: 11,
    gestorNewsId: null,
    title: "Temas claro y oscuro",
    subtitle: "Mejoras de color y contraste",
    body:
      "Se afinará la paleta de los temas claro y oscuro: colores más coherentes, mejor contraste y una UI más cómoda en ambos modos.",
    kind: "proximamente",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 91,
  },
  {
    id: 12,
    gestorNewsId: null,
    title: "Módulo de encuestas",
    subtitle: "Escuchar al equipo y a los clientes",
    body:
      "Se sumará un módulo de encuestas para reunir opiniones del personal o de clientes y usar esa información en el negocio.",
    kind: "proximamente",
    publishedAt: "2026-10-08T16:00:00.000Z",
    sortOrder: 92,
  },
];
