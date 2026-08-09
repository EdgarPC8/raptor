import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import CollectionsWorkbench from "./collections/CollectionsWorkbench.jsx";

/** Hub Ventas: cuentas por cobrar / cobranzas a clientes. */
export default function SalesHubPage() {
  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: 1.5,
          background: (t) =>
            `linear-gradient(120deg, ${t.palette.primary.main}12, transparent 60%)`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
          Ventas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cobranzas a clientes: abonos a pedidos, grupos y saldos pendientes.
        </Typography>
      </Paper>
      <CollectionsWorkbench />
    </Box>
  );
}
