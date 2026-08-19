/** Configuración del sistema: pestañas por categoría (extensible). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PreviewIcon from "@mui/icons-material/Preview";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { useSubscriptions } from "../hooks/useSubscriptions.js";
import {
  FEATURE_STATUS_HINT,
  getFeatureStatus,
  isFeatureUnlocked,
} from "../utils/entitlementFeatures.js";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import { uploadImageRequest, deleteImageRequest } from "../api/imgRequest.js";
import { buildImageUrl } from "../api/axios.js";
import AppTimeClockPanel from "../components/AppTimeClockPanel.jsx";
import NotificationToastSettings from "../components/NotificationToastSettings.jsx";
import SriBillingSettingsPanel from "../components/SriBillingSettingsPanel.jsx";
import ReceiptDetailPreviewDialog from "../components/settings/ReceiptDetailPreviewDialog.jsx";
import ThemePaletteEditor from "../components/settings/ThemePaletteEditor.jsx";
import PrintFormatToggle from "../components/saleReceipt/PrintFormatToggle.jsx";
import { PageSkeleton } from "../components/ContentSkeleton.jsx";
import TourHelpButton from "../components/TourHelpButton.jsx";
import { usePageTour } from "../hooks/usePageTour.js";
import { CONFIG_APP_TOUR_ID, getConfigAppTourSteps } from "../tours/configAppTour.js";
import { CONFIG_SRI_TOUR_ID, getConfigSriTourSteps } from "../tours/configSriTour.js";
import { APP_TIMEZONE_OPTIONS } from "../utils/appDateTime.js";
import {
  DEFAULT_RECEIPT_DETAIL_SETTINGS,
  normalizeReceiptDetailSettings,
  PRODUCT_NAME_CASE_OPTIONS,
} from "../utils/receiptDetailFormat.js";
import {
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
} from "../theme/themePalette.js";

const ALLOWED = new Set(["Administrador", "Programador"]);

/**
 * Pestañas de configuración (agregar más aquí a futuro).
 * id → query ?tab=…  |  legado: ?tab=app → marca
 */
