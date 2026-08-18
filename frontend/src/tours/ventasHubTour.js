/** Tour del reporte de ventas (Facturación x día). */
export const VENTAS_HUB_TOUR_ID = "ventas-hub";

export function getVentasHubTourSteps() {
  return [
    {
      element: "[data-tour='ventas-hub-header']",
      popover: {
        title: "Reporte de ventas",
        description:
          "Aquí ves la facturación / ventas de caja por día: totales, formas de pago y acciones por fila. No es el calendario de Pedidos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ventas-hub-actions-bar']",
      popover: {
        title: "Acciones rápidas",
        description:
          "«Ver pedidos» abre el calendario de pedidos a clientes/proveedores. «Exportar Excel» descarga el reporte con el filtro actual.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='ventas-hub-filters']",
      popover: {
        title: "Filtros de fecha",
        description:
          "Acotá el rango de fechas y usá Limpiar para volver al mes actual. El buscador de la tabla filtra por columnas.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ventas-hub-search']",
      popover: {
        title: "Buscador de la tabla",
        description:
          "Buscá por cliente, vendedor, número, totales, etc. Tocá el encabezado de una columna para ordenar ascendente o descendente.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ventas-hub-table']",
      popover: {
        title: "Facturación x día",
        description:
          "Cada fila es una venta. Las columnas de dinero están compactas; Cliente se corta con … si el nombre es largo.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='ventas-hub-row-actions']",
      allowMissing: true,
      popover: {
        title: "Ver e imprimir",
        description:
          "El ojo abre el modal de detalle (comprobante, cliente, productos, pagos e historial). La impresora abre el formato de impresión.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='ventas-hub-totals']",
      popover: {
        title: "Totales del filtro",
        description:
          "Sumas de subtotal, IVA, total y formas de pago según las filas que estén filtradas.",
        side: "top",
        align: "start",
      },
    },
  ];
}
