/** Tour del modal «Pedido a proveedor». */
export const PEDIDO_PROVEEDOR_FORM_TOUR_ID = "pedido-proveedor-form";

/**
 * @param {{
 *   runItemsDemo?: () => void | Promise<void>,
 *   resetDemo?: () => void,
 *   createPackDemo?: () => void,
 * }} [hooks]
 */
export function getPedidoProveedorFormTourSteps(hooks = {}) {
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
      element: "[data-tour='pedido-prov-form']",
      popover: {
        title: "Pedido a proveedor",
        description:
          "Registrás una compra: proveedor, productos, cantidades y precios. Con multistock, al marcar recibido elegís Bodega o sucursal.",
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
          "Elegí o creá un producto (+): entra solo al carrito. Cantidad, precio e IVA se ajustan a la derecha.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-items']",
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runItemsDemo?.()).then(() => refreshSoon(driver, 50));
      },
      popover: {
        title: "Lista del pedido",
        description:
          "Acá ves productos, subtotal e IVA. Editá cantidad/precio o el lápiz del producto. Podés arrastrarlos a una paca.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedido-prov-create-pack']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        createPackDemo?.();
        refreshSoon(driver, 120);
      },
      popover: {
        title: "Crear paca",
        description:
          "Agrupá productos que llegan juntos (misma caja). La paca nace vacía: arrastrá, usá ↑↓ o el menú ⋮ para meter/sacar.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-pack']",
      allowMissing: true,
      popover: {
        title: "Paca (acordeón)",
        description:
          "Cada paca se colapsa con la flecha. Usá ↑↓ para ordenar y la papelera para desarmar la paca.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-pack-meta']",
      allowMissing: true,
      popover: {
        title: "Fechas y valor de la paca",
        description:
          "Poné vencimiento/elaboración y el valor total de la paca. El check reparte ese monto en los precios unitarios (con varios decimales).",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedido-prov-save']",
      allowMissing: true,
      popover: {
        title: "Guardar compra",
        description:
          "Confirmá el pedido. Quedará en el calendario para pago y recepción. En el tutorial no guardamos.",
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
