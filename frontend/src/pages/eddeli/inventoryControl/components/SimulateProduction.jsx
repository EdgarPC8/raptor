// RenderFromFinal.jsx
import React, { useEffect, useRef, useState } from "react";

import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Chip,
  IconButton,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

// API (ajusta la ruta si hace falta)
import {
  simulateProduction,
  registerProductionFinalFromPayload,
} from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
} from "./ProgrammerMovementDateField.jsx";
/* ---------------- Utils ---------------- */
const numberOrZero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function toArray(req) {
  if (Array.isArray(req)) return req;
  if (req && Array.isArray(req.requiere)) return req.requiere;
  return [];
}
const clone = (obj) => JSON.parse(JSON.stringify(obj));

function genericGroups(resultado) {
  const groups = new Map();
  for (const node of resultado?.requiere || []) {
    if (node?.kind !== "gramos" || !node.generico) continue;
    const current = groups.get(node.id) || {
      id: node.id,
      producto: node.producto,
      need: 0,
      generic: Number(node.gramosGenerico) || 0,
      empaques: node.empaques || [],
      aperturaPermitida: Boolean(node.aperturaPermitida),
      mensaje: node.mensaje,
    };
    current.need += Number(node.cantidadGramos) || 0;
    if (node.mensaje) current.mensaje = node.mensaje;
    groups.set(node.id, current);
  }
  return [...groups.values()];
}

function actionsFromState(resultado, packQty, merma) {
  const abrirEmpaques = [];
  const mermas = [];
  for (const group of genericGroups(resultado)) {
    for (const pack of group.empaques) {
      const packs = Math.floor(Number(packQty[`${group.id}:${pack.productId}`]) || 0);
      if (packs > 0) {
        abrirEmpaques.push({ insumoId: group.id, productId: pack.productId, packs });
      }
    }
    const grams = Number(merma[group.id]?.gramos);
    const motivo = String(merma[group.id]?.motivo || "").trim();
    if (grams > 0) mermas.push({ insumoId: group.id, gramos: grams, motivo });
  }
  return { abrirEmpaques, mermas };
}

function groupCovered(group, packQty, merma, autocomplete) {
  const waste = Number(merma[group.id]?.gramos) || 0;
  const opened = (group.empaques || []).reduce((sum, pack) => {
    const packs = Math.floor(Number(packQty[`${group.id}:${pack.productId}`]) || 0);
    return sum + packs * Number(pack.gramosPorEmpaque || 0);
  }, 0);
  const available = Math.max(0, group.generic - waste) + opened;
  if (available + 1e-6 >= group.need) return true;
  return Boolean(autocomplete && group.aperturaPermitida);
}

/** Aplica una actualización inmutable en la ruta dada (path) dentro del árbol. */
function applyAtPath(rootArray, path, updater) {
  const root = clone(rootArray);
  let cursor = root;

  for (let i = 0; i < path.length; i++) {
    const idx = path[i];

    if (i === path.length - 1) {
      cursor[idx] = updater(cursor[idx]);
    } else {
      const node = cursor[idx];
      const childArr = toArray(node.requiere);
      const nextChild = childArr.slice();
      cursor[idx] = { ...node, requiere: nextChild };
      cursor = nextChild;
    }
  }
  return root;
}

