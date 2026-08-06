/** Tour del modal «Crear / editar producto». */
export const PRODUCTO_FORM_TOUR_ID = "producto-form";

export function getProductoFormTourSteps() {
  return [
    {
      element: "[data-tour='producto-form']",
      popover: {
        title: "Ficha del producto",
        description:
          "Completá los datos maestros. Lo que guardás aquí alimenta Caja, Pedidos, Locales y producción.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='producto-form-identity']",
      popover: {
        title: "Identidad",
        description:
          "Nombre obligatorio, código de barras opcional (lector USB) e imagen (galería o cámara con recorte).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-classify']",
      popover: {
        title: "Clasificación",
        description:
          "Tipo (materia prima / intermedio / final), unidad de medida y categoría del catálogo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-prices']",
      popover: {
        title: "Precios e IVA",
        description:
          "Proveedor (compra), distribuidor (pedidos mayoristas) y venta (caja/mostrador). IVA %: 0 sin IVA, 15 con IVA típico.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-stock']",
      popover: {
        title: "Stock y pesos",
        description:
          "Stock mínimo para alertas. Con multistock: al crear entra a Bodega; al editar el total es la suma (ajustá en Por local o Locales).",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-packages']",
      allowMissing: true,
      popover: {
        title: "Tramos / paquetes",
        description:
          "Opcional: precios por cantidad o empaque (ej. 3×$1). Útil en caja y accesos rápidos.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-save']",
      popover: {
        title: "Guardar",
        description:
          "«Guardar producto» crea o actualiza. En el tutorial no hace falta guardar: podés cerrar cuando quieras.",
        side: "top",
        align: "end",
      },
    },
  ];
}
