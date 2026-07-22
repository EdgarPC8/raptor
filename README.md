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

El **comando** fija si hay suscripciones/entitlement. No hace falta editar
`.env` a mano para eso.

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

# Store LIBRE → http://localhost:5174/store/
npm run dev:store

# Store CON entitlement → http://localhost:5174/store/ (API local :3003)
npm run store

# Raptor invitado → http://localhost:5175/raptor/ (sin backend)
npm run raptor
```

### ¿Cuál usar en desarrollo?

| Comando | Suscripciones | Para qué |
|---------|---------------|----------|
| `npm run dev:eddeli` / `npm run dev` | OFF — acceso total a módulos | Programar día a día |
| `npm run eddeli` | ON — lee entitlement del backend | Probar planes, mantenimiento, oculto, etc. |
| `npm run dev:store` | OFF | Programar Store sin límites |
| `npm run store` | ON | Probar entitlement en Store |
| `npm run raptor` | N/A (shell invitado) | Demo sin backend |

- `dev:eddeli` / `dev:store` fuerzan `VITE_SUBSCRIPTIONS_ENABLED=false`.
- `eddeli` / `store` fuerzan `VITE_SUBSCRIPTIONS_ENABLED=true`.

## Builds (producción)

`build-app.mjs` aplica un **perfil por comando** (no hace falta tocar `.env`):

| Comando | Qué hace |
|---------|----------|
| `npm run build:eddeli` (o `build` / `build-eddeli`) | Suscripciones **ON** + API **production** → genera `dist/` y copia al repo EdDeli (`index.html` + `assets/`) |
| `npm run build:store` (o `build-store`) | Igual para Store → copia al destino de deploy de Store |
| `npm run build:raptor` (o `build-raptor`) | Shell invitado (sin backend / suscripciones OFF) → `frontend/dist-raptor/` (no copia) |
| `npm run build:app -- <mode>` | Build genérico (ej. `scheduly` con `.env.scheduly`) |

```bash
cd raptor/frontend

# Build EdDeli de producción (este es el que se sube al servidor)
npm run build:eddeli
# alias: npm run build  /  npm run build-eddeli

# Build Store de producción
npm run build:store

# Build Raptor (modo invitado, sin deploy automático)
npm run build:raptor

# Otra app con .env.<mode>
npm run build:app -- <mode>
```

No existe `build:eddeli:production`: **`build:eddeli` ya es el build de producción**.

Tras el build de EdDeli, commit/push en el repo **eddeli** (`index.html` + `assets/`) y en el servidor:

```bash
cd /ruta/a/eddeli
git pull
# si falla por index.html local sucio:
# git checkout -- index.html && git pull
```

Las variables `VITE_*` se integran en el bundle en la compilación. El servidor
web solo sirve `index.html` + `assets/`; el `.env` del frontend no se usa en
runtime. La clave del gestor (`gc_…`) va en el **backend** (`.env` del API), no
en el build del frontend.
