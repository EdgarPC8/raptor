import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";

const ZONE = {
  FREE: "free",
  PACK: "pack",
  LOT: "lot",
};

function DropZone({ zoneType, zoneKey, children, onDropItem, sx = {}, emptyHint }) {
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
        if (lineId) onDropItem(lineId, zoneType, zoneKey, null);
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
      {emptyHint}
    </Box>
  );
}

function LeftSortControls({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  upTitle = "Subir",
  downTitle = "Bajar",
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        flexShrink: 0,
        alignSelf: "flex-start",
        mt: 0.1,
      }}
    >
      <Tooltip title={upTitle}>
        <span>
          <IconButton
            size="small"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            sx={{ p: 0.15, color: "text.secondary" }}
            aria-label={upTitle}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={downTitle}>
        <span>
          <IconButton
            size="small"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            sx={{ p: 0.15, color: "text.secondary" }}
            aria-label={downTitle}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

function DraggableLine({
  item,
  ivaRate,
  showIva = true,
  packs = [],
  canMoveUp,
  canMoveDown,
  onRemove,
  onUpdateField,
  onToggleIva,
  onMoveItem,
  onAssignItem,
  onDropItem,
  zoneType,
  zoneKey,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const lineTaxRate = Number(item.taxRate ?? ivaRate) || 0;
  const lineTotal =
    formatOrderLineTotal(item.quantity, item.unitPrice, item.discount) *
    (showIva && item.hasIva ? 1 + lineTaxRate / 100 : 1);

  const otherPacks = packs.filter((p) => p.key !== item.packKey);
  const inPack = Boolean(item.packKey);

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const lineId = e.dataTransfer.getData("text/lineId");
        if (!lineId || lineId === item.lineId) return;
        onDropItem?.(lineId, zoneType, zoneKey, item.lineId);
      }}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 0.5,
        py: 0.5,
        mb: 0.5,
        bgcolor: "background.paper",
      }}
    >
      <LeftSortControls
        canMoveUp={Boolean(canMoveUp && onMoveItem)}
        canMoveDown={Boolean(canMoveDown && onMoveItem)}
        onMoveUp={() => onMoveItem?.(item.lineId, -1)}
        onMoveDown={() => onMoveItem?.(item.lineId, 1)}
      />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 0.75, rowGap: 0.25 }}>
        <Box sx={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 0.25 }}>
          <Tooltip title="Arrastrar (manito)">
            <Box
              component="span"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/lineId", item.lineId);
                e.dataTransfer.effectAllowed = "move";
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                cursor: "grab",
                color: "text.secondary",
                px: 0.25,
                "&:active": { cursor: "grabbing" },
              }}
              aria-label="Arrastrar producto"
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Tooltip>
          <Typography variant="caption" fontWeight={600} sx={{ flex: 1, lineHeight: 1.2 }}>
            {item.name}
          </Typography>
          {(packs.length > 0 || inPack) && (
            <>
              <Tooltip title="Mover / paca">
                <IconButton
                  size="small"
                  sx={{ p: 0.25 }}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  aria-label="Opciones de paca"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                dense
              >
                {inPack && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onAssignItem?.(item.lineId, null);
                    }}
                  >
                    <ListItemIcon>
                      <ExitToAppIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sacar de la paca" secondary="Queda suelto" />
                  </MenuItem>
                )}
                {otherPacks.length > 0 && inPack && <Divider />}
                {otherPacks.map((p) => (
                  <MenuItem
                    key={p.key}
                    onClick={() => {
                      setMenuAnchor(null);
                      onAssignItem?.(item.lineId, { packKey: p.key, lotKey: null });
                    }}
                  >
                    <ListItemIcon>
                      <MoveToInboxIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={inPack ? `Pasar a «${p.name || "Paca"}»` : `Meter en «${p.name || "Paca"}»`}
                    />
                  </MenuItem>
                ))}
                {!inPack && otherPacks.length === 0 && packs.length === 0 && (
                  <MenuItem disabled>
                    <ListItemText primary="Creá una paca primero" />
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
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
        <TextField
          label="Desc. $"
          type="number"
          size="small"
          value={item.discount ?? 0}
          onChange={(e) => onUpdateField(item.lineId, "discount", e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: 0, step: "any" }}
          sx={{ width: 88 }}
        />
        {showIva && (
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
            label={`IVA ${lineTaxRate}%`}
          />
        )}
        <Typography variant="body2" fontWeight={700} sx={{ ml: "auto", minWidth: 72, textAlign: "right" }}>
          {formatProductPrice(lineTotal)}
        </Typography>
      </Box>
    </Box>
  );
}

function renderLineList({
  list,
  zoneType,
  zoneKey,
  ivaRate,
  showIva,
  packs,
  onRemoveItem,
  onUpdateItemField,
  onToggleItemIva,
  onMoveItem,
  onAssignItem,
  onDropItem,
}) {
  return list.map((item, index) => (
    <DraggableLine
      key={item.lineId}
      item={item}
      ivaRate={ivaRate}
      showIva={showIva}
      packs={packs}
      canMoveUp={index > 0}
      canMoveDown={index < list.length - 1}
      onRemove={onRemoveItem}
      onUpdateField={onUpdateItemField}
      onToggleIva={onToggleItemIva}
      onMoveItem={onMoveItem}
      onAssignItem={onAssignItem}
      onDropItem={onDropItem}
      zoneType={zoneType}
      zoneKey={zoneKey}
    />
  ));
}

/**
 * Tablero: productos libres + pacas (+ lotes opcionales) con drag & drop y flechas.
 */
