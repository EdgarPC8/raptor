/**
 * Convierte un monto a texto en español (dólares / centavos), estilo actas EC.
 * Ej: 415.58 → "CUATROCIENTOS QUINCE DOLARES CON 58 CTVS"
 */

const UNIDADES = [
  "",
  "UN",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISEIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
];

const DECENAS = [
  "",
  "",
  "VEINTI",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function tensAndUnits(n) {
  if (n < 21) return UNIDADES[n];
  if (n < 30) {
    const u = n - 20;
    return u === 0 ? "VEINTE" : `VEINTI${UNIDADES[u]}`;
  }
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DECENAS[d];
  return `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function hundreds(n) {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const head = CENTENAS[c];
  if (!rest) return head;
  return `${head} ${tensAndUnits(rest)}`;
}

function integerToWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return "CERO";
  if (num > 999_999_999) return String(num);

  const millions = Math.floor(num / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1000);
  const rest = num % 1000;

  const parts = [];
  if (millions === 1) parts.push("UN MILLON");
  else if (millions > 1) parts.push(`${hundreds(millions)} MILLONES`);

  if (thousands === 1) parts.push("MIL");
  else if (thousands > 1) parts.push(`${hundreds(thousands)} MIL`);

  if (rest > 0) parts.push(hundreds(rest));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * @param {number|string} amount
 * @returns {string} ej. "CUATROCIENTOS QUINCE DOLARES CON 58 CTVS"
 */
export function amountToSpanishDollars(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "CERO DOLARES CON 0 CTVS";

  const abs = Math.abs(n);
  const whole = Math.floor(abs + 1e-9);
  const cents = Math.round((abs - whole) * 100);

  const dollarsWord = whole === 1 ? "DOLAR" : "DOLARES";
  const words = integerToWords(whole);
  const prefix = n < 0 ? "MENOS " : "";
  return `${prefix}${words} ${dollarsWord} CON ${String(cents).padStart(1, "0")} CTVS`;
}

export default amountToSpanishDollars;
