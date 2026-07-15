/** Tour de la sección Caja (POS). */
export const CAJA_TOUR_ID = "caja";

export function getCajaTourSteps() {
  return [
    {
      element: "[data-tour='caja-header']",
      popover: {
        title: "Punto de venta",
        description:
          "Aquí cobras ventas del día. El icono verde/rojo indica si hay un turno abierto (obligatorio para cobrar).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-shift']",
      popover: {
        title: "Estado del turno",
        description:
          "Sin turno abierto no se puede cobrar. Usa el aviso «Abrir turno» o ve a Turno para iniciar la caja.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-product-search']",
      popover: {
        title: "Buscar producto",
        description:
          "Escribe nombre, código o SKU y pulsa Enter o elige de la lista. También puedes escanear código de barras.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-quick-access']",
      popover: {
        title: "Accesos rápidos",
        description:
          "Abre la grilla de panadería y canastas. Ahí verás «Pan surtido» y «Galletas saladas surtido» ($0.35 u. o 3×$1). Al abrir sale su propio tutorial.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='caja-cart']",
      popover: {
        title: "Carrito de venta",
        description:
          "Revisa cantidades, precios e IVA. Puedes editar filas o vaciar el listado antes de cobrar.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-sell-actions']",
      popover: {
        title: "Acciones del listado",
        description:
          "«Realizar venta» inicia el cobro. «Vaciar listado» limpia el carrito sin registrar nada.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='caja-checkout-panel']",
      popover: {
        title: "Panel de cobro",
        description:
          "Aquí defines documento, condición de pago, cliente y método. En efectivo ingresa el monto recibido para ver el vuelto.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-documento']",
      popover: {
        title: "Documento (importante)",
        description:
          "Si lo dejas en «Documento» (valor por defecto) la venta se registra como Consumidor Final y al contado, sin pedir datos de cliente. Usa «Factura» o «Nota de venta» solo si necesitas otro comprobante o cliente.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-cobrar']",
      popover: {
        title: "Cobrar",
        description:
          "Confirma la venta. Se descuenta stock, registra el ingreso y puedes imprimir el comprobante. Con Documento + Contado (por defecto) cobra rápido como Consumidor Final.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-open-tab']",
      popover: {
        title: "Otra caja",
        description:
          "Abre otra pestaña del mismo punto de venta (mismo turno) si atiendes varios clientes a la vez.",
        side: "bottom",
        align: "end",
      },
    },
  ];
}
