/**
 * Toast de aviso estilo “globo” (abajo derecha): título + descripción corta,
 * color del theme según el tipo. No cambia los snackbars de éxito/error.
 */
import { forwardRef, useCallback } from "react";
import { SnackbarContent, useSnackbar } from "notistack";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { notificationToastAccent } from "../utils/notificationToast.js";

const ICONS = {
  greeting: WbSunnyIcon,
  stock: Inventory2OutlinedIcon,
  credit: PaymentsOutlinedIcon,
  expiry: EventBusyIcon,
};

const NotificationSnack = forwardRef(function NotificationSnack(props, ref) {
  const { id, title, description, category, link, message } = props;
  const theme = useTheme();
  const navigate = useNavigate();
  const { closeSnackbar } = useSnackbar();
  const accent = notificationToastAccent(category, theme.palette);
  const Icon = ICONS[category] || NotificationsIcon;
  const heading = String(title || message || "Nueva notificación").trim();
  const body = String(description || "").trim();
  const paper =
    theme.palette.mode === "light"
      ? theme.palette.common?.white || "#fff"
      : theme.palette.background.paper;
  const tint = theme.palette.mode === "dark" ? 0.22 : 0.14;

  const onClose = useCallback(
    (event) => {
      event?.stopPropagation?.();
      closeSnackbar(id);
    },
    [closeSnackbar, id],
  );

  const onOpen = useCallback(() => {
    closeSnackbar(id);
    if (link) navigate(link);
  }, [closeSnackbar, id, link, navigate]);

  return (
    <SnackbarContent ref={ref} role="status">
      <Box
        onClick={onOpen}
        sx={{
          width: 360,
          maxWidth: "calc(100vw - 28px)",
          display: "flex",
          alignItems: "flex-start",
          gap: 1.25,
          px: 1.5,
          py: 1.4,
          borderRadius: 3,
          cursor: link ? "pointer" : "default",
          color: "text.primary",
          background: `linear-gradient(0deg, ${alpha(accent, tint)}, ${alpha(accent, tint)}), ${paper}`,
          border: `1px solid ${alpha(accent, theme.palette.mode === "dark" ? 0.55 : 0.4)}`,
          boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.45 : 0.18)}`,
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            bgcolor: accent,
          },
        }}
      >
        <Box
          sx={{
            ml: 0.5,
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(accent, theme.palette.mode === "dark" ? 0.22 : 0.14),
            color: accent,
          }}
        >
          <Icon sx={{ fontSize: 24 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, py: 0.15 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              pr: 2.5,
              color: accent,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {heading}
          </Typography>
          {body ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.35,
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {body}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          size="small"
          aria-label="Cerrar"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            color: "text.secondary",
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </SnackbarContent>
  );
});

export default NotificationSnack;
