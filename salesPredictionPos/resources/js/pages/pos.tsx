import { Head, router } from '@inertiajs/react';
import {
    Barcode,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Minus,
    Percent,
    Plus,
    Printer,
    QrCode,
    Receipt,
    RotateCcw,
    Search,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Trash2,
    User,
    UserPlus,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    category: string;
    category_id: number;
    stock: number;
    image: string | null;
}

interface Category {
    id: number;
    name: string;
}

interface Customer {
    id: number;
    name: string;
    phone: string;
}

interface CartItem {
    product: Product;
    quantity: number;
    discount: number;
}

interface HeldOrder {
    id: number;
    invoice_number: string;
    total: number;
    items: { product: Product; quantity: number; unit_price: number }[];
}

interface Props {
    products: Product[];
    categories: Category[];
    customers: Customer[];
    heldOrders: HeldOrder[];
}

function formatCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function Pos({ products = [], categories = [], customers = [], heldOrders = [] }: Props) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showHeldOrders, setShowHeldOrders] = useState(false);

    // Order modifiers
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
    const [taxRatePercent, setTaxRatePercent] = useState(8);

    // Checkout & Receipt Modal
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
            );
        }
        if (activeCategory !== null) {
            result = result.filter((p) => p.category_id === activeCategory);
        }
        return result;
    }, [products, searchQuery, activeCategory]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)
        );
    }, [customers, customerSearch]);

    // Cart calculations
    const rawSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        return (rawSubtotal * orderDiscountPercent) / 100;
    }, [rawSubtotal, orderDiscountPercent]);

    const taxAmount = useMemo(() => {
        return ((rawSubtotal - discountAmount) * taxRatePercent) / 100;
    }, [rawSubtotal, discountAmount, taxRatePercent]);

    const grandTotal = useMemo(() => {
        return Math.max(0, rawSubtotal - discountAmount + taxAmount);
    }, [rawSubtotal, discountAmount, taxAmount]);

    const changeDue = useMemo(() => {
        const tendered = parseFloat(amountTendered) || 0;
        return Math.max(0, tendered - grandTotal);
    }, [amountTendered, grandTotal]);

    const addToCart = useCallback((product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            if (product.stock <= 0) return prev;
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
    }, []);

    const updateQuantity = useCallback((productId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id !== productId) return item;
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null;
                    if (newQty > item.product.stock) return item;
                    return { ...item, quantity: newQty };
                })
                .filter(Boolean) as CartItem[]
        );
    }, []);

    const removeFromCart = useCallback((productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setSelectedCustomer(null);
        setOrderDiscountPercent(0);
        setAmountTendered('');
    }, []);

    // Barcode scanner simulation trigger
    const handleSimulateBarcode = () => {
        if (products.length > 0) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            addToCart(randomProduct);
        }
    };

    // Keyboard Shortcuts (F2: search focus, F8: clear cart, F9: checkout)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'F8') {
                e.preventDefault();
                clearCart();
            } else if (e.key === 'F9') {
                e.preventDefault();
                if (cart.length > 0) setCheckoutModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, clearCart]);

    const handleConfirmPayment = useCallback(() => {
        if (cart.length === 0 || processing) return;
        setProcessing(true);

        const salePayload = {
            customer_id: selectedCustomer,
            items: cart.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                discount: item.discount,
            })),
            payment_method: selectedPaymentMethod,
            total: grandTotal,
            subtotal: rawSubtotal,
            tax: taxAmount,
            discount: discountAmount,
        };

        router.post(
            '/pos',
            salePayload,
            {
                onSuccess: () => {
                    setLastCompletedSale({
                        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                        date: new Date().toLocaleString(),
                        items: [...cart],
                        subtotal: rawSubtotal,
                        tax: taxAmount,
                        discount: discountAmount,
                        total: grandTotal,
                        paymentMethod: selectedPaymentMethod,
                        amountTendered: parseFloat(amountTendered) || grandTotal,
                        change: changeDue,
                        customer: customers.find((c) => c.id === selectedCustomer),
                    });
                    setCheckoutModalOpen(false);
                    setReceiptModalOpen(true);
                    clearCart();
                    setProcessing(false);
                },
                onError: () => setProcessing(false),
            }
        );
    }, [cart, selectedCustomer, selectedPaymentMethod, grandTotal, rawSubtotal, taxAmount, discountAmount, amountTendered, changeDue, customers, processing, clearCart]);

    const handleHoldOrder = useCallback(() => {
        if (cart.length === 0 || processing) return;
        setProcessing(true);

        router.post(
            '/pos/hold',
            {
                customer_id: selectedCustomer,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                    discount: item.discount,
                })),
            },
            {
                onSuccess: () => {
                    clearCart();
                    setProcessing(false);
                },
                onError: () => setProcessing(false),
            }
        );
    }, [cart, selectedCustomer, processing, clearCart]);

    const resumeOrder = useCallback(
        (order: HeldOrder) => {
            const restoredCart: CartItem[] = order.items.map((item) => ({
                product: products.find((p) => p.id === item.product.id) || (item.product as Product),
                quantity: item.quantity,
                discount: 0,
            }));
            setCart(restoredCart);
            setShowHeldOrders(false);
            router.post(`/pos/${order.id}/void`);
        },
        [products]
    );

    const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);

    return (
        <AppLayout breadcrumbs={[{ title: 'Smart POS Terminal', href: '/pos' }]}>
            <Head title="Smart POS Terminal - Retail AI" />

            <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-background overflow-hidden">
                {/* LEFT COLUMN: Product Catalog & Touch Bar */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-border/60 overflow-hidden">
                    {/* Header Controls: Search + Categories + Barcode trigger */}
                    <div className="p-4 bg-card border-b border-border/60 space-y-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search by Product Name, SKU or Scan Barcode... (F2)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 rounded-xl bg-muted/40 border-border/70 focus:bg-background transition-all text-xs"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            <Button
                                onClick={handleSimulateBarcode}
                                variant="outline"
                                size="sm"
                                className="h-10 px-3 rounded-xl border-dashed border-blue-500/40 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs gap-1.5 shrink-0"
                            >
                                <Barcode className="size-4" />
                                <span className="hidden sm:inline">Scan Item</span>
                            </Button>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                onClick={() => setActiveCategory(null)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                    activeCategory === null
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                All Products ({products.length})
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                        activeCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Touch Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredProducts.map((product) => {
                                const inCart = cart.find((item) => item.product.id === product.id);
                                const isLowStock = product.stock <= 5 && product.stock > 0;
                                const isOutOfStock = product.stock <= 0;

                                return (
                                    <motion.button
                                        key={product.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => addToCart(product)}
                                        disabled={isOutOfStock}
                                        className={`relative group flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all shadow-xs ${
                                            inCart
                                                ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20'
                                                : 'bg-card border-border/60 hover:border-blue-500/40 hover:shadow-md'
                                        } ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {inCart && (
                                            <span className="absolute -top-2 -right-2 size-6 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md animate-bounce">
                                                {inCart.quantity}
                                            </span>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                    {product.sku || 'ITEM'}
                                                </span>
                                                {isLowStock && (
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                                        LOW STOCK
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xs font-bold text-foreground line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {product.name}
                                            </h3>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                                            <span className="text-sm font-black text-foreground">
                                                {formatCurrency(product.price)}
                                            </span>
                                            <span className={`text-[10px] font-semibold ${isOutOfStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                                            </span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                                    <ShoppingBag className="size-7" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No matching products</p>
                                <p className="text-xs text-muted-foreground max-w-xs">
                                    Try adjusting your search query or selecting a different category tab.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Interactive Cart & Checkout Panel */}
                <div className="w-full lg:w-[420px] flex flex-col bg-card border-l border-border/60 shrink-0">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                <ShoppingCart className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-foreground">Cart Order Summary</h2>
                                <p className="text-[10px] text-muted-foreground">{cart.length} unique items added</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {heldOrders.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHeldOrders(!showHeldOrders)}
                                    className="h-8 text-xs rounded-xl bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold gap-1"
                                >
                                    <Clock className="size-3.5" />
                                    <span>Held ({heldOrders.length})</span>
                                </Button>
                            )}
                            {cart.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearCart}
                                    className="h-8 text-xs rounded-xl text-destructive hover:bg-destructive/10"
                                >
                                    Clear (F8)
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Customer Selection Bar */}
                    <div className="p-3 border-b border-border/60 bg-muted/10">
                        {selectedCustomerData ? (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                                        {selectedCustomerData.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200">{selectedCustomerData.name}</p>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400">{selectedCustomerData.phone}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="text-blue-500 hover:text-blue-700">
                                    <X className="size-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCustomerModal(true)}
                                className="w-full h-9 px-3 rounded-xl bg-muted/40 hover:bg-muted border border-dashed border-border text-xs text-muted-foreground flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <User className="size-3.5 text-blue-500" />
                                    <span>Attach Customer Profile (Optional)</span>
                                </div>
                                <Plus className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Held Orders Drawer Dropdown */}
                    <AnimatePresence>
                        {showHeldOrders && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-3 bg-amber-500/10 border-b border-amber-500/20 space-y-2 overflow-hidden"
                            >
                                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Held Orders Queue</p>
                                {heldOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between p-2 rounded-xl bg-background border border-amber-500/30 text-xs"
                                    >
                                        <div>
                                            <p className="font-bold">{order.invoice_number}</p>
                                            <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-amber-600">{formatCurrency(order.total)}</span>
                                            <Button
                                                size="sm"
                                                onClick={() => resumeOrder(order)}
                                                className="h-7 text-[10px] bg-amber-600 text-white rounded-lg px-2"
                                            >
                                                Resume
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cart Items Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                                <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/40">
                                    <ShoppingCart className="size-8" />
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground">Cart is empty</p>
                                <p className="text-[11px] text-muted-foreground/70 max-w-[200px]">
                                    Click products from the catalog or press F2 to scan barcodes.
                                </p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {cart.map((item) => (
                                    <motion.div
                                        key={item.product.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 group hover:border-border transition-all"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{item.product.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatCurrency(item.product.price)} each</p>
                                        </div>

                                        <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl p-1">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                className="size-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground"
                                            >
                                                <Minus className="size-3" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                className="size-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground"
                                            >
                                                <Plus className="size-3" />
                                            </button>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xs font-black text-foreground">
                                                {formatCurrency(item.product.price * item.quantity)}
                                            </p>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-muted-foreground hover:text-destructive text-[10px] transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Order Modifiers & Total Section */}
                    <div className="p-4 border-t border-border/60 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Discount %</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={orderDiscountPercent}
                                    onChange={(e) => setOrderDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                                    className="h-8 text-xs rounded-xl bg-background"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tax Rate %</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={taxRatePercent}
                                    onChange={(e) => setTaxRatePercent(Math.max(0, Number(e.target.value)))}
                                    className="h-8 text-xs rounded-xl bg-background"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1 border-t border-border/40">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-semibold">{formatCurrency(rawSubtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Discount ({orderDiscountPercent}%)</span>
                                    <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax ({taxRatePercent}%)</span>
                                <span className="font-semibold">+{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-base pt-2 border-t border-border/60">
                                <span className="font-black text-foreground">Total Due</span>
                                <span className="font-black text-blue-600 dark:text-blue-400 text-lg">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Payment & Hold Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button
                                onClick={handleHoldOrder}
                                disabled={cart.length === 0 || processing}
                                variant="outline"
                                className="h-11 rounded-xl text-amber-600 border-amber-500/30 hover:bg-amber-500/10 font-bold text-xs"
                            >
                                Hold Sale
                            </Button>
                            <Button
                                onClick={() => setCheckoutModalOpen(true)}
                                disabled={cart.length === 0 || processing}
                                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
                            >
                                Complete Pay (F9)
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUSTOMER PICKER MODAL */}
            <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Select Customer Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        <Input
                            placeholder="Search by customer name or phone..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="h-10 rounded-xl"
                        />
                        <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                            {filteredCustomers.map((cust) => (
                                <button
                                    key={cust.id}
                                    onClick={() => {
                                        setSelectedCustomer(cust.id);
                                        setShowCustomerModal(false);
                                    }}
                                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between rounded-xl"
                                >
                                    <div>
                                        <p className="text-xs font-bold">{cust.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{cust.phone}</p>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                        Select
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CHECKOUT PAYMENT DIALOG */}
            <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Payment Checkout</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 mt-3">
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Amount Payable</span>
                            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                                {formatCurrency(grandTotal)}
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setSelectedPaymentMethod('cash')}
                                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                                    selectedPaymentMethod === 'cash'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold ring-2 ring-emerald-500/20'
                                        : 'border-border hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <DollarSign className="size-6" />
                                <span className="text-xs">Cash</span>
                            </button>
                            <button
                                onClick={() => setSelectedPaymentMethod('card')}
                                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                                    selectedPaymentMethod === 'card'
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold ring-2 ring-blue-500/20'
                                        : 'border-border hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <CreditCard className="size-6" />
                                <span className="text-xs">Card (POS)</span>
                            </button>
                            <button
                                onClick={() => setSelectedPaymentMethod('digital')}
                                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                                    selectedPaymentMethod === 'digital'
                                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-bold ring-2 ring-purple-500/20'
                                        : 'border-border hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                <QrCode className="size-6" />
                                <span className="text-xs">Digital Wallet</span>
                            </button>
                        </div>

                        {/* Cash Amount Tendered Input */}
                        {selectedPaymentMethod === 'cash' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground">Amount Tendered</label>
                                <Input
                                    type="number"
                                    placeholder={grandTotal.toString()}
                                    value={amountTendered}
                                    onChange={(e) => setAmountTendered(e.target.value)}
                                    className="h-11 text-base font-bold rounded-xl"
                                />
                                {parseFloat(amountTendered) > 0 && (
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 text-xs">
                                        <span className="text-muted-foreground font-medium">Change Due:</span>
                                        <span className="font-black text-emerald-600 text-sm">
                                            {formatCurrency(changeDue)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={handleConfirmPayment}
                            disabled={processing}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 gap-2"
                        >
                            <CheckCircle2 className="size-5" />
                            <span>Confirm & Issue Receipt</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RECEIPT PRINT PREVIEW MODAL */}
            <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 font-mono">
                    <DialogHeader className="text-center pb-2 border-b border-dashed border-border">
                        <DialogTitle className="text-base font-bold">SMART POS STORE</DialogTitle>
                        <p className="text-[11px] text-muted-foreground">Official Sales Receipt</p>
                    </DialogHeader>

                    {lastCompletedSale && (
                        <div className="space-y-3 my-3 text-xs">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Invoice: {lastCompletedSale.invoice_number}</span>
                                <span>{lastCompletedSale.date}</span>
                            </div>

                            <div className="border-t border-b border-dashed border-border py-2 space-y-1">
                                {lastCompletedSale.items.map((item: CartItem, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{item.quantity}x {item.product.name}</span>
                                        <span>{formatCurrency(item.product.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1 text-right">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(lastCompletedSale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatCurrency(lastCompletedSale.tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
                                    <span>Total Paid</span>
                                    <span>{formatCurrency(lastCompletedSale.total)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={() => window.print()}
                            variant="outline"
                            className="flex-1 h-10 rounded-xl gap-2 font-sans"
                        >
                            <Printer className="size-4" />
                            <span>Print</span>
                        </Button>
                        <Button
                            onClick={() => setReceiptModalOpen(false)}
                            className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-sans"
                        >
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
