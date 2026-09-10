/** Tour del modal «Abrir empaque» en Caja. */
export const CAJA_OPEN_PACK_TOUR_ID = "caja-open-pack-modal";

export function getCajaOpenPackTourSteps() {
  return [
    {
      element: "[data-tour='caja-open-pack-dialog']",
      popover: {
        title: "Abrir empaque desde caja",
        description:
          "Falta stock en el carrito, pero hay empaques enlazados con existencias en este local. Si hay varios productos, salen todos juntos en una sola lista (como el autocompletar).",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-open-pack-list']",
      popover: {
        title: "Qué se va a abrir",
        description:
          "La tabla lista todos los productos a reponer: empaque, cuánto falta, stock de pacas, cuántas abrir y unidades que ganan.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-open-pack-qty']",
      allowMissing: true,
      popover: {
        title: "Cantidad a abrir",
        description:
          "Ajustá cuántos empaques abrir. El sistema propone lo mínimo para cubrir lo que pedís en el carrito, sin pasar el stock del local.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-open-pack-actions']",
      popover: {
        title: "Confirmar o saltar",
        description:
          "«Abrir y cobrar» (o «Abrir todos y cobrar») abre todos los de la lista de una vez y registra la venta. «No abrir» deja el stock: si tenés autocompletar, podrás ajustar; si no, verás aviso de stock insuficiente.",
        side: "top",
        align: "end",
      },
    },
  ];
}
