import React from "react";
// Inicializa el motor styled de MUI antes de cualquier componente (evita
// "styled_default is not a function" con el prebundle de Vite).
import "@mui/material/styles/styled";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { Toaster } from "react-hot-toast";
import { ThemeModeProvider } from "./theme/ThemeModeProvider.jsx";
import { AppSettingsProvider, useAppSettings } from "./context/AppSettingsContext.jsx";
import NotificationSnack from "./components/NotificationSnack.jsx";
import { normalizeToastPosition, toastAnchorOf } from "./utils/toastPosition.js";
import App from "./App.jsx";
import "./styles/print.css";

import { BRAND_NAME } from "./config/raptorBrand.js";

const appTitle = String(import.meta.env.VITE_APP_NAME || BRAND_NAME).trim();
if (appTitle) document.title = appTitle;

function ToastHost({ children }) {
  const { activeApp } = useAppSettings();
  const position = normalizeToastPosition(activeApp?.toastPosition);
  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={3000}
      anchorOrigin={toastAnchorOf(position)}
      Components={{ appNotification: NotificationSnack }}
    >
      {children}
      <Toaster key={position} position={position} />
    </SnackbarProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <ThemeModeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <ToastHost>
            <App />
          </ToastHost>
        </BrowserRouter>
      </ThemeModeProvider>
    </AppSettingsProvider>
  </React.StrictMode>,
);
