/**
 * Modal de reporte de deuda del cliente (cuenta completa o un grupo).
 * Vista Resumen o Acta formal; A4 / 80 mm / 55 mm; PNG, PDF, TXT, imprimir.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  TextField,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import PrintIcon from "@mui/icons-material/Print";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  money,
  moneyUnitPrice,
  safeFileName,
  todayISO,
  toNum,
  getBillableQty,
  downloadTextFile,
} from "./helpers.js";
import { buildDetailedReportTxt } from "./reportBuilders.js";
import {
  downloadReceiptAsPng,
  downloadReceiptAsPdf,
  copyReceiptAsPng,
} from "../../../../utils/saleReceiptExport.js";
import { printHtmlDocument } from "../../../../utils/printHtmlDocument.js";
import { amountToSpanishDollars } from "../../../../utils/amountToSpanishWords.js";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { buildCustomerDisplayName } from "../../../../utils/customerUtils.js";

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MONTHS_UPPER = MONTHS.map((m) => m.toUpperCase());

/** Ciudad por defecto del acta (EdDeli / Cariamanga). */
const ACTA_CITY = "Cariamanga";
const ACTA_CANTON = "Calvas";

function parseYmd(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  if (dmy) return { y: Number(dmy[3]), m: Number(dmy[2]), d: Number(dmy[1]) };
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

/** "2026-05-24" → "Lunes, 24 de Mayo de 2026" */
function formatDateLong(value) {
  const p = parseYmd(value);
  if (!p) return value ? String(value) : "—";
  const dt = new Date(p.y, p.m - 1, p.d);
  if (Number.isNaN(dt.getTime())) return String(value);
  return `${WEEKDAYS[dt.getDay()]}, ${p.d} de ${MONTHS[p.m - 1]} de ${p.y}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** "a los 04 días del mes de agosto del año 2026" */
function formalDaysPhrase(value) {
  const p = parseYmd(value) || parseYmd(todayISO());
  const monthName = MONTHS[p.m - 1].toLowerCase();
  return `a los ${pad2(p.d)} días del mes de ${monthName} del año ${p.y}`;
}

/** "Cariamanga, 04 de agosto del 2026" */
function formalPlaceDate(value, city = ACTA_CITY) {
  const p = parseYmd(value) || parseYmd(todayISO());
  const monthName = MONTHS[p.m - 1].toLowerCase();
  return `${city}, ${pad2(p.d)} de ${monthName} del ${p.y}`;
}

function dominantPeriod(items) {
  const counts = new Map();
  for (const it of items || []) {
    const p = parseYmd(it.orderDate);
    if (!p) continue;
    const key = `${p.y}-${pad2(p.m)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n >= bestN) {
      best = k;
      bestN = n;
    }
  }
  if (!best) {
    const now = parseYmd(todayISO());
    return { year: now.y, month: now.m, label: MONTHS_UPPER[now.m - 1] };
  }
  const [y, m] = best.split("-").map(Number);
  return { year: y, month: m, label: MONTHS_UPPER[m - 1] };
}

