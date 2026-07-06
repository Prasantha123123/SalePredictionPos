import {
  BarChart3,
  Boxes,
  Building2,
  Gauge,
  HandCoins,
  LineChart,
  Package,
  Percent,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SquareUser,
  Tag,
  Users,
  CreditCard,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'administrator' | 'manager' | 'cashier';

export type NavigationItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  roles: Role[];
  description: string;
};

export const sidebarGroups = [
  {
    title: 'Core',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: Gauge, roles: ['administrator', 'manager', 'cashier'], description: 'Operational overview and KPIs.' },
      { title: 'Billing / POS', path: '/billing', icon: CreditCard, roles: ['administrator', 'manager', 'cashier'], description: 'Fast billing and checkout.' },
      { title: 'Reports', path: '/reports', icon: ReceiptText, roles: ['administrator', 'manager'], description: 'Sales, profit, inventory, and forecast reports.' },
      { title: 'Sales Prediction', path: '/prediction', icon: LineChart, roles: ['administrator', 'manager'], description: 'Daily, weekly, and monthly forecasts.' },
      { title: 'Analytics Dashboard', path: '/analytics', icon: BarChart3, roles: ['administrator', 'manager'], description: 'Interactive business analytics.' },
    ] satisfies NavigationItem[],
  },
  {
    title: 'Operations',
    items: [
      { title: 'Products', path: '/products', icon: Package, roles: ['administrator', 'manager', 'cashier'], description: 'Manage product records.' },
      { title: 'Categories', path: '/categories', icon: Tag, roles: ['administrator', 'manager'], description: 'Organise product groups.' },
      { title: 'Brands', path: '/brands', icon: Building2, roles: ['administrator', 'manager'], description: 'Manage product brands.' },
      { title: 'Suppliers', path: '/suppliers', icon: Users, roles: ['administrator', 'manager'], description: 'Supplier information and contacts.' },
      { title: 'Inventory', path: '/inventory', icon: Boxes, roles: ['administrator', 'manager'], description: 'Stock levels and alerts.' },
      { title: 'Purchases', path: '/purchases', icon: ShoppingCart, roles: ['administrator', 'manager'], description: 'Purchase ordering and receiving.' },
      { title: 'Customers', path: '/customers', icon: SquareUser, roles: ['administrator', 'manager', 'cashier'], description: 'Customer profiles and histories.' },
      { title: 'Expenses', path: '/expenses', icon: CircleDollarSign, roles: ['administrator', 'manager'], description: 'Expense tracking and reporting.' },
      { title: 'Discounts', path: '/discounts', icon: Percent, roles: ['administrator', 'manager'], description: 'Promotional discounts.' },
      { title: 'Coupons', path: '/coupons', icon: HandCoins, roles: ['administrator', 'manager'], description: 'Coupon creation and validation.' },
    ] satisfies NavigationItem[],
  },
  {
    title: 'Administration',
    items: [
      { title: 'User Management', path: '/users', icon: Users, roles: ['administrator'], description: 'Manage system users.' },
      { title: 'Role Management', path: '/roles', icon: ShieldCheck, roles: ['administrator'], description: 'Configure permissions.' },
      { title: 'Settings', path: '/settings', icon: Settings, roles: ['administrator', 'manager', 'cashier'], description: 'Application preferences.' },
      { title: 'Profile', path: '/profile', icon: SquareUser, roles: ['administrator', 'manager', 'cashier'], description: 'User profile settings.' },
    ] satisfies NavigationItem[],
  },
] as const;

export const moduleRoutes = sidebarGroups.flatMap((group) => group.items).filter((item) => !['/dashboard', '/billing', '/prediction', '/settings', '/profile', '/users', '/roles', '/reports', '/analytics'].includes(item.path));

export const demoStats = [
  { label: 'Today\'s Sales', value: 'LKR 184,500', accent: 'from-amber-500 to-orange-500' },
  { label: 'Low Stock Items', value: '12', accent: 'from-sky-500 to-cyan-500' },
  { label: 'Net Profit', value: 'LKR 62,300', accent: 'from-emerald-500 to-green-500' },
  { label: 'Forecast Accuracy', value: '94.2%', accent: 'from-indigo-500 to-violet-500' },
];

export const salesTrend = [
  { name: 'Mon', sales: 102000, forecast: 98000 },
  { name: 'Tue', sales: 116000, forecast: 111000 },
  { name: 'Wed', sales: 98000, forecast: 103000 },
  { name: 'Thu', sales: 123000, forecast: 119000 },
  { name: 'Fri', sales: 157000, forecast: 151000 },
  { name: 'Sat', sales: 198000, forecast: 190000 },
  { name: 'Sun', sales: 175000, forecast: 170000 },
];

export const inventoryWarnings = [
  { product: 'Basmati Rice 1kg', stock: 8, reorderLevel: 15 },
  { product: 'Burger Bun Pack', stock: 4, reorderLevel: 20 },
  { product: 'Coca Cola 500ml', stock: 10, reorderLevel: 18 },
  { product: 'Chicken Breast', stock: 6, reorderLevel: 12 },
];

export const recentSales = [
  { invoice: 'INV-1028', cashier: 'Nimal', amount: 'LKR 14,200', status: 'Paid' },
  { invoice: 'INV-1029', cashier: 'Malini', amount: 'LKR 8,450', status: 'Paid' },
  { invoice: 'INV-1030', cashier: 'Kasun', amount: 'LKR 21,900', status: 'Paid' },
  { invoice: 'INV-1031', cashier: 'Nadeesha', amount: 'LKR 6,800', status: 'Pending' },
];

export const forecastSeries = {
  daily: [
    { label: 'Day 1', actual: 87000, predicted: 89000 },
    { label: 'Day 2', actual: 91000, predicted: 92500 },
    { label: 'Day 3', actual: 88000, predicted: 90000 },
    { label: 'Day 4', actual: 96000, predicted: 98000 },
    { label: 'Day 5', actual: 101000, predicted: 100500 },
  ],
  weekly: [
    { label: 'W1', actual: 480000, predicted: 492000 },
    { label: 'W2', actual: 510000, predicted: 525000 },
    { label: 'W3', actual: 495000, predicted: 502000 },
    { label: 'W4', actual: 535000, predicted: 548000 },
  ],
  monthly: [
    { label: 'Jan', actual: 1800000, predicted: 1820000 },
    { label: 'Feb', actual: 1710000, predicted: 1740000 },
    { label: 'Mar', actual: 1930000, predicted: 1955000 },
    { label: 'Apr', actual: 2010000, predicted: 2040000 },
  ],
} as const;

export type ForecastPoint = {
  label: string;
  actual: number;
  predicted: number;
};

export const predictionMetrics = {
  daily: { model: 'Prophet', rmse: '1,240', mae: '890' },
  weekly: { model: 'XGBoost', rmse: '3,850', mae: '2,610' },
  monthly: { model: 'Prophet', rmse: '11,500', mae: '8,900' },
} as const;

export const productCatalog = [
  { id: 'P001', name: 'Fried Rice', category: 'Meals', price: 850, stock: 42 },
  { id: 'P002', name: 'Chicken Kottu', category: 'Meals', price: 950, stock: 28 },
  { id: 'P003', name: 'Cappuccino', category: 'Beverages', price: 420, stock: 31 },
  { id: 'P004', name: 'Water 500ml', category: 'Beverages', price: 120, stock: 80 },
  { id: 'P005', name: 'Cheese Sandwich', category: 'Snacks', price: 540, stock: 19 },
  { id: 'P006', name: 'Fruit Juice', category: 'Beverages', price: 360, stock: 26 },
];