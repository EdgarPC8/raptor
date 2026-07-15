/** Tour del modal «Crear pedido (cliente)». */
export const PEDIDO_CLIENTE_FORM_TOUR_ID = "pedido-cliente-form";

/**
 * @param {{ runItemsDemo?: () => void | Promise<void>, resetDemo?: () => void }} [hooks]
 */
export function getPedidoClienteFormTourSteps(hooks = {}) {
  const { runItemsDemo, resetDemo } = hooks;

  const refreshSoon = (driver, ms = 80) => {
    window.setTimeout(() => {
      try {
        driver.refresh();
      } catch {
        /* ignore */
      }
    }, ms);
  };

  return [
    {
      element: "[data-tour='pedido-cliente-form']",
      popover: {
        title: "Nuevo pedido a cliente",
        description:
          "Aquí armas un pedido mayorista o a crédito: cliente, productos con precio distribuidor y fecha. No es una venta de caja.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-cliente-customer']",
      popover: {
        title: "Cliente",
        description: "Elige a quién va el pedido (distribuidora, café, consumidor final, etc.).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-product']",
      popover: {
        title: "Producto",
        description: "Busca el producto. Debajo verás la referencia de precios si aplica.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-line']",
      popover: {
        title: "Cantidad y precio",
        description:
          "Indica cuántas unidades y el precio distribuidor. El botón + suma la línea a la lista del pedido.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-items']",
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runItemsDemo?.()).then(() => refreshSoon(driver, 50));
      },
      popover: {
        title: "Lista del pedido (demo)",
        description:
          "Mirá cómo se van agregando productos de ejemplo. Podés quitar líneas antes de guardar.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-cliente-save']",
      popover: {
        title: "Guardar pedido",
        description:
          "Cuando la lista está lista, guardás. El pedido aparece en el calendario del día elegido. En el tutorial no guardamos de verdad.",
        side: "top",
        align: "end",
      },
      onNextClick: (_el, _step, { driver }) => {
        resetDemo?.();
        driver.destroy();
      },
    },
  ];
}
