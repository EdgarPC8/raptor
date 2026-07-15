/** Tour interactivo de Pedidos (calendario, día, ítems y modal). */
export const PEDIDOS_TOUR_ID = "pedidos";

/**
 * @param {{
 *   prepareOpenDayDemo?: () => void | Promise<void>,
 *   prepareExpandOrderDemo?: () => void | Promise<void>,
 *   runAddLineDemo?: () => void | Promise<void>,
 *   confirmAddLineDemo?: () => void | Promise<void>,
 *   prepareCreateFormDemo?: () => void | Promise<void>,
 *   runCreateFormItemsDemo?: () => void | Promise<void>,
 *   resetTourDemo?: () => void,
 * }} [hooks]
 */
export function getPedidosTourSteps(hooks = {}) {
  const {
    prepareOpenDayDemo,
    prepareExpandOrderDemo,
    runAddLineDemo,
    confirmAddLineDemo,
    prepareCreateFormDemo,
    runCreateFormItemsDemo,
    resetTourDemo,
  } = hooks;

  const refreshSoon = (driver, ms = 90) => {
    window.setTimeout(() => {
      try {
        driver.refresh();
      } catch {
        /* ignore */
      }
    }, ms);
  };

  const afterPrep = (driver, fn, wait = 120) => {
    void Promise.resolve(fn?.()).then(() => {
      refreshSoon(driver, 40);
      window.setTimeout(() => driver.moveNext(), wait);
    });
  };

  return [
    {
      element: "[data-tour='pedidos-header']",
      popover: {
        title: "Pedidos (no es la caja)",
        description:
          "Aquí registras pedidos a clientes (mayorista/entrega) y pedidos a proveedores (compras). Las ventas rápidas de mostrador viven en Caja.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedidos-create-customer']",
      popover: {
        title: "Crear pedido a cliente",
        description:
          "Abre el formulario: eliges cliente, fecha y vas armando la lista de productos con precio distribuidor.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedidos-create-supplier']",
      popover: {
        title: "Pedido a proveedor",
        description:
          "Compras a proveedores: insumos o mercancía. Se sigue aparte de los pedidos a clientes.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedidos-month-nav']",
      popover: {
        title: "Calendario mensual",
        description:
          "Navega el mes. Cada día muestra cuántos pedidos de clientes y/o proveedores tiene.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedidos-filter']",
      popover: {
        title: "Filtros",
        description:
          "Todos · Clientes · Proveedores. El color del día refleja el estado: pendiente (cálido) vs cobrado/entregado (verde).",
        side: "bottom",
        align: "center",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, prepareOpenDayDemo, 220);
      },
    },
    {
      element: "[data-tour='pedidos-day-focus']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(prepareOpenDayDemo?.()).then(() => refreshSoon(driver, 50));
      },
      popover: {
        title: "Tarjeta del día",
        description:
          "Al tocar un día se abre el detalle debajo de esa semana. Mira cómo se selecciona y se revelan los pedidos…",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='pedidos-day-detail']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(prepareOpenDayDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Pedidos del día",
        description:
          "Cada acordeón es un pedido: cliente, total y saldo por cobrar. Expandimos uno pendiente para ver los ítems.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, prepareExpandOrderDemo, 220);
      },
    },
    {
      element: "[data-tour='pedidos-order-focus']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(prepareExpandOrderDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Pedido expandido",
        description:
          "Por cada línea puedes marcar pago y entrega por separado. También abonar, editar, imprimir o subir recibo firmado.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='pedidos-add-line']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runAddLineDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Añadir producto (demo)",
        description:
          "Sin salir del pedido eliges producto, cantidad y precio. Observa cómo se rellenan los campos…",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        void Promise.resolve(confirmAddLineDemo?.()).then(() => {
          refreshSoon(driver, 50);
          window.setTimeout(() => driver.moveNext(), 220);
        });
      },
    },
    {
      element: "[data-tour='pedidos-order-items']",
      allowMissing: true,
      popover: {
        title: "Ítems en el pedido",
        description:
          "La línea de demo ya aparece en la lista (solo tutorial: no llama al servidor). Así se ve el pedido crecer.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, prepareCreateFormDemo, 260);
      },
    },
    {
      element: "[data-tour='pedido-cliente-form']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(prepareCreateFormDemo?.()).then(() => refreshSoon(driver, 80));
      },
      popover: {
        title: "Modal · nuevo pedido",
        description:
          "Al crear desde el botón usas este formulario: cliente + productos antes de guardar. También podés abrir el tutorial del modal con la banderita del título.",
        side: "left",
        align: "center",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, runCreateFormItemsDemo, 280);
      },
    },
    {
      element: "[data-tour='pedido-cliente-items']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runCreateFormItemsDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Armar la canasta del pedido",
        description:
          "Vas agregando productos a la lista del modal. Cuando todo cuadra, guardas el pedido completo.",
        side: "top",
        align: "center",
      },
      onNextClick: (_el, _step, { driver }) => {
        resetTourDemo?.();
        driver.destroy();
      },
    },
  ];
}
