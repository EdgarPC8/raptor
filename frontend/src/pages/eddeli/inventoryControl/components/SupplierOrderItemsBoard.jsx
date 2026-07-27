import {
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
        inputProps={{ min: 0, step: "0.001" }}
        sx={{ width: 92 }}
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
  onCreateLot,
  onUpdateLot,
  onRemoveLot,
}) {
  const freeItems = items.filter((it) => !it.packKey);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          Productos ({items.length})
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onCreatePack}>
          Crear paca
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Creá una paca (los productos sueltos entran solos), poné vencimiento/elaboración en la paca.
        Si hay varias fechas, activá «varios lotes» y arrastrá por lote.
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

      {packs.map((pack) => {
        const packLots = lots.filter((l) => l.packKey === pack.key);
        const packLoose = items.filter((it) => it.packKey === pack.key && !it.lotKey);

        return (
          <Box
            key={pack.key}
            sx={{
              border: 1,
              borderColor: "primary.light",
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 1, py: 0.75, bgcolor: "action.selected" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                <Inventory2Icon fontSize="small" color="primary" />
                <TextField
                  size="small"
                  label="Nombre paca"
                  value={pack.name}
                  onChange={(e) => onUpdatePack(pack.key, { name: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <Tooltip title="Eliminar paca (productos vuelven a sin paca)">
                  <IconButton size="small" color="error" onClick={() => onRemovePack(pack.key)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {!pack.useLots && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.75 }}>
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
                </Box>
              )}

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
            </Box>

            <Box sx={{ p: 0.75, display: "flex", flexDirection: "column", gap: 1 }}>
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
                  {items
                    .filter((it) => it.packKey === pack.key)
                    .map((item) => (
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
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export { ZONE };
