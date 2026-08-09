import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { getReceiptLayout } from "../../utils/receiptFormats.js";
import { code128SvgMarkup } from "../../utils/code128Barcode.js";
import {
  formatInvoiceMoney,
  formatInvoiceUnitPrice,
  sriPaymentFormLabel,
  dominantIvaRate,
} from "../../utils/invoiceFiscalUtils.js";

const BLACK = "#000";
const border = "1px solid #000";

function MetaRow({ label, children, boldValue = false }) {
  return (
    <Box sx={{ display: "flex", gap: 0.75, mb: 0.35, alignItems: "flex-start" }}>
      <Typography component="span" sx={{ fontWeight: 800, fontSize: "inherit", whiteSpace: "nowrap" }}>
        {label}
      </Typography>
      <Typography
        component="span"
        sx={{ fontWeight: boldValue ? 800 : 600, fontSize: "inherit", wordBreak: "break-all" }}
      >
        {children || "—"}
      </Typography>
    </Box>
  );
}

function TotalsBlock({ receipt, isTicket, ivaRate }) {
  const fiscal = receipt.fiscal || {};
  const discount = Number(receipt.discount || 0);
  const ice = Number(receipt.ice || 0);
  const tip = Number(receipt.tip || 0);
  const rows = [
    ["Total Sin Impuestos", formatInvoiceMoney(receipt.subtotal)],
    ["Descuento", formatInvoiceMoney(discount)],
    ["Valor ICE", formatInvoiceMoney(ice)],
    [ivaRate > 0 ? `Valor IVA ${ivaRate}%` : "Valor IVA", formatInvoiceMoney(receipt.iva)],
  ];
  if (!isTicket) rows.push(["Propina", formatInvoiceMoney(tip)]);
  rows.push(["Valor Total", formatInvoiceMoney(receipt.total)]);

  return (
    <Box sx={{ fontSize: "inherit", fontWeight: 700 }}>
      {rows.map(([label, value], i) => {
        const isTotal = label === "Valor Total";
        return (
          <Box
            key={label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              py: 0.2,
              fontWeight: isTotal ? 900 : 700,
              borderTop: i === rows.length - 1 ? border : "none",
              mt: i === rows.length - 1 ? 0.35 : 0,
              pt: i === rows.length - 1 ? 0.5 : 0.2,
            }}
          >
            <span>{label}</span>
            <span>{value}</span>
          </Box>
        );
      })}
      {fiscal.fromSettingsPreview ? (
        <Typography sx={{ mt: 0.75, fontSize: "0.72em", fontWeight: 700, color: "#444" }}>
          Nº previsto (próximo secuencial de facturas). Tras autorización SRI se confirma.
        </Typography>
      ) : null}
    </Box>
  );
}

function CustomerBlock({ receipt, emissionDate, isTicket }) {
  return (
    <Box
      sx={{
        border,
        p: isTicket ? 0.75 : 1,
        mb: isTicket ? 1 : 1.25,
        fontSize: "inherit",
        lineHeight: 1.35,
      }}
    >
      <MetaRow label="Razón Social/ Nombres:">{receipt.customerName}</MetaRow>
      <Box
        sx={{
          display: isTicket ? "block" : "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0.5,
        }}
      >
        <MetaRow label="Identificación:">{receipt.customerCedula}</MetaRow>
        {!isTicket ? <MetaRow label="Fecha Emisión:">{emissionDate}</MetaRow> : null}
        <MetaRow label="Dirección:">{receipt.customerAddress}</MetaRow>
        {!isTicket ? <MetaRow label="Guía de Remisión:" /> : null}
        <MetaRow label="Teléfono:">{receipt.customerPhone}</MetaRow>
        <MetaRow label="Correo:">{receipt.customerEmail}</MetaRow>
      </Box>
    </Box>
  );
}

