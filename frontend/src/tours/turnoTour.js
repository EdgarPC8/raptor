/** Tour de la sección Turno (apertura/cierre con arqueo simulado). */
export const TURNO_TOUR_ID = "turno";

/**
 * @param {{
 *   prepareOpenDemoUi?: () => void,
 *   runOpenArqueoDemo?: () => void | Promise<void>,
 *   runCloseArqueoDemo?: () => void | Promise<void>,
 *   resetTourDemo?: () => void,
 * }} [hooks]
 */
export function getTurnoTourSteps(hooks = {}) {
  const { prepareOpenDemoUi, runOpenArqueoDemo, runCloseArqueoDemo, resetTourDemo } = hooks;

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
      element: "[data-tour='turno-header']",
      popover: {
        title: "Turno de caja",
        description:
          "Aquí abres y cierras tu jornada. El chip verde «Abierto» indica que ya hay un turno activo (obligatorio para cobrar en Caja).",
        side: "bottom",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        prepareOpenDemoUi?.();
        refreshSoon(driver, 60);
        window.setTimeout(() => driver.moveNext(), 90);
      },
    },
    {
      element: "[data-tour='turno-open-arqueo']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        prepareOpenDemoUi?.();
        void Promise.resolve(runOpenArqueoDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Abrir turno · contar dinero",
        description:
          "Vas llenando monedas y billetes (o el total, si eres empleado). Mira cómo se van llenando los campos: cada denominación suma al capital inicial. Luego pulsas «Abrir turno».",
        side: "bottom",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        resetTourDemo?.({ keepClose: true });
        driver.moveNext();
      },
    },
    {
      element: "[data-tour='turno-movements']",
      allowMissing: true,
      popover: {
        title: "Movimientos de caja",
        description:
          "Registra salidas (papel, comida, compras, retiros) o entradas de efectivo. Así el arqueo de cierre cuadra con lo real.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='turno-movement-form']",
      allowMissing: true,
      popover: {
        title: "Registrar movimiento",
        description:
          "Elige Salida/Entrada, categoría, monto y concepto. «Registrar» lo suma al turno al instante.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='turno-movements-table']",
      allowMissing: true,
      popover: {
        title: "Historial del turno",
        description:
          "Lista de movimientos del turno actual: hora, tipo, concepto y monto (rojo salida / verde entrada).",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='turno-close']",
      allowMissing: true,
      popover: {
        title: "Cierre de caja",
        description:
          "Resumen: apertura, ventas en efectivo, salidas, entradas y efectivo esperado. Luego cuentas el dinero real en caja.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        driver.moveNext();
      },
    },
    {
      element: "[data-tour='turno-close-arqueo']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        void Promise.resolve(runCloseArqueoDemo?.()).then(() => refreshSoon(driver, 40));
      },
      popover: {
        title: "Cerrar turno · contar dinero",
        description:
          "Igual que al abrir: vas anotando monedas y billetes contados. El total se compara con el efectivo esperado. Si coinciden, el cuadre queda perfecto.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='turno-close-btn']",
      allowMissing: true,
      popover: {
        title: "Cerrar turno",
        description:
          "Cuando el contado está listo, pulsas este botón. En el tutorial no lo cerramos: es solo para que veas el paso final.",
        side: "top",
        align: "end",
      },
    },
    {
      element: "[data-tour='turno-history']",
      popover: {
        title: "Historial de turnos",
        description:
          "Turnos recientes (abiertos y cerrados). El administrador puede entrar a Supervisión por fecha.",
        side: "top",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        resetTourDemo?.();
        driver.destroy();
      },
    },
  ];
}
