/** Tour del reporte de compras. */
export const COMPRAS_HUB_TOUR_ID = "compras-hub";

export function getComprasHubTourSteps() {
  return [
    {
      element: "[data-tour='compras-hub-header']",
      popover: {
        title: "Compras",
        description:
          "Registrás facturas de proveedor (XML o manual), cargás productos y revisás el reporte diario de compras.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='compras-hub-actions-bar']",
      popover: {
        title: "Acciones rápidas",
        description:
          "«Ver pedidos» va al calendario. «Exportar Excel» descarga el filtro actual. «Nueva compra» abre el formulario de pedido a proveedor.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='compras-hub-filters']",
      popover: {
        title: "Filtros de fecha",
        description:
          "Elegí el rango y Limpiar restaura el mes. Al cambiar fechas se recargan las compras. El buscador de la tabla filtra por columnas.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='compras-hub-search']",
      popover: {
        title: "Buscador de la tabla",
        description:
          "Buscá por proveedor, número de factura, totales… Ordená con las flechas de cada columna.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='compras-hub-table']",
      popover: {
        title: "Compras x día",
        description:
          "Cada fila es una compra / factura de proveedor con desglose de pagos.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='compras-hub-row-actions']",
      allowMissing: true,
      popover: {
        title: "Ver, imprimir y editar",
        description:
          "Ojo = modal de detalle e historial del proveedor. Impresora = reporte imprimible. Lápiz = editar el pedido / productos.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='compras-hub-totals']",
      popover: {
        title: "Totales del filtro",
        description:
          "Sumas del rango de fechas cargado: subtotal, IVA, total y formas de pago.",
        side: "top",
        align: "start",
      },
    },
  ];
}
