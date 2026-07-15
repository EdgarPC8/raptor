/** Tour de Accesos rápidos (Caja → canasta / surtido). */
export const CAJA_QUICK_TOUR_ID = "caja-quick";

/**
 * @param {{ prepareSurtidoDemo?: () => void, confirmSurtidoDemo?: () => void }} [hooks]
 */
export function getCajaQuickTourSteps(hooks = {}) {
  const { prepareSurtidoDemo, confirmSurtidoDemo } = hooks;

  return [
    {
      element: "[data-tour='caja-quick-dialog']",
      popover: {
        title: "Accesos rápidos",
        description:
          "Aquí eliges productos de mostrador con un clic. Ideal para panadería y galletas sin buscar por nombre.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-quick-qty']",
      popover: {
        title: "Cantidad rápida",
        description:
          "Pulsa 1–9 (o usa el teclado) para fijar cuántas unidades sumar al tocar un producto.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-quick-surtidos']",
      popover: {
        title: "Surtidos / canastas",
        description:
          "«Pan surtido» y «Galletas saladas surtido» arman una canasta mezclando sabores. En galletas: $0.35 c/u o 3 por $1.00. En el siguiente paso armamos una canasta de ejemplo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='caja-quick-grid']",
      allowMissing: true,
      onHighlightStarted: () => {
        prepareSurtidoDemo?.();
      },
      popover: {
        title: "Canasta de ejemplo",
        description:
          "En modo canasta, cada clic suma unidades. Aquí ya entramos a «Galletas saladas» con 3 unidades (una de cada sabor) para el tramo 3×$1.00.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='caja-quick-confirm']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        prepareSurtidoDemo?.();
        window.setTimeout(() => {
          try {
            driver.refresh();
          } catch {
            /* ignore */
          }
        }, 80);
      },
      onNextClick: (_el, _step, { driver }) => {
        confirmSurtidoDemo?.();
        driver.destroy();
      },
      popover: {
        title: "Agregar canasta al carrito",
        description:
          "Este botón confirma el surtido y lo manda al carrito con el precio del tramo. Pulsa «Listo» y lo agregamos por ti en esta demo.",
        side: "top",
        align: "center",
      },
    },
  ];
}
