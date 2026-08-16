/** Tour del modal «Configurar apertura de presentación». */
export const INSUMOS_LINK_TOUR_ID = "insumos-link-modal";

export function getInsumosLinkTourSteps() {
  return [
    {
      element: "[data-tour='insumos-link-dialog']",
      popover: {
        title: "Enlazar empaque ↔ destino",
        description:
          "Definís qué pasa al abrir una presentación: baja 1 empaque y suben N unidades del destino (insumo o producto final).",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='insumos-link-presentation']",
      popover: {
        title: "1. Presentación a abrir",
        description:
          "Elegí el empaque (caja, paca, saco…). Es el producto final que se descuenta al abrir.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='insumos-link-target']",
      popover: {
        title: "2. Destino al abrir",
        description:
          "Producto que recibe el stock. Puede ser un insumo genérico (harina) o un final (sobre, bolsa de 2 kg).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='insumos-link-units']",
      popover: {
        title: "3. Unidades por paca",
        description:
          "Cuántas unidades del destino suma cada empaque. Ejemplo: caja de SiCafe → 60 sobres.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='insumos-link-save']",
      popover: {
        title: "Guardar enlace",
        description:
          "Al guardar, en Movimientos → Abrir (y en Caja si la función está activa) el sistema ya sabe cómo desglosar el empaque.",
        side: "top",
        align: "end",
      },
    },
  ];
}
