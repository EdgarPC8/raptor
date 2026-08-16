/** Tour Configuración → pestañas de negocio (no SRI). */
export const CONFIG_APP_TOUR_ID = "config-app";

/**
 * @param {{ goInventarioTab?: () => void }} [hooks]
 */
export function getConfigAppTourSteps(hooks = {}) {
  return [
    {
      element: "[data-tour='config-header']",
      popover: {
        title: "Configuración del sistema",
        description:
          "Acá definís marca, sistema, inventario, comprobantes, vista pública y facturación SRI. Cada tipo tiene su pestaña arriba.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-tabs']",
      popover: {
        title: "Categorías",
        description:
          "Navegá como un menú de juego: Marca, Sistema, Inventario, Comprobantes, Público y Facturación SRI. Se pueden agregar más pestañas después.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='config-logo']",
      popover: {
        title: "Logo de marca",
        description:
          "El logo es la imagen de marca (suele incluir el nombre). Se usa en pantallas e informes, no como favicon.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-icon']",
      popover: {
        title: "Icono de la app",
        description:
          "Emblema pequeño (cuadrado) para la pestaña del navegador / favicon. Es distinto del logo con nombre.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-identity']",
      popover: {
        title: "Identidad",
        description:
          "Nombre completo, alias corto, versión, autor y descripción que se muestran en la app.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-open-pack']",
      allowMissing: true,
      onHighlightStarted: (_el, _step, { driver }) => {
        hooks?.goInventarioTab?.();
        window.setTimeout(() => {
          try {
            driver.refresh();
          } catch {
            /* ignore */
          }
        }, 120);
      },
      popover: {
        title: "Sugerir abrir empaque en caja",
        description:
          "En Inventario: si al cobrar falta stock y hay un empaque enlazado con existencias, Caja pregunta si querés abrirlo. Primero enlazá en Producción → Insumos y presentaciones.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-save']",
      popover: {
        title: "Guardar",
        description:
          "Guardá los cambios de la categoría actual. En Facturación SRI el botón guarda los datos fiscales.",
        side: "left",
        align: "center",
      },
    },
  ];
}
