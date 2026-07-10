import { Boxes, Package, Shirt } from "lucide-react";
import { ProductListRow } from "./mockup-ui/ProductListRow";
import { POSCheckoutPanel } from "./mockup-ui/POSCheckoutPanel";

export function TabletMockup() {
  return (
    // Always LTR: this represents literal app-screenshot content, which
    // stays English regardless of the site's locale/direction.
    <div
      dir="ltr"
      className="w-[380px] rounded-[1.75rem] border-[10px] border-ink-fixed bg-ink-fixed p-1 shadow-2xl"
    >
      <div className="h-[300px] overflow-hidden rounded-[1.1rem] bg-white dark:bg-[#1c1810]">
        <div className="grid h-full grid-cols-5 gap-3 p-4">
          <div className="col-span-3 space-y-2">
            <p className="text-xs font-semibold text-gray-400">Products</p>
            <ProductListRow icon={Boxes} name="Wireless Earbuds" qty="42 in stock" price="$29" />
            <ProductListRow icon={Package} name="Phone Case" qty="118 in stock" price="$14" />
            <ProductListRow icon={Shirt} name="Cotton T-Shirt" qty="76 in stock" price="$12" />
          </div>
          <div className="col-span-2">
            <POSCheckoutPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
