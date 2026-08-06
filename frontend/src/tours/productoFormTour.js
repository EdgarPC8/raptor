/** Tour del modal «Crear / editar producto» — un paso por campo principal. */
export const PRODUCTO_FORM_TOUR_ID = "producto-form";

export function getProductoFormTourSteps() {
  return [
    {
      element: "[data-tour='producto-form']",
      popover: {
        title: "Ficha del producto",
        description:
          "Acá cargás o editás los datos maestros. Lo que guardés alimenta Caja, Pedidos, Locales y producción. Tocá Siguiente para ver cada campo.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='producto-form-name']",
      popover: {
        title: "Nombre",
        description:
          "Obligatorio. Es como aparece en caja, pedidos y listas. Usá un nombre claro y único.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-barcode']",
      popover: {
        title: "Código de barras",
        description:
          "Opcional. Podés escribirlo o activar el ícono del lector USB y escanear. Sirve para buscar rápido en Caja y pedidos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-image']",
      popover: {
        title: "Imagen",
        description:
          "Galería o cámara. Después podés recortar (proporción en «Recorte»). Se muestra en catálogo y accesos rápidos.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-desc']",
      allowMissing: true,
      popover: {
        title: "Descripción",
        description: "Texto libre opcional (notas internas, detalle para el catálogo, etc.).",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-type']",
      popover: {
        title: "Tipo",
        description:
          "Materia prima = insumos. Intermedio = se produce y se usa en otra receta. Final = se vende al cliente.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-unit']",
      popover: {
        title: "Unidad",
        description:
          "Unidad base del inventario (unidad, kg, litro…). Todo el stock y las ventas se cuentan en esta unidad.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-category']",
      popover: {
        title: "Categoría",
        description:
          "Clasificación del catálogo (panadería, bebidas…). Ayuda a filtrar y a los accesos rápidos de caja.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-supplier-price']",
      popover: {
        title: "P. proveedor",
        description:
          "Costo de referencia en el catálogo (lo que te suele costar comprar). No se actualiza solo al recibir un pedido: es el valor de la ficha.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-distributor-price']",
      popover: {
        title: "P. distribuidor",
        description:
          "Precio para pedidos mayoristas / clientes distribuidora. Si está en 0, a veces se usa el de venta.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-sale-price']",
      popover: {
        title: "P. venta",
        description:
          "Precio al consumidor (caja / mostrador). Es el que ves en el select y en el cobro normal.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-tax']",
      popover: {
        title: "IVA %",
        description:
          "0 = sin IVA. 15 = IVA típico Ecuador. Se usa al armar líneas con impuesto en pedidos y documentos.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-net-weight']",
      allowMissing: true,
      popover: {
        title: "Peso neto",
        description: "Peso del producto en la unidad que manejés (opcional, para control o etiquetas).",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-min-stock']",
      popover: {
        title: "Stock mínimo",
        description:
          "Umbral de alerta. Si el stock baja de este valor, el producto se marca en riesgo (chip ámbar/rojo en selects).",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-stock']",
      popover: {
        title: "Stock",
        description:
          "Sin multistock: podés editarlo acá. Con multistock: al crear entra a Bodega; al editar ves la suma y ajustás por local en Locales.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-std-weight']",
      allowMissing: true,
      popover: {
        title: "Peso promedio (g)",
        description:
          "Gramos promedio por unidad (útil en panadería / producción). Opcional.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-crop']",
      allowMissing: true,
      popover: {
        title: "Recorte",
        description:
          "Proporción al recortar la imagen (1:1, 4:3…). Solo afecta la foto, no el inventario.",
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
          "Opcional: precio por cantidad o empaque (ej. 3 unidades por $1). Se usa en caja y accesos rápidos.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='producto-form-wholesale']",
      allowMissing: true,
      popover: {
        title: "Mayorista",
        description:
          "Descuento % si la cantidad supera un mínimo (ej. desde 12 uds → 5% off). Opcional.",
        side: "top",
        align: "start",
      },
    },
    {
      element: 'button[type="submit"][form="eddeli-product-form"]',
      allowMissing: true,
      popover: {
        title: "Guardar",
        description:
          "Confirma crear o actualizar. En el tutorial no hace falta guardar: cerrá cuando quieras.",
        side: "top",
        align: "end",
      },
    },
  ];
}
