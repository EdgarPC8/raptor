/** Tour del modal de detalle (venta / compra). */
export const INVOICE_HUB_DETAIL_TOUR_ID = "invoice-hub-detail-modal";

/**
 * @param {{
 *   goTab?: (index: number) => void | Promise<void>,
 *   partyLabel?: string,
 * }} [hooks]
 */
export function getInvoiceHubDetailTourSteps(hooks = {}) {
  const { goTab, partyLabel = "Cliente" } = hooks;

  const refreshSoon = (driver, ms = 90) => {
    window.setTimeout(() => {
      try {
        driver.refresh();
      } catch {
        /* ignore */
      }
    }, ms);
  };

  const afterTab = (driver, index, wait = 160) => {
    void Promise.resolve(goTab?.(index)).then(() => {
      refreshSoon(driver, 40);
      window.setTimeout(() => driver.moveNext(), wait);
    });
  };

  return [
    {
      element: "[data-tour='invoice-detail-dialog']",
      popover: {
        title: "Detalle del documento",
        description:
          "Reporte de esta venta o compra. Arriba podés imprimir o cerrar. Las pestañas abajo organizan la información.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='invoice-detail-tabs']",
      popover: {
        title: "Pestañas",
        description: `Comprobante · ${partyLabel} · Productos · Pagos · General (historial). Vamos recorriéndolas.`,
        side: "bottom",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterTab(driver, 0, 120);
      },
    },
    {
      element: "[data-tour='invoice-detail-content']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(goTab?.(0)).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Comprobante",
        description:
          "Fecha, establecimiento, número, vendedor y totales (subtotal, descuento, IVA, retención).",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterTab(driver, 1, 140);
      },
    },
    {
      element: "[data-tour='invoice-detail-content']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(goTab?.(1)).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: partyLabel,
        description: `Datos de contacto del ${partyLabel.toLowerCase()}: nombre, cédula/RUC, teléfono, email y dirección.`,
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterTab(driver, 2, 140);
      },
    },
    {
      element: "[data-tour='invoice-detail-content']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(goTab?.(2)).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Productos",
        description:
          "Líneas de este documento: producto, cantidad, precio unitario y total de línea.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterTab(driver, 3, 140);
      },
    },
    {
      element: "[data-tour='invoice-detail-content']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(goTab?.(3)).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Pagos",
        description:
          "Desglose en efectivo, cheque/banco, tarjeta u otros, y el método registrado.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterTab(driver, 4, 160);
      },
    },
    {
      element: "[data-tour='invoice-detail-content']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(goTab?.(4)).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "General · historial",
        description:
          "Todos los documentos del mismo cliente o proveedor (en el filtro cargado) y los productos acumulados. Con el ojo de cada fila saltás a ver ese documento.",
        side: "top",
        align: "start",
      },
    },
  ];
}
