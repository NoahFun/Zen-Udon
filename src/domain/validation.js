export function isNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function hasTwoOrLessDecimals(value) {
  const s = String(value);
  if (!s.includes(".")) return true;
  return s.split(".")[1].length <= 2;
}

export function validateMasterItem(item, allItems, editingId = null) {
  const errors = {};
  const category = String(item.category || "").trim();
  const itemName = String(item.itemName || "").trim();
  const unitCost = item.unitCost;

  if (!category) errors.category = "Category is required.";
  if (!itemName) errors.itemName = "Item name is required.";
  if (!isNonNegativeNumber(unitCost)) errors.unitCost = "Unit cost must be non-negative.";
  if (!hasTwoOrLessDecimals(unitCost)) errors.unitCost = "Unit cost max 2 decimals.";

  const duplicate = allItems.find((x) => {
    if (editingId && x.id === editingId) return false;
    return x.category.trim().toLowerCase() === category.toLowerCase() &&
      x.itemName.trim().toLowerCase() === itemName.toLowerCase();
  });
  if (duplicate) errors.itemName = "Duplicate item in same category.";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDailyForm(date, revenue) {
  const errors = {};
  if (!date) errors.date = "Date is required.";
  if (revenue === "" || revenue === null || revenue === undefined) {
    errors.revenue = "Revenue is required.";
  } else if (!isNonNegativeNumber(revenue)) {
    errors.revenue = "Revenue must be non-negative.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateQuantity(value) {
  return isNonNegativeNumber(value);
}
