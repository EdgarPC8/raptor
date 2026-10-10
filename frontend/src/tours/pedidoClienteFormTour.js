/** Tour del modal «Crear pedido (cliente)». */
export const PEDIDO_CLIENTE_FORM_TOUR_ID = "pedido-cliente-form";

/**
 * @param {{
 *   runItemsDemo?: () => void | Promise<void>,
 *   resetDemo?: () => void,
 *   createPackDemo?: () => void,
 * }} [hooks]
 */
export function getPedidoClienteFormTourSteps(hooks = {}) {
  const { runItemsDemo, resetDemo, createPackDemo } = hooks;

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
          "Armás un pedido mayorista o a crédito: cliente a la izquierda, carrito y pacas a la derecha. No es una venta de caja.",
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
        description:
          "Elegí o creá un producto (+): entra solo al carrito. Cantidad y precios se ajustan a la derecha.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-items']",
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runItemsDemo?.()).then(() => refreshSoon(driver, 50));
      },
      popover: {
        title: "Carrito (demo)",
        description:
          "Acá se acumulan las líneas. Editá cantidad/precio o el lápiz del producto. Podés agrupar en pacas.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-cliente-create-pack']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        createPackDemo?.();
        refreshSoon(driver, 120);
      },
      popover: {
        title: "Crear paca",
        description:
          "Agrupá productos que salen juntos. La paca nace vacía: meté ítems con la manito, ↑↓ o el menú ⋮.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-pack']",
      allowMissing: true,
      popover: {
        title: "Paca",
        description:
          "Cada paca se colapsa con la flecha. Usá ↑↓ para ordenar y la papelera para desarmar la paca.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-pack-meta']",
      allowMissing: true,
      popover: {
        title: "Fechas y valor de la paca",
        description:
          "Podés poner vencimiento/elaboración y el valor total. El check reparte ese monto en los precios unitarios.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-cliente-save']",
      popover: {
        title: "Guardar pedido",
        description:
          "Cuando el carrito está listo, guardás. El pedido aparece en el calendario del día elegido. En el tutorial no guardamos de verdad.",
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
