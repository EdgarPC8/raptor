import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";

const ZONE = {
  FREE: "free",
  PACK: "pack",
  LOT: "lot",
};

function DropZone({ zoneType, zoneKey, children, onDropItem, sx = {} }) {
  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const lineId = e.dataTransfer.getData("text/lineId");
        if (lineId) onDropItem(lineId, zoneType, zoneKey);
      }}
      sx={{
        minHeight: 48,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "divider",
        p: 0.75,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function DraggableLine({
  item,
  ivaRate,
  onRemove,
  onUpdateField,
  onToggleIva,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 0.75,
        rowGap: 0.25,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 0.75,
        py: 0.5,
        mb: 0.5,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/lineId", item.lineId);
            e.dataTransfer.effectAllowed = "move";
          }}
          sx={{ userSelect: "none", cursor: "grab", px: 0.25, "&:active": { cursor: "grabbing" } }}
          title="Arrastrar"
        >
          ⠿
        </Typography>
        <Typography variant="caption" fontWeight={600} sx={{ flex: 1, lineHeight: 1.2 }}>
          {item.name}
        </Typography>
        <Tooltip title="Quitar">
          <IconButton size="small" color="error" sx={{ p: 0.25 }} onClick={() => onRemove(item.lineId)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <TextField
        label="Cant."
        type="number"
        size="small"
        value={item.quantity}
        onChange={(e) => onUpdateField(item.lineId, "quantity", e.target.value)}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0.01, step: "any" }}
        sx={{ width: 78 }}
      />
      <Typography variant="caption" color="text.secondary">
        {item.unitLabel || "u."} ×
      </Typography>
      <TextField
        label="P. unit."
        type="number"
        size="small"
        value={item.unitPrice}
        onChange={(e) => onUpdateField(item.lineId, "unitPrice", e.target.value)}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, step: "any" }}
        sx={{ width: 100 }}
      />
      <FormControlLabel
        sx={{ ml: 0.25, mr: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
        control={
          <Checkbox
            size="small"
            sx={{ p: 0.25 }}
            checked={Boolean(item.hasIva)}
            onChange={(e) => onToggleIva(item.lineId, e.target.checked)}
          />
        }
        label={`IVA ${Number(ivaRate) || 0}%`}
      />
      <Typography variant="body2" fontWeight={700} sx={{ ml: "auto", minWidth: 72, textAlign: "right" }}>
        {formatProductPrice(
          formatOrderLineTotal(item.quantity, item.unitPrice) *
            (item.hasIva ? 1 + (Number(ivaRate) || 0) / 100 : 1),
        )}
      </Typography>
    </Box>
  );
}

/**
 * Tablero: productos libres + pacas (+ lotes opcionales) con drag & drop.
 */
