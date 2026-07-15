/** Tour del modal «Pedido a proveedor». */
export const PEDIDO_PROVEEDOR_FORM_TOUR_ID = "pedido-proveedor-form";

/**
 * @param {{ runItemsDemo?: () => void | Promise<void>, resetDemo?: () => void }} [hooks]
 */
export function getPedidoProveedorFormTourSteps(hooks = {}) {
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
      element: "[data-tour='pedido-prov-form']",
      popover: {
        title: "Pedido a proveedor",
        description:
          "Registrás una compra: proveedor, productos, cantidades, precios e IVA. Luego podés abonar o marcar recepción desde el calendario.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-prov-supplier']",
      popover: {
        title: "Proveedor",
        description:
          "Elegí el proveedor. El botón al lado sirve para crear uno nuevo sin salir del formulario.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-product']",
      popover: {
        title: "Producto",
        description:
          "Buscá por nombre o código de barras. También podés crear un producto nuevo con el botón +.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-line']",
      popover: {
        title: "Cantidad, precio e IVA",
        description: "Completá la línea y sumala al pedido con +. Podés reordenar ítems después.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-items']",
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runItemsDemo?.()).then(() => refreshSoon(driver, 50));
      },
      popover: {
        title: "Productos del pedido (demo)",
        description:
          "La lista se va llenando con ítems de ejemplo. Acá ves subtotal, IVA y total antes de guardar.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-prov-save']",
      allowMissing: true,
      popover: {
        title: "Guardar compra",
        description:
          "Confirmá el pedido a proveedor. Quedará en el calendario para seguimiento de pago y entrega. En el tutorial no guardamos.",
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
