/**
 * Noticias del periódico interno — catálogo fijo en código.
 * Ya no se sincronizan desde el gestor Raptor Solutions.
 *
 * kinds: portada | interior | breve | editorial | proximamente
 */
export const APP_NEWS_CATALOG = [
  {
    id: 1,
    gestorNewsId: null,
    title: "Bienvenido a tu sistema",
    subtitle: "Operación, inventario y ventas en un solo lugar",
    body: "Este periódico muestra novedades del sistema. Las notas se definen en el código de la app (appNewsCatalog.js), sin depender del gestor.",
    kind: "portada",
    publishedAt: "2026-01-15T12:00:00.000Z",
    sortOrder: 0,
  },
  {
    id: 2,
    gestorNewsId: null,
    title: "Caja y turnos",
    subtitle: "Cobrá y cerrá el día con control",
    body: "Abrí turno, cobrá en caja y revisá el arqueo. Ideal para el día a día del local.",
    kind: "interior",
    publishedAt: "2026-01-15T12:00:00.000Z",
    sortOrder: 10,
  },
  {
    id: 3,
    gestorNewsId: null,
    title: "Inventario al día",
    subtitle: "Stock, compras y producción",
    body: "Registrá productos, pedidos a proveedor y movimientos para mantener el stock coherente.",
    kind: "interior",
    publishedAt: "2026-01-15T12:00:00.000Z",
    sortOrder: 20,
  },
  {
    id: 4,
    gestorNewsId: null,
    title: "Tip: roles claros",
    subtitle: "Propietario, Admin, Empleado, Programador",
    body: "Cada rol ve lo que necesita. El módulo Desarrollador es solo para Programador.",
    kind: "breve",
    publishedAt: "2026-01-15T12:00:00.000Z",
    sortOrder: 30,
  },
  {
    id: 5,
    gestorNewsId: null,
    title: "Próximamente",
    subtitle: "Más módulos en camino",
    body: "Las secciones marcadas como «próximamente» en el catálogo de módulos aparecerán aquí cuando estén listas.",
    kind: "proximamente",
    publishedAt: "2026-01-15T12:00:00.000Z",
    sortOrder: 40,
  },
];