/* ---------- Editor de Árbol (integrado) ---------- */
/* ---------- Editor de Árbol (integrado) ---------- */
function TreeEditor({ requiere = [], level = 0, onChange }) {
  const [editValues, setEditValues] = React.useState({});
  const inputRefs = React.useRef({}); // refs por campo

  // Siempre trabajar sobre el array raíz actual
  const rootArray = React.useMemo(() => toArray(requiere), [requiere]);

  const getInputRef = (pathKey) => {
    if (!inputRefs.current[pathKey]) {
      inputRefs.current[pathKey] = React.createRef();
    }
    return inputRefs.current[pathKey];
  };

  const handleEditClick = (pathKey, initial) => {
    setEditValues((p) => ({ ...p, [pathKey]: { editing: true, ...initial } }));
    requestAnimationFrame(() => {
      inputRefs.current[pathKey]?.current?.focus?.();
    });
  };

  const handleValueChange = (pathKey, field, value) => {
    setEditValues((p) => ({ ...p, [pathKey]: { ...p[pathKey], [field]: value } }));
    requestAnimationFrame(() => {
      inputRefs.current[pathKey]?.current?.focus?.();
    });
  };

  const stopEditing = (pathKey) => {
    setEditValues((p) => ({ ...p, [pathKey]: { ...p[pathKey], editing: false } }));
  };

  const handleSaveClick = React.useCallback(
    (path, pathKey) => {
      const st = editValues[pathKey];
      if (!st) return;

      // ✅ Aplicar sobre el ARREGLO RAÍZ completo
      const updatedRoot = applyAtPath(rootArray, path, (item) => {
        const draft = { ...item };
        const qty = Number.parseFloat(st.cantidad ?? "");
        if (Number.isFinite(qty)) {
          if (draft.cantidadGramos !== undefined) draft.cantidadGramos = qty;
          else if (draft.cantidadUnidades !== undefined) draft.cantidadUnidades = qty;
        }
        const sobr = Number.parseFloat(st.sobrante ?? "");
        if (Number.isFinite(sobr)) draft.sobrante = sobr;
        return draft;
      });

      onChange?.(updatedRoot);
      stopEditing(pathKey);
    },
    [editValues, onChange, rootArray]
  );

  const RenderNode = ({ items, level, pathPrefix = [] }) => {
    if (!Array.isArray(items)) return null;

    return (
      <List dense sx={{ pl: level * 2 }}>
        {items.map((item, idx) => {
          if (!item) return null;
          const path = [...pathPrefix, idx];
          const pathKey = path.join(">");
          const editState = editValues[pathKey] || {};
          const editing = !!editState.editing;

          const cantidadOriginal = item.cantidadGramos ?? item.cantidadUnidades ?? 0;

          const esGramos = item.kind === "gramos" || item.cantidadGramos !== undefined;
          const rawStock = Number(
            esGramos ? (item.gramosDisponibles ?? item.stockActual ?? 0) : (item.stockActual || 0),
          );
          const mostrarStock = esGramos
            ? `${rawStock.toLocaleString("es-EC")} g`
            : `${rawStock} unidades`;

          return (
            <Box
              key={item.id ?? pathKey}
              sx={{
                mb: 1,
                pl: 2,
                ...(level > 0 && {
                  borderLeft: 2,
                  borderStyle: "solid",
                  borderColor: "divider",
                }),
              }}
            >
              <ListItem
                secondaryAction={
                  esGramos ? null : editing ? (
                    <IconButton
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSaveClick(path, pathKey)}
                    >
                      <SaveIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        handleEditClick(pathKey, {
                          cantidad: cantidadOriginal,
                          sobrante: item.sobrante ?? 0,
                        })
                      }
                    >
                      <EditIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      <strong>{item.producto}</strong> —{" "}
                      {editing ? (
                        <>
                          <TextField
                            type="number"
                            size="small"
                            variant="outlined"
                            label="Cantidad"
                            value={editState.cantidad ?? ""}
                            onChange={(e) => handleValueChange(pathKey, "cantidad", e.target.value)}
                            sx={{ width: 110, mr: 1 }}
                            inputProps={{ step: "0.01", min: 0 }}
                            inputRef={getInputRef(pathKey)}
                            autoFocus
                            onWheel={(e) => e.target.blur()}
                          />
                          {item.sobrante !== undefined && (
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              label="Sobrante"
                              value={editState.sobrante ?? ""}
                              onChange={(e) =>
                                handleValueChange(pathKey, "sobrante", e.target.value)
                              }
                              sx={{ width: 110 }}
                              inputProps={{ step: "0.01", min: 0 }}
                              onWheel={(e) => e.target.blur()}
                            />
                          )}
                        </>
                      ) : item.cantidadGramos !== undefined ? (
                        `${Number(item.cantidadGramos).toFixed(2)} g necesarios`
                      ) : (
                        `${item.cantidadUnidades} unidades necesarias`
                      )}
                    </Typography>
                  }
                  secondary={
                    <>
                      Stock disponible: {mostrarStock}
                      {item.esIntermedio && (
                        <>
                          {" • "}Lotes necesarios: <strong>{item.lotesNecesarios}</strong>
                          {item.productionYield !== undefined && (
                            <>
                              {" • "}Producción por lote:{" "}
                              <strong>{item.productionYield}</strong>
                              {item.unitId === 1 ? " unidades" : "g"}
                            </>
                          )}
                          {item.sobrante !== undefined && (
                            <>
                              {" • "}Sobrante estimado:{" "}
                              <strong>{Number(item.sobrante).toFixed(2)}</strong>
                              {item.unitId === 1 ? " unidades" : "g"}
                            </>
                          )}
                        </>
                      )}
                    </>
                  }
                />
              </ListItem>

              {item.esIntermedio && item.requiere && (
                <RenderNode items={toArray(item.requiere)} level={level + 1} pathPrefix={path} />
              )}
            </Box>
          );
        })}
      </List>
    );
  };

  return <RenderNode items={rootArray} level={level} pathPrefix={[]} />;
}


