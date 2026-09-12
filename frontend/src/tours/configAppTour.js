/**
 * Tours de Configuración — uno por pestaña (excepto SRI, en configSriTour.js).
 * Anclas: data-tour en AppSettingsPage / BackupsPage / ThemePaletteEditor.
 */

export const CONFIG_TAB_TOUR_IDS = {
  marca: "config-marca",
  sistema: "config-sistema",
  local: "config-local",
  inventario: "config-inventario",
  comprobantes: "config-comprobantes",
  publico: "config-publico",
  backups: "config-backups",
};

/** @deprecated Usar CONFIG_TAB_TOUR_IDS.marca */
export const CONFIG_APP_TOUR_ID = CONFIG_TAB_TOUR_IDS.marca;

const headerStep = (extra = "") => ({
  element: "[data-tour='config-header']",
  popover: {
    title: "Configuración",
    description:
      `Cada pestaña guarda su propio bloque de opciones.${extra ? ` ${extra}` : ""} Usá el ? de ayuda para repetir este tutorial.`,
    side: "bottom",
    align: "start",
  },
});

const tabsStep = {
  element: "[data-tour='config-tabs']",
  popover: {
    title: "Pestañas",
    description:
      "Marca, Sistema, Local, Inventario, Comprobantes, Público, Facturación SRI y (si sos Programador) Backups. Cambiá de pestaña para ver otro tutorial.",
    side: "bottom",
    align: "center",
  },
};

const saveStep = {
  element: "[data-tour='config-save']",
  popover: {
    title: "Guardar",
    description:
      "El botón flotante guarda los cambios de la pestaña actual. No olvides guardarlos antes de salir.",
    side: "left",
    align: "center",
  },
};

