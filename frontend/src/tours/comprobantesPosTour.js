/** Tour de Comprobantes POS. */
export const COMPROBANTES_POS_TOUR_ID = "comprobantes-pos";

export function getComprobantesPosTourSteps() {
  return [
    {
      element: "[data-tour='pos-header']",
      popover: {
        title: "Comprobantes POS",
        description:
          "Reimpresión y consulta de ventas de caja. El detalle SRI electrónico está en Documentos emitidos; la config SRI en Configuración.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-filters']",
      popover: {
        title: "Filtros",
        description:
          "Fechas, estado SRI, ambiente, vendedor y estado de pago. El select de Producto deja solo las ventas que incluyen ese ítem.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-product-filter']",
      popover: {
        title: "Buscar por producto",
        description:
          "Escribí el nombre del producto: la tabla muestra solo comprobantes que lo vendieron.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-search']",
      popover: {
        title: "Buscador de la tabla",
        description:
          "Buscá por cliente, secuencial, vendedor, totales… Tocá un encabezado para ordenar ascendente o descendente.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pos-table']",
      popover: {
        title: "Ventas de caja",
        description:
          "Listado compacto de comprobantes. La llave indica que hay clave de acceso SRI.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='pos-row-actions']",
      allowMissing: true,
      popover: {
        title: "Acciones de la fila",
        description:
          "Ojo = modal de reporte. Flecha = despliega los productos debajo de la fila. Impresora = formato de impresión.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='pos-totals']",
      popover: {
        title: "Totales",
        description:
          "Sumas del filtro actual (subtotal, ICE, IVA y total).",
        side: "top",
        align: "start",
      },
    },
  ];
}