function shortSignatureName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0].toUpperCase();
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`.toUpperCase();
  if (parts.length === 3) {
    return `${parts[0]} ${parts[1][0]}. ${parts[2]}`.toUpperCase();
  }
  // 4+ → NOMBRE I. APELLIDO I. (ej. EDGAR P. TORRES C.)
  return `${parts[0]} ${parts[1][0]}. ${parts[2]} ${parts[3][0]}.`.toUpperCase();
}

function getFontConfig(format) {
  if (format === "ticket55") return { title: 13, sub: 11, cell: 10, total: 13, pad: "2px 1px" };
  if (format === "ticket80") return { title: 15, sub: 12, cell: 11, total: 14, pad: "3px 2px" };
  return { title: 20, sub: 14, cell: 12, total: 16, pad: "4px 6px" };
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object} props.customer
 * @param {array} props.items
 * @param {{ id?: number, concept?: string } | null} [props.group]
 * @param {array} [props.payments]
 * @param {(msg: string) => void} [props.onError]
 */
export default function DebtReportDialog({
  open,
  onClose,
  customer,
  items,
  group = null,
  payments = [],
  onError,
}) {
  const captureRef = useRef(null);
  const { activeApp } = useAppSettings();
  const { user: accountUser } = useAuth();
  const isProgrammer = accountUser?.loginRol === "Programador";
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState("a4");
  const [viewMode, setViewMode] = useState("resumen"); // resumen | acta
  const [copied, setCopied] = useState(false);
  /** Monto editable en constancia (solo Programador). */
  const [amountInput, setAmountInput] = useState("");
  /** Fecha del documento (solo Programador). */
  const [dateInput, setDateInput] = useState(() => todayISO());
  /** Espacio (px) antes de las firmas — solo Programador. */
  const [sigGapPx, setSigGapPx] = useState(80);

  const isGroup = !!group;

  useEffect(() => {
    if (open) setViewMode("resumen");
  }, [open, isGroup, customer?.id]);

  const bakeryName = activeApp?.name || "Panadería";
  const bakeryAlias = activeApp?.alias || bakeryName;
  const bakeryLogo = activeApp?.logoUrl || "";

  // Proveedor = datos de la cuenta logueada (nombre completo + cédula)
  const providerFullName = buildCustomerDisplayName(accountUser);
  const providerName =
    providerFullName && providerFullName !== "—"
      ? providerFullName
      : bakeryAlias;
  const providerCi = String(accountUser?.ci || "").trim();

  const report = useMemo(() => {
    const source = isGroup
      ? items || []
      : (items || []).filter((it) => !it.paidAt);

    const byProduct = new Map();
    const byDate = new Map();
    let total = 0;

    for (const it of source) {
      const qty = getBillableQty(it);
      if (qty <= 0) continue;
      const price = toNum(it.price, 0);
      const line = Number((qty * price).toFixed(2));
      total = Number((total + line).toFixed(2));

      const pKey = String(it.product || "(sin nombre)");
      if (!byProduct.has(pKey)) byProduct.set(pKey, { product: pKey, qty: 0, total: 0 });
      const agg = byProduct.get(pKey);
      agg.qty = Number((agg.qty + qty).toFixed(2));
      agg.total = Number((agg.total + line).toFixed(2));

      const dKey = String(it.orderDate || "—");
      if (!byDate.has(dKey)) byDate.set(dKey, []);
      byDate.get(dKey).push({ product: pKey, qty, price, line });
    }

    const completedPays = (payments || []).filter(
      (p) => String(p.status || "completed").toLowerCase() === "completed",
    );
    const paid = Number(
      completedPays.reduce((acc, p) => acc + toNum(p.amount, 0), 0).toFixed(2),
    );
    const remaining = isGroup
      ? Number(Math.max(0, total - paid).toFixed(2))
      : total;

    const payRows = completedPays
      .slice()
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .map((p) => ({
        date: p.date || p.paidAt || "—",
        amount: toNum(p.amount, 0),
        note: p.note || p.concept || "",
        method: p.method || p.paymentMethod || "",
      }));

    const products = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
    const dates = Array.from(byDate.entries()).sort((a, b) =>
      String(a[0]).localeCompare(String(b[0])),
    );

    // Acta = dinero entregado: abonos del grupo, o saldo/total de la cuenta
    const delivered =
      isGroup && paid > 0 ? paid : isGroup ? total : remaining;

    return {
      products,
      dates,
      total,
      paid,
      remaining,
      payRows,
      source,
      delivered,
      period: dominantPeriod(source),
    };
  }, [items, payments, isGroup]);

  // Al abrir / recalcular, cargar el monto y fecha sugeridos
  useEffect(() => {
    setAmountInput(Number(report.delivered || 0).toFixed(2));
    setDateInput(todayISO());
  }, [report.delivered, open, customer?.id, group?.id]);

  const effectiveAmount = useMemo(() => {
    const raw = String(amountInput ?? "").trim().replace(",", ".");
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Number(n.toFixed(2));
    return Number(report.delivered || 0);
  }, [amountInput, report.delivered]);

  const effectiveDate = useMemo(() => {
    const raw = String(dateInput || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return todayISO();
  }, [dateInput]);

  const heading =
    viewMode === "acta"
      ? "Constancia de recepción de valores"
      : isGroup
        ? `Resumen del grupo${group?.id != null ? ` #${group.id}` : ""}`
        : "Resumen de tu cuenta";
  const groupLabel = isGroup
    ? String(group?.concept || `Grupo #${group?.id || ""}`).trim()
    : "";

  const customerFullName = buildCustomerDisplayName(customer);
  const customerCi = String(customer?.cedula || "").trim();

  const resumenHtml = useMemo(() => {
    const F = getFontConfig(format);
    const BORDER = "#000";
    const ROW = "#ccc";
    const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    const sectionHeader = (label) =>
      `<div style="font-size:${F.sub}px;font-weight:800;color:#000;border-bottom:2px solid ${BORDER};padding-bottom:3px;margin:14px 0 6px">${label}</div>`;

    const productRows = report.products.length
      ? report.products
          .map(
            (p) => `<tr style="border-bottom:1px solid ${ROW}">
              <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(p.product)}</td>
              <td style="font-size:${F.cell}px;padding:${F.pad};text-align:center">${p.qty}</td>
              <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right;font-weight:700">${money(p.total)}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="font-size:${F.cell}px;padding:${F.pad};text-align:center">Sin ítems en este resumen</td></tr>`;

    const dateBlocks = report.dates.length
      ? report.dates
          .map(
            ([date, rows]) => `
            <div style="font-weight:800;font-size:${F.cell}px;color:#000;border-bottom:1px solid ${BORDER};padding:3px 0;margin-top:8px">${escapeHtml(formatDateLong(date))}</div>
            <table style="width:100%;border-collapse:collapse"><tbody>
              ${rows
                .map(
                  (r) => `<tr style="border-bottom:1px solid ${ROW}">
                    <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(r.product)}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:center">${r.qty}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right">${moneyUnitPrice(r.price)}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right;font-weight:700">${money(r.line)}</td>
                  </tr>`,
                )
                .join("")}
            </tbody></table>`,
          )
          .join("")
      : `<div style="font-size:${F.cell}px">Sin datos.</div>`;

    const paymentsBlock = isGroup
      ? `${sectionHeader("Abonos del grupo")}
        ${
          report.payRows.length
            ? `<table style="width:100%;border-collapse:collapse">
                <thead><tr style="border-bottom:2px solid ${BORDER}">
                  <th style="text-align:left;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Fecha</th>
                  <th style="text-align:left;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Nota</th>
                  <th style="text-align:right;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Monto</th>
                </tr></thead>
                <tbody>
                  ${report.payRows
                    .map(
                      (p) => `<tr style="border-bottom:1px solid ${ROW}">
                        <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(formatDateLong(p.date))}</td>
                        <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(p.note || p.method || "—")}</td>
                        <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right;font-weight:700">${money(p.amount)}</td>
                      </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>`
            : `<div style="font-size:${F.cell}px">Aún no hay abonos.</div>`
        }`
      : "";

    const totalsBlock = isGroup
      ? `<div style="margin-top:16px;border:2px solid ${BORDER};border-radius:6px;padding:10px 14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:${F.cell}px">Total del grupo</span>
            <span style="font-size:${F.cell}px;font-weight:700">${money(report.total)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:${F.cell}px">Abonado</span>
            <span style="font-size:${F.cell}px;font-weight:700">${money(report.paid)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid ${BORDER};padding-top:6px;margin-top:4px">
            <span style="font-size:${F.sub}px;font-weight:800;color:#000">Saldo pendiente</span>
            <span style="font-size:${F.total}px;font-weight:800;color:#000">${money(report.remaining)}</span>
          </div>
        </div>`
      : `<div style="margin-top:16px;border:2px solid ${BORDER};border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:${F.sub}px;font-weight:800;color:#000">Saldo pendiente</span>
          <span style="font-size:${F.total}px;font-weight:800;color:#000">${money(report.remaining)}</span>
        </div>`;

    const resumenTitle = isGroup
      ? `Resumen del grupo${group?.id != null ? ` #${group.id}` : ""}`
      : "Resumen de tu cuenta";

    return `<div style="font-family:${FONT};color:#000">
      <div style="text-align:center;font-weight:800;font-size:${F.title}px">${escapeHtml(resumenTitle)}</div>
      <div style="text-align:center;font-size:${F.cell}px;margin-top:2px;margin-bottom:12px">${escapeHtml(formatDateLong(todayISO()))}</div>

      <div style="font-size:${F.sub}px;font-weight:800;color:#000">${escapeHtml(customer?.name || "—")}</div>
      ${customer?.phone ? `<div style="font-size:${F.cell}px">Tel: ${escapeHtml(customer.phone)}</div>` : ""}
      ${
        isGroup
          ? `<div style="font-size:${F.cell}px;margin-top:4px"><b>Grupo:</b> ${escapeHtml(groupLabel)}</div>`
          : ""
      }

      ${sectionHeader("Resumen por producto")}
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:2px solid ${BORDER}">
          <th style="text-align:left;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Producto</th>
          <th style="text-align:center;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Cant</th>
          <th style="text-align:right;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Total</th>
        </tr></thead>
        <tbody>${productRows}</tbody>
      </table>

      ${sectionHeader("Detalle por fecha")}
      ${dateBlocks}

      ${paymentsBlock}

      ${totalsBlock}

      <div style="text-align:center;font-size:${F.cell}px;margin-top:16px;line-height:1.5">
        Gracias por su preferencia y confianza.
      </div>
    </div>`;
  }, [report, format, customer, isGroup, groupLabel, group?.id]);

  const actaHtml = useMemo(() => {
    const F = getFontConfig(format === "a4" ? "a4" : format);
    const FONT = "'Times New Roman', Times, Georgia, serif";
    const amountNum = Number(effectiveAmount || 0).toFixed(2);
    const amountWords = amountToSpanishDollars(effectiveAmount);
    const monthLabel = report.period.label;
    const yearLabel = report.period.year;
    const today = effectiveDate;
    const clientName = String(customerFullName || customer?.name || "—");
    const conceptExtra =
      isGroup && groupLabel
        ? `, correspondiente al grupo de cobro «${groupLabel}»`
        : "";

    const logoBlock = bakeryLogo
      ? `<div style="text-align:center;margin-bottom:16px">
           <img src="${escapeHtml(bakeryLogo)}" alt="Logo" style="max-height:72px;max-width:120px;object-fit:contain" />
         </div>`
      : "";

    const docRef = `CV-${today.replace(/-/g, "")}-${customer?.id || "0"}${
      isGroup && group?.id != null ? `-G${group.id}` : ""
    }`;

    const body = `En la ciudad de ${ACTA_CITY} del Cantón ${ACTA_CANTON}, ${formalDaysPhrase(today)}, yo, <b>${escapeHtml(providerName)}</b>${
      providerCi ? `, portador(a) de la cédula de ciudadanía N.º <b>${escapeHtml(providerCi)}</b>` : ""
    }, en representación de <b>${escapeHtml(bakeryAlias)}</b> (${escapeHtml(bakeryName)}), por medio de la presente <b>CONSTANCIA DE RECEPCIÓN DE VALORES</b> declaro haber <b>recibido</b> de el/la Sr(a). <b>${escapeHtml(clientName)}</b>${
      customerCi ? `, portador(a) de la cédula de ciudadanía N.º <b>${escapeHtml(customerCi)}</b>` : ""
    }, la cantidad de <b>$${escapeHtml(amountNum)}</b> (<b>${escapeHtml(amountWords)}</b>), por concepto de pago / abono por consumo de pan y productos de panadería correspondientes al mes de <b>${escapeHtml(monthLabel.toLowerCase())}</b> del año <b>${yearLabel}</b>${escapeHtml(conceptExtra)}.`;

    const closing = `Para constancia de lo actuado, las partes suscriben el presente documento en dos ejemplares de igual tenor, uno para el cliente y otro para el archivo del proveedor.`;

    const sigClient = shortSignatureName(clientName);
    const sigProvider = shortSignatureName(providerName);
    const gap = Math.max(0, Math.min(280, Number(sigGapPx) || 0));

    // Firmas con espacio ajustable (sin empujar a 2.ª hoja por defecto)
    return `<div style="font-family:${FONT};color:#000;line-height:1.9;box-sizing:border-box;padding:4px 8px 12px">
      ${logoBlock}
      <div style="text-align:center;font-weight:800;font-size:${F.title + 2}px;letter-spacing:1px;line-height:1.3">${escapeHtml(bakeryAlias.toUpperCase())}</div>
      <div style="text-align:center;font-size:${F.cell}px;margin-top:4px;line-height:1.45">${escapeHtml(bakeryName)}</div>
      <div style="text-align:center;font-size:${F.cell}px;margin-top:2px;margin-bottom:22px;line-height:1.45">N.º ${escapeHtml(docRef)}</div>

      <div style="text-align:center;font-weight:800;font-size:${F.sub + 2}px;margin:0 0 22px;text-transform:uppercase;letter-spacing:0.8px;line-height:1.35">
        Constancia de recepción de valores
      </div>

      <div style="text-align:justify;font-size:${F.cell + 1}px;margin-bottom:20px">${body}</div>

      <div style="text-align:center;font-weight:800;font-size:${F.sub}px;margin:18px 0 6px;text-transform:uppercase;line-height:1.5">
        Valor recibido $ ${escapeHtml(amountNum)}
      </div>
      <div style="text-align:center;font-size:${F.cell + 1}px;margin-bottom:20px;line-height:1.6">
        Son: <b>${escapeHtml(amountWords)}</b>
      </div>

      <div style="text-align:justify;font-size:${F.cell + 1}px;margin-bottom:22px">${closing}</div>

      <div style="text-align:right;font-size:${F.cell + 1}px;margin-bottom:24px">${escapeHtml(formalPlaceDate(today))}</div>

      <div style="margin-top:${gap}px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="width:50%;vertical-align:top;text-align:center;padding:0 16px;line-height:1.5">
              <div style="font-weight:800;font-size:${F.cell}px">ENTREGUÉ CONFORME</div>
              <div style="font-size:${F.cell}px;margin-top:6px">EL / LA CLIENTE</div>
              <div style="height:52px"></div>
              <div style="border-top:1px solid #000;margin:0 16px;padding-top:8px;font-size:${F.cell}px;font-weight:700">${escapeHtml(sigClient)}</div>
              ${customerCi ? `<div style="font-size:${F.cell}px;margin-top:4px">CI. ${escapeHtml(customerCi)}</div>` : ""}
            </td>
            <td style="width:50%;vertical-align:top;text-align:center;padding:0 16px;line-height:1.5">
              <div style="font-weight:800;font-size:${F.cell}px">RECIBÍ CONFORME</div>
              <div style="font-size:${F.cell}px;margin-top:6px">EL / LA PROVEEDOR(A)<br/>${escapeHtml(bakeryAlias.toUpperCase())}</div>
              <div style="height:52px"></div>
              <div style="border-top:1px solid #000;margin:0 16px;padding-top:8px;font-size:${F.cell}px;font-weight:700">${escapeHtml(sigProvider)}</div>
              ${providerCi ? `<div style="font-size:${F.cell}px;margin-top:4px">CI. ${escapeHtml(providerCi)}</div>` : ""}
            </td>
          </tr>
        </table>
      </div>
    </div>`;
  }, [
    format,
    report,
    effectiveAmount,
    effectiveDate,
    sigGapPx,
    customer,
    customerFullName,
    customerCi,
    providerName,
    providerCi,
    bakeryAlias,
    bakeryName,
    bakeryLogo,
    isGroup,
    groupLabel,
    group?.id,
  ]);

  const bodyHtml = viewMode === "acta" ? actaHtml : resumenHtml;

  const baseName =
    viewMode === "acta"
      ? `constancia_valores_${safeFileName(customer?.name)}_${effectiveDate}`
      : isGroup
        ? `resumen_grupo_${group?.id || "x"}_${safeFileName(customer?.name)}_${todayISO()}`
        : `resumen_cuenta_${safeFileName(customer?.name)}_${todayISO()}`;

  const effectiveFormat = viewMode === "acta" ? "a4" : format;
  const previewWidth =
    viewMode === "acta"
      ? 760
      : format === "ticket55"
        ? 240
        : format === "ticket80"
          ? 320
          : 720;

  const withBusy = async (fn, errMsg) => {
    try {
      setBusy(true);
      await fn();
    } catch (err) {
      onError?.(err?.message || errMsg);
    } finally {
      setBusy(false);
    }
  };

  const handlePng = () =>
    withBusy(
      () => downloadReceiptAsPng(captureRef.current, `${baseName}.png`, effectiveFormat),
      "No se pudo generar la imagen",
    );
  const handleCopy = () =>
    withBusy(async () => {
      await copyReceiptAsPng(captureRef.current, effectiveFormat);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }, "No se pudo copiar la imagen");
  const handlePdf = () =>
    withBusy(
      () => downloadReceiptAsPdf(captureRef.current, effectiveFormat, `${baseName}.pdf`),
      "No se pudo generar el PDF",
    );
  const handlePrint = () => printHtmlDocument(bodyHtml, { format: effectiveFormat });

  const handleTxt = () => {
    if (viewMode === "acta") {
      const amountNum = Number(effectiveAmount || 0).toFixed(2);
      const amountWords = amountToSpanishDollars(effectiveAmount);
      const clientName = String(customerFullName || customer?.name || "—");
      const conceptExtra =
        isGroup && groupLabel
          ? `, correspondiente al grupo de cobro «${groupLabel}»`
          : "";
      const docRef = `CV-${effectiveDate.replace(/-/g, "")}-${customer?.id || "0"}${
        isGroup && group?.id != null ? `-G${group.id}` : ""
      }`;
      const txt = [
        bakeryAlias.toUpperCase(),
        bakeryName,
        `N.º ${docRef}`,
        "",
        "CONSTANCIA DE RECEPCIÓN DE VALORES",
        "",
        `En la ciudad de ${ACTA_CITY} del Cantón ${ACTA_CANTON}, ${formalDaysPhrase(effectiveDate)}, yo, ${providerName}${
          providerCi ? `, portador(a) de la cédula de ciudadanía N.º ${providerCi}` : ""
        }, en representación de ${bakeryAlias} (${bakeryName}), por medio de la presente CONSTANCIA DE RECEPCIÓN DE VALORES declaro haber recibido de el/la Sr(a). ${clientName}${
          customerCi ? `, portador(a) de la cédula de ciudadanía N.º ${customerCi}` : ""
        }, la cantidad de $${amountNum} (${amountWords}), por concepto de pago / abono por consumo de pan y productos de panadería correspondientes al mes de ${report.period.label.toLowerCase()} del año ${report.period.year}${conceptExtra}.`,
        "",
        `VALOR RECIBIDO $ ${amountNum}`,
        `Son: ${amountWords}`,
        "",
        "Para constancia de lo actuado, las partes suscriben el presente documento en dos ejemplares de igual tenor, uno para el cliente y otro para el archivo del proveedor.",
        "",
        formalPlaceDate(effectiveDate),
        "",
        "ENTREGUÉ CONFORME — EL / LA CLIENTE",
        shortSignatureName(clientName),
        customerCi ? `CI. ${customerCi}` : "",
        "",
        `RECIBÍ CONFORME — EL / LA PROVEEDOR(A) · ${bakeryAlias.toUpperCase()}`,
        shortSignatureName(providerName),
        providerCi ? `CI. ${providerCi}` : "",
        "",
      ]
        .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
        .join("\r\n");
      downloadTextFile(`${baseName}.txt`, txt);
      return;
    }

    const title = isGroup
      ? `RESUMEN DEL GRUPO #${group?.id || ""} — ${groupLabel}`.trim()
      : "RESUMEN DE TU CUENTA";
    const { txt: baseTxt } = buildDetailedReportTxt({
      title,
      customer,
      items: report.source,
    });
    const extra = isGroup
      ? [
          "",
          "=================================",
          "ABONOS DEL GRUPO",
          "=================================",
          ...(report.payRows.length
            ? report.payRows.map(
                (p) =>
                  `- ${formatDateLong(p.date)} | ${money(p.amount)}${p.note ? ` | ${p.note}` : ""}`,
              )
            : ["(Sin abonos)"]),
          "",
          `Total del grupo: ${money(report.total)}`,
          `Abonado: ${money(report.paid)}`,
          `Saldo pendiente: ${money(report.remaining)}`,
          "",
        ].join("\n")
      : "";
    downloadTextFile(`${baseName}.txt`, `${baseTxt}${extra}`);
  };

  const openActa = () => {
    setViewMode("acta");
    setFormat("a4");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <DialogTitle sx={{ pb: 1 }}>{heading}</DialogTitle>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <DialogContent sx={{ bgcolor: "grey.200" }}>
        <Paper
          elevation={2}
          sx={{
            mb: 2,
            px: 1.5,
            py: 1.25,
            bgcolor: "#ffffff",
            color: "#111111",
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "rgba(0,0,0,0.18)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="flex-start"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, v) => {
                if (!v) return;
                setViewMode(v);
                if (v === "acta") setFormat("a4");
              }}
              sx={{
                bgcolor: "#fff",
                "& .MuiToggleButton-root": {
                  color: "#1a1a1a",
                  borderColor: "rgba(0,0,0,0.35)",
                  px: 1.5,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "#fff",
                    borderColor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                },
              }}
            >
              <ToggleButton value="resumen">Resumen</ToggleButton>
              <ToggleButton value="acta">Constancia</ToggleButton>
            </ToggleButtonGroup>
            {viewMode === "resumen" ? (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={format}
                onChange={(_, v) => v && setFormat(v)}
                sx={{
                  bgcolor: "#fff",
                  "& .MuiToggleButton-root": {
                    color: "#1a1a1a",
                    borderColor: "rgba(0,0,0,0.35)",
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "#fff",
                      borderColor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" },
                    },
                  },
                }}
              >
                <ToggleButton value="a4">A4</ToggleButton>
                <ToggleButton value="ticket80">80 mm</ToggleButton>
                <ToggleButton value="ticket55">55 mm</ToggleButton>
              </ToggleButtonGroup>
            ) : null}
            {viewMode === "acta" && isProgrammer ? (
              <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  type="number"
                  label="Monto ($)"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                  sx={{
                    width: 150,
                    bgcolor: "#fff",
                    "& .MuiInputBase-input": { color: "#111", fontWeight: 600 },
                    "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.75)" },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.45)",
                      borderWidth: 1.5,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Fecha"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: 160,
                    bgcolor: "#fff",
                    "& .MuiInputBase-input": { color: "#111", fontWeight: 600 },
                    "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.75)" },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.45)",
                      borderWidth: 1.5,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Bajar firmas"
                  value={sigGapPx}
                  onChange={(e) => setSigGapPx(e.target.value)}
                  inputProps={{ min: 0, max: 280, step: 10 }}
                  helperText="px (0–280)"
                  FormHelperTextProps={{ sx: { m: 0, mt: 0.5, color: "rgba(0,0,0,0.65)" } }}
                  sx={{
                    width: 140,
                    bgcolor: "#fff",
                    "& .MuiInputBase-input": { color: "#111", fontWeight: 600 },
                    "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.75)" },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.45)",
                      borderWidth: 1.5,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                />
              </Stack>
            ) : null}
          </Stack>
        </Paper>

        <Box
          ref={captureRef}
          sx={{
            bgcolor: "#fff",
            color: "#000",
            mx: "auto",
            width: "100%",
            maxWidth: previewWidth,
            p: effectiveFormat === "a4" ? 3 : 1.5,
            borderRadius: 1,
            boxShadow: 1,
            boxSizing: "border-box",
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            color={copied ? "success" : "primary"}
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={handleCopy}
            disabled={busy}
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </Button>
          <Button
            variant={viewMode === "acta" ? "contained" : "outlined"}
            startIcon={<ReceiptLongIcon />}
            onClick={openActa}
            disabled={busy}
          >
            Constancia
          </Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={handleTxt} disabled={busy}>
            TXT
          </Button>
          <Button variant="outlined" startIcon={<ImageIcon />} onClick={handlePng} disabled={busy}>
            PNG
          </Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handlePdf} disabled={busy}>
            PDF
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} disabled={busy}>
            Imprimir
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
