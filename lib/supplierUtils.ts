export const DIRECT_SUPPLIER_NAME = 'دابینکەری ڕاستەوخۆ';

export function isDirectSupplierName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === DIRECT_SUPPLIER_NAME.toLowerCase() ||
    n === 'direct supplier' ||
    n === 'walk-in supplier' ||
    n === 'دابینکەری راستەوخۆ' ||
    n === 'دابینکەری دەستبەجێ' ||
    n === 'المورد المباشر' ||
    n === 'مورد مباشر'
  );
}

