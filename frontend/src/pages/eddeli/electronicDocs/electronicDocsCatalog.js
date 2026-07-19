/**
 * Secciones del módulo Comprobantes electrónicos (SRI Ecuador).
 */
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import InventoryIcon from "@mui/icons-material/Inventory";
import SettingsIcon from "@mui/icons-material/Settings";
import FactCheckIcon from "@mui/icons-material/FactCheck";

import { APP_ROUTES } from "../../../config/appRoutes.js";

export const ELECTRONIC_DOC_SECTIONS = [
  {
    id: "hub",
    path: APP_ROUTES.electronicDocs.hub,
    name: "Inicio",
    short: "Panel",
    description: "Resumen del módulo y acceso rápido a cada tipo de comprobante.",
    icon: FactCheckIcon,
    sriCode: null,
    status: "ready",
  },
  {
    id: "facturas",
    path: APP_ROUTES.electronicDocs.invoices,
    name: "Facturas",
    short: "Facturas",
    description:
      "Factura electrónica (01). Venta con IVA a cliente identificado (RUC/cédula).",
    icon: ReceiptLongIcon,
    sriCode: "01",
    status: "ready",
  },
  {
    id: "notas-venta",
    path: APP_ROUTES.electronicDocs.salesNotes,
    name: "Notas de venta",
    short: "Notas venta",
    description:
      "Comprobante interno. No se envía al SRI; para eso usa Factura electrónica.",
    icon: PointOfSaleIcon,
    sriCode: null,
    status: "ready",
  },
  {
    id: "notas-credito",
    path: APP_ROUTES.electronicDocs.creditNotes,
    name: "Notas de crédito",
    short: "N. crédito",
    description: "Nota de crédito (04). Devoluciones, descuentos o anulaciones parciales de facturas.",
    icon: NoteAddIcon,
    sriCode: "04",
    status: "ready",
  },
  {
    id: "notas-debito",
    path: APP_ROUTES.electronicDocs.debitNotes,
    name: "Notas de débito",
    short: "N. débito",
    description: "Nota de débito (05). Cargos adicionales vinculados a una factura.",
    icon: RemoveCircleOutlineIcon,
    sriCode: "05",
    status: "ready",
  },
  {
    id: "retenciones",
    path: APP_ROUTES.electronicDocs.withholdings,
    name: "Retenciones",
    short: "Retenciones",
    description: "Comprobante de retención (07). Retención en la fuente de renta e IVA.",
    icon: AccountBalanceIcon,
    sriCode: "07",
    status: "ready",
  },
  {
    id: "guias-remision",
    path: APP_ROUTES.electronicDocs.deliveryGuides,
    name: "Guías de remisión",
    short: "Guías",
    description: "Guía de remisión (06). Traslado de mercadería entre locales o hacia clientes.",
    icon: LocalShippingIcon,
    sriCode: "06",
    status: "ready",
  },
  {
    id: "liquidacion-compras",
    path: APP_ROUTES.electronicDocs.purchaseSettlement,
    name: "Liquidación de compras",
    short: "Liq. compras",
    description:
      "Liquidación de compra de bienes o prestación de servicios (03). Cuando el emisor liquida la compra.",
    icon: ShoppingCartCheckoutIcon,
    sriCode: "03",
    status: "ready",
  },
  {
    id: "emitidos",
    path: APP_ROUTES.electronicDocs.issued,
    name: "Documentos emitidos",
    short: "Emitidos",
    description:
      "Bandeja de comprobantes enviados al SRI: autorizados, rechazados, pendientes. XML y RIDE.",
    icon: InventoryIcon,
    sriCode: null,
    status: "ready",
  },
  {
    id: "configuracion",
    path: APP_ROUTES.electronicDocs.sriSettings,
    name: "Configuración SRI",
    short: "Config",
    description: "RUC, firma .p12, ambiente pruebas/producción, establecimiento y punto de emisión.",
    icon: SettingsIcon,
    sriCode: null,
    status: "ready",
    external: true,
  },
];

export function getElectronicDocSection(id) {
  return ELECTRONIC_DOC_SECTIONS.find((s) => s.id === id) || null;
}
