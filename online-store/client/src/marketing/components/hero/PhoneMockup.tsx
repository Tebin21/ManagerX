import { Boxes, ShoppingCart, Users } from "lucide-react";
import { StatTotal } from "./mockup-ui/StatTotal";
import { DashboardBarChart } from "./mockup-ui/DashboardBarChart";
import { ProductListRow } from "./mockup-ui/ProductListRow";

export function PhoneMockup() {
  return (
    // Always LTR: this represents literal app-screenshot content, which stays
    // English regardless of the homepage's own locale/direction.
    <div dir="ltr" className="w-[260px] rounded-[2.5rem] border-[10px] border-ink bg-ink p-1.5 shadow-2xl">
      <div className="relative h-[520px] overflow-hidden rounded-[2rem] bg-white">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
        <div className="flex h-full flex-col gap-3 px-4 pt-9 pb-5">
          <p className="text-xs font-semibold text-slate-400">Today&apos;s overview</p>
          <StatTotal label="Today's Sales" value="$1,284" />
          <DashboardBarChart />
          <div className="space-y-2">
            <ProductListRow icon={Boxes} name="Wireless Earbuds" qty="42 in stock" price="$29" />
            <ProductListRow icon={ShoppingCart} name="Order #1042" qty="3 items" price="$80" />
            <ProductListRow icon={Users} name="New customer" qty="Aran K." price="—" />
          </div>
        </div>
      </div>
    </div>
  );
}