function ItemsTableA4({ items }) {
  return (
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mb: 1.25, fontSize: "0.92em" }}>
      <Box component="thead">
        <Box component="tr">
          {["Codigo", "Descripción", "Cant", "Precio Unitario", "Descto", "Subtotal"].map((h, i) => (
            <Box
              component="th"
              key={h}
              sx={{
                border,
                px: 0.6,
                py: 0.45,
                fontWeight: 800,
                textAlign: i >= 2 ? "right" : "left",
                bgcolor: "#f3f3f3",
              }}
            >
              {h}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {items.map((it, idx) => (
          <Box component="tr" key={`a4-${idx}`}>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, fontWeight: 600 }}>
              {it.code || it.productId || idx + 1}
            </Box>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, fontWeight: 600 }}>
              {it.name}
            </Box>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, textAlign: "right", fontWeight: 700 }}>
              {formatInvoiceMoney(it.quantity)}
            </Box>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, textAlign: "right", fontWeight: 700 }}>
              {formatInvoiceUnitPrice(it.price)}
            </Box>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, textAlign: "right", fontWeight: 700 }}>
              {formatInvoiceMoney(it.discount || 0)}
            </Box>
            <Box component="td" sx={{ border, px: 0.6, py: 0.35, textAlign: "right", fontWeight: 700 }}>
              {formatInvoiceMoney(it.subtotal ?? it.lineTotal)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ItemsTableTicket({ items }) {
  return (
    <Box sx={{ mb: 1, fontSize: "inherit" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "0.7fr 2.2fr 0.9fr 0.7fr 0.9fr",
          gap: 0.25,
          borderBottom: border,
          pb: 0.35,
          mb: 0.35,
          fontWeight: 800,
          fontSize: "0.85em",
        }}
      >
        <span>Cant</span>
        <span>Descripción</span>
        <span style={{ textAlign: "right" }}>P.V.P</span>
        <span style={{ textAlign: "right" }}>Descto</span>
        <span style={{ textAlign: "right" }}>Subtotal</span>
      </Box>
      {items.map((it, idx) => (
        <Box
          key={`tk-${idx}`}
          sx={{
            display: "grid",
            gridTemplateColumns: "0.7fr 2.2fr 0.9fr 0.7fr 0.9fr",
            gap: 0.25,
            py: 0.3,
            borderBottom: "1px dotted #999",
            fontWeight: 600,
            fontSize: "0.9em",
            alignItems: "start",
          }}
        >
          <span>{formatInvoiceMoney(it.quantity)}</span>
          <span style={{ wordBreak: "break-word" }}>{it.name}</span>
          <span style={{ textAlign: "right" }}>{formatInvoiceUnitPrice(it.price)}</span>
          <span style={{ textAlign: "right" }}>{formatInvoiceMoney(it.discount || 0)}</span>
          <span style={{ textAlign: "right" }}>{formatInvoiceMoney(it.subtotal ?? it.lineTotal)}</span>
        </Box>
      ))}
    </Box>
  );
}

function PaymentExtra({ receipt, isTicket }) {
  const pay = sriPaymentFormLabel(receipt.paymentMethod);
  return (
    <Box sx={{ fontSize: "0.9em" }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Información Adicional</Typography>
      {!isTicket ? (
        <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Sucursal: Matriz</Typography>
      ) : null}
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
        <Box component="thead">
          <Box component="tr">
            {["Forma de Pago", "Valor", "Plazo", "Tiempo"].map((h) => (
              <Box
                component="th"
                key={h}
                sx={{ border, px: 0.5, py: 0.3, fontWeight: 800, textAlign: "left", fontSize: "0.85em" }}
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          <Box component="tr">
            <Box component="td" sx={{ border, px: 0.5, py: 0.35, fontWeight: 600, fontSize: "0.85em" }}>
              {pay}
            </Box>
            <Box component="td" sx={{ border, px: 0.5, py: 0.35, fontWeight: 700 }}>
              {formatInvoiceMoney(receipt.total)}
            </Box>
            <Box component="td" sx={{ border, px: 0.5, py: 0.35 }} />
            <Box component="td" sx={{ border, px: 0.5, py: 0.35, fontWeight: 600 }}>
              ninguno
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** RIDE factura: A4 (dos columnas) o ticket 80/55 mm (vertical). */
export default function InvoiceRideContent({ receipt, format = "a4" }) {
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const fiscal = receipt?.fiscal || {};
  const barcodeKey = fiscal.authorizationNumber || fiscal.accessKey || "";
  const barcodeSvg = useMemo(
    () =>
      barcodeKey
        ? code128SvgMarkup(barcodeKey, {
            height: isTicket ? 36 : 48,
            maxWidth: isTicket ? 240 : 300,
          })
        : "",
    [barcodeKey, isTicket],
  );

  if (!receipt) return null;

  const items = receipt.items || [];
  const ivaRate = dominantIvaRate(items);
  const emissionDate =
    fiscal.emissionDate ||
    (receipt.date && String(receipt.date).match(/\d{4}-\d{2}-\d{2}/)?.[0]) ||
    "";

  const issuerBlock = (
    <Box sx={{ textAlign: isTicket ? "center" : "left" }}>
      {receipt.logoUrl ? (
        <Box
          component="img"
          src={receipt.logoUrl}
          alt=""
          sx={{
            maxWidth: isTicket ? 120 : 160,
            maxHeight: isTicket ? 70 : 90,
            objectFit: "contain",
            mb: 0.75,
            display: "block",
            mx: isTicket ? "auto" : 0,
          }}
        />
      ) : null}
      <Typography sx={{ fontWeight: 900, fontSize: isTicket ? "0.95em" : "1.05em", lineHeight: 1.25 }}>
        {fiscal.legalName || receipt.businessName}
      </Typography>
      {(fiscal.tradeName || receipt.businessDescription) ? (
        <Typography sx={{ fontWeight: 700, fontSize: isTicket ? "0.85em" : "0.95em", mt: 0.25 }}>
          {fiscal.tradeName || receipt.businessDescription}
        </Typography>
      ) : null}
      {fiscal.matrixAddress ? (
        <Typography sx={{ fontWeight: 600, fontSize: "0.82em", mt: 0.5 }}>
          <Box component="span" sx={{ fontWeight: 800 }}>Matriz: </Box>
          {fiscal.matrixAddress}
        </Typography>
      ) : null}
      {fiscal.establishmentAddress ? (
        <Typography sx={{ fontWeight: 600, fontSize: "0.82em" }}>
          <Box component="span" sx={{ fontWeight: 800 }}>Sucursal: </Box>
          {fiscal.establishmentAddress}
        </Typography>
      ) : null}
      <Typography sx={{ fontWeight: 600, fontSize: "0.82em", mt: 0.35 }}>
        <Box component="span" sx={{ fontWeight: 800 }}>Obligado a llevar Contabilidad: </Box>
        {fiscal.accountingRequired ? "SI" : "NO"}
      </Typography>
      {fiscal.phone ? (
        <Typography sx={{ fontWeight: 600, fontSize: "0.82em" }}>{fiscal.phone}</Typography>
      ) : null}
      {fiscal.email ? (
        <Typography sx={{ fontWeight: 600, fontSize: "0.82em" }}>{fiscal.email}</Typography>
      ) : null}
    </Box>
  );

  const docMetaBlock = (
    <Box sx={{ textAlign: isTicket ? "center" : "left" }}>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: isTicket ? "1.15em" : "1.35em",
          letterSpacing: 0.5,
          mb: 0.75,
          textAlign: "center",
        }}
      >
        FACTURA
      </Typography>
      <MetaRow label={isTicket ? "Ruc:" : "RUC:"} boldValue>
        {fiscal.ruc || "—"}
      </MetaRow>
      {!isTicket ? (
        <>
          <MetaRow label="No." boldValue>
            {fiscal.invoiceNumber || "—"}
          </MetaRow>
          <MetaRow label="Ambiente" boldValue>
            {fiscal.environmentLabel || "—"}
          </MetaRow>
          <MetaRow label="Autorización">
            {fiscal.authorizationNumber || "Pendiente de autorización SRI"}
          </MetaRow>
          {fiscal.authorizedAt ? (
            <MetaRow label="Fecha y Hora Autorización">{String(fiscal.authorizedAt)}</MetaRow>
          ) : null}
          {barcodeSvg ? (
            <Box
              sx={{ mt: 1, "& svg": { width: "100%", maxWidth: 300, height: 48, display: "block" } }}
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
          ) : null}
        </>
      ) : null}
    </Box>
  );

  const ticketAuthBlock = (
    <Box sx={{ textAlign: "center", mt: 0.75 }}>
      <MetaRow label="Fecha Emisión:" boldValue>
        {emissionDate || "—"}
      </MetaRow>
      <MetaRow label="No." boldValue>
        {fiscal.invoiceNumber || "—"}
      </MetaRow>
      <MetaRow label="Ambiente" boldValue>
        {fiscal.environmentLabel || "—"}
      </MetaRow>
      <MetaRow label="Autorización">
        {fiscal.authorizationNumber || "Pendiente SRI"}
      </MetaRow>
      {fiscal.authorizedAt ? (
        <MetaRow label="Fecha y Hora Autorización">{String(fiscal.authorizedAt)}</MetaRow>
      ) : null}
      {fiscal.accessKey ? <MetaRow label="Clave acceso">{fiscal.accessKey}</MetaRow> : null}
    </Box>
  );

  return (
    <Box
      sx={{
        width: isTicket ? layout.previewWidth : "100%",
        maxWidth: isTicket ? layout.maxWidth : 820,
        mx: "auto",
        p: isTicket ? 1 : 1.5,
        bgcolor: "#fff",
        color: BLACK,
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: isTicket ? (layout.narrow ? 11 : 12.5) : 13,
        border: "1px solid #ccc",
        borderRadius: 1,
        "& .MuiTypography-root": { color: BLACK },
      }}
    >
      {isTicket ? (
        <>
          {docMetaBlock}
          <Box sx={{ my: 1 }}>{issuerBlock}</Box>
          {ticketAuthBlock}
          <Box sx={{ borderTop: border, borderBottom: border, py: 0.5, my: 1 }} />
          <CustomerBlock receipt={receipt} emissionDate={emissionDate} isTicket />
          <ItemsTableTicket items={items} />
          <TotalsBlock receipt={receipt} isTicket ivaRate={ivaRate} />
          <Box sx={{ mt: 1.25 }}>
            <PaymentExtra receipt={receipt} isTicket />
          </Box>
        </>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 1.25,
              mb: 1.25,
            }}
          >
            <Box sx={{ border, p: 1.25 }}>{issuerBlock}</Box>
            <Box sx={{ border, p: 1.25 }}>{docMetaBlock}</Box>
          </Box>
          <CustomerBlock receipt={receipt} emissionDate={emissionDate} isTicket={false} />
          <ItemsTableA4 items={items} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 1.25,
              alignItems: "start",
            }}
          >
            <Box sx={{ border, p: 1 }}>
              <PaymentExtra receipt={receipt} isTicket={false} />
            </Box>
            <Box sx={{ border, p: 1 }}>
              <TotalsBlock receipt={receipt} isTicket={false} ivaRate={ivaRate} />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
