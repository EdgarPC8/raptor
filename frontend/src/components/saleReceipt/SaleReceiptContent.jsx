import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { getReceiptLayout } from "../../utils/receiptFormats.js";
import {
  formatMoneyReceipt,
  formatUnitMoneyReceipt,
  RECEIPT_FIELD_LABELS,
} from "../../utils/saleReceiptUtils.js";
import { isFacturaDocument } from "../../utils/invoiceFiscalUtils.js";
import {
  formatReceiptItemDescription,
  normalizeReceiptDetailSettings,
} from "../../utils/receiptDetailFormat.js";
import {
  formatReceiptQuantity,
  receiptColumnCellValue,
  resolveReceiptTableColumns,
} from "../../utils/receiptTableColumns.js";
import { useAppSettings } from "../../context/AppSettingsContext.jsx";
import InvoiceRideContent from "./InvoiceRideContent.jsx";

const BLACK = "#000";
const cellSx = { py: 0.5, color: BLACK, borderColor: "#ccc" };
const headCellSx = { ...cellSx, fontWeight: 800 };

/** Bloque de firmas entrega / recibe. */
function ReceiptSignatures({ isTicket, signatureSize }) {
  const lineSx = {
    borderTop: "1.5px solid",
    borderColor: BLACK,
    pt: 0.75,
    mt: isTicket ? 3.5 : 5,
    textAlign: "center",
    fontWeight: 800,
    fontSize: signatureSize,
  };

  if (isTicket) {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography sx={lineSx}>Entrega</Typography>
        <Typography sx={lineSx}>Recibe</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 4, mt: 4 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={lineSx}>Entrega</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={lineSx}>Recibe</Typography>
      </Box>
    </Box>
  );
}

