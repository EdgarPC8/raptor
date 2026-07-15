/**
 * Inicio de sesión y selección de rol cuando la cuenta tiene varios roles.
 */
import { useState, useEffect } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { getPostLoginPath } from "../utils/postLoginPath.js";
import { SHELL_ONLY } from "../config/deployEnv.js";
import { raptorLogoUrl } from "../config/raptorBrand.js";
import {
  useSubscriptions,
  hasActiveSubscription,
} from "../hooks/useSubscriptions.js";

export default function Login() {
  const { activeApp } = useAppSettings();
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectingRole, setSelectingRole] = useState(false);
  const [roles, setRoles] = useState([]);

  const { signin, enterGuestMode, isAuthenticated, isGuest, user, errors } = useAuth();
  const { subscription, expired, isLoading: subLoading } = useSubscriptions();
  const navigate = useNavigate();

  useEffect(() => {
    if (SHELL_ONLY) {
      if (isGuest || isAuthenticated) navigate("/inicio", { replace: true });
      return;
    }
    if (subLoading) return;
    if (
      isAuthenticated &&
      hasActiveSubscription(subscription, expired)
    ) {
      navigate(getPostLoginPath(user?.loginRol), { replace: true });
    }
  }, [
    isAuthenticated,
    isGuest,
    navigate,
    user?.loginRol,
    subscription,
    expired,
    subLoading,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signin({ username, password });
    if (result?.selectRole) {
      setSelectingRole(true);
      setRoles(result.roles);
    } else if (result?.success) {
      // Sin plan: quedarse en la base (home). Con plan: panel.
      if (hasActiveSubscription(subscription, expired)) {
        navigate(getPostLoginPath(result.loginRol), { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  };

  const handleRoleSelect = async (roleId) => {
    const result = await signin({ username, password, selectedRoleId: roleId });
    if (result?.success) {
      if (hasActiveSubscription(subscription, expired)) {
        navigate(getPostLoginPath(result.loginRol), { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  };

  const BrandMark = ({ width = 280, onDark = true }) => {
    if (activeApp.brandWordmark || activeApp.offlineBrand) {
      return (
        <Box
          component="img"
          src={raptorLogoUrl(onDark)}
          alt={activeApp.alias || "Raptor"}
          sx={{
            width: { xs: Math.min(width, 220), sm: width },
            maxWidth: "100%",
            height: "auto",
            display: "block",
            filter: onDark
              ? `drop-shadow(0 8px 24px ${alpha("#000", 0.35)})`
              : "none",
            mb: onDark ? 0 : 1,
          }}
        />
      );
    }
    if (activeApp.logoUrl) {
      return (
        <Box
          component="img"
          src={activeApp.logoUrl}
          alt={activeApp.name}
          sx={{
            width,
            height: width,
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
            mb: onDark ? 0 : 1,
          }}
        />
      );
    }
    return (
      <Box
        sx={{
          width,
          height: width,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: onDark ? alpha("#fff", 0.18) : alpha(theme.palette.primary.main, 0.12),
          color: onDark ? "#fff" : theme.palette.primary.main,
          fontFamily: `'Fredoka', 'Nunito', sans-serif`,
          fontWeight: 800,
          fontSize: width * 0.42,
          letterSpacing: "-0.04em",
          userSelect: "none",
          mb: onDark ? 0 : 1,
        }}
        aria-label={activeApp.alias || "Raptor"}
      >
        {(activeApp.alias || "R").charAt(0)}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Panel izquierdo — marca */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          background: `linear-gradient(160deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${alpha(theme.palette.secondary.main, 0.85)} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            bgcolor: alpha("#fff", 0.06),
            top: -100,
            right: -100,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.secondary.main, 0.15),
            bottom: -80,
            left: -60,
          }}
        />
        <Box
          sx={{
            position: "relative",
            p: { xs: 2, md: 3 },
            borderRadius: activeApp.brandWordmark ? 3 : "50%",
            bgcolor: alpha("#fff", 0.1),
            boxShadow: `0 16px 48px ${alpha("#000", 0.25)}, 0 0 60px ${alpha(theme.palette.secondary.main, 0.35)}`,
            mb: 3,
            maxWidth: "92%",
          }}
        >
          <BrandMark width={320} onDark />
        </Box>
        {!activeApp.brandWordmark ? (
          <>
            <Typography variant="h4" fontWeight={800} color="#fff" textAlign="center" gutterBottom>
              {activeApp.name}
            </Typography>
            <Typography variant="body1" sx={{ color: alpha("#fff", 0.9), textAlign: "center", maxWidth: 320 }}>
              {activeApp.description}
            </Typography>
          </>
        ) : (
          <Typography variant="body1" sx={{ color: alpha("#fff", 0.9), textAlign: "center", maxWidth: 360 }}>
            {activeApp.description}
          </Typography>
        )}
      </Box>

      {/* Panel derecho — formulario */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 440px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4 },
          bgcolor: "background.paper",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 380,
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: { md: "none" }, textAlign: "center", mb: 3 }}>
            <BrandMark width={200} onDark={false} />
            {!activeApp.brandWordmark ? (
              <Typography variant="h6" fontWeight={800} color="primary">
                {activeApp.alias}
              </Typography>
            ) : null}
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            {selectingRole ? "Elige tu rol" : "Bienvenido"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectingRole
              ? "Tu cuenta tiene varios roles asignados."
              : SHELL_ONLY
                ? "Probá el modo invitado para recorrer módulos sin servidor."
                : "Ingresa con tu usuario del sistema."}
          </Typography>

          {!selectingRole ? (
            <>
              {SHELL_ONLY && (
                <>
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    Sin backend. Explorá la app como invitado. En Caja verás un tutorial la primera vez; luego puedes reabrirlo con el icono de la banderita.
                  </Alert>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{
                      mb: 2,
                      py: 1.4,
                      fontWeight: 800,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                    onClick={() => {
                      enterGuestMode();
                      navigate("/inicio", { replace: true });
                    }}
                  >
                    Entrar como invitado
                  </Button>
                </>
              )}
              {errors?.message && (
                <Alert
                  severity={errors.status === "info" ? "info" : "error"}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  {errors.message}
                </Alert>
              )}
              {!SHELL_ONLY ? (
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Usuario"
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Contraseña"
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 3,
                    py: 1.4,
                    fontWeight: 700,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  }}
                >
                  Iniciar sesión
                </Button>
              </Box>
              ) : null}
              <Button component={RouterLink} to="/home" fullWidth sx={{ mt: 2 }} color="inherit">
                Volver al inicio
              </Button>
            </>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  onClick={() => handleRoleSelect(role.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {role.name}
                </Button>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
