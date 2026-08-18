/**
 * Switches de avisos (bandeja) y toasts abajo a la derecha.
 * Admin / Programador.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import {
  getNotificationPrograms,
  updateNotificationProgram,
} from "../api/notificationProgramRequest.js";
import { demoNotificationToasts } from "../api/notificationsRequest.js";

const GREETING_CODES = new Set(["BUENOS_DIAS", "BUENAS_TARDES", "BUENAS_NOCHES"]);
const STOCK_CODE = "SYSTEM_STOCK_MIN";

const ROWS = [
  {
    id: "greeting",
    label: "Saludos",
    hint: "Buenos días, tardes y noches",
    toastKey: "notificationsToastGreeting",
  },
  {
    id: "stock",
    label: "Stock mínimo",
    hint: "Productos en o bajo el mínimo",
    toastKey: "notificationsToastStock",
  },
  {
    id: "credit",
    label: "Créditos / cuotas",
    hint: "Vencimiento de cobros y pagos",
    toastKey: "notificationsToastCredit",
    inboxKey: "notificationsCreditEnabled",
  },
  {
    id: "expiry",
    label: "Caducidad",
    hint: "Lotes vencidos o por vencer (30 días)",
    toastKey: "notificationsToastExpiry",
    inboxKey: "notificationsExpiryEnabled",
  },
];

export default function NotificationToastSettings() {
  const { activeApp, setSettings, reload } = useAppSettings();
  const { toast } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [savingKey, setSavingKey] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const res = await getNotificationPrograms();
      setPrograms(res.data || []);
    } catch {
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const inboxOn = useMemo(() => {
    const greetings = programs.filter((p) => GREETING_CODES.has(p.code));
    const stock = programs.find((p) => p.code === STOCK_CODE);
    return {
      greeting: greetings.length ? greetings.some((p) => p.active) : true,
      stock: stock ? Boolean(stock.active) : true,
      credit: activeApp?.notificationsCreditEnabled !== false,
      expiry: Boolean(activeApp?.notificationsExpiryEnabled),
    };
  }, [programs, activeApp]);

  const toastOn = {
    greeting: Boolean(activeApp?.notificationsToastGreeting),
    stock: Boolean(activeApp?.notificationsToastStock),
    credit: Boolean(activeApp?.notificationsToastCredit),
    expiry: Boolean(activeApp?.notificationsToastExpiry),
  };

  const patchSettings = async (partial) => {
    const data = await updateAppSettings(partial);
    if (data?.settings) setSettings(data.settings);
    await reload?.();
  };

  const onToggleInbox = async (row, checked) => {
    const key = `inbox-${row.id}`;
    setSavingKey(key);
    try {
      if (row.id === "greeting") {
        const targets = programs.filter((p) => GREETING_CODES.has(p.code));
        await Promise.all(
          targets.map((p) => updateNotificationProgram(p.id, { active: checked })),
        );
        await loadPrograms();
      } else if (row.id === "stock") {
        const stock = programs.find((p) => p.code === STOCK_CODE);
        if (stock) {
          await updateNotificationProgram(stock.id, { active: checked });
          await loadPrograms();
        }
      } else if (row.inboxKey) {
        await patchSettings({ [row.inboxKey]: checked });
      }
    } catch (err) {
      toast?.({
        message: err?.response?.data?.message || "No se pudo guardar el aviso",
        variant: "error",
      });
    } finally {
      setSavingKey("");
    }
  };

  const onToggleToast = async (row, checked) => {
    const key = `toast-${row.id}`;
    setSavingKey(key);
    try {
      await patchSettings({ [row.toastKey]: checked });
    } catch (err) {
      toast?.({
        message: err?.response?.data?.message || "No se pudo guardar el toast",
        variant: "error",
      });
    } finally {
      setSavingKey("");
    }
  };

  const onDemoToasts = async () => {
    setDemoBusy(true);
    try {
      await demoNotificationToasts();
    } catch (err) {
      toast?.({
        message: err?.response?.data?.message || "No se pudieron disparar los toasts de demo",
        variant: "error",
      });
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Avisos y toasts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        La bandeja y la campanita siguen igual. El toast sale abajo a la derecha
        solo si lo prendés en esa columna. Todo arranca apagado en toast.
      </Typography>
      <Stack spacing={1.25}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 1,
            px: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Tipo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 88, textAlign: "center" }}>
            En bandeja
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 88, textAlign: "center" }}>
            Toast
          </Typography>
        </Box>
        {ROWS.map((row) => (
          <Box
            key={row.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 1,
              alignItems: "center",
              py: 0.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {row.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.hint}
              </Typography>
            </Box>
            <FormControlLabel
              sx={{ m: 0, width: 88, justifyContent: "center" }}
              label=""
              control={
                <Switch
                  size="small"
                  checked={Boolean(inboxOn[row.id])}
                  disabled={savingKey === `inbox-${row.id}`}
                  onChange={(e) => void onToggleInbox(row, e.target.checked)}
                />
              }
            />
            <FormControlLabel
              sx={{ m: 0, width: 88, justifyContent: "center" }}
              label=""
              control={
                <Switch
                  size="small"
                  checked={Boolean(toastOn[row.id])}
                  disabled={savingKey === `toast-${row.id}`}
                  onChange={(e) => void onToggleToast(row, e.target.checked)}
                />
              }
            />
          </Box>
        ))}
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={demoBusy}
          onClick={() => void onDemoToasts()}
        >
          {demoBusy ? "Enviando demo…" : "Probar toasts"}
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
          Manda los 4 tipos a tu usuario, uno cada segundo. Prendé la columna Toast
          para verlos abajo a la derecha.
        </Typography>
      </Box>
    </Paper>
  );
}
