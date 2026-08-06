/** Tour de la sección Productos (catálogo, tabla, por local). */
export const PRODUCTOS_TOUR_ID = "productos";

/**
 * @param {{
 *   prepareTableView?: () => void | Promise<void>,
 *   prepareByStoreView?: () => void | Promise<void>,
 *   prepareCardsView?: () => void | Promise<void>,
 *   multiStockEnabled?: boolean,
 *   resetTourDemo?: () => void,
 * }} [hooks]
 */
export function getProductosTourSteps(hooks = {}) {
  const {
    prepareTableView,
    prepareByStoreView,
    prepareCardsView,
    multiStockEnabled = true,
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

  const afterPrep = (driver, fn, wait = 160) => {
    void Promise.resolve(fn?.()).then(() => {
      refreshSoon(driver, 40);
      window.setTimeout(() => driver.moveNext(), wait);
    });
  };

  const steps = [
    {
      element: "[data-tour='productos-header']",
      popover: {
        title: "Catálogo de productos",
        description:
          "Aquí defines qué vendés o usás en producción: precios, código de barras, stock y categorías. No es Caja ni Pedidos: es la ficha maestra del inventario.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='productos-create']",
      popover: {
        title: "Crear producto",
        description:
          "Abre el formulario de alta. Dentro del modal, el icono de ayuda explica cada bloque (precios, stock, tramos…). También podés escanear un código en el buscador: si no existe, propone crearlo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='productos-category']",
      popover: {
        title: "Filtro por categoría",
        description:
          "Filtra el catálogo por categoría (sirve en tarjetas, tabla y vista por local).",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='productos-view-mode']",
      popover: {
        title: "Cambiar de vista",
        description: multiStockEnabled
          ? "Tarjetas (rápido), Tabla (detalle) y Por local (stock y exhibidores de cada sucursal/bodega)."
          : "Tarjetas para vista rápida y Tabla para listado completo con columnas y acciones.",
        side: "bottom",
        align: "end",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, prepareCardsView, 180);
      },
    },
    {
      element: "[data-tour='productos-cards']",
      allowMissing: true,
      popover: {
        title: "Vista en tarjetas",
        description:
          "Ideal para revisar imagen, precios y stock de un vistazo. Podés buscar o escanear código aquí.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='productos-search']",
      allowMissing: true,
      popover: {
        title: "Buscar / escanear",
        description:
          "Escribí nombre o código y Enter. Si el código no está registrado, se abre el alta con el barcode listo.",
        side: "bottom",
        align: "start",
      },
      onNextClick: (_el, _step, { driver }) => {
        afterPrep(driver, prepareTableView, 200);
      },
    },
    {
      element: "[data-tour='productos-table']",
      allowMissing: true,
      popover: {
        title: "Vista tabla",
        description:
          "Listado denso: imagen, tipo, categoría, precios y stock. Desde las acciones editás o eliminás.",
        side: "top",
        align: "center",
      },
      onNextClick: (_el, _step, { driver }) => {
        if (multiStockEnabled) {
          afterPrep(driver, prepareByStoreView, 220);
          return;
        }
        resetTourDemo?.();
        driver.destroy();
      },
    },
  ];

  if (multiStockEnabled) {
    steps.push(
      {
        element: "[data-tour='productos-by-store']",
        allowMissing: true,
        popover: {
          title: "Vista por local",
          description:
            "Elegí Bodega o una sucursal propia. Acá ves stock de ese local (no el total), exhibidores y visibilidad en el catálogo del local.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "[data-tour='productos-store-select']",
        allowMissing: true,
        popover: {
          title: "Selector de local",
          description:
            "Cambia el local para ver su inventario. El stock general del producto es la suma de todos los locales.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='productos-exhibidores']",
        allowMissing: true,
        popover: {
          title: "Exhibidores",
          description:
            "Organizan productos en el local (vitrina, mostrador…). No tienen stock propio: el inventario sigue siendo del local.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='productos-by-store-table']",
        allowMissing: true,
        popover: {
          title: "Stock y catálogo del local",
          description:
            "Ajustá stock local (genera movimiento), asigná exhibidor y mostrá/ocultá en el catálogo del local. Para el formulario de alta/edición: «Crear producto» y el icono de ayuda del modal.",
          side: "top",
          align: "center",
        },
        onNextClick: (_el, _step, { driver }) => {
          resetTourDemo?.();
          driver.destroy();
        },
      },
    );
  }

  return steps;
}
