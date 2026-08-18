/**
 * Alta rápida en caja cuando el escáner no encuentra el código:
 * código (fijo) + nombre + precio. Crea un producto final y lo agrega al carrito.
 */
import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createProduct, getUnits } from "../../api/inventoryControlRequest.js";
import { normalizeProductBarcode } from "../../utils/productLookup.js";
import { mediaStoragePath } from "../../utils/mediaPaths.js";
import { toStorageMoney } from "../../utils/moneyFormat.js";

function pickDefaultUnitId(units) {
  if (!Array.isArray(units) || !units.length) return "";
  const byAbbr = units.find(
    (u) => String(u.abbreviation || "").toLowerCase() === "un",
  );
  if (byAbbr) return byAbbr.id;
  const byName = units.find((u) =>
    String(u.name || "").toLowerCase().includes("unidad"),
  );
  return (byName || units[0]).id;
}

export default function CajaScanCreateProductDialog({
  open,
  barcode,
  onClose,
  onCreated,
  toast,
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setPrice("");
    }
  }, [open, barcode]);

  const handleCreate = async () => {
    const trimmed = String(name || "").trim();
    const amt = Number(price);
    const code = normalizeProductBarcode(barcode);
    if (!trimmed) {
      void toast?.({ message: "Indicá el nombre del producto.", variant: "warning" });
      return;
    }
    if (!Number.isFinite(amt) || amt < 0) {
      void toast?.({ message: "Indicá un precio válido.", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const { data: units } = await getUnits();
      const unitId = pickDefaultUnitId(Array.isArray(units) ? units : []);
      if (!unitId) {
        void toast?.({
          message: "No hay unidades configuradas. Crealo desde Productos.",
          variant: "error",
        });
        return;
      }
      const fd = new FormData();
      fd.append("subfolder", mediaStoragePath("products"));
      fd.append("name", trimmed);
      if (code) fd.append("barcode", code);
      fd.append("type", "final");
      fd.append("unitId", String(unitId));
      fd.append("price", String(toStorageMoney(amt)));
      fd.append("distributorPrice", String(toStorageMoney(amt)));
      fd.append("supplierPrice", "0");
      fd.append("taxRate", "15");
      fd.append("stock", "0");
      fd.append("minStock", "0");
      const { data } = await createProduct(fd);
      const product = data?.id ? data : data?.product || data;
      void toast?.({
        message: `Producto “${trimmed}” creado y agregado al carrito.`,
        variant: "success",
      });
      onCreated?.(product);
      onClose?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo crear el producto.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose?.()} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.05rem" }}>
        Producto no registrado
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          El código no está en el catálogo. ¿Querés crear el producto y agregarlo al
          carrito?
        </Typography>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          <TextField
            size="small"
            label="Código de barras"
            value={barcode || ""}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            size="small"
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            size="small"
            label="Precio"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: "0.01" }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.()} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleCreate()} disabled={saving}>
          {saving ? "Creando…" : "Crear y agregar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
