/**
 * Genera y sube la plantilla "Menu de Productos" (6 cards, 3×2) al backend.
 * Uso: node build-menu-de-productos.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "menu-de-productos-6.json");

const CW = 1920;
const CH = 1080;
const MARGIN_X = 56;
const GAP = 36;
const HEADER_H = 130;
const FOOTER_PAD = 48;
const COLS = 3;
const ROWS = 2;
const CARD_COUNT = COLS * ROWS;

const contentW = CW - MARGIN_X * 2;
const contentH = CH - HEADER_H - FOOTER_PAD;
const cardW = Math.floor((contentW - GAP * (COLS - 1)) / COLS);
const cardH = Math.floor((contentH - GAP * (ROWS - 1)) / ROWS);

const folders = [];
const layers = [
  {
    id: "background",
    name: "Fondo",
    groupId: "group_main",
    type: "shape",
    x: 0,
    y: 0,
    w: CW,
    h: CH,
    zIndex: 0,
    props: { fill: "#F4F7FB", borderRadius: 0 },
    bind: null,
    visible: true,
    locked: true,
  },
  {
    id: "header_bar",
    name: "Barra título",
    groupId: "group_main",
    type: "shape",
    x: 0,
    y: 0,
    w: CW,
    h: HEADER_H,
    zIndex: 1,
    props: { fill: "#1B2A4A", borderRadius: 0 },
    bind: null,
    visible: true,
    locked: false,
  },
  {
    id: "title_text",
    name: "Título (fijo)",
    groupId: "group_main",
    type: "text",
    x: 64,
    y: 28,
    w: 1200,
    h: 74,
    zIndex: 2,
    props: {
      text: "Menú de productos",
      fontFamily: "Montserrat, Inter, system-ui, Arial",
      fontSize: 52,
      fontWeight: 900,
      color: "#FFFFFF",
      align: "left",
      verticalAlign: "center",
      lineHeight: 1.1,
    },
    bind: null,
    visible: true,
    locked: false,
  },
  {
    id: "subtitle_text",
    name: "Subtítulo (fijo)",
    groupId: "group_main",
    type: "text",
    x: 1280,
    y: 40,
    w: 580,
    h: 50,
    zIndex: 3,
    props: {
      text: "Elige tu favorito",
      fontFamily: "Inter, system-ui, Arial",
      fontSize: 28,
      fontWeight: 600,
      color: "rgba(255,255,255,0.85)",
      align: "right",
      verticalAlign: "center",
      lineHeight: 1.1,
    },
    bind: null,
    visible: true,
    locked: false,
  },
];

let z = 10;

for (let i = 0; i < CARD_COUNT; i += 1) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const ox = MARGIN_X + col * (cardW + GAP);
  const oy = HEADER_H + row * (cardH + GAP);
  const slot = i;
  const n = i + 1;
  const folderId = `folder_card_${n}`;

  folders.push({
    id: folderId,
    name: `Card ${n}`,
    parentId: null,
    productSlot: slot,
  });

  const imgSize = Math.min(Math.floor(cardW * 0.72), Math.floor(cardH * 0.52));
  const imgX = ox + Math.floor((cardW - imgSize) / 2);
  const imgY = oy + 28;

  layers.push({
    id: `card_${n}_bg`,
    name: `Card ${n} fondo`,
    groupId: "group_main",
    folderId,
    type: "shape",
    x: ox,
    y: oy,
    w: cardW,
    h: cardH,
    zIndex: z++,
    props: {
      fill: "#FFFFFF",
      borderRadius: 28,
      folderId,
    },
    bind: null,
    visible: true,
    locked: false,
  });

  layers.push({
    id: `card_${n}_img`,
    name: `Card ${n} imagen`,
    groupId: "group_main",
    folderId,
    type: "image",
    x: imgX,
    y: imgY,
    w: imgSize,
    h: imgSize,
    zIndex: z++,
    props: {
      src: "",
      fit: "contain",
      borderRadius: 18,
      folderId,
      productSlot: slot,
    },
    bind: {
      srcFrom: "imageUrl",
      fallbackSrc: "",
      productSlot: slot,
    },
    visible: true,
    locked: false,
  });

  layers.push({
    id: `card_${n}_name`,
    name: `Card ${n} nombre`,
    groupId: "group_main",
    folderId,
    type: "text",
    x: ox + 24,
    y: imgY + imgSize + 16,
    w: cardW - 48,
    h: 64,
    zIndex: z++,
    props: {
      text: `Producto ${n}`,
      fontFamily: "Montserrat, Inter, system-ui, Arial",
      fontSize: 30,
      fontWeight: 800,
      color: "#1B2A4A",
      align: "center",
      verticalAlign: "center",
      maxLines: 2,
      lineHeight: 1.15,
      folderId,
      productSlot: slot,
    },
    bind: {
      textFrom: "product.name",
      maxLen: 40,
      productSlot: slot,
    },
    visible: true,
    locked: false,
  });

  layers.push({
    id: `card_${n}_price`,
    name: `Card ${n} precio`,
    groupId: "group_main",
    folderId,
    type: "text",
    x: ox + 24,
    y: oy + cardH - 78,
    w: cardW - 48,
    h: 54,
    zIndex: z++,
    props: {
      text: "$0.00",
      fontFamily: "Inter, system-ui, Arial",
      fontSize: 36,
      fontWeight: 900,
      color: "#E67E22",
      align: "center",
      verticalAlign: "center",
      lineHeight: 1.1,
      folderId,
      productSlot: slot,
    },
    bind: {
      textFrom: "computed.priceText",
      productSlot: slot,
    },
    visible: true,
    locked: false,
  });
}

const doc = {
  canvas: { width: CW, height: CH },
  meta: {
    name: "Menu de Productos",
    templateKind: "mixto",
    requiresProduct: true,
    backgroundMode: "color",
    folders,
  },
  folders,
  groups: [{ id: "group_main", x: 0, y: 0, visible: true, locked: false }],
  layers,
  data: {},
};

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2), "utf8");
console.log("Escrito:", OUT);
console.log(`Cards: ${CARD_COUNT} · card ${cardW}×${cardH}`);

const API = process.env.API_URL || "http://127.0.0.1:3001/eddeliapi";
const TEMPLATE_ID = process.env.TEMPLATE_ID || "3";
const JWT_SECRET =
  process.env.JWT_SECRET || "cambiar-por-secreto-largo-en-produccion";

const token = jwt.sign(
  { accountId: 1, id: 1 },
  JWT_SECRET,
  { algorithm: "HS256", expiresIn: "1h" }
);

const res = await fetch(`${API}/editor/templates/${TEMPLATE_ID}/doc`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ doc }),
});

const body = await res.json().catch(() => ({}));
console.log("HTTP", res.status, body);
if (!res.ok) process.exit(1);
console.log("Plantilla #", TEMPLATE_ID, "actualizada.");
