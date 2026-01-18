import PRICES from "../data/prices.json" with { type: "json" };

function normalizeSize(size) {
  // input examples: "20 manna", "12-15 manna", "16 manna"
  if (!size) return null;
  return String(size)
    .toLowerCase()
    .replace("manna", "")
    .replace(" ", "")
    .trim(); // "20", "12-15", "6-8"
}

function bitePriceISK(details) {
  const id = details?.id;
  const qty = Number(details?.quantity);

  if (!id) throw new Error("Bite id missing");
  const unit = PRICES.smarettir?.[id];
  if (!unit) throw new Error(`Unknown bite id: ${id}`);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Invalid bite quantity: ${details?.quantity}`);
  }

  return unit * qty;
}

function cakePriceISK(details) {
  const cakeName = details?.cake;
  if (!cakeName) throw new Error("Cake name missing");

  // Special-case: unit price cakes
  if (cakeName === "Sykurmassamynd") {
    const unit = PRICES.kokur?.[cakeName]?.unitPrice;
    if (!unit) throw new Error(`Missing unitPrice for ${cakeName}`);
    return unit;
  }

  const sizeKey = normalizeSize(details?.size);
  if (!sizeKey) throw new Error(`Missing size for cake ${cakeName}`);

  const cakeMap = PRICES.kokur?.[cakeName];
  if (!cakeMap) throw new Error(`Unknown cake: ${cakeName}`);

  // Try exact match first (e.g. "12-15")
  let price = cakeMap[sizeKey];

  // If not found, also try first number (e.g. "20-25" -> "20") if your json uses "20"
  if (price == null && sizeKey.includes("-")) {
    const first = sizeKey.split("-")[0];
    price = cakeMap[first];
  }

  if (price == null) {
    throw new Error(`No price for cake '${cakeName}' with size '${details?.size}' (key '${sizeKey}')`);
  }

  return price;
}

function breadPriceISK(details) {
  const name = details?.bread;
  const qty = Number(details?.quantity);

  const unit = PRICES.breads?.[name];
  if (!unit) throw new Error(`Unknown bread: ${name}`);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid bread quantity: ${details?.quantity}`);

  return unit * qty;
}

function minidonutsPriceISK(details) {
  const qty = Number(details?.quantity);
  const unit = Number(PRICES.minidonuts?.unitPrice);

  if (!Number.isFinite(unit) || unit <= 0) throw new Error("Minidonuts unitPrice missing/invalid");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid minidonuts quantity: ${details?.quantity}`);

  return unit * qty;
}

export function calculateTotalISK(products) {
  if (!Array.isArray(products)) throw new Error("products must be an array");

  let total = 0;
  for (const p of products) {
    if (p.type === "cake") total += cakePriceISK(p.details);
    else if (p.type === "bread") total += breadPriceISK(p.details);
    else if (p.type === "minidonut") total += minidonutsPriceISK(p.details);
    else if (p.type === "bite") total += bitePriceISK(p.details);   // ✅ ADD THIS
    else throw new Error(`Unknown product type: ${p.type}`);
  }
  return total;
}