export function getConfigMarcaTourSteps() {
  return [
    headerStep("Acá definís la identidad visual del negocio."),
    tabsStep,
    {
      element: "[data-tour='config-logo']",
      popover: {
        title: "Logo de marca",
        description:
          "Imagen grande de marca (suele incluir el nombre). Se usa en pantallas e informes; no es el favicon.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-icon']",
      popover: {
        title: "Icono de la app",
        description:
          "Emblema cuadrado para la pestaña del navegador (favicon). Debe verse bien en tamaño pequeño.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-identity']",
      popover: {
        title: "Datos del negocio",
        description:
          "Nombre completo, alias corto, versión, autor, descripción, teléfono y redes. El alias es el que ves en la barra lateral.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-theme-palette']",
      allowMissing: true,
      popover: {
        title: "Paleta de colores",
        description:
          "Colores de marca para tema claro, oscuro y neón. Se guardan en el servidor y se cachean en el navegador.",
        side: "top",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigSistemaTourSteps() {
  return [
    headerStep("Zona horaria, notificaciones y operación diaria."),
    tabsStep,
    {
      element: "[data-tour='config-timezone']",
      popover: {
        title: "Hora y zona",
        description:
          "Todas las fechas del sistema usan esta zona IANA (ej. America/Guayaquil). El reloj de abajo muestra la hora resultante.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-notifications']",
      allowMissing: true,
      popover: {
        title: "Notificaciones",
        description:
          "Cómo se muestran los toasts (abajo a la derecha) según el tipo de aviso: sonido, duración, etc.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-sistema-operacion']",
      allowMissing: true,
      popover: {
        title: "Operación",
        description:
          "Carpeta de medios (logos/icons), filtro de accesos rápidos en caja y etiqueta del cliente mostrador (consumidor final).",
        side: "top",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigInventarioTourSteps() {
  return [
    headerStep("Montos, stock y atajos de caja."),
    tabsStep,
    {
      element: "[data-tour='config-inventario']",
      popover: {
        title: "Inventario y montos",
        description:
          "Decimales en pantalla, redondeo, si se muestra el costo al elegir producto, y ajustes al entregar pedidos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-open-pack']",
      allowMissing: true,
      popover: {
        title: "Abrir empaque en caja",
        description:
          "Si al cobrar falta stock y hay un empaque enlazado con existencias, Caja pregunta si querés abrirlo. Requiere enlace en Producción → Insumos.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-caja-products']",
      allowMissing: true,
      popover: {
        title: "Productos desde caja",
        description:
          "Crear producto desde el buscador o el escáner, editar desde el carrito, descuento % por producto/compra y sugerir actualizar precio al cobrar. Por defecto están apagados.",
        side: "top",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigLocalTourSteps() {
  return [
    headerStep("Local de operación y vínculo con facturación SRI."),
    tabsStep,
    {
      element: "[data-tour='config-local']",
      popover: {
        title: "Local",
        description:
          "Acá ves el local enlazado al SRI y los códigos de establecimiento / punto de emisión. En EdDeli, si el gestor lo desbloqueó, también podés activar varios locales (multistock).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-multistock']",
      allowMissing: true,
      popover: {
        title: "Un local o varios",
        description:
          "Solo en EdDeli: con un local queda fijo y se enlaza al SRI; con varios elegís el principal para facturación. Store y Tienda operan siempre con un local.",
        side: "top",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigComprobantesTourSteps() {
  return [
    headerStep("Cómo se imprimen y se ven los comprobantes."),
    tabsStep,
    {
      element: "[data-tour='config-receipt-print']",
      popover: {
        title: "Impresión",
        description:
          "Formato predeterminado: A4, ticket 80 mm o 55 mm. Podés previsualizar la plantilla y cambiar el tamaño en cada impresión.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-receipt-detail']",
      popover: {
        title: "Texto del detalle",
        description:
          "Mayúsculas, límite de caracteres, número de línea, código de barras, unidad y a qué documentos aplica (factura / nota de venta). No cambia la base de datos.",
        side: "top",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigPublicoTourSteps() {
  return [
    headerStep("Qué ve un visitante sin iniciar sesión."),
    tabsStep,
    {
      element: "[data-tour='config-public']",
      popover: {
        title: "Vista pública",
        description:
          "Activá o ocultá el catálogo público, las sucursales propias y las vitrinas en la pantalla de Inicio / menú sin sesión.",
        side: "bottom",
        align: "start",
      },
    },
    saveStep,
  ];
}

export function getConfigBackupsTourSteps() {
  return [
    headerStep("Solo Programador: respaldos JSON de la base."),
    tabsStep,
    {
      element: "[data-tour='config-backups']",
      popover: {
        title: "Backups JSON",
        description:
          "Exportá o guardá un snapshot de la BD, subí un JSON y recargá la base desde backup.json. Subir un archivo no cambia datos hasta que uses Recargar BD.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-backups-actions']",
      allowMissing: true,
      popover: {
        title: "Acciones rápidas",
        description:
          "Actualizar lista, Guardar desde BD (crea/actualiza backup.json) y Recargar BD (restaura desde el backup fijo del servidor).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-backups-main']",
      allowMissing: true,
      popover: {
        title: "backup.json fijo",
        description:
          "El archivo principal en el servidor. Desde acá podés descargarlo o subir uno nuevo para reemplazarlo.",
        side: "top",
        align: "start",
      },
    },
  ];
}

/** Steps del tour de la pestaña activa (no SRI). */
export function getConfigTabTourSteps(tabId) {
  switch (tabId) {
    case "sistema":
      return getConfigSistemaTourSteps();
    case "local":
      return getConfigLocalTourSteps();
    case "inventario":
      return getConfigInventarioTourSteps();
    case "comprobantes":
      return getConfigComprobantesTourSteps();
    case "publico":
      return getConfigPublicoTourSteps();
    case "backups":
      return getConfigBackupsTourSteps();
    case "marca":
    default:
      return getConfigMarcaTourSteps();
  }
}

/** @deprecated Preferir getConfigTabTourSteps('marca') */
export function getConfigAppTourSteps() {
  return getConfigMarcaTourSteps();
}

export function configTourIdForTab(tabId) {
  if (tabId === "sri") return null;
  return CONFIG_TAB_TOUR_IDS[tabId] || CONFIG_TAB_TOUR_IDS.marca;
}
