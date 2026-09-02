/**
 * Simula búsqueda escáner caja vs inventario con datos reales de MySQL tienda.
 * Uso: node scripts/test-caja-barcode-lookup.mjs
 */
import { execSync } from "node:child_process";
import {
  buildGlobalSupplierCodeIndex,
  findProductByAnyCode,
  findProductByLooseCode,
  isSellableInCaja,
} from "../src/utils/productLookup.js";

function mysqlJson(sql) {
  const out = execSync(`MYSQL_PAGER=cat mysql -u root tienda -N -B -e ${JSON.stringify(sql)}`, {
    encoding: "utf8",
  });
  return out.trim();
}

const productsRaw = mysqlJson(`
  SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id, 'name', name, 'type', type, 'price', price,
    'barcode', barcode, 'sku', sku, 'isActive', isActive
  ))
  FROM ERP_inventory_products WHERE isActive=1
`);
const products = JSON.parse(productsRaw || "[]");

const codesRaw = mysqlJson(`
  SELECT JSON_ARRAYAGG(JSON_OBJECT('supplierCode', supplierCode, 'productId', productId))
  FROM ERP_supplier_product_codes
`);
const supplierIndex = buildGlobalSupplierCodeIndex(JSON.parse(codesRaw || "[]"));

const sellable = products.filter(isSellableInCaja);

const testCodes = [
  "7861153901179", // 597 raw con barcode
  "7861164201473", // 456 final
  "7861153911062", // 410 final
  "7861021200410", // 598 final
  "40409450", // supplier code corto 597
  "07861153901179", // supplier code con ceros 597
  "7861055903592", // 486 raw sin barcode, solo supplier
];

console.log(`Productos activos: ${products.length}, vendibles caja: ${sellable.length}`);
console.log(`Códigos proveedor indexados: ${supplierIndex.size}\n`);

for (const code of testCodes) {
  const inInv = findProductByLooseCode(products, code);
  const inCajaOld = sellable.find(
    (p) =>
      String(p.barcode || "").replace(/\D/g, "") === code.replace(/\D/g, "") ||
      String(p.sku || "").trim().toLowerCase() === code.toLowerCase(),
  );
  const inCajaNew = findProductByAnyCode(products, code, supplierIndex);
  const sellableHit = inCajaNew && isSellableInCaja(inCajaNew);

  console.log(`Código: ${code}`);
  console.log(`  Inventario (loose): ${inInv ? `#${inInv.id} ${inInv.name} (${inInv.type})` : "NO"}`);
  console.log(`  Caja ANTES (solo finales): ${inCajaOld ? `#${inCajaOld.id}` : "NO"}`);
  console.log(
    `  Caja AHORA (catálogo+cód.prov): ${inCajaNew ? `#${inCajaNew.id} ${inCajaNew.name} (${inCajaNew.type})` : "NO"}${sellableHit ? " ✓ vendible" : inCajaNew ? " ⚠ no vendible" : ""}`,
  );
  console.log("");
}
