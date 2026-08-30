/**
 * Renderiza el documento a un contexto 2D (preview / gotero / export).
 */
import { resolveTemplate } from "./bind/resolveTemplate";
import { drawImageWithCrop } from "./imageCrop.js";
import { editorImageUrl } from "./editorImageUpload.js";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const url =
      src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")
        ? src
        : editorImageUrl(src);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });

const roundRectPath = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

const wrapLine = (ctx, str, w, wrap) => {
  if (!wrap || w <= 0) return str.split("\n");
  const lines = [];
  for (const para of str.split("\n")) {
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const m = ctx.measureText(test);
      if (m.width <= w) {
        current = test;
      } else {
        if (current) lines.push(current);
        if (ctx.measureText(word).width <= w) {
          current = word;
        } else {
          for (const c of word) {
            const t = current + c;
            if (ctx.measureText(t).width > w && current) {
              lines.push(current);
              current = c;
            } else current = t;
          }
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [str];
};

export async function renderDocToContext(ctx, doc, docData, options = {}) {
  const { background = "#ffffff" } = options;
  const W = doc.canvas.width;
  const H = doc.canvas.height;

  if (typeof document?.fonts?.ready === "object") {
    await document.fonts.ready;
  }

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const resolvedDoc = resolveTemplate(doc, docData || doc.data || {});
  const gmap = new Map((resolvedDoc.groups || []).map((g) => [g.id, g]));

  const visibleLayers = [...(resolvedDoc.layers || [])]
    .filter((l) => l.visible !== false)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const layer of visibleLayers) {
    const g = gmap.get(layer.groupId) || { x: 0, y: 0 };
    const x = (g.x || 0) + (layer.x || 0);
    const y = (g.y || 0) + (layer.y || 0);
    const w = layer.w || 0;
    const h = layer.h || 0;

    if (layer.type === "shape") {
      const fill = layer.props?.fill || "rgba(0,0,0,0.35)";
      const r = layer.props?.borderRadius || 0;
      ctx.save();
      ctx.fillStyle = fill;
      if (r > 0) {
        roundRectPath(ctx, x, y, w, h, r);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    if (layer.type === "image") {
      const src = layer.props?.src;
      if (!src) continue;
      try {
        const im = await loadImage(src);
        drawImageWithCrop(
          ctx,
          im,
          x,
          y,
          w,
          h,
          layer.props?.fit || "cover",
          layer.props?.borderRadius || 0,
          layer.props?.cropNorm
        );
      } catch {
        /* ignore */
      }
    }

    if (layer.type === "text") {
      const rawText = String(layer.props?.text ?? "");
      const fontSize = Number(layer.props?.fontSize || 32);
      const fontWeight = layer.props?.fontWeight || 700;
      const fontStyle = layer.props?.fontStyle || "normal";
      const fontFamily = layer.props?.fontFamily || "Inter, system-ui, Arial";
      const color = layer.props?.color || "#fff";
      const align = layer.props?.align || "left";
      const verticalAlign = layer.props?.verticalAlign || "top";
      const stroke = layer.props?.stroke;
      const strokeWidth = Number(layer.props?.strokeWidth || 0);
      const shadowBlur = Number(layer.props?.shadowBlur || 0);
      const shadowOffsetX = Number(layer.props?.shadowOffsetX || 0);
      const shadowOffsetY = Number(layer.props?.shadowOffsetY || 0);
      const shadowColor = layer.props?.shadowColor || "transparent";
      const lineHeight = Number(layer.props?.lineHeight || 1.1);
      const wrap = layer.props?.wrap !== false;

      ctx.save();
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = align;

      let tx = x;
      if (align === "center") tx = x + w / 2;
      if (align === "right") tx = x + w;

      const lines = wrapLine(ctx, rawText, w, wrap);
      const totalHeight = (lines.length - 1) * fontSize * lineHeight + fontSize;
      let ty =
        verticalAlign === "top"
          ? y + fontSize / 2
          : verticalAlign === "bottom"
            ? y + h - totalHeight + fontSize / 2
            : y + h / 2 - totalHeight / 2 + fontSize / 2;

      if (shadowBlur > 0) {
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.shadowColor = shadowColor;
      }

      if (strokeWidth > 0 && stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
      }

      lines.forEach((line, i) => {
        const lineTy = i === 0 ? ty : ty + i * fontSize * lineHeight;
        if (strokeWidth > 0 && stroke) ctx.strokeText(line, tx, lineTy);
        ctx.fillStyle = color;
        ctx.fillText(line, tx, lineTy);
      });

      ctx.restore();
    }
  }
}

export async function sampleColorAtDocPoint(doc, docData, docX, docY) {
  const W = doc?.canvas?.width || 0;
  const H = doc?.canvas?.height || 0;
  if (!W || !H) return "#000000";

  const x = Math.max(0, Math.min(W - 1, Math.floor(docX)));
  const y = Math.max(0, Math.min(H - 1, Math.floor(docY)));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  await renderDocToContext(ctx, doc, docData, { background: "#ffffff" });

  const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
  if (a >= 255) {
    const rr = r.toString(16).padStart(2, "0");
    const gg = g.toString(16).padStart(2, "0");
    const bb = b.toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`.toUpperCase();
  }
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}
