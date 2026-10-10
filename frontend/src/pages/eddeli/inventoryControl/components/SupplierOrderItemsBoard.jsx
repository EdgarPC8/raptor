import { useMemo, useState } from "react";
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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
import SortIcon from "@mui/icons-material/Sort";
import {
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import {
  listFreeBoardItemKeys,
  moveFreeItemToPosition,
  sortFreeBoardItems,
} from "./orderPackUtils.js";

const ZONE = {
  FREE: "free",
  PACK: "pack",
  LOT: "lot",
};

function DropZone({ zoneType, zoneKey, children, onDropItem, sx = {}, emptyHint }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <Box
      onDragEnter={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        const lineId = e.dataTransfer.getData("text/lineId");
        if (lineId) onDropItem(lineId, zoneType, zoneKey, null);
      }}
      sx={{
        minHeight: 48,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: isOver ? "primary.main" : "divider",
        p: 0.75,
        bgcolor: isOver ? "action.hover" : undefined,
        transition: "border-color 0.12s, background-color 0.12s",
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
        justifyContent: "center",
        flexShrink: 0,
        gap: 0,
      }}
    >
      <Tooltip title={upTitle}>
        <span>
          <IconButton
            size="small"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            sx={{ p: 0, color: "text.secondary", height: 16, width: 18 }}
            aria-label={upTitle}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={downTitle}>
        <span>
          <IconButton
            size="small"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            sx={{ p: 0, color: "text.secondary", height: 16, width: 18 }}
            aria-label={downTitle}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
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
  onEditProduct,
  zoneType,
  zoneKey,
  positionNumber = null,
  showPositions = false,
  onMoveToPosition = null,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [posDraft, setPosDraft] = useState("");
  const lineTaxRate = Number(item.taxRate ?? ivaRate) || 0;
  const lineTotal =
    formatOrderLineTotal(item.quantity, item.unitPrice, item.discount) *
    (showIva && item.hasIva ? 1 + lineTaxRate / 100 : 1);

  const otherPacks = packs.filter((p) => p.key !== item.packKey);
  const inPack = Boolean(item.packKey);

  const denseFieldSx = {
    width: 64,
    "& .MuiInputBase-input": { py: 0.35, px: 0.75, fontSize: "0.8rem" },
    "& .MuiInputLabel-root": { fontSize: "0.7rem" },
  };

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
        alignItems: "center",
        gap: 0.35,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 0.35,
        py: 0.25,
        mb: 0.35,
        bgcolor: "background.paper",
      }}
    >
      <LeftSortControls
        canMoveUp={Boolean(canMoveUp && onMoveItem)}
        canMoveDown={Boolean(canMoveDown && onMoveItem)}
        onMoveUp={() => onMoveItem?.(item.lineId, -1)}
        onMoveDown={() => onMoveItem?.(item.lineId, 1)}
      />
      {showPositions && positionNumber != null ? (
        <Tooltip title="Escribí la posición destino y Enter (ej. 4 = arriba del actual #4)">
          <TextField
            size="small"
            label="#"
            value={posDraft !== "" ? posDraft : String(positionNumber)}
            onFocus={() => setPosDraft(String(positionNumber))}
            onChange={(e) => setPosDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={() => setPosDraft("")}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const dest = Number(posDraft || positionNumber);
              if (Number.isFinite(dest) && dest >= 1) {
                onMoveToPosition?.(positionNumber, dest);
              }
              setPosDraft("");
              e.currentTarget.blur();
            }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ inputMode: "numeric", style: { textAlign: "center", padding: "2px 4px" } }}
            sx={{
              width: 40,
              flexShrink: 0,
              "& .MuiInputBase-input": { fontSize: "0.75rem", fontWeight: 700 },
              "& .MuiInputLabel-root": { fontSize: "0.65rem" },
            }}
          />
        </Tooltip>
      ) : null}
      <Box
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/lineId", item.lineId);
          e.dataTransfer.effectAllowed = "move";
        }}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          color: "text.secondary",
          cursor: "grab",
          flexShrink: 0,
          "&:active": { cursor: "grabbing" },
        }}
        aria-label="Arrastrar producto"
      >
        <DragIndicatorIcon sx={{ fontSize: 18 }} />
      </Box>
      <Typography
        variant="caption"
        fontWeight={600}
        title={item.name}
        sx={{
          flex: "1 1 88px",
          minWidth: 72,
          maxWidth: 160,
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.name}
      </Typography>
      <TextField
        label="Cant."
        type="number"
        size="small"
        value={item.quantity}
        onChange={(e) => onUpdateField(item.lineId, "quantity", e.target.value)}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0.01, step: "any" }}
        sx={denseFieldSx}
      />
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: "0.7rem" }}>
        {item.unitLabel || "u."}
      </Typography>
      <TextField
        label="P.u."
        type="number"
        size="small"
        value={item.unitPrice}
        onChange={(e) => onUpdateField(item.lineId, "unitPrice", e.target.value)}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, step: "any" }}
        sx={{ ...denseFieldSx, width: 72 }}
      />
      <TextField
        label="Desc."
        type="number"
        size="small"
        value={item.discount ?? 0}
        onChange={(e) => onUpdateField(item.lineId, "discount", e.target.value)}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, step: "any" }}
        sx={{ ...denseFieldSx, width: 60 }}
      />
      {showIva && (
        <FormControlLabel
          sx={{
            ml: 0,
            mr: 0,
            flexShrink: 0,
            "& .MuiFormControlLabel-label": { fontSize: "0.68rem" },
          }}
          control={
            <Checkbox
              size="small"
              sx={{ p: 0.15 }}
              checked={Boolean(item.hasIva)}
              onChange={(e) => onToggleIva(item.lineId, e.target.checked)}
            />
          }
          label={`IVA`}
        />
      )}
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{ flexShrink: 0, minWidth: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
      >
        {formatProductPrice(lineTotal)}
      </Typography>
      {typeof onEditProduct === "function" && item.productId != null && (
        <Tooltip title="Editar producto">
          <IconButton
            size="small"
            color="primary"
            sx={{ p: 0.15 }}
            onClick={() => onEditProduct(item.productId, item)}
            aria-label="Editar producto"
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
      {(packs.length > 0 || inPack) && (
        <>
          <Tooltip title="Mover / paca">
            <IconButton
              size="small"
              sx={{ p: 0.15 }}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Opciones de paca"
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
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
        <IconButton size="small" color="error" sx={{ p: 0.15 }} onClick={() => onRemove(item.lineId)}>
          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
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
  onEditProduct,
  canMoveUpFor,
  canMoveDownFor,
  positionByLineId = null,
  showPositions = false,
  onMoveToPosition = null,
}) {
  return list.map((item, index) => (
    <DraggableLine
      key={item.lineId}
      item={item}
      ivaRate={ivaRate}
      showIva={showIva}
      packs={packs}
      canMoveUp={canMoveUpFor ? canMoveUpFor(item, index) : index > 0}
      canMoveDown={canMoveDownFor ? canMoveDownFor(item, index) : index < list.length - 1}
      onRemove={onRemoveItem}
      onUpdateField={onUpdateItemField}
      onToggleIva={onToggleItemIva}
      onMoveItem={onMoveItem}
      onAssignItem={onAssignItem}
      onDropItem={onDropItem}
      onEditProduct={onEditProduct}
      zoneType={zoneType}
      zoneKey={zoneKey}
      positionNumber={positionByLineId?.get?.(item.lineId) ?? null}
      showPositions={showPositions}
      onMoveToPosition={onMoveToPosition}
    />
  ));
}

/**
 * Tablero: productos libres + pacas intercalados (+ lotes) con drag & drop y flechas.
 */
export default function SupplierOrderItemsBoard({
  items,
  packs,
  lots,
  boardOrder = null,
  ivaRate,
  showIva = true,
  tourIdPrefix = "pedido-prov",
  helpText,
  onEditProduct = null,
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
  onBoardOrderChange = null,
}) {
  const [packDropKey, setPackDropKey] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [showPositions, setShowPositions] = useState(false);

  const resolvedBoardOrder = boardOrder?.length
    ? boardOrder
    : [
        ...items.filter((it) => !it.packKey).map((it) => ({ type: "item", key: it.lineId })),
        ...packs.map((pack) => ({ type: "pack", key: pack.key })),
      ];

  const itemsById = new Map(items.map((it) => [it.lineId, it]));
  const packsByKey = new Map(packs.map((pack) => [pack.key, pack]));
  const freeKeys = useMemo(
    () => listFreeBoardItemKeys(resolvedBoardOrder, items),
    [resolvedBoardOrder, items],
  );
  const positionByLineId = useMemo(() => {
    const map = new Map();
    freeKeys.forEach((key, i) => map.set(key, i + 1));
    return map;
  }, [freeKeys]);

  const applyBoardOrder = (nextOrder) => {
    if (typeof onBoardOrderChange === "function" && nextOrder && nextOrder !== resolvedBoardOrder) {
      onBoardOrderChange(nextOrder);
    }
  };

  const handleSort = (mode) => {
    setSortMenuAnchor(null);
    applyBoardOrder(sortFreeBoardItems(resolvedBoardOrder, items, mode));
  };

  const handleMoveToPosition = (fromPos, toPos) => {
    applyBoardOrder(moveFreeItemToPosition(resolvedBoardOrder, items, fromPos, toPos));
  };

  const lineListExtras = {
    onEditProduct,
    positionByLineId,
    showPositions: showPositions && typeof onBoardOrderChange === "function",
    onMoveToPosition: handleMoveToPosition,
  };
  const firstPackKey = packs[0]?.key;
  const canReorder = typeof onBoardOrderChange === "function" && freeKeys.length > 1;

  const renderPackCard = (pack, boardIndex) => {
    const packLots = lots.filter((l) => l.packKey === pack.key);
    const packLoose = items.filter((it) => it.packKey === pack.key && !it.lotKey);
    const packItems = items.filter((it) => it.packKey === pack.key);
    const linesSum = packItems.reduce(
      (acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice, it.discount),
      0,
    );
    const expanded = pack.expanded !== false;

    const packFieldSx = {
      "& .MuiInputBase-input": { py: 0.35, px: 0.75, fontSize: "0.8rem" },
      "& .MuiInputLabel-root": { fontSize: "0.7rem" },
      "& .MuiFormHelperText-root": { mt: 0.15, fontSize: "0.65rem" },
    };

    return (
      <Box
        key={pack.key}
        data-tour={pack.key === firstPackKey ? `${tourIdPrefix}-pack` : undefined}
        sx={{
          border: 1,
          borderColor: "primary.light",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box
          onDragEnter={(e) => {
            e.preventDefault();
            setPackDropKey(pack.key);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setPackDropKey(pack.key);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPackDropKey(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPackDropKey(null);
            const lineId = e.dataTransfer.getData("text/lineId");
            if (lineId) onDropItem?.(lineId, ZONE.PACK, pack.key, null);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.35,
            bgcolor: packDropKey === pack.key ? "action.hover" : "action.selected",
            outline: packDropKey === pack.key ? "2px solid" : "none",
            outlineColor: "primary.main",
            minHeight: 32,
            px: 0.35,
            py: 0.2,
            transition: "background-color 0.12s, outline-color 0.12s",
          }}
        >
          <LeftSortControls
            canMoveUp={boardIndex > 0 && Boolean(onMovePack)}
            canMoveDown={boardIndex < resolvedBoardOrder.length - 1 && Boolean(onMovePack)}
            onMoveUp={() => onMovePack?.(pack.key, -1)}
            onMoveDown={() => onMovePack?.(pack.key, 1)}
            upTitle="Subir paca"
            downTitle="Bajar paca"
          />
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.35 }}>
            <Tooltip title={expanded ? "Colapsar" : "Expandir"}>
              <IconButton
                size="small"
                sx={{ p: 0.15 }}
                onClick={() => onUpdatePack(pack.key, { expanded: !expanded })}
                aria-label={expanded ? "Colapsar paca" : "Expandir paca"}
              >
                <ExpandMoreIcon
                  sx={{
                    fontSize: 18,
                    transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.15s",
                  }}
                />
              </IconButton>
            </Tooltip>
            <Inventory2Icon sx={{ fontSize: 16 }} color="primary" />
            <Typography
              variant="caption"
              fontWeight={700}
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                cursor: "pointer",
                userSelect: "none",
                lineHeight: 1.2,
              }}
              onClick={() => onUpdatePack(pack.key, { expanded: !expanded })}
            >
              {pack.name || "Paca"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap", fontSize: "0.7rem" }}
            >
              {packItems.length} · {formatProductPrice(linesSum)}
            </Typography>
            <Tooltip title="Eliminar paca">
              <IconButton size="small" color="error" sx={{ p: 0.15 }} onClick={() => onRemovePack(pack.key)}>
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {expanded ? (
          <Box sx={{ p: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}
              data-tour={pack.key === firstPackKey ? `${tourIdPrefix}-pack-meta` : undefined}
            >
              <TextField
                size="small"
                label="Nombre"
                value={pack.name}
                onChange={(e) => onUpdatePack(pack.key, { name: e.target.value })}
                sx={{ ...packFieldSx, flex: "1 1 100px", minWidth: 90 }}
              />
              {!pack.useLots && (
                <>
                  <TextField
                    size="small"
                    label="Lote"
                    value={pack.lotCode || ""}
                    onChange={(e) => onUpdatePack(pack.key, { lotCode: e.target.value })}
                    sx={{ ...packFieldSx, width: 88 }}
                  />
                  <TextField
                    size="small"
                    label="Vence"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={pack.expiresAt || ""}
                    onChange={(e) => onUpdatePack(pack.key, { expiresAt: e.target.value })}
                    sx={{ ...packFieldSx, width: 118 }}
                  />
                  <TextField
                    size="small"
                    label="Elab."
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={pack.manufacturedAt || ""}
                    onChange={(e) => onUpdatePack(pack.key, { manufacturedAt: e.target.value })}
                    sx={{ ...packFieldSx, width: 118 }}
                  />
                </>
              )}
              <TextField
                size="small"
                label="Valor $"
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
                helperText={packItems.length ? `Σ ${formatProductPrice(linesSum)}` : "Sin prod."}
                sx={{ ...packFieldSx, width: 96 }}
              />
              <Tooltip title="Aplicar valor a precios unitarios">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={!onApplyPackTotal || packItems.length === 0}
                    onClick={() => onApplyPackTotal?.(pack.key, pack.totalPrice)}
                    sx={{ p: 0.25 }}
                    aria-label="Aplicar valor de paca"
                  >
                    <CheckIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <FormControlLabel
                sx={{
                  ml: 0.25,
                  mr: 0,
                  "& .MuiFormControlLabel-label": { fontSize: "0.7rem" },
                }}
                control={
                  <Checkbox
                    size="small"
                    sx={{ p: 0.25 }}
                    checked={Boolean(pack.useLots)}
                    onChange={(e) => onUpdatePack(pack.key, { useLots: e.target.checked })}
                  />
                }
                label="Varios lotes"
              />
            </Box>

            {!pack.useLots ? (
              <DropZone
                zoneType={ZONE.PACK}
                zoneKey={pack.key}
                onDropItem={onDropItem}
                sx={{ bgcolor: "background.paper", minHeight: 28, py: 0.25, px: 0.5 }}
              >
                {packItems.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                    Arrastrá productos aquí
                  </Typography>
                ) : (
                  renderLineList({
                    list: packItems,
                    zoneType: ZONE.PACK,
                    zoneKey: pack.key,
                    ivaRate,
                    showIva,
                    packs,
                    ...lineListExtras,
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
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => onCreateLot(pack.key)}
                    sx={{ py: 0, minHeight: 26, fontSize: "0.7rem" }}
                  >
                    Lote
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
                      sx={{ bgcolor: "background.paper", py: 0.35, px: 0.5 }}
                    >
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.35, alignItems: "center" }}>
                        <TextField
                          size="small"
                          label="Lote"
                          value={lot.code || ""}
                          onChange={(e) => onUpdateLot(lot.key, { code: e.target.value })}
                          sx={{ ...packFieldSx, width: 88 }}
                        />
                        <TextField
                          size="small"
                          label="Vence"
                          type="date"
                          required
                          InputLabelProps={{ shrink: true }}
                          value={lot.expiresAt || ""}
                          onChange={(e) => onUpdateLot(lot.key, { expiresAt: e.target.value })}
                          sx={{ ...packFieldSx, width: 118 }}
                        />
                        <TextField
                          size="small"
                          label="Elab."
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={lot.manufacturedAt || ""}
                          onChange={(e) => onUpdateLot(lot.key, { manufacturedAt: e.target.value })}
                          sx={{ ...packFieldSx, width: 118 }}
                        />
                        <Tooltip title="Eliminar lote">
                          <IconButton size="small" color="error" sx={{ p: 0.15 }} onClick={() => onRemoveLot(lot.key)}>
                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {lotItems.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                          Arrastrá aquí
                        </Typography>
                      ) : (
                        renderLineList({
                          list: lotItems,
                          zoneType: ZONE.LOT,
                          zoneKey: lot.key,
                          ivaRate,
                          showIva,
                          packs,
                          ...lineListExtras,
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
                  sx={{ bgcolor: "action.hover", minHeight: 24, py: 0.2, px: 0.5 }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", display: "block", mb: 0.25 }}>
                    Sin lote
                  </Typography>
                  {packLoose.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                      —
                    </Typography>
                  ) : (
                    renderLineList({
                      list: packLoose,
                      zoneType: ZONE.PACK,
                      zoneKey: pack.key,
                      ivaRate,
                      showIva,
                      packs,
                      ...lineListExtras,
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
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
      data-tour={`${tourIdPrefix}-packs`}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
        <Typography variant="caption" fontWeight={700} sx={{ flex: "1 1 auto", minWidth: 0 }}>
          Productos ({items.length})
        </Typography>
        {typeof onBoardOrderChange === "function" ? (
          <FormControlLabel
            sx={{
              m: 0,
              mr: 0.25,
              "& .MuiFormControlLabel-label": { fontSize: "0.68rem" },
            }}
            control={
              <Checkbox
                size="small"
                sx={{ p: 0.25 }}
                checked={showPositions}
                onChange={(e) => setShowPositions(e.target.checked)}
                disabled={freeKeys.length === 0}
              />
            }
            label="Posiciones"
          />
        ) : null}
        {typeof onBoardOrderChange === "function" ? (
          <>
            <Tooltip title="Ordenar productos sueltos">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={!canReorder}
                  onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                  aria-label="Ordenar"
                  sx={{ border: 1, borderColor: "divider", p: 0.35 }}
                >
                  <SortIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={() => setSortMenuAnchor(null)}
              dense
            >
              <MenuItem onClick={() => handleSort("alpha-asc")}>Nombre A → Z</MenuItem>
              <MenuItem onClick={() => handleSort("alpha-desc")}>Nombre Z → A</MenuItem>
              <MenuItem onClick={() => handleSort("price-asc")}>Precio menor → mayor</MenuItem>
              <MenuItem onClick={() => handleSort("price-desc")}>Precio mayor → menor</MenuItem>
              <Divider />
              <MenuItem onClick={() => handleSort("reverse")}>Invertir orden</MenuItem>
            </Menu>
          </>
        ) : null}
        {typeof onOpenShoppingList === "function" ? (
          <Tooltip title="Lista de pedido (copiar / PNG / PDF)">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={onOpenShoppingList}
                disabled={!items.length}
                aria-label="Lista de pedido"
                sx={{ border: 1, borderColor: "divider", p: 0.35 }}
              >
                <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip
          title={
            helpText ||
            "Arrastrá a una paca, usá ↑↓ o el menú ⋮. Soltá arriba para sacar de una paca."
          }
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onCreatePack}
            data-tour={`${tourIdPrefix}-create-pack`}
            sx={{ py: 0.15, minHeight: 28 }}
          >
            Paca
          </Button>
        </Tooltip>
      </Box>
      {showPositions && freeKeys.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
          Con posiciones: tocá el #, escribí el destino (ej. 4) y Enter. Solo productos sueltos.
        </Typography>
      ) : null}

      <DropZone
        zoneType={ZONE.FREE}
        zoneKey="free"
        onDropItem={onDropItem}
        sx={{ bgcolor: "action.hover", minHeight: 22, py: 0.15, px: 0.5 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
          Soltá aquí para sacar de una paca
        </Typography>
      </DropZone>

      {resolvedBoardOrder.map((entry, boardIndex) => {
        if (entry.type === "pack") {
          const pack = packsByKey.get(entry.key);
          return pack ? renderPackCard(pack, boardIndex) : null;
        }
        const item = itemsById.get(entry.key);
        if (!item || item.packKey) return null;
        return (
          <Box key={item.lineId}>
            {renderLineList({
              list: [item],
              zoneType: ZONE.FREE,
              zoneKey: "free",
              ivaRate,
              showIva,
              packs,
              ...lineListExtras,
              onRemoveItem,
              onUpdateItemField,
              onToggleItemIva,
              onMoveItem,
              onAssignItem,
              onDropItem,
              canMoveUpFor: () => boardIndex > 0,
              canMoveDownFor: () => boardIndex < resolvedBoardOrder.length - 1,
            })}
          </Box>
        );
      })}
    </Box>
  );
}

export { ZONE };
