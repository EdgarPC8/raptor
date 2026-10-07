/** Texto visible: gasto/gastos → egreso/egresos. No cambia claves ni datos guardados. */
export function showEgreso(text) {
  return String(text ?? "")
    .replaceAll("Gastos", "Egresos")
    .replaceAll("gastos", "egresos")
    .replaceAll("Gasto", "Egreso")
    .replaceAll("gasto", "egreso");
}
