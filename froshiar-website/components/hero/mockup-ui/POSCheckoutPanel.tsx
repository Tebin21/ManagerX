const LINE_ITEMS = [
  { name: "Wireless Earbuds", qty: 2, price: "$58.00" },
  { name: "Phone Case", qty: 1, price: "$14.00" },
  { name: "Screen Protector", qty: 1, price: "$8.00" },
];

export function POSCheckoutPanel() {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
      <p className="text-xs font-semibold text-ink">Checkout</p>
      <div className="mt-3 flex-1 space-y-2">
        {LINE_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {item.qty}× {item.name}
            </span>
            <span className="font-medium text-ink">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-xs dark:border-white/10">
        <div className="flex items-center justify-between text-gray-500">
          <span>Subtotal</span>
          <span>$80.00</span>
        </div>
        <div className="flex items-center justify-between text-sm font-bold text-ink">
          <span>Total</span>
          <span>$80.00</span>
        </div>
      </div>
      <button className="mt-3 w-full rounded-xl bg-gold-500 py-2.5 text-xs font-semibold text-ink-fixed shadow-sm">
        Charge
      </button>
    </div>
  );
}
