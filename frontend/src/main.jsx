import React from "react";
// Inicializa el motor styled de MUI antes de cualquier componente (evita
// "styled_default is not a function" con el prebundle de Vite).
import "@mui/material/styles/styled";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { Toaster } from "react-hot-toast";
import { ThemeModeProvider } from "./theme/ThemeModeProvider.jsx";
import { AppSettingsProvider } from "./context/AppSettingsContext.jsx";
import App from "./App.jsx";
import "./styles/print.css";

const appTitle = String(import.meta.env.VITE_APP_NAME || "Raptor").trim();
if (appTitle) document.title = appTitle;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <ThemeModeProvider>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
            <App />
            <Toaster position="bottom-right" />
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeModeProvider>
    </AppSettingsProvider>
  </React.StrictMode>,
);
