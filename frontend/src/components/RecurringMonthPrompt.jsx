import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import SimpleDialog from "./Dialogs/SimpleDialog.jsx";
import { generateRecurringOccurrencesRequest } from "../api/financeRequest.js";

const PROMPT_ROLES = ["Administrador", "Propietario"];

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date = new Date()) {
  return date.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
}

export default function RecurringMonthPrompt({ role, toast }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const storageKey = `raptor-recurring-month:${monthKey()}`;
  const label = monthLabel();

  useEffect(() => {
    if (!PROMPT_ROLES.includes(role)) return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    setOpen(true);
  }, [role, storageKey]);

  const remember = (value) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* el aviso vuelve a salir en este navegador si no se puede guardar */
    }
  };

  const dismiss = () => {
    remember("dismissed");
    setOpen(false);
  };

  const generate = async () => {
    setSaving(true);
    try {
      const res = await generateRecurringOccurrencesRequest();
      remember("generated");
      setOpen(false);
      const created = Number(res?.data?.created) || 0;
      void toast?.({
        message:
          created > 0
            ? `Se generaron ${created} cuota(s) de ${label}.`
            : `Las cuotas de ${label} ya estaban listas.`,
        variant: "success",
      });
    } catch (err) {
      void toast?.({
        message: err?.response?.data?.message || "No se pudieron generar las cuotas",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleDialog
      open={open}
      onClose={dismiss}
      title={`Cuotas de ${label}`}
      maxWidth="md"
      fullWidth
      actions={
        <>
          <Button onClick={dismiss} disabled={saving}>
            Ahora no
          </Button>
          <Button variant="contained" onClick={generate} disabled={saving}>
            Generar cuotas del mes
          </Button>
        </>
      }
    >
      <Typography variant="h6" sx={{ pt: 1, pb: 1, fontWeight: 700 }}>
        Aviso de egresos recurrentes
      </Typography>
      <Typography variant="body1">
        Genera las cuotas de {label}. Entran las semanales y las mensuales, y también las bimestrales, trimestrales o anuales que correspondan a este mes.
      </Typography>
    </SimpleDialog>
  );
}
