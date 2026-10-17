import { CONTENT_TYPES } from "../constants.js";
import { resolveMediaUrl } from "./mediaUrl.js";

function collectImageUrls(playlist = []) {
  const urls = [];
  for (const slide of playlist) {
    if (!slide) continue;
    if (
      slide.contentType === CONTENT_TYPES.VIDEO ||
      slide.contentType === CONTENT_TYPES.TEXT
    ) {
      continue;
    }
    if (slide.contentType === CONTENT_TYPES.MENU) {
      for (const item of slide.menuItems || []) {
        if (!item?.mediaPath) continue;
        const url = resolveMediaUrl({
          contentType: CONTENT_TYPES.IMAGE,
          mediaPath: item.mediaPath,
        });
        if (url) urls.push(url);
      }
      continue;
    }
    const url = resolveMediaUrl(slide);
    if (url) urls.push(url);
  }
  return [...new Set(urls)];
}

function loadImage(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(false);
      return;
    }
    const img = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const t = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      finish(true);
    };
    img.onerror = () => {
      clearTimeout(t);
      finish(false);
    };
    img.src = url;
  });
}

/**
 * Precarga imágenes. onProgress(ratio 0..1) se llama al avanzar.
 */
export async function preloadPlaylistMedia(
  playlist = [],
  { maxImages = 6, onProgress } = {},
) {
  const urls = collectImageUrls(playlist).slice(0, maxImages);
  const report = (ratio) => {
    if (typeof onProgress === "function") {
      onProgress(Math.min(1, Math.max(0, ratio)));
    }
  };

  if (!urls.length) {
    report(1);
    return { ready: true, loaded: 0, total: 0 };
  }

  report(0);
  let done = 0;
  const results = await Promise.all(
    urls.map(async (u) => {
      const ok = await loadImage(u);
      done += 1;
      report(done / urls.length);
      return ok;
    }),
  );
  report(1);
  return {
    ready: true,
    loaded: results.filter(Boolean).length,
    total: urls.length,
  };
}
