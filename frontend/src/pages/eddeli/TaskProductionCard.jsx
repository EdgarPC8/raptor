import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { executeTaskProduction, previewTaskProduction } from "../../api/taskRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

const grams = (n) => Number(n || 0).toLocaleString("es-EC");

function genericNodes(plan) {
  return (plan?.requiere || []).filter((node) => node?.kind === "gramos" && node.generico);
}

export default function TaskProductionCard({ item, onCompleted }) {
  const { toast } = useAuth();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [packQty, setPackQty] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (item.status === "done") return undefined;
    let cancel = false;
    setError("");
    previewTaskProduction(item.id)
      .then((res) => {
        if (!cancel) setPlan(res.data);
      })
      .catch((e) => {
        if (!cancel) setError(e?.response?.data?.message || "No se pudo calcular la producción.");
      });
    return () => {
      cancel = true;
    };
  }, [item.id, item.status]);

  const nodes = useMemo(() => genericNodes(plan), [plan]);

  const covered = useMemo(() => {
    if (!plan) return false;
    const unitsOk = (plan.requiere || [])
      .filter((node) => node.kind === "unidad" || (node.kind === "gramos" && !node.generico))
      .every((node) => node.suficiente !== false);
    const genericsOk = nodes.every((node) => {
      const opened = (node.empaques || []).reduce((sum, pack) => {
        const packs = Math.floor(Number(packQty[`${node.id}:${pack.productId}`]) || 0);
        return sum + packs * Number(pack.gramosPorEmpaque || 0);
      }, 0);
      const loose = Number(node.gramosDisponibles ?? node.gramosGenerico) || 0;
      return loose + opened + 1e-6 >= Number(node.cantidadGramos || 0);
    });
    return unitsOk && genericsOk;
  }, [plan, nodes, packQty]);

  const run = async () => {
    const abrirEmpaques = [];
    for (const node of nodes) {
      for (const pack of node.empaques || []) {
        const packs = Math.floor(Number(packQty[`${node.id}:${pack.productId}`]) || 0);
        if (packs > 0) abrirEmpaques.push({ insumoId: node.id, productId: pack.productId, packs });
      }
    }
    setBusy(true);
    try {
      const res = await executeTaskProduction(item.id, { abrirEmpaques });
      setResult(res.data);
      onCompleted?.(res.data);
      void toast?.({ message: res.data?.resultNote || "Producción registrada.", variant: "success" });
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo registrar la producción.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  if (item.status === "done" || result) {
    return (
      <Alert severity="success" sx={{ mt: 1 }}>
        {result?.resultNote || item.resultNote || "Producción registrada."}
      </Alert>
    );
  }

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {nodes.map((node) => {
        const opened = (node.empaques || []).reduce((sum, pack) => {
          const packs = Math.floor(Number(packQty[`${node.id}:${pack.productId}`]) || 0);
          return sum + packs * Number(pack.gramosPorEmpaque || 0);
        }, 0);
        const loose = Number(node.gramosDisponibles ?? node.gramosGenerico) || 0;
        const quedan = loose + opened - Number(node.cantidadGramos || 0);
        return (
          <Box key={node.id}>
            <Typography variant="body2">
              <strong>{node.producto}</strong>: se necesitan {grams(node.cantidadGramos)} g. Saldo suelto{" "}
              {grams(loose)} g.{" "}
              {quedan >= -1e-6
                ? `Si la haces ahora, quedan cerca de ${grams(Math.max(0, quedan))} g.`
                : `Faltan ${grams(Math.abs(quedan))} g.`}
            </Typography>
            {node.mensaje && quedan < -1e-6 ? (
              <Alert severity="warning" sx={{ mt: 0.75 }}>
                {node.mensaje}
              </Alert>
            ) : null}
            {node.aperturaPermitida
              ? (node.empaques || []).map((pack) => (
                  <Stack key={pack.productId} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.75 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>
                        Abrir {pack.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock {pack.stock} · aporta {grams(pack.gramosPorEmpaque)} g
                      </Typography>
                    </Box>
                    <TextField
                      label="Empaques a abrir"
                      type="number"
                      size="small"
                      value={packQty[`${node.id}:${pack.productId}`] ?? ""}
                      onChange={(e) =>
                        setPackQty((prev) => ({
                          ...prev,
                          [`${node.id}:${pack.productId}`]: e.target.value,
                        }))
                      }
                      sx={{ width: { sm: 180 } }}
                    />
                  </Stack>
                ))
              : null}
          </Box>
        );
      })}
      {plan ? (
        <Typography variant="body2" color="text.secondary">
          Van a salir {grams(plan.cantidadDeseada)} de {plan.producto}. Hoy hay {grams(plan.stockActualFundas)}.
        </Typography>
      ) : null}
      <Button
        size="small"
        variant="contained"
        startIcon={<PlayArrowIcon />}
        disabled={busy || !plan || !covered}
        onClick={() => void run()}
        sx={{ alignSelf: "flex-start" }}
      >
        Registrar producción
      </Button>
    </Stack>
  );
}
