import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { productCatalog } from '../lib/navigation';
import { Badge, Button, Card, Input, SectionHeader, Select } from '../components/ui';

type CouponForm = {
  code: string;
};

export function BillingPage() {
  const { items, subtotal, discount, total, addItem, updateQuantity, removeItem, clearCart, applyCoupon } = useCart();
  const [query, setQuery] = useState('');
  const [success, setSuccess] = useState('');
  const { register, handleSubmit } = useForm<CouponForm>({ defaultValues: { code: '' } });

  const filteredProducts = useMemo(() => productCatalog.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()) || product.category.toLowerCase().includes(query.toLowerCase())), [query]);

  const onApplyCoupon = handleSubmit((values) => {
    applyCoupon(values.code);
    setSuccess(values.code.trim().toUpperCase() === 'SAVE10' ? 'Coupon applied successfully.' : 'Coupon captured for validation.');
  });

  const checkout = () => {
    setSuccess(`Sale completed successfully. Invoice ${String(Date.now()).slice(-6)}`);
    clearCart();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="POS Billing"
        subtitle="Fast product selection, coupon handling, and transaction summary for cashiers."
        action={<Button variant="secondary"><ReceiptText className="h-4 w-4" />Print receipt</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Product catalog</h2>
              <p className="text-sm text-slate-500">Search and add items to the active bill.</p>
            </div>
            <div className="w-full md:w-80">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or categories" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.category}</p>
                  </div>
                  <Badge tone={product.stock < 10 ? 'amber' : 'green'}>{product.stock} in stock</Badge>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p>
                    <p className="text-xl font-black text-slate-950">LKR {product.price.toLocaleString()}</p>
                  </div>
                  <Button onClick={() => addItem(product.id)}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Current bill</h2>
              <p className="text-sm text-slate-500">Coupons and discounts are applied automatically.</p>
            </div>
            <Badge tone="blue">{items.length} items</Badge>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Cart is empty. Add products from the catalog.
              </div>
            ) : items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-500">LKR {item.price.toLocaleString()} each</p>
                  </div>
                  <Button variant="ghost" className="px-2" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-500">Quantity</label>
                  <Select value={String(item.quantity)} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} className="w-24">
                    {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onApplyCoupon} className="mt-5 space-y-4 rounded-3xl bg-slate-50 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Coupon code</label>
              <Input placeholder="SAVE10" {...register('code')} />
            </div>
            <Button type="submit" variant="secondary" className="w-full">Apply coupon</Button>
          </form>

          <div className="mt-5 space-y-2 rounded-3xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>LKR {subtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Discount</span><span>- LKR {discount.toLocaleString()}</span></div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Total</span><span>LKR {total.toLocaleString()}</span></div>
          </div>

          {success ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <div className="mt-4 flex gap-3">
            <Button className="flex-1" onClick={checkout} disabled={items.length === 0}>Complete sale</Button>
            <Button variant="secondary" className="flex-1" onClick={clearCart}>Reset</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}