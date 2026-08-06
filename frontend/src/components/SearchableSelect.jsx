import { useEffect, useMemo, useState } from "react";
import { Box, TextField, Autocomplete, CircularProgress } from "@mui/material";

const EMPTY_MARKER = "__searchableSelect_empty__";

/** ¿El texto de búsqueda coincide como prefijo de palabra (evita "sal" ⊂ "Universal")? */
function textMatchesQuery(haystack, query) {
  const h = String(haystack || "").toLowerCase();
  const q = String(query || "").toLowerCase().trim();
  if (!q) return true;
  if (!h) return false;
  // Prefijo de palabra: "sa" → Sal; "sal" → Sal / Pan de Sal; no "Universal".
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}`, "iu");
    return re.test(h);
  } catch {
    return h
      .split(/[^a-z0-9áéíóúüñ]+/i)
      .some((w) => w.startsWith(q));
  }
}

export default function SearchableSelect({
  label = "Seleccionar",
  items = [],
  value = "",
  onChange,
  getOptionLabel: getOptionLabelProp = (item) => item?.name ?? "",
  getOptionValue = (item) => item?.id,
  placeholder = "Buscar...",
  onSearchChange,
  loading = false,
  emptyOptionLabel,
  renderOption: renderOptionProp,
  onEnterWithInput,
  /** Texto extra para filtrar (nombre, código de barras, SKU, etc.). */
  getSearchText,
  disabled = false,
  /** Tras elegir una opción, vacía el campo (útil en caja: agregar y seguir buscando). */
  clearInputOnSelect = false,
}) {
  const [inputLen, setInputLen] = useState(0);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (value === "" || value == null) {
      setInputValue("");
      setInputLen(0);
    }
  }, [value]);

  const emptyOption = useMemo(
    () => (emptyOptionLabel ? { [EMPTY_MARKER]: true } : null),
    [emptyOptionLabel]
  );

  const options = useMemo(() => {
    // Evita filas duplicadas por el mismo id (rompe Autocomplete si el label se repite).
    const seen = new Set();
    const unique = [];
    for (const item of items || []) {
      if (!item || item[EMPTY_MARKER]) continue;
      const key = String(getOptionValue(item));
      if (!key || key === "undefined" || key === "null") {
        unique.push(item);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    if (emptyOption) return [emptyOption, ...unique];
    return unique;
  }, [items, emptyOption, getOptionValue]);

  const resolveLabel = (option) => {
    if (!option) return "";
    if (option[EMPTY_MARKER]) return emptyOptionLabel || "";
    return getOptionLabelProp(option) ?? "";
  };

  const selectedOption = useMemo(() => {
    if (value === "" || value == null) return null;
    return (
      options.find((i) => {
        if (i?.[EMPTY_MARKER]) return false;
        const ov = getOptionValue(i);
        return ov === value || String(ov) === String(value);
      }) ?? null
    );
  }, [options, value, getOptionValue]);

  return (
    <Box sx={{ width: "100%" }}>
      <Autocomplete
        size="small"
        disabled={disabled}
        options={options}
        loading={loading}
        value={selectedOption}
        inputValue={inputValue}
        onChange={(_event, newValue) => {
          if (!onChange) return;
          if (!newValue || newValue[EMPTY_MARKER]) {
            onChange("");
            return;
          }
          onChange(getOptionValue(newValue));
          if (clearInputOnSelect) {
            setInputValue("");
            setInputLen(0);
          }
        }}
        onInputChange={(_event, newInput, reason) => {
          setInputValue(newInput);
          if (reason === "input") {
            setInputLen(newInput.length);
            onSearchChange?.(newInput);
          }
          if (reason === "clear" || reason === "reset") {
            setInputLen(0);
          }
        }}
        getOptionLabel={(option) => resolveLabel(option)}
        getOptionKey={(option) =>
          option?.[EMPTY_MARKER]
            ? EMPTY_MARKER
            : String(getOptionValue(option) ?? resolveLabel(option))
        }
        isOptionEqualToValue={(a, b) => {
          if (!a && !b) return true;
          if (!a || !b) return false;
          if (a[EMPTY_MARKER] && b[EMPTY_MARKER]) return true;
          if (a[EMPTY_MARKER] || b[EMPTY_MARKER]) return false;
          return String(getOptionValue(a)) === String(getOptionValue(b));
        }}
        filterOptions={(opts, params) => {
          const q = (params.inputValue || "").toLowerCase().trim();
          if (!q) return opts;
          return opts.filter((opt) => {
            if (opt[EMPTY_MARKER]) return true;
            const label = resolveLabel(opt) || "";
            const extra = (getSearchText ? getSearchText(opt) : "") || "";
            return textMatchesQuery(`${label} ${extra}`, q);
          });
        }}
        noOptionsText={
          onSearchChange && inputLen > 0 && inputLen < 2
            ? "Escriba al menos 2 caracteres para buscar"
            : "No se encontraron resultados"
        }
        renderOption={
          renderOptionProp
            ? (props, option) => {
                if (option[EMPTY_MARKER]) {
                  return (
                    <li {...props} key={props.key}>
                      {emptyOptionLabel || ""}
                    </li>
                  );
                }
                return renderOptionProp(props, option);
              }
            : undefined
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            onKeyDown={(e) => {
              params.inputProps?.onKeyDown?.(e);
              if (e.key === "Enter" && onEnterWithInput) {
                const input = e.currentTarget;
                const listboxOpen = input.getAttribute("aria-expanded") === "true";
                const hasHighlighted = Boolean(input.getAttribute("aria-activedescendant"));
                if (listboxOpen && hasHighlighted) return;
                const val = String(input.value ?? "").trim();
                if (val) {
                  e.preventDefault();
                  e.stopPropagation();
                  onEnterWithInput(val);
                  if (clearInputOnSelect) {
                    setInputValue("");
                    setInputLen(0);
                  }
                }
              }
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        ListboxProps={{ style: { maxHeight: 360 } }}
        clearOnBlur
        handleHomeEndKeys
        selectOnFocus
      />
    </Box>
  );
}
