/** Tour Configuración → pestaña Facturación electrónica (SRI). */
export const CONFIG_SRI_TOUR_ID = "config-sri";

export function getConfigSriTourSteps() {
  return [
    {
      element: "[data-tour='sri-status']",
      popover: {
        title: "Estado SRI",
        description:
          "Chips de listo/falta, ambiente (pruebas o producción) y si el módulo está activado. El cobro en Caja sigue igual hasta que se emita factura.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-enabled']",
      popover: {
        title: "Activar módulo",
        description:
          "Flag para cuando exista emisión al SRI. No cambia el POS actual (consumidor final / comprobantes).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sri-emitter']",
      popover: {
        title: "Datos del emisor",
        description:
          "RUC, razón social, direcciones, establecimiento y punto de emisión. Verde = OK, rojo = falta obligatorio, amarillo = opcional.",
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
          "Sube el certificado .p12/.pfx y la contraseña. La clave se cifra en el servidor y no se vuelve a mostrar.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='config-save']",
      popover: {
        title: "Guardar facturación SRI",
        description:
          "Guarda los datos fiscales y la contraseña de firma (si la escribiste). El estado «listo» aparece cuando RUC, emisor y certificado están completos.",
        side: "left",
        align: "end",
      },
    },
  ];
}
