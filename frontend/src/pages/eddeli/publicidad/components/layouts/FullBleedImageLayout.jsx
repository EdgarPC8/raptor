/**
 * Imagen a pantalla completa (plantillas de diseño / menús exportados).
 * Sin marco ni chrome — pensado para TV y kiosco.
 */
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";

export default function FullBleedImageLayout({ slide }) {
  const url = resolveMediaUrl(slide);
  const [imgError, setImgError] = useState(false);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "#111",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {url && !imgError ? (
        <Box
          component="img"
          src={url}
          alt={slide?.title || ""}
          onError={() => setImgError(true)}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <Box sx={{ px: 4, textAlign: "center", color: "#fff", maxWidth: 640 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
            {slide?.title || "Sin imagen"}
          </Typography>
          <Typography sx={{ opacity: 0.8, fontSize: 18 }}>
            {!url
              ? "Esta pieza no tiene mediaPath. En la campaña: quitá la plantilla, volvé a agregarla y guardá."
              : "No se pudo cargar la imagen (404 o ruta incorrecta). Revisá que el PNG exista en el servidor."}
          </Typography>
          {slide?.mediaPath ? (
            <Typography sx={{ mt: 2, opacity: 0.5, fontSize: 13, wordBreak: "break-all" }}>
              {slide.mediaPath}
            </Typography>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
