/** Tour de Insumos y presentaciones (tabla principal). */
export const INSUMOS_TOUR_ID = "insumos-presentaciones";

export function getInsumosTourSteps() {
  return [
    {
      element: "[data-tour='insumos-header']",
      popover: {
        title: "Insumos y presentaciones",
        description:
          "Aquí unís un empaque (caja, paca, saco) con el producto que se repone al abrirlo. Sin este enlace, en Caja no se podrá sugerir abrir el empaque cuando falte stock.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='insumos-search']",
      popover: {
        title: "Buscar",
        description:
          "Filtrá por nombre, tipo, SKU o código. Buscá el producto unitario (destino) o el empaque para ver si ya está enlazado.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='insumos-config-link']",
      popover: {
        title: "Configurar enlace",
        description:
          "Abrí el modal para elegir la presentación a abrir, el destino y cuántas unidades entrega cada paca (ej.: 1 caja → 60 sobres).",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='insumos-table']",
      popover: {
        title: "Tabla de productos",
        description:
          "«Destino al abrir» muestra a dónde va el stock si abrís ese empaque. «Enlaces» indica cuántas presentaciones se abren hacia ese producto. Expandí la fila para ver el detalle (+N unidades).",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='insumos-header']",
      popover: {
        title: "Uso en Caja",
        description:
          "Con el enlace listo, activá «Sugerir abrir empaque en caja» en Configuración → Inventario. Al cobrar sin stock del unitario, Caja preguntará si querés abrir el empaque.",
        side: "bottom",
        align: "start",
      },
    },
  ];
}
