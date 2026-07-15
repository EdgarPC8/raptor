/** Modo invitado (npm run raptor): explorar UI sin backend. */
export const GUEST_STORAGE_KEY = "raptor_guest_session_v1";

export const GUEST_USER = {
  firstName: "Invitado",
  secondName: "",
  firstLastName: "Raptor",
  secondLastName: "",
  ci: "",
  birthday: null,
  gender: "",
  photo: null,
  username: "invitado",
  accountId: 0,
  userId: 0,
  rolId: 2,
  loginRol: "Administrador",
  roles: [
    { id: 2, name: "Administrador" },
    { id: 4, name: "Empleado" },
  ],
  isGuest: true,
};

export function readGuestSession() {
  try {
    return sessionStorage.getItem(GUEST_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGuestSession(on) {
  try {
    if (on) sessionStorage.setItem(GUEST_STORAGE_KEY, "1");
    else sessionStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
