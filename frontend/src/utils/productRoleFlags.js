/** Roles simultáneos del producto (espejo del backend). */

export function flagsFromType(type) {
  const t = String(type || "final").toLowerCase();
  if (t === "raw") return { isRaw: true, isRecipe: false, isSellable: false };
  if (t === "intermediate") return { isRaw: true, isRecipe: true, isSellable: false };
  return { isRaw: false, isRecipe: false, isSellable: true };
}

export function typeFromFlags({ isRaw, isRecipe, isSellable }) {
  if (isRaw && isSellable) return "raw";
  if (isRaw && isRecipe && !isSellable) return "intermediate";
  if (isRecipe && isSellable && !isRaw) return "final";
  if (isSellable) return "final";
  if (isRecipe) return "intermediate";
  if (isRaw) return "raw";
  return "final";
}

export function resolveProductFlags(product) {
  if (!product) return { isRaw: false, isRecipe: false, isSellable: true };
  const hasExplicit =
    product.isRaw != null || product.isRecipe != null || product.isSellable != null;
  if (hasExplicit) {
    let isRaw = Boolean(product.isRaw);
    let isRecipe = Boolean(product.isRecipe);
    let isSellable = Boolean(product.isSellable);
    if (!isRaw && !isRecipe && !isSellable) {
      return flagsFromType(product.type);
    }
    return { isRaw, isRecipe, isSellable };
  }
  return flagsFromType(product.type);
}

export function productIsRaw(product) {
  return resolveProductFlags(product).isRaw;
}

export function productIsSellable(product) {
  return resolveProductFlags(product).isSellable;
}

export function productIsRecipe(product) {
  return resolveProductFlags(product).isRecipe;
}
