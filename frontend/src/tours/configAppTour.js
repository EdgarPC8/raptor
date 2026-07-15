/** Tour Configuración → pestaña Negocio y app. */
export const CONFIG_APP_TOUR_ID = "config-app";

export function getConfigAppTourSteps() {
  return [
    {
      element: "[data-tour='config-header']",
      popover: {
        title: "Configuración del sistema",
        description:
          "Aquí defines la marca del negocio, la operación diaria y la preparación SRI. Hay dos pestañas: Negocio y app, y Facturación electrónica.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-tabs']",
      popover: {
        title: "Pestañas",
        description:
          "«Negocio y app» = nombre, logo, icono, zona horaria y vista pública. «Facturación electrónica» = datos SRI y firma .p12.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='config-logo']",
      popover: {
        title: "Logo de marca",
        description:
          "El logo es la imagen de marca (suele incluir el nombre del negocio). Se usa en pantallas e informes, no como favicon de la pestaña.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-icon']",
      popover: {
        title: "Icono de la app",
        description:
          "El icono es el emblema pequeño (cuadrado) que representa la marca: pestaña del navegador / favicon. Es distinto del logo con nombre.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-identity']",
      popover: {
        title: "Identidad",
        description:
          "Nombre completo, alias corto, versión, autor y descripción que se muestran en la app e Información.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-timezone']",
      popover: {
        title: "Zona horaria",
        description:
          "Todas las fechas del sistema (turnos, pedidos, movimientos) usan esta zona. En Ecuador: America/Guayaquil.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-public']",
      popover: {
        title: "Vista pública",
        description:
          "Activa o apaga qué ve un visitante sin sesión: catálogo, sucursales propias y vitrinas.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-save']",
      popover: {
        title: "Guardar",
        description:
          "Los cambios de esta pestaña se guardan con este botón. En Facturación electrónica el mismo botón guarda la config SRI.",
        side: "left",
        align: "end",
      },
    },
  ];
}
