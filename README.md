# Raptor

Frontend compartido para Raptor, EdDeli y Store.

## Instalación

```bash
cd raptor/frontend
npm install
```

Los entornos están configurados en `.env.raptor`, `.env.eddeli` y
`.env.store`.

App nueva: copiá `.env.example` → `.env.<mode>` y `npm run build:app -- <mode>`.

## Desarrollo

```bash
cd raptor/frontend

# EdDeli LIBRE (recomendado para programar) → http://localhost:5173/eddeli/
# Sin límites de módulos/permisos del gestor. Necesitas backend EdDeli (:3001).
npm run dev:eddeli
# atajo:
npm run dev

# EdDeli CON entitlement (como producción) → http://localhost:5173/eddeli/
# Respeta módulos/estados empujados por el gestor. Backend EdDeli (:3001).
npm run eddeli

# Store → http://localhost:5174/store/ (API local :3003)
npm run store

# Raptor invitado → http://localhost:5175/raptor/ (sin backend)
npm run raptor
```

### ¿Cuál usar?

| Comando | ¿Gestor / permisos? | Para qué |
|---------|---------------------|----------|
| `npm run dev:eddeli` / `npm run dev` | No: acceso total a módulos | Programar día a día |
| `npm run eddeli` | Sí: lee entitlement del backend | Probar planes, mantenimiento, oculto, etc. |

`dev:eddeli` fuerza `VITE_SUBSCRIPTIONS_ENABLED=false`.  
`eddeli` usa lo de `.env.eddeli` (`VITE_SUBSCRIPTIONS_ENABLED=true`).

## Builds

Sin `VITE_API_MODE` en `.env.eddeli` / `.env.store`, el build usa
`production` automáticamente y apunta a `VITE_API_ORIGIN` (p. ej.
`https://aplicaciones.marianosamaniego.edu.ec/eddeliapi`). No hace falta un
comando de build aparte.

```bash
# Build EdDeli → frontend/dist/ + copia al destino de deploy
npm run build
# alias: npm run build-eddeli / npm run build:eddeli

# Build genérico por modo (ej. scheduly con .env.scheduly)
npm run build:app -- <mode>

# Build Store y copia al destino de deploy
npm run build-store

# Build Raptor; genera frontend/dist-raptor/ (sin copiar, modo invitado)
npm run build-raptor
```

Las variables `VITE_*` se integran en el bundle durante la compilación. El
servidor web solo necesita el `index.html` y la carpeta `assets/` resultantes;
el `.env` del frontend no se usa en tiempo de ejecución.
