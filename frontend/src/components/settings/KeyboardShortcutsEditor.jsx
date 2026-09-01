import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  KEYBOARD_SHORTCUT_CATALOG,
  catalogByModule,
  detectShortcutConflicts,
  eventToComboString,
  normalizeKeyboardShortcuts,
} from "../../utils/keyboardShortcuts.js";

function ShortcutCaptureButton({ value, onChange, disabled }) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return undefined;
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setListening(false);
        return;
      }
      const combo = eventToComboString(e);
      if (!combo) return;
      onChange(combo);
      setListening(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [listening, onChange]);

  return (
    <Button
      size="small"
      variant={listening ? "contained" : "outlined"}
      color={listening ? "warning" : "inherit"}
      disabled={disabled}
      onClick={() => setListening(true)}
      sx={{ minWidth: 168, fontFamily: "monospace", justifyContent: "flex-start" }}
    >
      {listening ? "Pulsá la tecla… (Esc cancela)" : value || "Sin asignar"}
    </Button>
  );
}

export default function KeyboardShortcutsEditor({ value, onChange }) {
  const map = useMemo(() => normalizeKeyboardShortcuts(value), [value]);
  const groups = useMemo(() => catalogByModule(), []);
  const conflicts = useMemo(() => detectShortcutConflicts(map), [map]);

  const setBinding = useCallback(
    (id, patch) => {
      onChange({
        ...map,
        [id]: { ...map[id], ...patch },
      });
    },
    [map, onChange],
  );

  const resetCommand = (id) => {
    const def = KEYBOARD_SHORTCUT_CATALOG.find((c) => c.id === id);
    if (!def) return;
    setBinding(id, { keys: def.defaultKeys, enabled: true });
  };

  const resetAll = () => {
    onChange(normalizeKeyboardShortcuts(null));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Asigná teclas o combinaciones (Ctrl, Alt, Shift + tecla). Clic en «Cambiar tecla» y
        pulsá la combinación deseada. Esc cancela la captura.
      </Typography>

      {conflicts.length ? (
        <Box>
          {conflicts.map((c) => (
            <Chip
              key={c.keys}
              size="small"
              color="warning"
              label={`Conflicto: ${c.keys} en ${c.ids.length} comandos`}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      ) : null}

      {[...groups.entries()].map(([moduleKey, commands]) => (
        <Box key={moduleKey}>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.1 }}>
            {commands[0]?.moduleLabel || moduleKey}
          </Typography>
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1, mt: 0.75 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Comando</TableCell>
                  <TableCell>Teclas</TableCell>
                  <TableCell align="center">Activo</TableCell>
                  <TableCell align="right">Default</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commands.map((cmd) => {
                  const binding = map[cmd.id] || { keys: cmd.defaultKeys, enabled: true };
                  return (
                    <TableRow key={cmd.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {cmd.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cmd.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <ShortcutCaptureButton
                          value={binding.keys}
                          disabled={!binding.enabled}
                          onChange={(keys) => setBinding(cmd.id, { keys })}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={binding.enabled !== false}
                              onChange={(e) =>
                                setBinding(cmd.id, { enabled: e.target.checked })
                              }
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => resetCommand(cmd.id)}>
                          {cmd.defaultKeys}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      <Box>
        <Button size="small" variant="text" onClick={resetAll}>
          Restaurar todos los valores por defecto
        </Button>
      </Box>
    </Stack>
  );
}
