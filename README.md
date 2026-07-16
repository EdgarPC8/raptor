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
# EdDeli → http://localhost:5173/eddeli/ (API local :3001)
npm run eddeli

# Store → http://localhost:5174/store/ (API local :3003)
npm run store

# Raptor invitado → http://localhost:5175/raptor/ (sin backend)
npm run raptor

# Atajo por defecto: EdDeli
npm run dev
```

## Builds

```bash
# Build local de EdDeli; genera frontend/dist/ y copia al destino de deploy
npm run build

# Build genérico por modo (ej. scheduly con .env.scheduly)
npm run build:app -- <mode>

# Build EdDeli y copia el resultado al destino de deploy
npm run build-eddeli

# Build Store y copia el resultado al destino de deploy
npm run build-store

# Build Raptor; genera frontend/dist-raptor/ (sin copiar)
npm run build-raptor
```

## Builds de producción

Estos comandos apuntan a
`https://aplicaciones.marianosamaniego.edu.ec` y copian el resultado a la
carpeta de cada despliegue:

```bash
# API: https://aplicaciones.marianosamaniego.edu.ec/eddeliapi
npm run build-eddeli-production

# API: https://aplicaciones.marianosamaniego.edu.ec/storeapi
npm run build-store-production
```

Las variables `VITE_*` se integran en el bundle durante la compilación. El
servidor web solo necesita el `index.html` y la carpeta `assets/` resultantes;
el `.env` del frontend no se usa en tiempo de ejecución.