export default function SupplierOrderItemsBoard({
  items,
  packs,
  lots,
  ivaRate,
  onRemoveItem,
  onUpdateItemField,
  onToggleItemIva,
  onDropItem,
  onCreatePack,
  onUpdatePack,
  onRemovePack,
  onMovePack,
  onApplyPackTotal,
  onCreateLot,
  onUpdateLot,
  onRemoveLot,
}) {
  const freeItems = items.filter((it) => !it.packKey);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }} data-tour="pedido-prov-packs">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          Productos ({items.length})
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreatePack}
          data-tour="pedido-prov-create-pack"
        >
          Crear paca
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Creá una paca, poné vencimiento/elaboración y el <strong>valor total de la paca</strong>. Al
        aplicar, se reparte en los precios unitarios (varios decimales). Colapsá la paca o usá ↑↓
        para ordenar.
      </Typography>

      <DropZone
        zoneType={ZONE.FREE}
        zoneKey="free"
        onDropItem={onDropItem}
        sx={{ bgcolor: "background.paper" }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
          Sin paca / sin lote
        </Typography>
        {freeItems.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Soltá aquí productos que no van en paca.
          </Typography>
        ) : (
          freeItems.map((item) => (
            <DraggableLine
              key={item.lineId}
              item={item}
              ivaRate={ivaRate}
              onRemove={onRemoveItem}
              onUpdateField={onUpdateItemField}
              onToggleIva={onToggleItemIva}
            />
          ))
        )}
      </DropZone>

      {packs.map((pack, packIndex) => {
        const packLots = lots.filter((l) => l.packKey === pack.key);
        const packLoose = items.filter((it) => it.packKey === pack.key && !it.lotKey);
        const packItems = items.filter((it) => it.packKey === pack.key);
        const linesSum = packItems.reduce(
          (acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice),
          0,
        );
        const expanded = pack.expanded !== false;

        return (
          <Accordion
            key={pack.key}
            expanded={expanded}
            onChange={(_, exp) => onUpdatePack(pack.key, { expanded: exp })}
            disableGutters
            elevation={0}
            data-tour={packIndex === 0 ? "pedido-prov-pack" : undefined}
            sx={{
              border: 1,
              borderColor: "primary.light",
              borderRadius: "12px !important",
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: "action.selected",
                minHeight: 48,
                "& .MuiAccordionSummary-content": {
                  my: 0.75,
                  alignItems: "center",
                  gap: 0.75,
                  overflow: "hidden",
                },
              }}
            >
              <Inventory2Icon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
                {pack.name || "Paca"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {packItems.length} prod. · {formatProductPrice(linesSum)}
              </Typography>
              <Tooltip title="Subir">
                <span>
                  <IconButton
                    size="small"
                    disabled={packIndex === 0 || !onMovePack}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePack?.(pack.key, -1);
                    }}
                  >
                    <KeyboardArrowUpIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Bajar">
                <span>
                  <IconButton
                    size="small"
                    disabled={packIndex >= packs.length - 1 || !onMovePack}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePack?.(pack.key, 1);
                    }}
                  >
                    <KeyboardArrowDownIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Eliminar paca">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePack(pack.key);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                size="small"
                label="Nombre paca"
                value={pack.name}
                onChange={(e) => onUpdatePack(pack.key, { name: e.target.value })}
                fullWidth
              />

              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "flex-start" }}
                data-tour={packIndex === 0 ? "pedido-prov-pack-meta" : undefined}
              >
                {!pack.useLots && (
                  <>
                    <TextField
                      size="small"
                      label="Código lote"
                      value={pack.lotCode || ""}
                      onChange={(e) => onUpdatePack(pack.key, { lotCode: e.target.value })}
                      placeholder="Opcional"
                      sx={{ width: 120 }}
                    />
                    <TextField
                      size="small"
                      label="Vencimiento"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={pack.expiresAt || ""}
                      onChange={(e) => onUpdatePack(pack.key, { expiresAt: e.target.value })}
                      sx={{ width: 150 }}
                    />
                    <TextField
                      size="small"
                      label="Elaboración"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={pack.manufacturedAt || ""}
                      onChange={(e) => onUpdatePack(pack.key, { manufacturedAt: e.target.value })}
                      sx={{ width: 150 }}
                    />
                  </>
                )}
                <TextField
                  size="small"
                  label="Valor paca ($)"
                  type="number"
                  value={pack.totalPrice ?? ""}
                  onChange={(e) => onUpdatePack(pack.key, { totalPrice: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onApplyPackTotal?.(pack.key, pack.totalPrice);
                    }
                  }}
                  inputProps={{ min: 0, step: "any" }}
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    packItems.length
                      ? `Suma líneas: ${formatProductPrice(linesSum)}`
                      : "Sin productos aún"
                  }
                  sx={{ width: 160 }}
                />
                <Tooltip title="Aplicar valor a precios unitarios de la paca">
                  <span>
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={!onApplyPackTotal || packItems.length === 0}
                      onClick={() => onApplyPackTotal?.(pack.key, pack.totalPrice)}
                      sx={{ mt: 0.5 }}
                      aria-label="Aplicar valor de paca"
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(pack.useLots)}
                    onChange={(e) => onUpdatePack(pack.key, { useLots: e.target.checked })}
                  />
                }
                label="Esta paca tiene varios lotes (fechas distintas)"
              />

              {!pack.useLots ? (
                <DropZone
                  zoneType={ZONE.PACK}
                  zoneKey={pack.key}
                  onDropItem={onDropItem}
                  sx={{ bgcolor: "background.paper" }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Productos de la paca
                    {pack.expiresAt ? ` · vence ${pack.expiresAt}` : " · sin vencimiento aún"}
                  </Typography>
                  {packItems.map((item) => (
                    <DraggableLine
                      key={item.lineId}
                      item={item}
                      ivaRate={ivaRate}
                      onRemove={onRemoveItem}
                      onUpdateField={onUpdateItemField}
                      onToggleIva={onToggleItemIva}
                    />
                  ))}
                </DropZone>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => onCreateLot(pack.key)}>
                      Nuevo lote
                    </Button>
                  </Box>

                  {packLots.map((lot) => {
                    const lotItems = items.filter((it) => it.lotKey === lot.key);
                    return (
                      <DropZone
                        key={lot.key}
                        zoneType={ZONE.LOT}
                        zoneKey={lot.key}
                        onDropItem={onDropItem}
                        sx={{ bgcolor: "background.paper" }}
                      >
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.75 }}>
                          <TextField
                            size="small"
                            label="Código lote"
                            value={lot.code || ""}
                            onChange={(e) => onUpdateLot(lot.key, { code: e.target.value })}
                            sx={{ width: 120 }}
                          />
                          <TextField
                            size="small"
                            label="Vencimiento"
                            type="date"
                            required
                            InputLabelProps={{ shrink: true }}
                            value={lot.expiresAt || ""}
                            onChange={(e) => onUpdateLot(lot.key, { expiresAt: e.target.value })}
                            sx={{ width: 150 }}
                          />
                          <TextField
                            size="small"
                            label="Elaboración"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={lot.manufacturedAt || ""}
                            onChange={(e) => onUpdateLot(lot.key, { manufacturedAt: e.target.value })}
                            sx={{ width: 150 }}
                          />
                          <Tooltip title="Eliminar lote">
                            <IconButton size="small" color="error" onClick={() => onRemoveLot(lot.key)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {lotItems.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Arrastrá productos a este lote
                          </Typography>
                        ) : (
                          lotItems.map((item) => (
                            <DraggableLine
                              key={item.lineId}
                              item={item}
                              ivaRate={ivaRate}
                              onRemove={onRemoveItem}
                              onUpdateField={onUpdateItemField}
                              onToggleIva={onToggleItemIva}
                            />
                          ))
                        )}
                      </DropZone>
                    );
                  })}

                  <DropZone
                    zoneType={ZONE.PACK}
                    zoneKey={pack.key}
                    onDropItem={onDropItem}
                    sx={{ bgcolor: "action.hover" }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      En la paca, aún sin lote (arrastrá a un lote arriba)
                    </Typography>
                    {packLoose.map((item) => (
                      <DraggableLine
                        key={item.lineId}
                        item={item}
                        ivaRate={ivaRate}
                        onRemove={onRemoveItem}
                        onUpdateField={onUpdateItemField}
                        onToggleIva={onToggleItemIva}
                      />
                    ))}
                  </DropZone>
                </>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

export { ZONE };
