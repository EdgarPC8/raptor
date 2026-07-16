/** @param {string} path */
export function normalizeBasePath(path) {
  const raw = String(path || "/").trim();
  if (!raw.startsWith("/")) return `/${raw.endsWith("/") ? raw : `${raw}/`}`;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/** Genera .htaccess SPA según VITE_BASE_PATH del modo. */
export function generateHtaccess(basePath) {
  const rewriteBase = normalizeBasePath(basePath);

  return `# SPA — generado en build desde VITE_BASE_PATH (${rewriteBase})
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ${rewriteBase}

  RewriteRule ^backend/ - [L]
  RewriteRule ^frontend/ - [L]

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType application/wasm .wasm
</IfModule>
`;
}
