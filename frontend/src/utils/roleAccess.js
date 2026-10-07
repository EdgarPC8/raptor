/** Acceso por rol de sesión (loginRol). */

/** Propietario y Programador: mismos poderes de negocio. */
export function isOwnerLike(loginRol) {
  return loginRol === "Propietario" || loginRol === "Programador";
}

/** Solo módulo Desarrollador (logs, comandos, img, files). */
export function isDeveloperRole(loginRol) {
  return loginRol === "Programador";
}

export function isAdminOrOwnerLike(loginRol) {
  return (
    loginRol === "Administrador" ||
    loginRol === "Propietario" ||
    loginRol === "Programador"
  );
}
