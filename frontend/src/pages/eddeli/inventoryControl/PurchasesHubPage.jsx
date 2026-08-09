import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import SupplierPayablesWorkbench from "./collections/SupplierPayablesWorkbench.jsx";

/** Hub Compras: cuentas por pagar a proveedores. */
export default function PurchasesHubPage() {
  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: 1.5,
          background: (t) =>
            `linear-gradient(120deg, ${t.palette.error.main}12, transparent 60%)`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
          Compras
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cuentas por pagar a proveedores: abonos a pedidos de compra.
        </Typography>
      </Paper>
      <SupplierPayablesWorkbench />
    </Box>
  );
}
