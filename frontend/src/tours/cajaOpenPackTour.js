/** Tour del modal «Abrir empaque» en Caja. */
export const CAJA_OPEN_PACK_TOUR_ID = "caja-open-pack-modal";

export function getCajaOpenPackTourSteps() {
  return [
    {
      element: "[data-tour='caja-open-pack-dialog']",
      popover: {
        title: "Abrir empaque desde caja",
        description:
          "Falta stock del producto en el carrito, pero hay un empaque enlazado con existencias en este local. Podés abrirlo ahora para reponer y cobrar.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-open-pack-list']",
      popover: {
        title: "Qué se va a abrir",
        description:
          "Cada tarjeta muestra el empaque, el destino, cuánto falta y cuántas unidades entrega cada apertura (1 empaque = +N del producto).",
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
          "«Abrir y cobrar» desglosa el empaque y registra la venta. «No abrir» deja el stock como está: si tenés autocompletar, podrás ajustar; si no, verás aviso de stock insuficiente.",
        side: "top",
        align: "end",
      },
    },
  ];
}
