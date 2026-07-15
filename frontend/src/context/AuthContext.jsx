/**
 * Sesión global: login, perfil, rol activo, modo invitado y toasts unificados.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { useSnackbar } from "notistack";
import { loginRequest, getSessionRequest } from "../api/userRequest.js";
import { getAccount } from "../api/accountRequest.js";
import { changeRole as changeRoleRequest } from "../api/authRequest.js";
import { buildImageUrl, clearToken, getToken, setToken } from "../api/axios.js";
import { getApiErrorMessage, getApiSuccessMessage } from "../utils/apiMessages.js";
import { SHELL_ONLY } from "../config/deployEnv.js";
import {
  GUEST_USER,
  readGuestSession,
  writeGuestSession,
} from "../config/guestMode.js";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};

function applyGuestUser(setters) {
  const { setUser, setIsAuthenticated, setProfileImageUser, setIsLoading } = setters;
  setUser({ ...GUEST_USER });
  setIsAuthenticated(true);
  setProfileImageUser(null);
  setIsLoading(false);
}

export function AuthProvider({ children }) {
  const [errors, setErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profileImageUser, setProfileImageUser] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const isGuest = Boolean(user?.isGuest);

  const loadUserProfile = async () => {
    try {
      const session = await getSessionRequest();
      const { data } = await getAccount(session.data.accountId, session.data.rolId);
      const u = data.user || {};
      setUser({
        firstName: u.firstName,
        secondName: u.secondName,
        firstLastName: u.firstLastName,
        secondLastName: u.secondLastName,
        ci: u.ci,
        birthday: u.birthday,
        gender: u.gender,
        photo: u.photo,
        username: data.username,
        accountId: data.id,
        userId: session.data.userId,
        rolId: session.data.rolId,
        loginRol: session.data.loginRol,
        roles: data.roles || [],
      });
      setProfileImageUser(u.photo ? buildImageUrl(u.photo) : null);
      setIsAuthenticated(true);
      return session.data.loginRol;
    } finally {
      setIsLoading(false);
    }
  };

  const enterGuestMode = () => {
    clearToken();
    writeGuestSession(true);
    applyGuestUser({
      setUser,
      setIsAuthenticated,
      setProfileImageUser,
      setIsLoading,
    });
    enqueueSnackbar("Modo invitado: explorá módulos sin backend", {
      variant: "info",
      autoHideDuration: 3500,
    });
    return { success: true, loginRol: GUEST_USER.loginRol, guest: true };
  };

  const signin = async (userData) => {
    if (SHELL_ONLY) {
      setErrors({
        message:
          "En Raptor no hay backend. Usá «Entrar como invitado» para explorar la app.",
        status: "info",
      });
      return { error: true };
    }
    writeGuestSession(false);
    try {
      const { data } = await loginRequest(userData);

      if (data.selectRole) {
        return { selectRole: true, roles: data.roles, accountId: data.accountId };
      }

      if (setToken(data?.token)) {
        const loginRol = await loadUserProfile();
        return { success: true, loginRol };
      }

      setErrors({ message: data.message || "No se pudo iniciar sesión", status: "error" });
      return { error: true };
    } catch (error) {
      setIsAuthenticated(false);
      setIsLoading(false);
      setErrors({
        message: getApiErrorMessage(
          error,
          "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.",
        ),
        status: "error",
      });
      return { error: true };
    }
  };

  const logout = () => {
    clearToken();
    writeGuestSession(false);
    setIsAuthenticated(false);
    setUser(null);
    setProfileImageUser(null);
    setIsLoading(false);
  };

  const changeRole = async (newRoleId) => {
    if (isGuest) {
      const role = (user?.roles || []).find((r) => r.id === newRoleId || r.name === newRoleId);
      if (!role || role.name === "Programador") {
        enqueueSnackbar("En modo invitado solo Administrador y Empleado", {
          variant: "info",
        });
        return;
      }
      setUser((prev) => ({
        ...prev,
        rolId: role.id,
        loginRol: role.name,
      }));
      enqueueSnackbar(`Rol de invitado: ${role.name}`, { variant: "success" });
      return;
    }
    try {
      const { data } = await changeRoleRequest({
        accountId: user.accountId,
        rolId: newRoleId,
      });
      if (!setToken(data?.token)) {
        logout();
        enqueueSnackbar("Token inválido al cambiar de rol", { variant: "error" });
        return;
      }
      await loadUserProfile();
      const successText = getApiSuccessMessage({ data }, "Rol actualizado correctamente");
      if (successText) {
        enqueueSnackbar(successText, { variant: "success" });
      }
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error), { variant: "error" });
    }
  };

  const toast = async ({
    message,
    variant = "info",
    promise,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
  } = {}) => {
    if (message && !promise) {
      enqueueSnackbar(message, { variant, autoHideDuration: 3000 });
      return;
    }
    if (!promise) return;

    try {
      const result = await promise;
      const text = getApiSuccessMessage(result, successMessage);
      if (text) {
        enqueueSnackbar(text, { variant: "success", autoHideDuration: 3000 });
      }
      if (onSuccess) {
        await onSuccess(result);
      }
      return result;
    } catch (error) {
      const text = getApiErrorMessage(error, errorMessage);
      if (text) {
        enqueueSnackbar(text, { variant: "error", autoHideDuration: 4000 });
      }
      if (onError) {
        await onError(error);
      }
      throw error;
    }
  };

  const checkLogin = async () => {
    if (SHELL_ONLY) {
      clearToken();
      if (readGuestSession()) {
        applyGuestUser({
          setUser,
          setIsAuthenticated,
          setProfileImageUser,
          setIsLoading,
        });
        return;
      }
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }
    writeGuestSession(false);
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    try {
      await getSessionRequest();
      await loadUserProfile();
    } catch {
      clearToken();
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    if (!errors.message) return;
    const t = setTimeout(() => setErrors({}), 5000);
    return () => clearTimeout(t);
  }, [errors]);

  return (
    <AuthContext.Provider
      value={{
        signin,
        enterGuestMode,
        logout,
        changeRole,
        errors,
        isAuthenticated,
        isGuest,
        isLoading,
        user,
        profileImageUser,
        setProfileImageUser,
        loadUserProfile,
        toast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
