/** Integración con Photopea (iframe + Live Messaging API). */

export const PHOTOPEA_ORIGIN = "https://www.photopea.com";

export function buildPhotopeaUrl(config = {}) {
  const payload = {
    environment: {
      lang: "es",
      ...(config.environment || {}),
    },
    ...config,
  };
  return `${PHOTOPEA_ORIGIN}#${encodeURIComponent(JSON.stringify(payload))}`;
}

export function scriptNewDocument(width, height, name = "Plantilla") {
  const safeName = String(name).replace(/"/g, '\\"');
  return `
    if (app.documents.length) app.activeDocument.closeWithoutSaving();
    app.documents.add(${Math.round(width) || 1920}, ${Math.round(height) || 1080}, 72, "${safeName}");
    app.activeDocument.source = "template";
  `;
}

export function scriptSetSource(sourceId) {
  const s = String(sourceId).replace(/"/g, '\\"');
  return `app.activeDocument.source = "${s}";`;
}

export function scriptSavePsdToOE() {
  return 'app.activeDocument.saveToOE("psd:true");';
}

export function scriptSavePngToOE() {
  return 'app.activeDocument.saveToOE("png");';
}

/** Detecta si un ArrayBuffer parece PSD ("8BPS"). */
export function isPsdBuffer(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const v = new Uint8Array(buffer, 0, 4);
  return v[0] === 0x38 && v[1] === 0x42 && v[2] === 0x50 && v[3] === 0x53;
}

export function isPngBuffer(buffer) {
  if (!buffer || buffer.byteLength < 8) return false;
  const v = new Uint8Array(buffer, 0, 8);
  return v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4e && v[3] === 0x47;
}