export default function SupplierOrderItemsBoard({
  items,
  packs,
  lots,
  ivaRate,
  showIva = true,
  tourIdPrefix = "pedido-prov",
  helpText,
  onRemoveItem,
  onUpdateItemField,
  onToggleItemIva,
  onDropItem,
  onMoveItem,
  onAssignItem,
  onCreatePack,
  onUpdatePack,
  onRemovePack,
  onMovePack,
  onApplyPackTotal,
  onCreateLot,
  onUpdateLot,
  onRemoveLot,
  onOpenShoppingList,
}) {
  const freeItems = items.filter((it) => !it.packKey);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
      data-tour={`${tourIdPrefix}-packs`}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          Productos ({items.length})
        </Typography>
        {typeof onOpenShoppingList === "function" ? (
          <Tooltip title="Lista de pedido (copiar / PNG / PDF)">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={onOpenShoppingList}
                disabled={!items.length}
                aria-label="Lista de pedido"
                sx={{ border: 1, borderColor: "divider" }}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onCreatePack}
          data-tour={`${tourIdPrefix}-create-pack`}
        >
          Crear paca
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        {helpText || (
          <>
            Creá una paca vacía y meté productos con la manito ⠿, las flechas ↑↓ o el menú ⋮.
            También podés sacar ítems de una paca o pasarlos a otra. El valor total de la paca se
            reparte en los precios unitarios.
          </>
        )}
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
            Soltá aquí productos sueltos (fuera de paca).
          </Typography>
        ) : (
          renderLineList({
            list: freeItems,
            zoneType: ZONE.FREE,
            zoneKey: "free",
            ivaRate,
            showIva,
            packs,
            onRemoveItem,
            onUpdateItemField,
            onToggleItemIva,
            onMoveItem,
            onAssignItem,
            onDropItem,
          })
        )}
      </DropZone>

      {packs.map((pack, packIndex) => {
        const packLots = lots.filter((l) => l.packKey === pack.key);
        const packLoose = items.filter((it) => it.packKey === pack.key && !it.lotKey);
        const packItems = items.filter((it) => it.packKey === pack.key);
        const linesSum = packItems.reduce(
          (acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice, it.discount),
          0,
        );
        const expanded = pack.expanded !== false;

        return (
          <Box
            key={pack.key}
            data-tour={packIndex === 0 ? `${tourIdPrefix}-pack` : undefined}
            sx={{
              border: 1,
              borderColor: "primary.light",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 0.5,
                bgcolor: "action.selected",
                minHeight: 48,
                px: 0.5,
                py: 0.5,
              }}
            >
              <LeftSortControls
                canMoveUp={packIndex > 0 && Boolean(onMovePack)}
                canMoveDown={packIndex < packs.length - 1 && Boolean(onMovePack)}
                onMoveUp={() => onMovePack?.(pack.key, -1)}
                onMoveDown={() => onMovePack?.(pack.key, 1)}
                upTitle={
                  packs.length < 2
                    ? "Creá otra paca para reordenar"
                    : "Subir paca"
                }
                downTitle={
                  packs.length < 2
                    ? "Creá otra paca para reordenar"
                    : "Bajar paca"
                }
              />
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5, pt: 0.25 }}>
                <Tooltip title={expanded ? "Colapsar" : "Expandir"}>
                  <IconButton
                    size="small"
                    onClick={() => onUpdatePack(pack.key, { expanded: !expanded })}
                    aria-label={expanded ? "Colapsar paca" : "Expandir paca"}
                  >
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                  </IconButton>
                </Tooltip>
                <Inventory2Icon fontSize="small" color="primary" />
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  noWrap
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => onUpdatePack(pack.key, { expanded: !expanded })}
                >
                  {pack.name || "Paca"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  {packItems.length} prod. · {formatProductPrice(linesSum)}
                </Typography>
                <Tooltip title="Eliminar paca">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onRemovePack(pack.key)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {expanded ? (
            <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                size="small"
                label="Nombre paca"
                value={pack.name}
                onChange={(e) => onUpdatePack(pack.key, { name: e.target.value })}
                fullWidth
              />

              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "flex-start" }}
                data-tour={packIndex === 0 ? `${tourIdPrefix}-pack-meta` : undefined}
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
                      : "Sin productos aún — arrastrá o usá el menú ⋮"
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
                    {pack.expiresAt ? ` · vence ${pack.expiresAt}` : " · vacía hasta que metas productos"}
                  </Typography>
                  {packItems.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Arrastrá productos aquí o usá ⋮ en un ítem suelto → Meter en esta paca.
                    </Typography>
                  ) : (
                    renderLineList({
                      list: packItems,
                      zoneType: ZONE.PACK,
                      zoneKey: pack.key,
                      ivaRate,
                      showIva,
                      packs,
                      onRemoveItem,
                      onUpdateItemField,
                      onToggleItemIva,
                      onMoveItem,
                      onAssignItem,
                      onDropItem,
                    })
                  )}
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
                          renderLineList({
                            list: lotItems,
                            zoneType: ZONE.LOT,
                            zoneKey: lot.key,
                            ivaRate,
                            showIva,
                            packs,
                            onRemoveItem,
                            onUpdateItemField,
                            onToggleItemIva,
                            onMoveItem,
                            onAssignItem,
                            onDropItem,
                          })
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
                    {packLoose.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Vacío
                      </Typography>
                    ) : (
                      renderLineList({
                        list: packLoose,
                        zoneType: ZONE.PACK,
                        zoneKey: pack.key,
                        ivaRate,
                        showIva,
                        packs,
                        onRemoveItem,
                        onUpdateItemField,
                        onToggleItemIva,
                        onMoveItem,
                        onAssignItem,
                        onDropItem,
                      })
                    )}
                  </DropZone>
                </>
              )}
            </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

export { ZONE };
