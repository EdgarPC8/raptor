/** Configuración del sistema: pestañas por categoría (extensible). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, Navigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  Avatar,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PreviewIcon from "@mui/icons-material/Preview";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { useSubscriptions } from "../hooks/useSubscriptions.js";
import {
  FEATURE_STATUS_HINT,
  getFeatureStatus,
  isFeatureUnlocked,
} from "../utils/entitlementFeatures.js";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import {
  getStoresRequest,
  updateStoreRequest,
} from "../api/inventoryControlRequest.js";
import { uploadImageRequest, deleteImageRequest } from "../api/imgRequest.js";
import { buildImageUrl } from "../api/axios.js";
import AppTimeClockPanel from "../components/AppTimeClockPanel.jsx";
import NotificationToastSettings from "../components/NotificationToastSettings.jsx";
import SriBillingSettingsPanel from "../components/SriBillingSettingsPanel.jsx";
import BackupsPage from "./BackupsPage.jsx";
import ReceiptDetailPreviewDialog from "../components/settings/ReceiptDetailPreviewDialog.jsx";
import ReceiptTableColumnsEditor from "../components/settings/ReceiptTableColumnsEditor.jsx";
import ThemePaletteEditor from "../components/settings/ThemePaletteEditor.jsx";
import KeyboardShortcutsEditor from "../components/settings/KeyboardShortcutsEditor.jsx";
import PrintFormatToggle from "../components/saleReceipt/PrintFormatToggle.jsx";
import { PageSkeleton } from "../components/ContentSkeleton.jsx";
import TourHelpButton from "../components/TourHelpButton.jsx";
import { usePageTour } from "../hooks/usePageTour.js";
import {
  configTourIdForTab,
  getConfigTabTourSteps,
} from "../tours/configAppTour.js";
import { CONFIG_SRI_TOUR_ID, getConfigSriTourSteps } from "../tours/configSriTour.js";
import { APP_TIMEZONE_OPTIONS } from "../utils/appDateTime.js";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
} from "../utils/receiptDetailFormat.js";
import {
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
} from "../theme/themePalette.js";
import { normalizeKeyboardShortcuts } from "../utils/keyboardShortcuts.js";
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
  storeHoldsInventory,
} from "../utils/storeLocationKind.js";
import { APP_ROUTES } from "../config/appRoutes.js";
import { APP_ID } from "../config/appInfo.js";

const ALLOWED = new Set(["Administrador", "Programador"]);
/** Multistock solo en EdDeli (desbloqueado por gestor). Store/Tienda = un local. */
const MULTI_STOCK_APP = APP_ID === "eddeli";

/**
 * Pestañas de configuración (agregar más aquí a futuro).
 * id → query ?tab=…  |  legado: ?tab=app → marca
 */
const SETTINGS_TABS = [
  { id: "marca", label: "Marca", icon: <StorefrontIcon fontSize="small" />, saveKind: "app" },
  { id: "sistema", label: "Sistema", icon: <AccessTimeIcon fontSize="small" />, saveKind: "app" },
  {
    id: "local",
    label: "Local",
    icon: <PlaceOutlinedIcon fontSize="small" />,
    saveKind: "app",
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: <Inventory2OutlinedIcon fontSize="small" />,
    saveKind: "app",
  },
  {
    id: "comprobantes",
    label: "Comprobantes",
    icon: <ReceiptLongOutlinedIcon fontSize="small" />,
    saveKind: "app",
  },
  {
    id: "teclado",
    label: "Teclado",
    icon: <KeyboardIcon fontSize="small" />,
    saveKind: "app",
  },
  {
    id: "publico",
    label: "Público",
    icon: <PublicOutlinedIcon fontSize="small" />,
    saveKind: "app",
  },
  { id: "sri", label: "Facturación SRI", icon: <FactCheckIcon fontSize="small" />, saveKind: "sri" },
  {
    id: "backups",
    label: "Backups",
    icon: <BackupOutlinedIcon fontSize="small" />,
    saveKind: "none",
    programmerOnly: true,
  },
];

const TAB_IDS = new Set(SETTINGS_TABS.map((t) => t.id));

function resolveTabId(raw) {
  if (!raw || raw === "app") return "marca";
  return TAB_IDS.has(raw) ? raw : "marca";
}

function SettingsSection({ title, hint, children, tourId }) {
  return (
    <Box data-tour={tourId} sx={{ mb: 2.5 }}>
      <Typography
        variant="overline"
        sx={{
          display: "block",
          letterSpacing: 1.2,
          fontWeight: 800,
          color: "text.secondary",
          mb: hint ? 0.25 : 1,
        }}
      >
        {title}
      </Typography>
      {hint ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          {hint}
        </Typography>
      ) : null}
      <Stack spacing={0.75}>{children}</Stack>
    </Box>
  );
}

/** Fila estilo menú de juego: etiqueta a la izquierda, control a la derecha. */
function SettingsRow({ label, description, control, align = "center", wide = false }) {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: align },
        justifyContent: "space-between",
        gap: { xs: 1, sm: 2 },
        px: { xs: 1.25, sm: 1.75 },
        py: 1.25,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.03),
        border: 1,
        borderColor: "divider",
        transition: "background-color 120ms ease, border-color 120ms ease",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
          borderColor: alpha(theme.palette.primary.main, 0.35),
        },
      })}
    >
      <Box sx={{ minWidth: 0, flex: 1, pr: { sm: 1 } }}>
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        {description ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          minWidth: { sm: wide ? 280 : 200 },
          maxWidth: { sm: wide ? 480 : 360 },
          width: { xs: "100%", sm: "auto" },
          display: "flex",
          justifyContent: { xs: "stretch", sm: "flex-end" },
          alignItems: "center",
        }}
      >
        {control}
      </Box>
    </Box>
  );
}