/** Vista previa del comprobante (A4 o ticket térmico). */
export default function SaleReceiptContent({
  receipt,
  format = "a4",
  showNotes = true,
  detailSettings = null,
}) {
  const { activeApp } = useAppSettings();
  const detailCfg = normalizeReceiptDetailSettings(
    detailSettings ?? activeApp?.receiptDetailSettings,
  );

  if (!receipt) return null;
  if (isFacturaDocument(receipt)) {
    return (
      <InvoiceRideContent
        receipt={receipt}
        format={format}
        detailSettings={detailCfg}
      />
    );
  }
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const items = receipt.items || [];
  const totalQuantity = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const docType = receipt.documentType || "nota_venta";
  const tableCols = resolveReceiptTableColumns(detailCfg, docType, format);
  const cellFormatters = {
    money: formatMoneyReceipt,
    unitPrice: formatUnitMoneyReceipt,
    description: (it, idx) =>
      formatReceiptItemDescription(it, detailCfg, idx, docType),
  };
  const qtyColIndex = tableCols.findIndex((c) => c.id === "qty");

  return (
    <Box
      sx={{
        width: isTicket ? layout.previewWidth : "100%",
        maxWidth: isTicket ? layout.maxWidth : layout.maxWidth || 794,
        mx: "auto",
        p: layout.pad,
        bgcolor: "#fff",
        color: BLACK,
        fontFamily: "Arial, sans-serif",
        fontSize: layout.baseFont,
        fontWeight: 600,
        border: "1px solid #ccc",
        borderRadius: 1,
        "& .MuiTypography-root": { color: BLACK },
        "& .MuiTableCell-root": { color: BLACK, borderColor: "#ccc" },
      }}
    >
      <Box sx={{ textAlign: "center", mb: isTicket ? 1 : 2 }}>
        <Typography fontWeight={800} fontSize={layout.businessName} color={BLACK}>
          {receipt.businessName}
        </Typography>
        {receipt.businessDescription ? (
          <Typography fontWeight={800} fontSize={layout.businessDesc} display="block" sx={{ mt: 0.5 }}>
            {receipt.businessDescription}
          </Typography>
        ) : null}
        <Typography fontWeight={800} sx={{ mt: 1 }} fontSize={layout.docTitle} color={BLACK}>
          {receipt.documentTitle}
        </Typography>
        <Typography fontWeight={800} fontSize={layout.meta} display="block" sx={{ mt: 0.5 }}>
          N° {receipt.id || "—"}
        </Typography>
        <Typography
          fontWeight={900}
          fontSize={layout.date}
          display="block"
          sx={{ mt: 0.35, letterSpacing: 0.2 }}
        >
          {receipt.date}
        </Typography>
      </Box>

      <Box sx={{ mb: isTicket ? 1.25 : 2, fontSize: layout.customer, fontWeight: 700, lineHeight: 1.4 }}>
        <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            {RECEIPT_FIELD_LABELS.name}
          </Box>{" "}
          {receipt.customerName}
        </Typography>
        {receipt.customerCedula ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.cedula}
            </Box>{" "}
            {receipt.customerCedula}
          </Typography>
        ) : null}
        {receipt.customerPhone ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.phone}
            </Box>{" "}
            {receipt.customerPhone}
          </Typography>
        ) : null}
        {receipt.customerAddress ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.address}
            </Box>{" "}
            {receipt.customerAddress}
          </Typography>
        ) : null}
        <Typography variant="body2" color={BLACK}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            {RECEIPT_FIELD_LABELS.payment}
          </Box>{" "}
          {receipt.paymentMethod}
        </Typography>
      </Box>

      <Table size="small" sx={{ mb: 1, tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            {tableCols.map((col) => (
              <TableCell
                key={col.id}
                align={col.align === "right" ? "right" : col.id === "qty" ? "center" : "left"}
                sx={{
                  ...headCellSx,
                  px: isTicket ? 0.5 : 1,
                  width: col.width,
                }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((it, idx) => (
            <TableRow key={`line-${idx}`}>
              {tableCols.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align === "right" ? "right" : col.id === "qty" ? "center" : "left"}
                  sx={{
                    ...cellSx,
                    py: 0.35,
                    px: isTicket ? 0.5 : 1,
                    fontSize: "inherit",
                    verticalAlign: "top",
                    whiteSpace: col.breakWords ? "normal" : "nowrap",
                    wordBreak: col.breakWords
                      ? col.id === "code"
                        ? "break-all"
                        : "break-word"
                      : undefined,
                    overflowWrap: col.breakWords ? "anywhere" : undefined,
                    lineHeight: 1.35,
                    fontWeight: col.align === "right" || col.id === "qty" ? 700 : 600,
                    width: col.width,
                    overflow: "hidden",
                  }}
                >
                  {receiptColumnCellValue(col.id, it, idx, cellFormatters)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          <TableRow>
            {tableCols.map((col, i) => {
              if (col.id === "qty") {
                return (
                  <TableCell
                    key={col.id}
                    align="center"
                    sx={{
                      ...cellSx,
                      py: 0.5,
                      px: 0.5,
                      fontWeight: 800,
                      borderTop: "1px solid #ccc",
                    }}
                  >
                    {formatReceiptQuantity(totalQuantity)}
                  </TableCell>
                );
              }
              const labelCell =
                qtyColIndex > 0
                  ? i === qtyColIndex - 1
                  : i === 0 && col.id === "description";
              if (labelCell) {
                return (
                  <TableCell
                    key={col.id}
                    align="right"
                    sx={{
                      ...cellSx,
                      py: 0.5,
                      px: isTicket ? 0.5 : 1,
                      fontWeight: 800,
                      borderTop: "1px solid #ccc",
                    }}
                  >
                    Total Cant
                  </TableCell>
                );
              }
              return (
                <TableCell
                  key={col.id}
                  sx={{ ...cellSx, py: 0.5, borderTop: "1px solid #ccc" }}
                />
              );
            })}
          </TableRow>
        </TableBody>
      </Table>

      <Box sx={{ borderTop: "1px dashed", borderColor: "#999", pt: 1, color: BLACK, fontWeight: 700 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>{formatMoneyReceipt(receipt.subtotal)}</span>
        </Box>
        {receipt.iva > 0 ? (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>IVA</span>
            <span>{formatMoneyReceipt(receipt.iva)}</span>
          </Box>
        ) : null}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            fontSize: layout.total,
            mt: 0.5,
          }}
        >
          <span>TOTAL</span>
          <span>{formatMoneyReceipt(receipt.total)}</span>
        </Box>
      </Box>

      {showNotes && receipt.notes ? (
        <Typography variant="body2" display="block" sx={{ mt: 1, color: BLACK, fontWeight: 700 }}>
          {receipt.notes}
        </Typography>
      ) : null}
      <Typography
        variant="body2"
        display="block"
        textAlign="center"
        sx={{ mt: 2, color: BLACK, fontWeight: 800, fontSize: layout.footer }}
      >
        Gracias por su compra
      </Typography>
      <ReceiptSignatures isTicket={isTicket} signatureSize={layout.signature} />
    </Box>
  );
}