/* ======================= Componente: RenderFromFinal ======================= */
/**
 * Modo página: `productId` + `fetchData` (Producción).
 * Modo embebido (movimientos): `embedProductId`, `embedQuantity`, `onSimulated`.
 */
export default function RenderFromFinal({
  fetchData,
  productId,
  embedProductId,
  embedQuantity,
  onSimulated,
}) {
  const isEmbed =
    typeof onSimulated === "function" &&
    embedProductId != null &&
    Number(embedQuantity) > 0;

  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [simError, setSimError] = useState("");

  const { toast: toastAuth, user } = useAuth();
  const { activeApp } = useAppSettings();
  const canOpenPack =
    Boolean(activeApp?.productionOpenPackaging) &&
    (user?.loginRol === "Administrador" || user?.loginRol === "Propietario");
  const isProgrammer = user?.loginRol === "Propietario" || user?.loginRol === "Programador";
  const [movementDate, setMovementDate] = useState(todayDateInput());
  const [packQty, setPackQty] = useState({});
  const [merma, setMerma] = useState({});
  const [autocomplete, setAutocomplete] = useState(false);
  const onSimulatedRef = useRef(onSimulated);
  onSimulatedRef.current = onSimulated;

  /* --- Embebido: simular para el formulario de movimiento --- */
  useEffect(() => {
    if (!isEmbed) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await simulateProduction(Number(embedProductId), Number(embedQuantity));
        const r = res?.data?.resultado ?? res?.data ?? null;
        if (cancelled) return;
        if (r) {
          const cloned = clone(r);
          setResultado(cloned);
          setPackQty({});
          setMerma({});
          setAutocomplete(false);
          onSimulatedRef.current?.(cloned);
        } else {
          setResultado(null);
        }
      } catch (e) {
        console.error("Error en simulación (embed):", e);
        if (!cancelled) setResultado(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEmbed, embedProductId, embedQuantity]);

  /* --- Página: simular al tener producto y cantidad --- */
  useEffect(() => {
    if (isEmbed || !productId) return;
    if (!/^[1-9]\d*$/.test(String(quantity).trim())) {
      setResultado(null);
      setSimError(
        String(quantity).trim()
          ? "La cantidad a producir debe ser un entero mayor que 0"
          : "",
      );
      return;
    }
    const n = Number(quantity);
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await simulateProduction(Number(productId), n);
        const r = res?.data?.resultado ?? res?.data ?? null;
        if (cancelled) return;
        if (r) setResultado(clone(r));
        else setResultado(null);
        if (!cancelled) {
          setSimError("");
          setPackQty({});
          setMerma({});
          setAutocomplete(false);
        }
      } catch (e) {
        console.error("Error en simulación:", e);
        if (!cancelled) {
          setResultado(null);
          setSimError(e?.response?.data?.message || "No se pudo simular la producción");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEmbed, productId, quantity]);

  const productionActions = actionsFromState(resultado, packQty, merma);
  const groups = genericGroups(resultado);
  const unitsShort = (resultado?.requiere || []).some(
    (node) => node.kind === "unidad" && !node.suficiente,
  );
  const gramsShort = groups.some(
    (group) => !groupCovered(group, packQty, merma, autocomplete),
  );
  const canProcess = Boolean(resultado?.requiere?.length) && !unitsShort && !gramsShort;

  useEffect(() => {
    if (!isEmbed || !resultado) return;
    onSimulatedRef.current?.({
      ...resultado,
      abrirEmpaques: productionActions.abrirEmpaques,
      mermas: productionActions.mermas,
      autocompletarStock: autocomplete,
    });
  }, [isEmbed, resultado, packQty, merma, autocomplete]);

  const handleProcess = async () => {
    if (!resultado || !canProcess) return;
    if (autocomplete) {
      const accepted = window.confirm(
        "Se registrará un ajuste visible solo por los gramos que falten. ¿Confirmas el autocompletado?",
      );
      if (!accepted) return;
    }

    const dateApi = isProgrammer ? movementDateForApi(movementDate) : undefined;
    const payload = {
      productId: Number(resultado.id ?? productId),
      quantity: Number(resultado.cantidadDeseada ?? quantity),
      simulated: resultado,
      type: "produccion",
      description: `Producción final de ${resultado.producto}`,
      abrirEmpaques: productionActions.abrirEmpaques,
      mermas: productionActions.mermas,
      ...(autocomplete ? { autocompletarStock: true } : {}),
      ...(dateApi ? { movementDate: dateApi } : {}),
    };

    toastAuth({
      promise: registerProductionFinalFromPayload(payload),
      onSuccess: () => {
        fetchData?.();
        setResultado(null);
        setQuantity("1");
        return {
          title: "Producción",
          description: "Producción registrada correctamente",
        };
      },
    });
  };

  const actionsPanel = groups.length ? (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {groups.map((group) => {
        const waste = Number(merma[group.id]?.gramos) || 0;
        const opened = (group.empaques || []).reduce((sum, pack) => {
          const packs = Math.floor(Number(packQty[`${group.id}:${pack.productId}`]) || 0);
          return sum + packs * Number(pack.gramosPorEmpaque || 0);
        }, 0);
        const quedan = group.generic - waste + opened - group.need;
        return (
          <Paper key={group.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>{group.producto}</strong>: se necesitan {group.need.toLocaleString("es-EC")} g.
              Saldo suelto {group.generic.toLocaleString("es-EC")} g.{" "}
              {quedan >= -1e-6
                ? `Quedan ${Math.max(0, quedan).toLocaleString("es-EC")} g después de descontar.`
                : `Faltan ${Math.abs(quedan).toLocaleString("es-EC")} g.`}
            </Typography>
            {group.mensaje && quedan < -1e-6 ? (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {group.mensaje}
              </Alert>
            ) : null}
            {canOpenPack && group.aperturaPermitida ? (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {(group.empaques || []).map((pack) => (
                  <Stack key={pack.productId} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {pack.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock {pack.stock} · aporta {Number(pack.gramosPorEmpaque).toLocaleString("es-EC")} g
                        {pack.sinPrecio
                          ? " · sin precio"
                          : ` · $${Number(pack.costoPorGramo).toFixed(6)}/g`}
                      </Typography>
                    </Box>
                    <TextField
                      label="Empaques a abrir"
                      type="number"
                      size="small"
                      value={packQty[`${group.id}:${pack.productId}`] ?? ""}
                      onChange={(e) =>
                        setPackQty((prev) => ({
                          ...prev,
                          [`${group.id}:${pack.productId}`]: e.target.value,
                        }))
                      }
                      inputProps={{ min: 0, max: pack.stock, step: 1 }}
                      sx={{ width: { sm: 160 } }}
                    />
                  </Stack>
                ))}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Merma (g)"
                    type="number"
                    size="small"
                    value={merma[group.id]?.gramos ?? ""}
                    onChange={(e) =>
                      setMerma((prev) => ({
                        ...prev,
                        [group.id]: { ...prev[group.id], gramos: e.target.value },
                      }))
                    }
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <TextField
                    label="Motivo de la merma"
                    size="small"
                    fullWidth
                    value={merma[group.id]?.motivo ?? ""}
                    onChange={(e) =>
                      setMerma((prev) => ({
                        ...prev,
                        [group.id]: { ...prev[group.id], motivo: e.target.value },
                      }))
                    }
                  />
                </Stack>
              </Stack>
            ) : null}
          </Paper>
        );
      })}
      {canOpenPack && gramsShort ? (
        <FormControlLabel
          control={
            <Checkbox
              checked={autocomplete}
              onChange={(e) => setAutocomplete(e.target.checked)}
            />
          }
          label="Autocompletar solo los gramos que falten, con un ajuste visible"
        />
      ) : null}
    </Stack>
  ) : null;

  if (isEmbed) {
    return (
      <Box>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {resultado && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
              Requerimientos según receta (producción)
            </Typography>
            {actionsPanel}
            <TreeEditor
              requiere={resultado.requiere}
              onChange={(newTree) => setResultado((prev) => ({ ...prev, requiere: newTree }))}
            />
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              type="number"
              label="Cantidad a producir"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ step: "1", min: 1 }}
              onWheel={(e) => e.target.blur()}
              error={Boolean(simError)}
              helperText={simError || "Solo enteros mayores que 0. La simulación muestra los gramos."}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {loading && <CircularProgress size={28} />}
          </Grid>
        </Grid>
      </Paper>

      {resultado && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              Simulación / Edición — <strong>{resultado.producto}</strong>
            </Typography>
            <Chip
              size="small"
              color="primary"
              label={`Cantidad: ${numberOrZero(resultado.cantidadDeseada)} ${resultado.unidad || "u"}`}
            />
          </Stack>

          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {(resultado.requiere || []).map((nodo, index) => (
              <Typography key={`${nodo.id}-${index}`} variant="body2">
                {nodo.kind === "gramos" ? (
                  <>
                    <strong>{nodo.producto}</strong>: descontar{" "}
                    {Number(nodo.cantidadGramos).toLocaleString("es-EC")} g del insumo suelto.
                    Disponible {Number(nodo.gramosDisponibles).toLocaleString("es-EC")} g.
                    {nodo.suficiente ? "" : " No alcanza."}
                  </>
                ) : (
                  <>
                    <strong>{nodo.producto}</strong>: {nodo.cantidadUnidades} unidades. Disponible{" "}
                    {nodo.stockActual}.
                  </>
                )}
              </Typography>
            ))}
            <Typography variant="body2">
              Fundas resultantes: {Number(resultado.fundasResultantes ?? resultado.cantidadDeseada).toLocaleString("es-EC")}
            </Typography>
            {resultado.costoPorFunda != null ? (
              <Typography variant="body2">
                Costo por funda: ${Number(resultado.costoPorFunda).toFixed(4)} (insumo $
                {Number(resultado.costoInsumo).toFixed(4)} + extras ${Number(resultado.extras).toFixed(4)})
              </Typography>
            ) : (
              (resultado.advertencias || []).map((msg) => (
                <Typography key={msg} variant="body2" color="warning.main">
                  {msg}
                </Typography>
              ))
            )}
          </Stack>

          {actionsPanel}

          <TreeEditor
            requiere={resultado.requiere}
            onChange={(newTree) => setResultado((prev) => ({ ...prev, requiere: newTree }))}
          />

          <Stack spacing={2} sx={{ mt: 2 }}>
            <ProgrammerMovementDateField
              isProgrammer={isProgrammer}
              value={movementDate}
              onChange={setMovementDate}
              label="Fecha de la producción"
            />
            <Button
              variant="contained"
              onClick={handleProcess}
              disabled={!canProcess}
            >
              Procesar producción
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