export default function AppSettingsPage() {
  const { user, toast } = useAuth();
  const { settings, activeApp, loading, reload, setSettings } = useAppSettings();
  const { subscription } = useSubscriptions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = resolveTabId(searchParams.get("tab"));
  const visibleTabs = useMemo(
    () =>
      SETTINGS_TABS.filter(
        (t) => !t.programmerOnly || user?.loginRol === "Programador",
      ),
    [user?.loginRol],
  );
  const tab = visibleTabs.some((t) => t.id === requestedTab)
    ? requestedTab
    : visibleTabs[0]?.id || "marca";
  const activeTabMeta = visibleTabs.find((t) => t.id === tab) || visibleTabs[0];
  const isSriTab = activeTabMeta.saveKind === "sri";
  const isBackupsTab = activeTabMeta.saveKind === "none";
  const sriPanelRef = useRef(null);
  const [sriSaving, setSriSaving] = useState(false);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [multiStockConfirmOpen, setMultiStockConfirmOpen] = useState(false);
  const [multiStockPrincipalId, setMultiStockPrincipalId] = useState("");
  const [multiStockStores, setMultiStockStores] = useState([]);
  const [multiStockStoresLoading, setMultiStockStoresLoading] = useState(false);
  const [multiStockUnifying, setMultiStockUnifying] = useState(false);
  const [localStores, setLocalStores] = useState([]);
  const [localStoresLoading, setLocalStoresLoading] = useState(false);
  const [localCodes, setLocalCodes] = useState({
    establishmentCode: "001",
    emissionPointCode: "001",
  });
  const [localCodesSaving, setLocalCodesSaving] = useState(false);
  const fileRef = useRef(null);
  const iconFileRef = useRef(null);

  const pageReady = !loading && Boolean(form);

  const activeTourId = isSriTab
    ? CONFIG_SRI_TOUR_ID
    : configTourIdForTab(tab);

  const getActiveTourSteps = useCallback(() => {
    if (isSriTab) return getConfigSriTourSteps();
    return getConfigTabTourSteps(tab);
  }, [isSriTab, tab]);

  const { startTour } = usePageTour({
    tourId: activeTourId,
    getSteps: getActiveTourSteps,
    enabled: pageReady && Boolean(activeTourId),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        alias: settings.alias || "",
        version: settings.version || "",
        description: settings.description || "",
        author: settings.author || "",
        logoPath: settings.logoPath || "",
        iconPath: settings.iconPath || "",
        phone: settings.phone || "",
        socialWhatsapp: settings.socials?.whatsapp || "",
        socialFacebook: settings.socials?.facebook || "",
        socialInstagram: settings.socials?.instagram || "",
        socialTiktok: settings.socials?.tiktok || "",
        socialEmail: settings.socials?.email || "",
        mediaFolderPrefix: settings.mediaFolderPrefix || "sistema",
        cajaQuickCategoryMatch: settings.cajaQuickCategoryMatch || "",
        walkInCustomerLabel: settings.walkInCustomerLabel || "Consumidor Final",
        timezone: settings.timezone || "America/Guayaquil",
        showPublicCatalog: settings.showPublicCatalog !== false,
        showPublicStoresPropia: settings.showPublicStoresPropia !== false,
        showPublicStoresVitrina: settings.showPublicStoresVitrina !== false,
        multiStockEnabled: Boolean(settings.multiStockEnabled),
        principalStoreId: settings.principalStoreId ?? null,
        showProductCostInSelect: Boolean(settings.showProductCostInSelect),
        moneyDisplayDecimals: Number(settings.moneyDisplayDecimals ?? 2),
        moneyRoundingMode: settings.moneyRoundingMode || "up",
        ordersAllowDeliverStockAdjust: Boolean(settings.ordersAllowDeliverStockAdjust),
        financeAllowAdminCorrections: settings.financeAllowAdminCorrections !== false,
        suggestOpenPackOnPosShortage: Boolean(settings.suggestOpenPackOnPosShortage),
        cajaAllowCreateProductFromSelect: Boolean(settings.cajaAllowCreateProductFromSelect),
        cajaAllowCreateProductFromScan: Boolean(settings.cajaAllowCreateProductFromScan),
        cajaAllowEditProductFromCart: Boolean(settings.cajaAllowEditProductFromCart),
        cajaSuggestUpdateProductPrice: Boolean(settings.cajaSuggestUpdateProductPrice),
        cajaAllowPercentDiscount: Boolean(settings.cajaAllowPercentDiscount),
        notificationsToastGreeting: Boolean(settings.notificationsToastGreeting),
        notificationsToastStock: Boolean(settings.notificationsToastStock),
        notificationsToastCredit: Boolean(settings.notificationsToastCredit),
        notificationsToastExpiry: Boolean(settings.notificationsToastExpiry),
        notificationsCreditEnabled: settings.notificationsCreditEnabled !== false,
        notificationsExpiryEnabled: Boolean(settings.notificationsExpiryEnabled),
        receiptDetailSettings: normalizeReceiptDetailSettings(
          settings.receiptDetailSettings || DEFAULT_RECEIPT_DETAIL_SETTINGS,
        ),
        themePalette: normalizeThemePalette(
          settings.themePalette || DEFAULT_THEME_PALETTE,
        ),
        keyboardShortcuts: normalizeKeyboardShortcuts(settings.keyboardShortcuts),
      });
    }
  }, [settings]);

  const multiStockFeatureStatus = useMemo(
    () => (MULTI_STOCK_APP ? getFeatureStatus(subscription, "multi_stock") : "hidden"),
    [subscription],
  );
  const multiStockUnlocked = useMemo(
    () =>
      MULTI_STOCK_APP &&
      isFeatureUnlocked(multiStockFeatureStatus, {
        isProgrammer: user?.loginRol === "Programador",
      }),
    [multiStockFeatureStatus, user?.loginRol],
  );
  const multiStockAlreadyOn = Boolean(MULTI_STOCK_APP && form?.multiStockEnabled);
  const multiStockCanToggleOff = multiStockAlreadyOn && ALLOWED.has(user?.loginRol);
  const multiStockSwitchDisabled = multiStockAlreadyOn
    ? !multiStockCanToggleOff
    : !multiStockUnlocked;
  const showMultiStockToggle = MULTI_STOCK_APP && multiStockFeatureStatus !== "hidden";

  const loadMultiStockPrincipalStores = useCallback(async () => {
    setMultiStockStoresLoading(true);
    try {
      const { data } = await getStoresRequest();
      const list = (Array.isArray(data) ? data : []).filter(
        (s) => s.isActive !== false && storeHoldsInventory(s.locationKind),
      );
      setMultiStockStores(sortStoresByKind(list));
    } catch {
      setMultiStockStores([]);
    } finally {
      setMultiStockStoresLoading(false);
    }
  }, []);

  const loadLocalTabStores = useCallback(async () => {
    setLocalStoresLoading(true);
    try {
      const { data } = await getStoresRequest();
      const list = sortStoresByKind(Array.isArray(data) ? data : []);
      setLocalStores(list);
    } catch {
      setLocalStores([]);
    } finally {
      setLocalStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "local") loadLocalTabStores();
  }, [tab, loadLocalTabStores]);

  const propiaStores = useMemo(
    () =>
      localStores.filter(
        (s) =>
          s.isActive !== false &&
          normalizeLocationKind(s.locationKind) === "propia",
      ),
    [localStores],
  );

  const selectedPrincipalId = useMemo(() => {
    const fromForm = form?.principalStoreId;
    if (fromForm != null && fromForm !== "") return String(fromForm);
    if (propiaStores.length === 1) return String(propiaStores[0].id);
    return "";
  }, [form?.principalStoreId, propiaStores]);

  const selectedPrincipalStore = useMemo(() => {
    if (!selectedPrincipalId) return null;
    return (
      localStores.find((s) => String(s.id) === String(selectedPrincipalId)) ||
      null
    );
  }, [localStores, selectedPrincipalId]);

  useEffect(() => {
    if (!selectedPrincipalStore) {
      setLocalCodes({ establishmentCode: "001", emissionPointCode: "001" });
      return;
    }
    setLocalCodes({
      establishmentCode: String(selectedPrincipalStore.establishmentCode || "001"),
      emissionPointCode: String(selectedPrincipalStore.emissionPointCode || "001"),
    });
  }, [selectedPrincipalStore]);

  // Un solo local propia → enlazar fijo a SRI si aún no hay principal.
  useEffect(() => {
    if (tab !== "local" || localStoresLoading || !form || !user) return;
    if (!ALLOWED.has(user.loginRol)) return;
    if (form.principalStoreId) return;
    if (propiaStores.length !== 1) return;
    const onlyId = propiaStores[0].id;
    let cancelled = false;
    (async () => {
      try {
        const { settings: next } = await updateAppSettings({
          principalStoreId: onlyId,
        });
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          principalStoreId: next.principalStoreId ?? onlyId,
        }));
        setSettings(next);
        await reload();
        await loadLocalTabStores();
      } catch {
        /* silencioso: el usuario puede enlazar a mano */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar sin principal
  }, [tab, localStoresLoading, propiaStores.length, form?.principalStoreId, user?.loginRol]);

  const tabIndex = useMemo(
    () => visibleTabs.findIndex((t) => t.id === tab),
    [tab, visibleTabs],
  );

  if (!ALLOWED.has(user?.loginRol)) return <Navigate to="/" replace />;

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === "marca") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const onChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const onToggle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));
  const onDefaultPrintFormat = (value) => {
    setForm((f) => ({
      ...f,
      receiptDetailSettings: {
        ...(f.receiptDetailSettings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
        defaultPrintFormat: value,
      },
    }));
  };
  const onReceiptDetailSettingsReplace = (next) => {
    setForm((f) => ({
      ...f,
      receiptDetailSettings: normalizeReceiptDetailSettings(next),
    }));
  };

  const persistSettings = async (patch, successMsg = "Configuración guardada") => {
    const { principalStoreId: patchPrincipal, ...settingsPatch } = patch || {};
    const payload = { ...form, ...settingsPatch };
    const nextPrincipal =
      patchPrincipal !== undefined
        ? patchPrincipal
        : form?.principalStoreId ?? null;
    if (nextPrincipal != null && nextPrincipal !== "") {
      payload.principalStoreId = nextPrincipal;
    } else if (patchPrincipal === null) {
      payload.principalStoreId = null;
    }
    await toast({
      promise: (async () => {
        const { settings: next } = await updateAppSettings(payload);
        setForm((f) => ({
          ...f,
          ...settingsPatch,
          principalStoreId: next.principalStoreId ?? f.principalStoreId,
          logoPath: next.logoPath ?? settingsPatch.logoPath ?? f.logoPath,
          iconPath: next.iconPath ?? settingsPatch.iconPath ?? f.iconPath,
        }));
        setSettings(next);
        await reload();
      })(),
      successMessage: successMsg,
      errorMessage: "No se pudo guardar la configuración",
    });
  };

  const onSelectPrincipalStore = async (storeId) => {
    const id = storeId ? Number(storeId) : null;
    setForm((f) => ({ ...f, principalStoreId: id }));
    await persistSettings(
      { principalStoreId: id },
      "Local vinculado a facturación SRI",
    );
    await loadLocalTabStores();
  };

  const onSaveLocalCodes = async () => {
    if (!selectedPrincipalStore?.id) return;
    setLocalCodesSaving(true);
    try {
      const fd = new FormData();
      fd.append(
        "establishmentCode",
        String(localCodes.establishmentCode || "001").replace(/\D/g, "").padStart(3, "0").slice(-3),
      );
      fd.append(
        "emissionPointCode",
        String(localCodes.emissionPointCode || "001").replace(/\D/g, "").padStart(3, "0").slice(-3),
      );
      fd.append("locationKind", "propia");
      await toast({
        promise: (async () => {
          await updateStoreRequest(selectedPrincipalStore.id, fd);
          await persistSettings(
            { principalStoreId: selectedPrincipalStore.id },
            "Códigos del local sincronizados con SRI",
          );
          await loadLocalTabStores();
        })(),
        successMessage: "Códigos del local guardados",
        errorMessage: "No se pudieron guardar los códigos del local",
      });
    } finally {
      setLocalCodesSaving(false);
    }
  };

  const onMultiStockToggle = (e) => {
    const next = e.target.checked;
    if (!next && form?.multiStockEnabled) {
      setMultiStockPrincipalId("");
      setMultiStockConfirmOpen(true);
      loadMultiStockPrincipalStores();
      return;
    }
    onToggle("multiStockEnabled")(e);
  };

  const confirmDisableMultiStock = async () => {
    setMultiStockUnifying(true);
    try {
      await persistSettings(
        {
          multiStockEnabled: false,
          ...(multiStockPrincipalId ? { principalStoreId: multiStockPrincipalId } : {}),
        },
        "Stock unificado en un solo local",
      );
      setMultiStockConfirmOpen(false);
    } catch {
      /* toast */
    } finally {
      setMultiStockUnifying(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await persistSettings({});
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandImage = useCallback(
    async ({ file, kind }) => {
      if (!file || !form) return;
      const isLogo = kind === "logo";
      const setBusy = isLogo ? setLogoBusy : setIconBusy;
      const folderName = isLogo ? "logos" : "icons";
      const fileName = isLogo ? "logo" : "icon";
      const pathKey = isLogo ? "logoPath" : "iconPath";
      const label = isLogo ? "Logo" : "Icono";

      setBusy(true);
      try {
        const prefix = String(form.mediaFolderPrefix || "sistema").trim() || "sistema";
        const res = await toast({
          promise: uploadImageRequest({
            file,
            folder: `${prefix}/${folderName}`,
            name: fileName,
            replace: true,
          }),
          successMessage: "Imagen subida",
          errorMessage: `No se pudo subir el ${label.toLowerCase()}`,
        });
        const relPath = res?.data?.data?.relativePath;
        if (!relPath) throw new Error(`Ruta de ${label.toLowerCase()} inválida`);

        const oldPath = form[pathKey]?.trim();
        if (oldPath && oldPath !== relPath) {
          try {
            await deleteImageRequest(oldPath);
          } catch {
            /* opcional */
          }
        }

        await persistSettings({ [pathKey]: relPath }, `${label} actualizado`);
      } catch {
        /* toast */
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, toast],
  );

  const onLogoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await uploadBrandImage({ file, kind: "logo" });
  };

  const onIconSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await uploadBrandImage({ file, kind: "icon" });
  };

  const onDeleteLogo = async () => {
    if (!form?.logoPath) return;
    if (!window.confirm("¿Eliminar el logo actual?")) return;

    setLogoBusy(true);
    try {
      try {
        await deleteImageRequest(form.logoPath);
      } catch {
        /* puede no existir */
      }
      await persistSettings({ logoPath: "" }, "Logo eliminado");
    } finally {
      setLogoBusy(false);
    }
  };

  const onDeleteIcon = async () => {
    if (!form?.iconPath) return;
    if (!window.confirm("¿Eliminar el icono actual?")) return;

    setIconBusy(true);
    try {
      try {
        await deleteImageRequest(form.iconPath);
      } catch {
        /* puede no existir */
      }
      await persistSettings({ iconPath: "" }, "Icono eliminado");
    } finally {
      setIconBusy(false);
    }
  };

  const onFooterSave = async () => {
    if (!isSriTab) {
      await onSave();
      return;
    }
    setSriSaving(true);
    try {
      await sriPanelRef.current?.save?.();
    } finally {
      setSriSaving(false);
    }
  };

  const footerBusy = isSriTab ? sriSaving : saving;
  const footerLabel = isSriTab
    ? footerBusy
      ? "Guardando…"
      : "Guardar facturación SRI"
    : footerBusy
      ? "Guardando…"
      : "Guardar configuración";

  if (loading || !form) {
    return (
      <Box sx={{ width: "100%", maxWidth: 1480, mx: "auto", py: 1, px: { xs: 0.5, sm: 1 }, pb: 2 }}>
        <PageSkeleton />
      </Box>
    );
  }

  const logoPreview = form.logoPath ? buildImageUrl(form.logoPath) : activeApp.logoUrl;
  const iconPreview = form.iconPath
    ? buildImageUrl(form.iconPath)
    : activeApp.iconUrl || null;

  return (
    <Box sx={{ width: "100%", maxWidth: 1480, mx: "auto", pt: 0.5, px: { xs: 0.5, sm: 1 }, pb: 10 }}>
      <Stack
        data-tour="config-header"
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mb: 0.25 }}
        flexWrap="wrap"
      >
        <Typography variant="h5" fontWeight={800}>
          Configuración
        </Typography>
        <TourHelpButton
          onClick={startTour}
          title={
            isSriTab
              ? "Ver tutorial de Facturación SRI"
              : `Ver tutorial de ${activeTabMeta?.label || "configuración"}`
          }
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Elegí una categoría arriba. Se irán sumando más opciones según el módulo.
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          mb: 2,
        }}
      >
        <Tabs
          data-tour="config-tabs"
          value={tabIndex < 0 ? 0 : tabIndex}
          onChange={(_, i) => setTab(visibleTabs[i].id)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={(theme) => ({
            minHeight: 56,
            px: 0.5,
            bgcolor:
              theme.palette.mode === "dark"
                ? alpha(theme.palette.common.black, 0.35)
                : alpha(theme.palette.common.black, 0.04),
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              minHeight: 56,
              textTransform: "none",
              fontWeight: 700,
              letterSpacing: 0.2,
              opacity: 0.72,
              px: 2,
              gap: 0.75,
              transition: "opacity 120ms ease, color 120ms ease",
              "&.Mui-selected": {
                opacity: 1,
                color: "primary.main",
              },
            },
          })}
        >
          {visibleTabs.map((t) => (
            <Tab key={t.id} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 1.25, sm: 1.75 }, minHeight: 360 }}>
          {tab === "marca" && (
            <>
              <SettingsSection
                title="Identidad visual"
                hint="Logo de marca e icono (favicon). Preparado para más assets de marca."
              >
                <Box data-tour="config-logo">
                  <SettingsRow
                    align="flex-start"
                    label="Logo de marca"
                    description="Imagen de marca (suele incluir el nombre). No es el favicon."
                    control={
                      <Stack spacing={1} alignItems={{ xs: "stretch", sm: "flex-end" }}>
                        <Avatar
                          src={logoPreview}
                          alt={form.alias || "Logo"}
                          variant="rounded"
                          sx={{ width: 72, height: 72, border: 1, borderColor: "divider" }}
                        />
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            onClick={() => fileRef.current?.click()}
                            disabled={logoBusy}
                          >
                            {logoBusy ? "…" : form.logoPath ? "Cambiar" : "Subir"}
                          </Button>
                          {form.logoPath ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={onDeleteLogo}
                              disabled={logoBusy}
                            >
                              Eliminar
                            </Button>
                          ) : null}
                        </Stack>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          hidden
                          onChange={onLogoSelected}
                        />
                      </Stack>
                    }
                  />
                </Box>
                <Box data-tour="config-icon">
                  <SettingsRow
                    align="flex-start"
                    label="Icono de la app"
                    description="Emblema cuadrado para la pestaña del navegador (favicon)."
                    control={
                      <Stack spacing={1} alignItems={{ xs: "stretch", sm: "flex-end" }}>
                        <Avatar
                          src={iconPreview || undefined}
                          alt={form.alias || "Icono"}
                          variant="rounded"
                          sx={{
                            width: 56,
                            height: 56,
                            border: 1,
                            borderColor: "divider",
                            bgcolor: "action.hover",
                            fontSize: "0.7rem",
                          }}
                        >
                          {!iconPreview ? "Icono" : null}
                        </Avatar>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            onClick={() => iconFileRef.current?.click()}
                            disabled={iconBusy}
                          >
                            {iconBusy ? "…" : form.iconPath ? "Cambiar" : "Subir"}
                          </Button>
                          {form.iconPath ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={onDeleteIcon}
                              disabled={iconBusy}
                            >
                              Eliminar
                            </Button>
                          ) : null}
                        </Stack>
                        <input
                          ref={iconFileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                          hidden
                          onChange={onIconSelected}
                        />
                      </Stack>
                    }
                  />
                </Box>
              </SettingsSection>

              <SettingsSection
                title="Datos del negocio"
                hint="Nombre y datos que se muestran en la app."
                tourId="config-identity"
              >
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      size="small"
                      label="Nombre completo"
                      fullWidth
                      value={form.name}
                      onChange={onChange("name")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      label="Alias corto"
                      fullWidth
                      value={form.alias}
                      onChange={onChange("alias")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      label="Versión"
                      fullWidth
                      value={form.version}
                      onChange={onChange("version")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      size="small"
                      label="Autor / desarrollador"
                      fullWidth
                      value={form.author}
                      onChange={onChange("author")}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      label="Descripción"
                      fullWidth
                      multiline
                      minRows={2}
                      value={form.description}
                      onChange={onChange("description")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small"
                      label="Teléfono"
                      fullWidth
                      value={form.phone}
                      onChange={onChange("phone")}
                    />
                  </Grid>
                </Grid>
              </SettingsSection>

              <SettingsSection title="Redes" hint="Enlaces públicos del negocio.">
                <Grid container spacing={1.5}>
                  {[
                    ["socialWhatsapp", "WhatsApp URL"],
                    ["socialFacebook", "Facebook URL"],
                    ["socialInstagram", "Instagram URL"],
                    ["socialTiktok", "TikTok URL"],
                    ["socialEmail", "Email"],
                  ].map(([key, label]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <TextField
                        size="small"
                        label={label}
                        fullWidth
                        value={form[key]}
                        onChange={onChange(key)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </SettingsSection>

              <SettingsSection
                title="Paleta de colores"
                hint="Define la marca visual en claro, oscuro y neón. Se guarda en el servidor y se cachea en el navegador."
              >
                <ThemePaletteEditor
                  value={form.themePalette || DEFAULT_THEME_PALETTE}
                  onChange={(next) =>
                    setForm((f) => ({
                      ...f,
                      themePalette: normalizeThemePalette(next),
                    }))
                  }
                />
              </SettingsSection>
            </>
          )}

          {tab === "sistema" && (
            <>
              <SettingsSection
                title="Hora y zona"
                hint="Todas las fechas del sistema usan esta zona."
                tourId="config-timezone"
              >
                <SettingsRow
                  label="Zona horaria (IANA)"
                  description="Ej. America/Guayaquil para Ecuador"
                  control={
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={form.timezone}
                      onChange={onChange("timezone")}
                    >
                      {APP_TIMEZONE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  }
                />
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "action.hover" }}>
                  <AppTimeClockPanel timezone={form.timezone} />
                </Paper>
              </SettingsSection>

              <SettingsSection
                title="Notificaciones"
                hint="Bandeja y toasts abajo a la derecha, por tipo de aviso."
                tourId="config-notifications"
              >
                <NotificationToastSettings />
              </SettingsSection>

              <SettingsSection
                title="Operación"
                hint="Carpetas, caja y cliente mostrador."
                tourId="config-sistema-operacion"
              >
                <SettingsRow
                  label="Carpeta de medios"
                  description="Prefijo en src/img (logos, icons, qr)."
                  control={
                    <TextField
                      size="small"
                      fullWidth
                      value={form.mediaFolderPrefix}
                      onChange={onChange("mediaFolderPrefix")}
                    />
                  }
                />
                <SettingsRow
                  label="Filtro accesos rápidos caja"
                  description="Subcadena de categoría. Vacío = todos."
                  control={
                    <TextField
                      size="small"
                      fullWidth
                      value={form.cajaQuickCategoryMatch}
                      onChange={onChange("cajaQuickCategoryMatch")}
                    />
                  }
                />
                <SettingsRow
                  label="Cliente mostrador"
                  description="Etiqueta del consumidor final en caja."
                  control={
                    <TextField
                      size="small"
                      fullWidth
                      value={form.walkInCustomerLabel}
                      onChange={onChange("walkInCustomerLabel")}
                    />
                  }
                />
              </SettingsSection>
            </>
          )}

          {tab === "local" && (
            <>
              <SettingsSection
                title="Local de operación"
                hint={
                  showMultiStockToggle
                    ? "Un local o varios (multistock). El local principal se enlaza con Facturación SRI (establecimiento / punto de emisión)."
                    : "Local de operación enlazado a Facturación SRI (establecimiento / punto de emisión)."
                }
                tourId="config-local"
              >
                {showMultiStockToggle ? (
                  <Box data-tour="config-multistock">
                    <SettingsRow
                      label="Varios locales (multistock)"
                      description={
                        !multiStockUnlocked
                          ? FEATURE_STATUS_HINT[multiStockFeatureStatus] ||
                            "Aún no disponible para tu instalación."
                          : multiStockAlreadyOn
                            ? "Activo: stock separado por local. Al desactivar se unifica en un solo local."
                            : "Desactivado: un solo local de operación (modo clásico)."
                      }
                      control={
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={Boolean(form.multiStockEnabled)}
                              disabled={multiStockSwitchDisabled}
                              onChange={onMultiStockToggle}
                            />
                          }
                          label={form.multiStockEnabled ? "Varios locales" : "Un local"}
                        />
                      }
                    />
                  </Box>
                ) : null}

                <SettingsRow
                  label="Local vinculado a SRI"
                  description={
                    showMultiStockToggle && form.multiStockEnabled
                      ? "Elegí la sucursal propia cuyos códigos 001-001 usan la facturación electrónica."
                      : "Local fijo de caja y facturación SRI."
                  }
                  wide
                  control={
                    localStoresLoading ? (
                      <CircularProgress size={22} />
                    ) : (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={selectedPrincipalId}
                        onChange={(e) => onSelectPrincipalStore(e.target.value)}
                        disabled={!propiaStores.length}
                        helperText={
                          !propiaStores.length
                            ? "No hay sucursales propias activas. Creá una en Locales."
                            : selectedPrincipalStore
                              ? `${locationKindLabel(selectedPrincipalStore.locationKind)} · ${selectedPrincipalStore.address || "Sin dirección"}`
                              : "Seleccioná un local"
                        }
                      >
                        {propiaStores.map((s) => (
                          <MenuItem key={s.id} value={String(s.id)}>
                            {s.name}
                            {form?.principalStoreId != null &&
                            Number(s.id) === Number(form.principalStoreId)
                              ? " · enlazado SRI"
                              : ""}
                            {` (#${s.id})`}
                          </MenuItem>
                        ))}
                      </TextField>
                    )
                  }
                />

                <SettingsRow
                  label="Establecimiento / Punto emisión"
                  description="Mismos códigos que en Facturación SRI. Al guardar se sincronizan."
                  wide
                  control={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <TextField
                        size="small"
                        label="Estab."
                        value={localCodes.establishmentCode}
                        onChange={(e) =>
                          setLocalCodes((c) => ({
                            ...c,
                            establishmentCode: e.target.value.replace(/\D/g, "").slice(0, 3),
                          }))
                        }
                        inputProps={{ maxLength: 3 }}
                        sx={{ width: 88 }}
                        disabled={!selectedPrincipalStore}
                      />
                      <Typography color="text.secondary">-</Typography>
                      <TextField
                        size="small"
                        label="Pto"
                        value={localCodes.emissionPointCode}
                        onChange={(e) =>
                          setLocalCodes((c) => ({
                            ...c,
                            emissionPointCode: e.target.value.replace(/\D/g, "").slice(0, 3),
                          }))
                        }
                        inputProps={{ maxLength: 3 }}
                        sx={{ width: 88 }}
                        disabled={!selectedPrincipalStore}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={onSaveLocalCodes}
                        disabled={!selectedPrincipalStore || localCodesSaving}
                      >
                        {localCodesSaving ? "…" : "Guardar códigos"}
                      </Button>
                    </Stack>
                  }
                />

                <Alert severity="info" sx={{ mt: 0.5 }}>
                  Gestión completa de locales (propia / bodega / vitrina):{" "}
                  <Button
                    component={RouterLink}
                    to={APP_ROUTES.channel.stores}
                    size="small"
                    sx={{ textTransform: "none", p: 0, minWidth: 0, verticalAlign: "baseline" }}
                  >
                    Canal → Locales
                  </Button>
                  . Régimen, RUC y firma: pestaña Facturación SRI.
                </Alert>
              </SettingsSection>
            </>
          )}

          {tab === "inventario" && (
            <SettingsSection
              title="Inventario y montos"
              hint="Cómo se muestran precios y cómo se maneja el stock."
              tourId="config-inventario"
            >
              <SettingsRow
                label="Decimales a mostrar"
                description="Solo en pantalla (0–6). En BD se guardan hasta 6."
                control={
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={Number(form.moneyDisplayDecimals ?? 2)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        moneyDisplayDecimals: Number(e.target.value),
                      }))
                    }
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n} decimal{n === 1 ? "" : "es"}
                      </MenuItem>
                    ))}
                  </TextField>
                }
              />
              <SettingsRow
                label="Redondeo al mostrar"
                description="Por defecto: hacia arriba"
                control={
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={form.moneyRoundingMode || "up"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        moneyRoundingMode: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="up">Hacia arriba</MenuItem>
                    <MenuItem value="down">Hacia abajo</MenuItem>
                    <MenuItem value="nearest">Al más cercano</MenuItem>
                  </TextField>
                }
              />
              <SettingsRow
                label="Mostrar costo (prov.) en selects"
                description="Útil al armar pedidos o compras."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.showProductCostInSelect)}
                        onChange={onToggle("showProductCostInSelect")}
                      />
                    }
                    label={form.showProductCostInSelect ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Correcciones financieras (Admin)"
                description="Permite a Administrador anular cobros/pagos y eliminar pedidos borrando ingresos/gastos vinculados en Finanzas. Programador siempre puede."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={form.financeAllowAdminCorrections !== false}
                        onChange={onToggle("financeAllowAdminCorrections")}
                      />
                    }
                    label={form.financeAllowAdminCorrections !== false ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Autocompletar stock"
                description="Si falta stock al cobrar en caja o al entregar un pedido, permite registrar un ajuste e completar. Solo Admin/Programador."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.ordersAllowDeliverStockAdjust)}
                        onChange={onToggle("ordersAllowDeliverStockAdjust")}
                      />
                    }
                    label={form.ordersAllowDeliverStockAdjust ? "Activado" : "Desactivado"}
                  />
                }
              />
              <Box data-tour="config-open-pack">
                <SettingsRow
                  label="Sugerir abrir empaque en caja"
                  description="Si al cobrar falta stock de un producto y hay un empaque enlazado con stock en el local, pregunta si deseas abrirlo para reponer unidades. Requiere enlace en Insumos y presentaciones."
                  control={
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(form.suggestOpenPackOnPosShortage)}
                          onChange={onToggle("suggestOpenPackOnPosShortage")}
                        />
                      }
                      label={form.suggestOpenPackOnPosShortage ? "Activado" : "Desactivado"}
                  />
                }
              />
            </Box>
            <Box data-tour="config-caja-products">
              <SettingsRow
                label="Crear producto desde el buscador de caja"
                description="Muestra un botón + al lado del select de producto. Abre el formulario completo de productos. Apagado por defecto."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.cajaAllowCreateProductFromSelect)}
                        onChange={onToggle("cajaAllowCreateProductFromSelect")}
                      />
                    }
                    label={form.cajaAllowCreateProductFromSelect ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Crear producto si el escáner no lo encuentra"
                description="Si pasás un código que no está en el catálogo, pregunta si querés crearlo con ese código (nombre y precio). Apagado por defecto."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.cajaAllowCreateProductFromScan)}
                        onChange={onToggle("cajaAllowCreateProductFromScan")}
                      />
                    }
                    label={form.cajaAllowCreateProductFromScan ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Editar producto desde el carrito de caja"
                description="En cada línea del carrito aparece un lápiz para editar el producto (útil si no tiene código de barras). Apagado por defecto."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.cajaAllowEditProductFromCart)}
                        onChange={onToggle("cajaAllowEditProductFromCart")}
                      />
                    }
                    label={form.cajaAllowEditProductFromCart ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Descuento por porcentaje en caja"
                description="Muestra columna de descuento % por producto y un % sobre el total de la compra. Apagado por defecto."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.cajaAllowPercentDiscount)}
                        onChange={onToggle("cajaAllowPercentDiscount")}
                      />
                    }
                    label={form.cajaAllowPercentDiscount ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Sugerir actualizar precio al cobrar"
                description="Si en el carrito cambiaste el precio y no coincide con el del catálogo, al cobrar pregunta si querés actualizar esos productos. Podés decir que sí o que no. Apagado por defecto."
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(form.cajaSuggestUpdateProductPrice)}
                        onChange={onToggle("cajaSuggestUpdateProductPrice")}
                      />
                    }
                    label={form.cajaSuggestUpdateProductPrice ? "Activado" : "Desactivado"}
                  />
                }
              />
            </Box>
            </SettingsSection>
          )}

          {tab === "teclado" && (
            <SettingsSection
              title="Atajos de teclado"
              hint="Comandos rápidos por módulo. Por ahora: Caja (ventas en mostrador)."
              tourId="config-teclado"
            >
              <KeyboardShortcutsEditor
                value={form.keyboardShortcuts}
                onChange={(next) => setForm((f) => ({ ...f, keyboardShortcuts: next }))}
              />
            </SettingsSection>
          )}

          {tab === "comprobantes" && (
            <>
            <SettingsSection
              title="Impresión"
              hint="Un solo tamaño para todo: predeterminado al imprimir y el que editas en Columnas. A4, 80 mm y 55 mm guardan layouts aparte."
              tourId="config-receipt-print"
            >
              <Stack
                direction="row"
                justifyContent="flex-end"
                sx={{ mb: 0.5 }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PreviewIcon />}
                  onClick={() => setPreviewOpen(true)}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Ver plantilla de prueba
                </Button>
              </Stack>
              <SettingsRow
                label="Formato"
                description="Vale para caja, pedidos y para editar columnas abajo. Cada tamaño tiene su propio layout."
                align="flex-start"
                wide
                control={
                  <PrintFormatToggle
                    value={form.receiptDetailSettings?.defaultPrintFormat || "a4"}
                    onChange={onDefaultPrintFormat}
                  />
                }
              />
            </SettingsSection>
            <SettingsSection
              title="Columnas y anchos"
              hint="Izquierda: columnas, RIDE y texto del detalle. Derecha: vista previa. El tamaño es el de Impresión (arriba)."
              tourId="config-receipt-columns"
            >
              <ReceiptTableColumnsEditor
                settings={form.receiptDetailSettings}
                onChange={onReceiptDetailSettingsReplace}
                businessName={form.alias || form.name || activeApp?.alias}
              />
            </SettingsSection>
            </>
          )}

          {tab === "publico" && (
            <SettingsSection
              title="Vista pública"
              hint="Qué ve un visitante sin sesión (inicio y menú público)."
              tourId="config-public"
            >
              <SettingsRow
                label="Mostrar catálogo"
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={Boolean(form.showPublicCatalog)}
                        onChange={onToggle("showPublicCatalog")}
                      />
                    }
                    label={form.showPublicCatalog ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Mostrar sucursales propias"
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={Boolean(form.showPublicStoresPropia)}
                        onChange={onToggle("showPublicStoresPropia")}
                      />
                    }
                    label={form.showPublicStoresPropia ? "Activado" : "Desactivado"}
                  />
                }
              />
              <SettingsRow
                label="Mostrar vitrinas"
                control={
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={Boolean(form.showPublicStoresVitrina)}
                        onChange={onToggle("showPublicStoresVitrina")}
                      />
                    }
                    label={form.showPublicStoresVitrina ? "Activado" : "Desactivado"}
                  />
                }
              />
            </SettingsSection>
          )}

          {tab === "sri" && <SriBillingSettingsPanel ref={sriPanelRef} />}

          {tab === "backups" && user?.loginRol === "Programador" ? (
            <Box data-tour="config-backups">
              <BackupsPage embedded />
            </Box>
          ) : null}
        </Box>
      </Paper>

      <Dialog
        open={multiStockConfirmOpen}
        onClose={() => !multiStockUnifying && setMultiStockConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          ¿Unificar en un solo stock?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            El stock de todas las <strong>sucursales y bodegas</strong> del negocio se sumará en
            un único stock por producto. Las <strong>vitrinas no se modifican</strong> (no llevan
            inventario).
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            Podés elegir un local principal donde quedará todo el stock, o dejar en automático
            para usar el local de operación actual.
          </DialogContentText>
          <TextField
            select
            fullWidth
            size="small"
            label="Local principal (opcional)"
            value={multiStockPrincipalId}
            onChange={(e) => setMultiStockPrincipalId(e.target.value)}
            disabled={multiStockStoresLoading || multiStockUnifying}
            helperText={
              multiStockStoresLoading
                ? "Cargando locales…"
                : "Vacío = automático (local de operación actual)"
            }
          >
            <MenuItem value="">Automático (local de operación actual)</MenuItem>
            {multiStockStores.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} — {locationKindLabel(s.locationKind)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setMultiStockConfirmOpen(false)}
            disabled={multiStockUnifying}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void confirmDisableMultiStock()}
            disabled={multiStockUnifying || multiStockStoresLoading}
            startIcon={
              multiStockUnifying ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {multiStockUnifying ? "Unificando…" : "Sí, unificar stock"}
          </Button>
        </DialogActions>
      </Dialog>

      <ReceiptDetailPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        settings={form.receiptDetailSettings}
        businessName={form.alias || form.name || activeApp?.alias}
        onFormatChange={onDefaultPrintFormat}
      />

      {!isBackupsTab ? (
      <Button
        data-tour="config-save"
        variant="contained"
        size="large"
        startIcon={<SaveIcon />}
        onClick={() => void onFooterSave()}
        disabled={footerBusy}
        sx={{
          position: "fixed",
          right: { xs: 16, sm: 28 },
          bottom: { xs: 20, sm: 28 },
          zIndex: (t) => t.zIndex.snackbar,
          borderRadius: 999,
          px: 2.5,
          py: 1.25,
          boxShadow: 6,
          textTransform: "none",
          fontWeight: 700,
          "&:hover": { boxShadow: 10 },
        }}
      >
        {footerLabel}
      </Button>
      ) : null}
    </Box>
  );
}
