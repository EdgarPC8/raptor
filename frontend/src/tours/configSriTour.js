/** Tour Configuración → pestaña Facturación electrónica (SRI). */
export const CONFIG_SRI_TOUR_ID = "config-sri";

export function getConfigSriTourSteps() {
  return [
    {
      element: "[data-tour='sri-status']",
      popover: {
        title: "Estado SRI",
        description:
          "Chips de listo/falta, ambiente, módulo y correo. El cobro en Caja sigue igual hasta emitir factura.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-tabs']",
      popover: {
        title: "Dos pestañas",
        description:
          "Facturación SRI: RUC, emisor y firma .p12. Correo: SMTP para enviar la factura al cliente al autorizar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-enabled']",
      allowMissing: true,
      popover: {
        title: "Activar módulo",
        description:
          "Flag para emisión al SRI (pestaña Facturación SRI). No cambia el POS actual.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-emitter']",
      allowMissing: true,
      popover: {
        title: "Datos del emisor",
        description:
          "RUC, razón social, direcciones, establecimiento y punto de emisión. Verde = OK, rojo = falta, amarillo = opcional.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-certificate']",
      allowMissing: true,
      popover: {
        title: "Firma electrónica",
        description:
          "Sube el certificado .p12/.pfx y la contraseña. La clave se cifra y no se vuelve a mostrar.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-invoice-email']",
      allowMissing: true,
      popover: {
        title: "Correo de facturas",
        description:
          "Cambia a la pestaña Correo: activa el envío, configura SMTP y prueba. Al autorizar, la factura llega al email del cliente.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-save']",
      popover: {
        title: "Guardar",
        description:
          "Guarda datos fiscales, firma y SMTP de ambas pestañas. «Listo» aparece cuando RUC, emisor y certificado están completos.",
        side: "left",
        align: "end",
      },
    },
  ];
}
