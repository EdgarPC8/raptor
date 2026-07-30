/** Tour de Locales / stock por local (Fase 1). */
export const LOCALES_TOUR_ID = "locales-stock";

export function getLocalesTourSteps() {
  return [
    {
      element: "[data-tour='locales-header']",
      popover: {
        title: "Locales y stock",
        description:
          "Aquí gestionas sucursales propias, bodega y vitrinas ajenas. El stock del sistema ahora vive por local: la suma de todos es el stock general.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='locales-kind-filters']",
      popover: {
        title: "Tipos de local",
        description:
          "Sucursal propia: vende y abre turno. Bodega: almacén sin caja (ahí migró el stock actual). Vitrina: local ajeno, sin inventario inventariable.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='locales-alert-stock']",
      popover: {
        title: "Importante tras la migración",
        description:
          "Todo el stock quedó en Bodega. En cada sucursal propia o en Bodega, abre el ícono de inventario: ahí ves la tabla de stock y configuras traspasos (Bodega → sucursal). Sin stock en el local del turno, Caja no deja cobrar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='locales-add']",
      popover: {
        title: "Crear o editar",
        description:
          "Al crear/editar eliges el tipo (propia, bodega, vitrina). En sucursales propias configuras SRI/cajas y enlazas productos. El desglose fino por exhibidores vendrá después.",
        side: "left",
        align: "start",
      },
    },
  ];
}
