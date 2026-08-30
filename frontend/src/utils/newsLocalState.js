/** Estado local del periódico / badge de noticias (navegador). */

const PAUSE_KEY = "raptor.news.autoplayPaused";
const SEEN_KEY = "raptor.news.seenIds";

export function getNewsAutoplayPaused() {
  try {
    return localStorage.getItem(PAUSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNewsAutoplayPaused(paused) {
  try {
    localStorage.setItem(PAUSE_KEY, paused ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function newsItemKey(item) {
  const id = item?.gestorNewsId ?? item?.id;
  return id != null ? String(id) : null;
}

export function getSeenNewsIds() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

/** Marca el lote actual como visto (limpia el badge). */
export function markNewsAsSeen(items) {
  try {
    const ids = (Array.isArray(items) ? items : [])
      .map(newsItemKey)
      .filter(Boolean);
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Cantidad de noticias aún no vistas (badge rojo). */
export function countUnseenNews(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return 0;
  const seen = getSeenNewsIds();
  if (seen.size === 0) {
    // Primera vez: todas cuentan como nuevas.
    return list.length;
  }
  let n = 0;
  for (const item of list) {
    const key = newsItemKey(item);
    if (key && !seen.has(key)) n += 1;
  }
  return n;
}