const SETTINGS_TABS = [
  { id: "marca", label: "Marca", icon: <StorefrontIcon fontSize="small" />, saveKind: "app" },
  { id: "sistema", label: "Sistema", icon: <AccessTimeIcon fontSize="small" />, saveKind: "app" },
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
    id: "publico",
    label: "Público",
    icon: <PublicOutlinedIcon fontSize="small" />,
    saveKind: "app",
  },
  { id: "sri", label: "Facturación SRI", icon: <FactCheckIcon fontSize="small" />, saveKind: "sri" },
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
  const tab = resolveTabId(searchParams.get("tab"));
  const activeTabMeta = SETTINGS_TABS.find((t) => t.id === tab) || SETTINGS_TABS[0];
  const isSriTab = activeTabMeta.saveKind === "sri";
  const sriPanelRef = useRef(null);
  const [sriSaving, setSriSaving] = useState(false);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef(null);
  const iconFileRef = useRef(null);

  const pageReady = !loading && Boolean(form);

  const getAppTourSteps = useCallback(
    () =>
      getConfigAppTourSteps({
        goInventarioTab: () => {
          const next = new URLSearchParams(searchParams);
          next.set("tab", "inventario");
          setSearchParams(next, { replace: true });
        },
      }),
    [searchParams, setSearchParams],
  );

  const { startTour: startAppTour } = usePageTour({
    tourId: CONFIG_APP_TOUR_ID,
    getSteps: getAppTourSteps,
    enabled: pageReady && !isSriTab,
  });
  const { startTour: startSriTour } = usePageTour({
    tourId: CONFIG_SRI_TOUR_ID,
    getSteps: getConfigSriTourSteps,
    enabled: pageReady && isSriTab,
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
      });
    }
  }, [settings]);

  const multiStockFeatureStatus = useMemo(
    () => getFeatureStatus(subscription, "multi_stock"),
    [subscription],
  );
  const multiStockUnlocked = useMemo(
    () =>
      isFeatureUnlocked(multiStockFeatureStatus, {
        isProgrammer: user?.loginRol === "Programador",
      }),
    [multiStockFeatureStatus, user?.loginRol],
  );
  const multiStockAlreadyOn = Boolean(form?.multiStockEnabled);
  const multiStockCanToggleOff =
    multiStockAlreadyOn && user?.loginRol === "Programador";
  const multiStockSwitchDisabled =
    !multiStockUnlocked || (multiStockAlreadyOn && !multiStockCanToggleOff);

  const tabIndex = useMemo(
    () => SETTINGS_TABS.findIndex((t) => t.id === tab),
    [tab],
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
  const onReceiptDetailChange = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({
      ...f,
      receiptDetailSettings: {
        ...(f.receiptDetailSettings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
        [key]:
          key === "maxNameLength"
            ? Number(value) || 0
            : value,
      },
    }));
  };
  const onDefaultPrintFormat = (value) => {
    setForm((f) => ({
      ...f,
      receiptDetailSettings: {
        ...(f.receiptDetailSettings || DEFAULT_RECEIPT_DETAIL_SETTINGS),
        defaultPrintFormat: value,
      },
    }));
  };

  const persistSettings = async (patch, successMsg = "Configuración guardada") => {
    const payload = { ...form, ...patch };
    await toast({
      promise: (async () => {
        const { settings: next } = await updateAppSettings(payload);
        setForm((f) => ({
          ...f,
          ...patch,
          logoPath: next.logoPath ?? patch.logoPath ?? f.logoPath,
          iconPath: next.iconPath ?? patch.iconPath ?? f.iconPath,
        }));
        setSettings(next);
        await reload();
      })(),
      successMessage: successMsg,
      errorMessage: "No se pudo guardar la configuración",
    });
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
      <Box sx={{ maxWidth: 1040, mx: "auto", py: 3, px: 2 }}>
        <PageSkeleton />
      </Box>
    );
  }

  const logoPreview = form.logoPath ? buildImageUrl(form.logoPath) : activeApp.logoUrl;
  const iconPreview = form.iconPath
    ? buildImageUrl(form.iconPath)
    : activeApp.iconUrl || null;

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", py: 3, px: 2, pb: 10 }}>
      <Stack
        data-tour="config-header"
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mb: 0.5 }}
        flexWrap="wrap"
      >
        <Typography variant="h5" fontWeight={800}>
          Configuración
        </Typography>
        <TourHelpButton
          onClick={isSriTab ? startSriTour : startAppTour}
          title={isSriTab ? "Ver tutorial de SRI" : "Ver tutorial de configuración"}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          onChange={(_, i) => setTab(SETTINGS_TABS[i].id)}
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
          {SETTINGS_TABS.map((t) => (
            <Tab key={t.id} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 2.75 }, minHeight: 360 }}>
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
              >
                <NotificationToastSettings />
              </SettingsSection>

              <SettingsSection title="Operación" hint="Carpetas, caja y cliente mostrador.">
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
            {multiStockFeatureStatus !== "hidden" ? (
              <Box data-tour="config-multistock">
                <SettingsRow
                  label="Multistock (stock por local)"
                  description={
                    !multiStockUnlocked
                      ? FEATURE_STATUS_HINT[multiStockFeatureStatus] ||
                        "Aún no disponible para tu instalación."
                      : multiStockAlreadyOn
                        ? multiStockCanToggleOff
                          ? "Activo. Programador puede desactivar."
                          : "Activo. No se puede desactivar."
                        : "Modo clásico: stock en Productos. Activá solo con varios locales."
                  }
                  control={
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(form.multiStockEnabled)}
                          disabled={multiStockSwitchDisabled}
                          onChange={onToggle("multiStockEnabled")}
                        />
                      }
                      label={form.multiStockEnabled ? "Activado" : "Desactivado"}
                    />
                  }
                />
              </Box>
            ) : null}
            </SettingsSection>
          )}

          {tab === "comprobantes" && (
            <>
            <SettingsSection
              title="Impresión"
              hint="Tamaño de papel para factura, nota de venta y el resto del sistema (caja, pedidos, cobros)."
              tourId="config-receipt-print"
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
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
                label="Formato predeterminado"
                description="A4, ticket 80 mm o 55 mm. Se puede cambiar en cada impresión."
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
              title="Texto del detalle"
              hint="Cómo se ven los productos en factura / nota de venta. No cambia la BD."
              tourId="config-receipt-detail"
            >
              <SettingsRow
                label="Mayúsculas / minúsculas"
                description="Formato del nombre del producto en el comprobante."
                control={
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={form.receiptDetailSettings?.productNameCase || "as_stored"}
                    onChange={onReceiptDetailChange("productNameCase")}
                  >
                    {PRODUCT_NAME_CASE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                }
              />
              <SettingsRow
                label="Límite de caracteres"
                description="0 = sin límite. Útil en tickets angostos."
                control={
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={form.receiptDetailSettings?.maxNameLength ?? 0}
                    onChange={onReceiptDetailChange("maxNameLength")}
                    inputProps={{ min: 0, max: 200 }}
                  />
                }
              />
              {[
                ["showLineNumber", "Número de línea", "Muestra 1., 2., …"],
                ["showBarcode", "Código / barras", "Junto al nombre del producto"],
                ["showUnit", "Unidad de medida", "Abreviatura de la unidad"],
                ["trimSpaces", "Recortar espacios", "Inicio y final del nombre"],
                ["collapseSpaces", "Colapsar espacios", "Varios espacios → uno"],
                ["applyToFactura", "Aplicar a factura", "Factura electrónica SRI"],
                ["applyToNotaVenta", "Aplicar a nota de venta", "Comprobante interno"],
              ].map(([key, label, description]) => {
                const checked =
                  key === "showLineNumber" || key === "showBarcode" || key === "showUnit"
                    ? Boolean(form.receiptDetailSettings?.[key])
                    : form.receiptDetailSettings?.[key] !== false;
                return (
                  <SettingsRow
                    key={key}
                    label={label}
                    description={description}
                    control={
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Switch
                            size="small"
                            checked={checked}
                            onChange={onReceiptDetailChange(key)}
                          />
                        }
                        label={checked ? "Activado" : "Desactivado"}
                      />
                    }
                  />
                );
              })}
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
        </Box>
      </Paper>

      <ReceiptDetailPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        settings={form.receiptDetailSettings}
        businessName={form.alias || form.name || activeApp?.alias}
        onFormatChange={onDefaultPrintFormat}
      />

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
    </Box>
  );
}
