/** Tipos de documento SRI (mismos códigos que clientes). */
export const SUPPLIER_IDENT_TYPE_OPTIONS = [
  { value: "04", label: "RUC (04)" },
  { value: "05", label: "Cédula (05)" },
  { value: "06", label: "Pasaporte (06)" },
  { value: "08", label: "Id. del exterior (08)" },
  { value: "07", label: "Consumidor final (07)" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

export const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: "ahorros", label: "Ahorros" },
  { value: "corriente", label: "Corriente" },
];

export const EMPTY_SUPPLIER_FORM = {
  name: "",
  tradeName: "",
  identType: "04",
  identNumber: "",
  category: "",
  isActive: true,
  contactName: "",
  contactRole: "",
  phone: "",
  whatsapp: "",
  email: "",
  invoiceEmail: "",
  website: "",
  address: "",
  city: "",
  province: "",
  bankName: "",
  bankAccountType: "",
  bankAccountNumber: "",
  paymentTermDays: "",
  preferredPaymentMethod: "",
  notes: "",
};

export function supplierToForm(supplier) {
  if (!supplier) return { ...EMPTY_SUPPLIER_FORM };
  return {
    name: supplier.name || "",
    tradeName: supplier.tradeName || "",
    identType: supplier.identType || "04",
    identNumber: supplier.identNumber || "",
    category: supplier.category || "",
    isActive: supplier.isActive !== false,
    contactName: supplier.contactName || "",
    contactRole: supplier.contactRole || "",
    phone: supplier.phone || "",
    whatsapp: supplier.whatsapp || "",
    email: supplier.email || "",
    invoiceEmail: supplier.invoiceEmail || "",
    website: supplier.website || "",
    address: supplier.address || "",
    city: supplier.city || "",
    province: supplier.province || "",
    bankName: supplier.bankName || "",
    bankAccountType: supplier.bankAccountType || "",
    bankAccountNumber: supplier.bankAccountNumber || "",
    paymentTermDays:
      supplier.paymentTermDays != null && supplier.paymentTermDays !== ""
        ? String(supplier.paymentTermDays)
        : "",
    preferredPaymentMethod: supplier.preferredPaymentMethod || "",
    notes: supplier.notes || "",
  };
}

function trimOrNull(value) {
  const v = String(value ?? "").trim();
  return v || null;
}

export function formToSupplierPayload(form) {
  const termRaw = String(form.paymentTermDays ?? "").trim();
  const paymentTermDays =
    termRaw === "" ? null : Number.isFinite(Number(termRaw)) ? Number(termRaw) : null;

  return {
    name: String(form.name || "").trim(),
    tradeName: trimOrNull(form.tradeName),
    identType: form.identType || "04",
    identNumber: trimOrNull(form.identNumber),
    category: trimOrNull(form.category),
    isActive: form.isActive !== false,
    contactName: trimOrNull(form.contactName),
    contactRole: trimOrNull(form.contactRole),
    phone: trimOrNull(form.phone),
    whatsapp: trimOrNull(form.whatsapp),
    email: trimOrNull(form.email),
    invoiceEmail: trimOrNull(form.invoiceEmail),
    website: trimOrNull(form.website),
    address: trimOrNull(form.address),
    city: trimOrNull(form.city),
    province: trimOrNull(form.province),
    bankName: trimOrNull(form.bankName),
    bankAccountType: trimOrNull(form.bankAccountType),
    bankAccountNumber: trimOrNull(form.bankAccountNumber),
    paymentTermDays,
    preferredPaymentMethod: trimOrNull(form.preferredPaymentMethod),
    notes: trimOrNull(form.notes),
  };
}

export function formatSupplierDocument(supplier) {
  if (!supplier?.identNumber) return "—";
  const type =
    SUPPLIER_IDENT_TYPE_OPTIONS.find((d) => d.value === supplier.identType)?.label ||
    supplier.identType ||
    "Doc";
  return `${type}: ${supplier.identNumber}`;
}
