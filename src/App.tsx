import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  db,
  auth,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from './firebase';
import { migrateLocalStorageToFirestore } from './migration';
import { generateTransactionReportPdf, wibDateKey, buildDateLabel } from './pdfReport';
import {
  Store,
  Package,
  Wallet,
  Receipt,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Check,
  AlertCircle,
  Clock,
  User,
  Filter,
  Printer,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Minus,
  Sparkles,
  BookOpen,
  Coffee,
  ShoppingBag,
  Download,
  Menu,
  LogOut,
  Database
} from 'lucide-react';

// --- Types & Interfaces ---
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StudentLog {
  id: string;
  date: string;
  type: 'deposit' | 'purchase';
  amount: number;
  description: string;
  balanceAfter: number;
}

export interface Student {
  id: string;
  fullName: string;
  classGroup?: string;
  balance: number;
  lastUpdated: string;
  history: StudentLog[];
}

export interface TransactionItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  displayDate: string;
  customerName: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'saved_money';
  cashReceived?: number;
  change?: number;
  studentBalanceBefore?: number;
  studentBalanceAfter?: number;
}

// --- Initial Seed Data ---
const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Roti Gandum Madu', category: 'Makanan', price: 4000, stock: 25, unit: 'pcs' },
  { id: 'prod-2', name: 'Air Mineral Barokah 600ml', category: 'Minuman', price: 3000, stock: 48, unit: 'botol' },
  { id: 'prod-3', name: 'Susu Kurma Segar', category: 'Minuman', price: 7000, stock: 18, unit: 'botol' },
  { id: 'prod-4', name: 'Nasi Kuning Santri', category: 'Makanan', price: 8000, stock: 15, unit: 'porsi' },
  { id: 'prod-5', name: 'Keripik Tempe Renyah', category: 'Snack', price: 3500, stock: 30, unit: 'bks' },
  { id: 'prod-6', name: 'Buku Catatan Tahfidz', category: 'Alat Tulis', price: 6000, stock: 40, unit: 'buku' },
  { id: 'prod-7', name: 'Pulpen Gel Hitam 0.5', category: 'Alat Tulis', price: 2500, stock: 50, unit: 'pcs' },
  { id: 'prod-8', name: 'Madu Randu Asli Sachet', category: 'Herbal', price: 5000, stock: 22, unit: 'sachet' },
  { id: 'prod-9', name: 'Sari Kurma Barokah', category: 'Herbal', price: 12000, stock: 10, unit: 'botol' },
  { id: 'prod-10', name: 'Siomay Kukus Ikan', category: 'Makanan', price: 5000, stock: 20, unit: 'porsi' }
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    fullName: 'Muhammad Al-Fatih',
    classGroup: 'Kelas Tahfidz 1A',
    balance: 65000,
    lastUpdated: '2026-10-09 14:30',
    history: [
      { id: 'log-1', date: '2026-10-07 08:00', type: 'deposit', amount: 100000, description: 'Setoran Awal Tabungan', balanceAfter: 100000 },
      { id: 'log-2', date: '2026-10-08 10:15', type: 'purchase', amount: 15000, description: 'Beli Nasi Kuning & Susu Kurma', balanceAfter: 85000 },
      { id: 'log-3', date: '2026-10-09 12:45', type: 'purchase', amount: 20000, description: 'Beli Buku Catatan Tahfidz & Madu', balanceAfter: 65000 }
    ]
  },
  {
    id: 'std-2',
    fullName: 'Zaid bin Tsabit',
    classGroup: 'Kelas Tahfidz 2B',
    balance: 42000,
    lastUpdated: '2026-10-09 11:20',
    history: [
      { id: 'log-4', date: '2026-10-06 09:00', type: 'deposit', amount: 50000, description: 'Setoran Wali Santri', balanceAfter: 50000 },
      { id: 'log-5', date: '2026-10-08 16:30', type: 'purchase', amount: 8000, description: 'Beli Roti Gandum & Air Mineral', balanceAfter: 42000 }
    ]
  },
  {
    id: 'std-3',
    fullName: 'Abdullah Azzam',
    classGroup: 'Kelas Tahfidz 1B',
    balance: 15000,
    lastUpdated: '2026-10-09 09:10',
    history: [
      { id: 'log-6', date: '2026-10-05 10:00', type: 'deposit', amount: 35000, description: 'Setoran Tabungan Mingguan', balanceAfter: 35000 },
      { id: 'log-7', date: '2026-10-07 13:00', type: 'purchase', amount: 20000, description: 'Beli Sari Kurma', balanceAfter: 15000 }
    ]
  },
  {
    id: 'std-4',
    fullName: 'Fathimah Zahra',
    classGroup: 'Kelas Tahfidz Putri 1',
    balance: 85000,
    lastUpdated: '2026-10-08 15:40',
    history: [
      { id: 'log-8', date: '2026-10-05 08:30', type: 'deposit', amount: 100000, description: 'Setoran Awal Tabungan', balanceAfter: 100000 },
      { id: 'log-9', date: '2026-10-07 12:10', type: 'purchase', amount: 15000, description: 'Beli Susu Kurma & Keripik', balanceAfter: 85000 }
    ]
  },
  {
    id: 'std-5',
    fullName: 'Hanif Ar-Rasyid',
    classGroup: 'Kelas Tahfidz 3A',
    balance: 5000,
    lastUpdated: '2026-10-09 10:05',
    history: [
      { id: 'log-10', date: '2026-10-04 09:00', type: 'deposit', amount: 25000, description: 'Setoran Awal', balanceAfter: 25000 },
      { id: 'log-11', date: '2026-10-06 14:00', type: 'purchase', amount: 20000, description: 'Beli Buku Catatan & Pulpen', balanceAfter: 5000 }
    ]
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-1001',
    date: '2026-10-09T08:15:00',
    displayDate: '09 Okt 2026, 08:15',
    customerName: 'Muhammad Al-Fatih',
    items: [
      { productId: 'prod-4', productName: 'Nasi Kuning Santri', price: 8000, quantity: 1, subtotal: 8000 },
      { productId: 'prod-2', productName: 'Air Mineral Barokah 600ml', price: 3000, quantity: 1, subtotal: 3000 }
    ],
    totalAmount: 11000,
    paymentMethod: 'saved_money',
    studentBalanceBefore: 76000,
    studentBalanceAfter: 65000
  },
  {
    id: 'TRX-1002',
    date: '2026-10-09T09:40:00',
    displayDate: '09 Okt 2026, 09:40',
    customerName: 'Umar Faruq',
    items: [
      { productId: 'prod-1', productName: 'Roti Gandum Madu', price: 4000, quantity: 2, subtotal: 8000 },
      { productId: 'prod-3', productName: 'Susu Kurma Segar', price: 7000, quantity: 1, subtotal: 7000 }
    ],
    totalAmount: 15000,
    paymentMethod: 'cash',
    cashReceived: 20000,
    change: 5000
  },
  {
    id: 'TRX-1003',
    date: '2026-10-09T11:20:00',
    displayDate: '09 Okt 2026, 11:20',
    customerName: 'Zaid bin Tsabit',
    items: [
      { productId: 'prod-6', productName: 'Buku Catatan Tahfidz', price: 6000, quantity: 1, subtotal: 6000 },
      { productId: 'prod-7', productName: 'Pulpen Gel Hitam 0.5', price: 2500, quantity: 2, subtotal: 5000 }
    ],
    totalAmount: 11000,
    paymentMethod: 'cash',
    cashReceived: 15000,
    change: 4000
  }
];

// Currency formatter helper
const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val || 0);
};

// ================= LOCALSTORAGE STORAGE KEYS & HELPERS =================
// 1. Struktur Key LocalStorage yang jelas & terpisah per modul
export const STORAGE_KEYS = {
  INVENTORY: 'canteen_inventory',
  STUDENTS: 'canteen_students',
  TRANSACTIONS: 'canteen_transactions'
} as const;

// 4. Helper Functions utilitas penyimpanan data dengan try-catch error handling
export const storageHelper = {
  /**
   * Mengambil data dari LocalStorage dengan parsing JSON aman.
   * Jika kosong, otomatis menginisialisasi defaultValue ke LocalStorage.
   */
  get<T>(key: string, defaultValue: T, legacyKey?: string): T {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null && stored !== 'undefined') {
        return JSON.parse(stored) as T;
      }
      // Dukungan migrasi jika data pernah disimpan dengan key lama
      if (legacyKey) {
        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored !== null && legacyStored !== 'undefined') {
          const parsed = JSON.parse(legacyStored) as T;
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      // 2. Inisialisasi data awal (Mock Data) ke LocalStorage jika belum ada data
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    } catch (err) {
      console.error(`[LocalStorage Error] Gagal membaca key "${key}":`, err);
      return defaultValue;
    }
  },

  /**
   * Menyimpan data ke LocalStorage dengan serialisasi JSON aman.
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[LocalStorage Error] Gagal menulis key "${key}":`, err);
      return false;
    }
  },

  /**
   * Menghapus spesifik key dari LocalStorage.
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[LocalStorage Error] Gagal menghapus key "${key}":`, err);
    }
  },

  /**
   * Mengosongkan seluruh data modul kantin di LocalStorage.
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.INVENTORY);
      localStorage.removeItem(STORAGE_KEYS.STUDENTS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem('mbti_canteen_products');
      localStorage.removeItem('mbti_canteen_students');
      localStorage.removeItem('mbti_canteen_transactions');
    } catch (err) {
      console.error('[LocalStorage Error] Gagal mengosongkan storage:', err);
    }
  }
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'saved_money' | 'database'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setDbReady(false);
      return;
    }
    let unsubProducts: (() => void) | undefined;
    let unsubStudents: (() => void) | undefined;
    let unsubTransactions: (() => void) | undefined;
    let cancelled = false;

    migrateLocalStorageToFirestore()
      .catch((err) => {
        console.error('[Migration] Gagal migrasi ke Firestore:', err);
      })
      .then(() => {
        if (cancelled) return;
        const qProducts = query(collection(db, 'products'));
        const qStudents = query(collection(db, 'students'));
        const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'));

        const onErr = (err: unknown) => {
          console.error('[Firestore] Listener error:', err);
        };
        unsubProducts = onSnapshot(qProducts, (snap) => {
          setProducts(snap.docs.map((d) => d.data() as Product));
        }, onErr);
        unsubStudents = onSnapshot(qStudents, (snap) => {
          setStudents(snap.docs.map((d) => d.data() as Student));
        }, onErr);
        unsubTransactions = onSnapshot(qTransactions, (snap) => {
          setTransactions(snap.docs.map((d) => d.data() as Transaction));
        }, onErr);
        setDbReady(true);
      });

    return () => {
      cancelled = true;
      unsubProducts?.();
      unsubStudents?.();
      unsubTransactions?.();
    };
  }, [user]);

  // --- Cart State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [cartSearchFilter, setCartSearchFilter] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('Semua');
  const [isMobileCartModalOpen, setIsMobileCartModalOpen] = useState(false);

  // --- Modals State ---
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'saved_money'>('cash');
  const [cashAmountReceived, setCashAmountReceived] = useState<number | ''>('');
  
  // Success Receipt Modal
  const [successTransaction, setSuccessTransaction] = useState<Transaction | null>(null);

  // Inventory Modals
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Makanan',
    price: 5000,
    stock: 10,
    unit: 'pcs'
  });

  // Student Modals
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [isAddDepositModalOpen, setIsAddDepositModalOpen] = useState(false);
  const [depositFormData, setDepositFormData] = useState({
    studentId: '',
    fullName: '',
    classGroup: 'Kelas Tahfidz',
    amount: 20000,
    note: 'Setoran Tambahan Tabungan'
  });

  // Database Filters
  const [dbSearch, setDbSearch] = useState('');
  const [dbMethodFilter, setDbMethodFilter] = useState<'all' | 'cash' | 'saved_money'>('all');
  const [dbDateFilter, setDbDateFilter] = useState<string>('all');
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  // PDF Report state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState<string>(''); // '' = hari ini
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // In-app Delete Confirmation Modals (menggantikan window.confirm yang terblokir di sandbox iframe)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Toast feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Semua', ...cats];
  }, [products]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Inventory statistics
  const inventoryStats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalPotentialRevenue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = products.filter(p => p.stock <= 5).length;
    return { totalItems, totalStock, totalPotentialRevenue, lowStockCount };
  }, [products]);

  // Students statistics
  const studentStats = useMemo(() => {
    const totalStudents = students.length;
    const totalSavings = students.reduce((sum, s) => sum + s.balance, 0);
    return { totalStudents, totalSavings };
  }, [students]);

  // Transactions statistics
  const transactionStats = useMemo(() => {
    const totalCount = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const cashTotal = transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.totalAmount, 0);
    const savedMoneyTotal = transactions.filter(t => t.paymentMethod === 'saved_money').reduce((sum, t) => sum + t.totalAmount, 0);
    return { totalCount, totalRevenue, cashTotal, savedMoneyTotal };
  }, [transactions]);

  // Cart Actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev; // stock limit reached
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  // Student match for Saved Money check
  const matchedStudent = useMemo(() => {
    if (!customerName.trim()) return null;
    const cleanInput = customerName.trim().toLowerCase();
    return students.find(s => s.fullName.trim().toLowerCase() === cleanInput) || null;
  }, [customerName, students]);

  // Open checkout modal
  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      showToast('Keranjang belanja masih kosong! Silakan pilih produk terlebih dahulu.');
      return;
    }
    if (!customerName.trim()) {
      // Jika di layar HP belum mengisi nama, otomatis buka pop-up keranjang
      setIsMobileCartModalOpen(true);
      showToast('Harap masukkan Nama Lengkap Pembeli!');
      return;
    }
    setPaymentMethod('cash');
    setCashAmountReceived(cartTotal);
    setIsPaymentModalOpen(true);
  };

  // Execute Payment
  const handleConfirmPayment = async () => {
    const trimmedName = customerName.trim();
    if (!trimmedName || isSubmitting) return;
    setIsSubmitting(true);

    // Check saved money requirements
    if (paymentMethod === 'saved_money') {
      if (!matchedStudent) {
        showToast(`Siswa atas nama "${trimmedName}" belum terdaftar di tabungan! Silakan gunakan tunai atau daftarkan tabungan.`);
        return;
      }
      if (matchedStudent.balance < cartTotal) {
        showToast(`Saldo tidak mencukupi! Saldo: ${formatRupiah(matchedStudent.balance)}, Belanja: ${formatRupiah(cartTotal)}.`);
        return;
      }
    }

    const now = new Date();
    const isoDate = now.toISOString();
    const displayDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const txId = `TRX-${Date.now().toString().slice(-6)}`;
    const txItems: TransactionItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));

    let newTx: Transaction;

    if (paymentMethod === 'cash') {
      const received = typeof cashAmountReceived === 'number' ? cashAmountReceived : cartTotal;
      if (received < cartTotal) {
        showToast('Nominal uang tunai yang diterima kurang dari total pembayaran!');
        return;
      }
      newTx = {
        id: txId,
        date: isoDate,
        displayDate,
        customerName: trimmedName,
        items: txItems,
        totalAmount: cartTotal,
        paymentMethod: 'cash',
        cashReceived: received,
        change: received - cartTotal
      };
    } else {
      // Saved Money execution
      const currentBal = matchedStudent!.balance;
      const newBal = currentBal - cartTotal;

      newTx = {
        id: txId,
        date: isoDate,
        displayDate,
        customerName: trimmedName,
        items: txItems,
        totalAmount: cartTotal,
        paymentMethod: 'saved_money',
        studentBalanceBefore: currentBal,
        studentBalanceAfter: newBal
      };

      // Update student balance & history (eksplisit, dipakai untuk state + Firestore)
      const logItem: StudentLog = {
        id: `log-${Date.now()}`,
        date: displayDate,
        type: 'purchase',
        amount: cartTotal,
        description: `Belanja Kantin (${txItems.map(i => `${i.productName} x${i.quantity}`).join(', ')})`,
        balanceAfter: newBal
      };
      const updatedStudent: Student = {
        ...matchedStudent!,
        balance: newBal,
        lastUpdated: displayDate,
        history: [logItem, ...matchedStudent!.history]
      };
      setStudents(prev =>
        prev.map(s => (s.id === matchedStudent!.id ? updatedStudent : s))
      );
      await fsUpdateStudent(updatedStudent);
    }

    // Deduct stock in Inventory
    setProducts(prev =>
      prev.map(prod => {
        const inCart = cart.find(c => c.product.id === prod.id);
        if (inCart) {
          const updatedStock = Math.max(0, prod.stock - inCart.quantity);
          return { ...prod, stock: updatedStock };
        }
        return prod;
      })
    );
    await Promise.all(cart.map(item => {
      const inCart = cart.find(c => c.product.id === item.product.id);
      if (inCart) {
        const updatedStock = Math.max(0, item.product.stock - inCart.quantity);
        return fsUpdateProduct({ ...item.product, stock: updatedStock });
      }
      return Promise.resolve();
    }));
    await fsAddTransaction(newTx);

    // Close payment modal, show success receipt modal, clear cart
    setIsPaymentModalOpen(false);
    setSuccessTransaction(newTx);
    setCart([]);
    setCustomerName('');
    setIsSubmitting(false);
  };

  // Product CRUD
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name?.trim() || isSubmitting) return;
    setIsSubmitting(true);

    if (viewProduct && isEditProductModalOpen) {
      const updated: Product = {
        ...viewProduct,
        name: productFormData.name || viewProduct.name,
        category: productFormData.category || viewProduct.category,
        price: Number(productFormData.price) || 0,
        stock: Number(productFormData.stock) || 0,
        unit: productFormData.unit || viewProduct.unit
      };
      setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      await fsUpdateProduct(updated);
      setIsEditProductModalOpen(false);
      setViewProduct(null);
    } else if (isAddProductModalOpen) {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: productFormData.name.trim(),
        category: productFormData.category || 'Makanan',
        price: Math.max(0, Number(productFormData.price) || 0),
        stock: Math.max(0, Number(productFormData.stock) || 0),
        unit: productFormData.unit?.trim() || 'pcs'
      };
      setProducts(prev => [newProd, ...prev]);
      await fsUpdateProduct(newProd);
      setIsAddProductModalOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    await fsDeleteProduct(productId);
    setCart(prev => prev.filter(item => item.product.id !== productId));
    setIsDeleteProductModalOpen(false);
    setViewProduct(null);
    showToast('Produk berhasil dihapus dari inventaris.');
  };

  // Membuka modal konfirmasi hapus transaksi (Aman & kompatibel di semua browser / iframe)
  const handleDeleteTransaction = (transactionOrId: string | Transaction) => {
    const tx =
      typeof transactionOrId === 'string'
        ? transactions.find(t => t.id === transactionOrId) || selectedTxDetail
        : transactionOrId;
    if (tx) {
      setTransactionToDelete(tx);
    }
  };

  // Eksekusi penghapusan transaksi setelah dikonfirmasi oleh user
  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    const targetId = transactionToDelete.id;
    const updated = transactions.filter(t => t.id !== targetId);
    setTransactions(updated);
    await fsDeleteTransaction(targetId);
    if (selectedTxDetail?.id === targetId) {
      setSelectedTxDetail(null);
    }
    setTransactionToDelete(null);
    showToast(`Riwayat transaksi ${targetId} berhasil dihapus dari database.`);
  };

  // Membuka modal konfirmasi hapus akun santri/tabungan
  const handleDeleteStudent = (studentOrId: string | Student, studentName?: string) => {
    const std =
      typeof studentOrId === 'string'
        ? students.find(s => s.id === studentOrId) || viewStudent
        : studentOrId;
    if (std) {
      setStudentToDelete(std);
    }
  };

  // Eksekusi penghapusan data tabungan santri setelah dikonfirmasi oleh user
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete.id;
    const targetName = studentToDelete.fullName;
    const updated = students.filter(s => s.id !== targetId);
    setStudents(updated);
    await fsDeleteStudent(targetId);
    if (viewStudent?.id === targetId) {
      setViewStudent(null);
    }
    setStudentToDelete(null);
    showToast(`Data tabungan santri "${targetName}" berhasil dihapus.`);
  };

  // Student Deposit / Add
  const handleSaveDepositOrStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = depositFormData.fullName.trim();
    if (!name || isSubmitting) return;
    setIsSubmitting(true);

    const amount = Number(depositFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Jumlah deposit harus berupa angka positif!');
      return;
    }

    const now = new Date();
    const displayDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Check if student exists
    const existingIndex = students.findIndex(s => s.fullName.toLowerCase() === name.toLowerCase());

    if (existingIndex >= 0) {
      const updated: Student = {
        ...students[existingIndex],
        balance: students[existingIndex].balance + amount,
        lastUpdated: displayDate,
        history: [
          {
            id: `log-${Date.now()}`,
            date: displayDate,
            type: 'deposit' as const,
            amount,
            description: depositFormData.note.trim() || 'Deposit Tabungan',
            balanceAfter: students[existingIndex].balance + amount
          },
          ...students[existingIndex].history
        ]
      };
      setStudents(prev => prev.map((s, idx) => (idx === existingIndex ? updated : s)));
      await fsUpdateStudent(updated);
    } else {
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        fullName: name,
        classGroup: depositFormData.classGroup.trim() || 'Santri MBTI',
        balance: amount,
        lastUpdated: displayDate,
        history: [
          {
            id: `log-${Date.now()}`,
            date: displayDate,
            type: 'deposit' as const,
            amount,
            description: depositFormData.note.trim() || 'Pendaftaran Tabungan Awal',
            balanceAfter: amount
          }
        ]
      };
      setStudents(prev => [newStudent, ...prev]);
      await fsUpdateStudent(newStudent);
    }

    setIsAddDepositModalOpen(false);
    setDepositFormData({
      studentId: '',
      fullName: '',
      classGroup: 'Kelas Tahfidz',
      amount: 20000,
      note: 'Setoran Tambahan Tabungan'
    });
    setIsSubmitting(false);
  };

  const fsUpdateProduct = useCallback(async (product: Product) => {
    await setDoc(doc(db, 'products', product.id), product);
  }, []);

  const fsDeleteProduct = useCallback(async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
  }, []);

  const fsUpdateStudent = useCallback(async (student: Student) => {
    await setDoc(doc(db, 'students', student.id), student);
  }, []);

  const fsDeleteStudent = useCallback(async (studentId: string) => {
    await deleteDoc(doc(db, 'students', studentId));
  }, []);

  const fsAddTransaction = useCallback(async (transaction: Transaction) => {
    await setDoc(doc(db, 'transactions', transaction.id), transaction);
  }, []);

  const fsDeleteTransaction = useCallback(async (transactionId: string) => {
    await deleteDoc(doc(db, 'transactions', transactionId));
  }, []);

  // Filtered products for Dashboard
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(cartSearchFilter.toLowerCase());
      const matchCat = selectedProductCategory === 'Semua' || p.category === selectedProductCategory;
      return matchSearch && matchCat;
    });
  }, [products, cartSearchFilter, selectedProductCategory]);

  // Filtered transactions for Database Tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchLower = dbSearch.toLowerCase();
      const matchSearch =
        t.customerName.toLowerCase().includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower) ||
        t.items.some(i => i.productName.toLowerCase().includes(searchLower));

      const matchMethod = dbMethodFilter === 'all' || t.paymentMethod === dbMethodFilter;

      let matchDate = true;
      if (dbDateFilter === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        matchDate = t.date.slice(0, 10) === todayStr;
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [transactions, dbSearch, dbMethodFilter, dbDateFilter]);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg.replace('Firebase: ', ''));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7AAACE] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F8F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7AAACE] to-[#355872] p-3 flex items-center justify-center mx-auto mb-3 border border-white/20">
              <Store className="w-8 h-8 text-[#F7F8F0]" />
            </div>
            <h2 className="text-xl font-bold text-[#355872]">Kantin Ma'had MBTI</h2>
            <p className="text-xs text-slate-500 mt-1">Masuk untuk mengelola data kantin</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
              />
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#355872] hover:bg-[#284357] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer transition-colors"
            >
              {authSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-[#F7F8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7AAACE] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Menghubungkan ke database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F0] text-slate-800 flex flex-col font-sans w-full max-w-full overflow-x-clip">
      {/* ================= HEADER & NAVIGATION ================= */}
      <header className="sticky top-0 z-30 bg-[#355872] text-white shadow-md border-b border-[#7AAACE]/20 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 sm:py-3.5 gap-2 sm:gap-4">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-[#7AAACE] to-[#355872] p-1.5 sm:p-2 flex items-center justify-center shadow-inner border border-white/20 shrink-0">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-[#F7F8F0]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm sm:text-base lg:text-lg xl:text-xl tracking-tight text-white leading-tight truncate">
                    Kantin Ma'had Bina Tahfidz
                  </h1>
                  <span className="hidden 2xl:inline-block text-[10px] font-semibold bg-[#9CD5FF]/20 text-[#9CD5FF] px-2 py-0.5 rounded border border-[#9CD5FF]/30 uppercase tracking-wider shrink-0">
                    Indonesia
                  </span>
                </div>
                {/* Deskripsi hanya muncul di layar sangat lebar (xl) agar tidak memakan tempat di tablet/laptop */}
                <p className="hidden xl:block text-xs text-[#9CD5FF]/90 font-medium truncate whitespace-nowrap">
                  Sistem Kasir, Stok Inventaris & Tabungan Santri
                </p>
              </div>
            </div>

            {/* Right: Tombol Menu Navigasi untuk Mobile & Tablet (< 1024px) */}
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="relative p-2 text-white hover:bg-white/10 rounded-lg cursor-pointer flex items-center justify-center transition-colors"
                title="Buka Menu Navigasi"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-6 h-6 text-white" />
                {cartTotalItems > 0 && activeTab === 'dashboard' && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-slate-900 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartTotalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Navigation Tabs (Tampil di layar desktop >= 1024px dengan teks adaptif) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#9CD5FF] truncate max-w-[120px]">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </div>
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-[#7AAACE] text-white shadow-sm font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>
                  <span className="xl:hidden">Kasir</span>
                  <span className="hidden xl:inline">Dashboard Kasir</span>
                </span>
                {cartTotalItems > 0 && (
                  <span className="ml-0.5 bg-amber-400 text-slate-900 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {cartTotalItems}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'bg-[#7AAACE] text-white shadow-sm font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>
                  <span className="xl:hidden">Inventaris</span>
                  <span className="hidden xl:inline">Inventaris</span>
                </span>
                <span className="text-[10px] opacity-75 font-mono">({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('saved_money')}
                className={`flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'saved_money'
                    ? 'bg-[#7AAACE] text-white shadow-sm font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>
                  <span className="xl:hidden">Tabungan</span>
                  <span className="hidden xl:inline">Tabungan</span>
                </span>
              </button>

              <button
                onClick={() => setActiveTab('database')}
                className={`flex items-center gap-1.5 px-3 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'database'
                    ? 'bg-[#7AAACE] text-white shadow-sm font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span>
                  <span className="xl:hidden">Transaksi</span>
                  <span className="hidden xl:inline">Data Transaksi</span>
                </span>
                <span className="text-[10px] opacity-75 font-mono">({transactions.length})</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ================= MOBILE & TABLET SLIDE-IN TASKBAR (DARI KIRI) ================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop gelap */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panel Taskbar dari Kiri */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#355872] text-white shadow-2xl flex flex-col z-50 border-r border-[#7AAACE]/30 animate-in slide-in-from-left duration-200">
            {/* Header Drawer */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#284357]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7AAACE] to-[#355872] p-1.5 flex items-center justify-center border border-white/20">
                  <Store className="w-5 h-5 text-[#F7F8F0]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    Kantin Ma'had
                  </h3>
                  <p className="text-[11px] text-[#9CD5FF]">Bina Tahfidz Indonesia</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Menu Taskbar */}
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase font-bold text-[#9CD5FF]/80 tracking-wider px-3 mb-2">
                Menu Halaman
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#7AAACE] text-white font-semibold shadow-xs'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[#9CD5FF]" />
                  <span>Dashboard</span>
                </div>
                {cartTotalItems > 0 && (
                  <span className="bg-amber-400 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full">
                    {cartTotalItems}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('inventory');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#7AAACE] text-white font-semibold shadow-xs'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#9CD5FF]" />
                  <span>Inventaris</span>
                </div>
                <span className="text-xs opacity-75 font-mono">({products.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('saved_money');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'saved_money'
                    ? 'bg-[#7AAACE] text-white font-semibold shadow-xs'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-[#9CD5FF]" />
                  <span>Tabungan</span>
                </div>
                <span className="text-xs opacity-75 font-mono">({students.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('database');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-[#7AAACE] text-white font-semibold shadow-xs'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-[#9CD5FF]" />
                  <span>Data Transaksi</span>
                </div>
                <span className="text-xs opacity-75 font-mono">({transactions.length})</span>
              </button>
            </div>

            {/* Footer Drawer */}
            <div className="p-4 border-t border-white/10 bg-[#284357]/80 space-y-3">
              <div className="text-xs text-white/70 space-y-1">
                <p className="font-semibold text-white/90">Kantin Ma'had MBTI</p>
                <p className="text-[11px] text-[#9CD5FF]/80">Version 1.0.1</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 ${cart.length > 0 ? 'pb-24 md:pb-8' : ''}`}>

        {/* ----------------- TAB 1: DASHBOARD (KASIR & KERANJANG) ----------------- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left 7-8 cols: Produk Kantin */}
            <div className="col-span-1 md:col-span-7 lg:col-span-7 xl:col-span-8 space-y-5">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari produk kantin (makanan, minuman, kitab, dll)..."
                    value={cartSearchFilter}
                    onChange={e => setCartSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] focus:border-[#7AAACE]"
                  />
                  {cartSearchFilter && (
                    <button
                      onClick={() => setCartSearchFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedProductCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        selectedProductCategory === cat
                          ? 'bg-[#355872] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const inCartItem = cart.find(i => i.product.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-[#7AAACE] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[11px] font-semibold text-[#355872] bg-[#9CD5FF]/25 px-2 py-0.5 rounded border border-[#9CD5FF]/40">
                            {product.category}
                          </span>
                          <span
                            className={`text-[11px] font-roboto font-medium px-2 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700 font-semibold'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isOutOfStock ? 'Habis' : `Stok: ${product.stock} ${product.unit}`}
                          </span>
                        </div>

                        <h3 className="font-semibold text-slate-800 text-base leading-snug group-hover:text-[#355872] transition-colors">
                          {product.name}
                        </h3>

                        <div className="mt-2 flex items-baseline gap-1 text-[#355872] font-roboto">
                          <span className="text-xs font-semibold">Rp</span>
                          <span className="text-lg font-bold">
                            {product.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs text-slate-400">/{product.unit}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {inCartItem ? (
                          <div className="flex items-center justify-between w-full bg-slate-50 border border-[#7AAACE]/50 rounded-lg p-1">
                            <button
                              onClick={() => updateCartQuantity(product.id, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                              title="Kurangi"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-[#355872] font-roboto px-2">
                              {inCartItem.quantity} di keranjang
                            </span>
                            <button
                              disabled={inCartItem.quantity >= product.stock}
                              onClick={() => updateCartQuantity(product.id, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-[#355872] hover:bg-[#355872]/90 disabled:opacity-40 text-white cursor-pointer shadow-xs"
                              title="Tambah"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#355872] hover:bg-[#284357] text-white shadow-xs'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah ke Keranjang
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
                  <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Tidak ada produk yang cocok dengan pencarian.</p>
                  <button
                    onClick={() => {
                      setCartSearchFilter('');
                      setSelectedProductCategory('Semua');
                    }}
                    className="mt-3 text-xs text-[#355872] underline font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>

            {/* Right 4-5 cols: Keranjang (Basket) & Pembeli (Tampil langsung di Desktop & Tablet) */}
            <div id="cart-section" className="hidden md:block md:col-span-5 lg:col-span-5 xl:col-span-4 md:sticky md:top-20">
              <div className="bg-white rounded-xl shadow-md border border-slate-200/90 overflow-hidden">
                {/* Basket Header */}
                <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#9CD5FF]" />
                    <h2 className="font-bold text-base">Keranjang Kasir</h2>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-white/80 hover:text-white underline cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* Nama Lengkap Pembeli Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Pembeli <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama lengkap siswa..."
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] focus:border-[#7AAACE]"
                        list="students-datalist"
                      />
                      <datalist id="students-datalist">
                        {students.map(s => (
                          <option key={s.id} value={s.fullName}>
                            {s.classGroup ? `${s.fullName} (${s.classGroup})` : s.fullName} - Saldo: {formatRupiah(s.balance)}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Santri Saved Money Info badge */}
                    {matchedStudent && (
                      <div className="mt-2 p-2 bg-[#9CD5FF]/20 border border-[#7AAACE]/40 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[#355872] min-w-0 pr-2">
                          <Wallet className="w-3.5 h-3.5 text-[#355872] shrink-0" />
                          <span className="font-semibold truncate">{matchedStudent.fullName}</span>
                        </div>
                        <div className="font-roboto font-bold text-[#355872] shrink-0">
                          Saldo: {formatRupiah(matchedStudent.balance)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#7AAACE]" />
                        <p className="text-xs">Keranjang masih kosong.</p>
                        <p className="text-[11px] text-slate-400">Pilih produk di atas untuk menambahkan.</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/70"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="text-xs font-semibold text-slate-800 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-roboto">
                              {formatRupiah(item.product.price)} × {item.quantity}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#355872] font-roboto">
                              {formatRupiah(item.product.price * item.quantity)}
                            </span>
                            <div className="flex items-center border border-slate-200 rounded bg-white">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold font-roboto">
                                {item.quantity}
                              </span>
                              <button
                                disabled={item.quantity >= item.product.stock}
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary & Checkout Button */}
                  {cart.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Total Jumlah Item:</span>
                        <span className="font-semibold font-roboto">{cartTotalItems} item</span>
                      </div>
                      <div className="flex justify-between items-center text-base font-bold text-slate-800">
                        <span>Total Bayar:</span>
                        <span className="text-xl text-[#355872] font-roboto">
                          {formatRupiah(cartTotal)}
                        </span>
                      </div>

                      <button
                        onClick={handleProceedToPayment}
                        className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#355872] hover:bg-[#284357] shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <Banknote className="w-5 h-5 text-[#9CD5FF]" />
                        <span>Bayar Sekarang ({formatRupiah(cartTotal)})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Mobile Cart Bar (Khusus Layar HP / Selain Desktop & Tablet) */}
            {cart.length > 0 && (
              <div className="fixed bottom-3 left-3 right-3 z-30 md:hidden animate-in slide-in-from-bottom duration-200">
                <div
                  onClick={() => setIsMobileCartModalOpen(true)}
                  className="bg-[#355872] text-white p-3 rounded-2xl shadow-xl border border-white/20 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#284357] active:scale-[0.99] transition-all"
                  title="Tekan untuk membuka keranjang & proses pembayaran"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-amber-400 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
                      {cartTotalItems}
                    </span>
                    <div className="truncate">
                      <p className="text-[10px] text-[#9CD5FF] leading-none">Total Belanja</p>
                      <p className="font-roboto font-bold text-sm text-white truncate">
                        {formatRupiah(cartTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart();
                        showToast('Pesanan berhasil dibatalkan.');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-medium cursor-pointer flex items-center gap-1 transition-colors active:scale-95"
                      title="Batalkan pesanan ini"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileCartModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#7AAACE] hover:bg-[#6899bd] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Bayar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 2: INVENTORY (MANAJEMEN STOK) ----------------- */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Inventory Header & Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#355872]/10 flex items-center justify-center text-[#355872]">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Jenis Produk</p>
                  <p className="text-xl font-bold text-[#355872] font-roboto">{inventoryStats.totalItems} Barang</p>
                  <p className="text-[11px] text-slate-400">{inventoryStats.totalStock} total unit fisik</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Pendapatan Potensial</p>
                  <p className="text-xl font-bold text-emerald-700 font-roboto">
                    {formatRupiah(inventoryStats.totalPotentialRevenue)}
                  </p>
                  <p className="text-[11px] text-slate-400">Rumus: Jumlah item × Harga per item</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Stok Perlu Perhatian</p>
                  <p className="text-xl font-bold text-amber-700 font-roboto">
                    {inventoryStats.lowStockCount} Produk
                  </p>
                  <p className="text-[11px] text-slate-400">Stok ≤ 5 unit perlu restock</p>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="font-bold text-base text-[#355872]">Daftar Inventaris Kantin</h2>
                <p className="text-xs text-slate-500">
                  Klik pada kartu produk untuk melihat detail, mengubah harga/stok, atau menghapus item.
                </p>
              </div>

              <button
                onClick={() => {
                  setProductFormData({
                    name: '',
                    category: 'Makanan',
                    price: 5000,
                    stock: 20,
                    unit: 'pcs'
                  });
                  setIsAddProductModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-lg bg-[#355872] hover:bg-[#284357] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Item Baru
              </button>
            </div>

            {/* Product Cards Grid with Potential Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;

                return (
                  <div
                    key={product.id}
                    onClick={() => setViewProduct(product)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-[#7AAACE] p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-semibold text-[#355872] bg-[#9CD5FF]/25 px-2 py-0.5 rounded border border-[#9CD5FF]/40">
                          {product.category}
                        </span>
                        <span
                          className={`text-[10px] font-medium font-roboto px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'Habis' : `Stok: ${product.stock} ${product.unit}`}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-800 text-sm group-hover:text-[#355872] transition-colors line-clamp-1">
                        {product.name}
                      </h3>

                      <div className="mt-2 text-xs text-slate-500 font-roboto">
                        Harga Satuan: <span className="font-bold text-slate-800">{formatRupiah(product.price)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#7AAACE] font-medium group-hover:text-[#355872] transition-colors">
                      <span className="text-slate-400 text-[10px]">Klik untuk kelola</span>
                      <div className="flex items-center group-hover:translate-x-0.5 transition-transform">
                        <span>Detail & Kelola</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: SAVED MONEY (TABUNGAN SISWA) ----------------- */}
        {activeTab === 'saved_money' && (
          <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#355872]/10 flex items-center justify-center text-[#355872]">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Saldo Tersimpan</p>
                  <p className="text-xl font-bold text-[#355872] font-roboto">
                    {formatRupiah(studentStats.totalSavings)}
                  </p>
                  <p className="text-[11px] text-slate-400">Dana tabungan santri aman</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#7AAACE]/20 flex items-center justify-center text-[#355872]">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Jumlah Santri Terdaftar</p>
                  <p className="text-xl font-bold text-[#355872] font-roboto">{studentStats.totalStudents} Santri</p>
                  <p className="text-[11px] text-slate-400">Akun aktif bertransaksi non-tunai</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Aksi Cepat</p>
                  <p className="text-sm font-semibold text-slate-700">Daftar Santri / Top Up Saldo</p>
                </div>
                <button
                  onClick={() => {
                    setDepositFormData({
                      studentId: '',
                      fullName: '',
                      classGroup: 'Kelas Tahfidz',
                      amount: 20000,
                      note: 'Setoran Tambahan Tabungan'
                    });
                    setIsAddDepositModalOpen(true);
                  }}
                  className="py-2 px-3.5 rounded-lg bg-[#355872] hover:bg-[#284357] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Deposit Saldo
                </button>
              </div>
            </div>

            {/* Vertical Student List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-base text-[#355872]">Daftar Rekening Tabungan Siswa</h3>
                  <p className="text-xs text-slate-500">
                    Klik nama santri untuk melihat riwayat setoran & transaksi belanja secara detail.
                  </p>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-roboto">
                  Total: {students.length} Akun
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {students.map(student => {
                  const isLow = student.balance < 10000;
                  return (
                    <div
                      key={student.id}
                      onClick={() => setViewStudent(student)}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#9CD5FF]/30 border border-[#7AAACE]/50 flex items-center justify-center font-bold text-[#355872] text-sm shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-800 hover:text-[#355872]">
                              {student.fullName}
                            </h4>
                            {student.classGroup && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {student.classGroup}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-roboto">
                            Terakhir diperbarui: {student.lastUpdated} · {student.history.length} riwayat
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Saldo Saat Ini</p>
                          <p
                            className={`text-base font-bold font-roboto ${
                              isLow ? 'text-rose-600' : 'text-[#355872]'
                            }`}
                          >
                            {formatRupiah(student.balance)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setDepositFormData({
                                studentId: student.id,
                                fullName: student.fullName,
                                classGroup: student.classGroup || '',
                                amount: 20000,
                                note: 'Top Up Saldo Santri'
                              });
                              setIsAddDepositModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-md bg-[#9CD5FF]/30 hover:bg-[#9CD5FF]/50 text-[#355872] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Top Up
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteStudent(student.id, student.fullName);
                            }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Hapus data tabungan ${student.fullName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: DATABASE (RIWAYAT TRANSAKSI) ----------------- */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Database Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Total Omset Kasir</p>
                <p className="text-xl font-bold text-[#355872] font-roboto mt-1">
                  {formatRupiah(transactionStats.totalRevenue)}
                </p>
                <p className="text-[11px] text-slate-400 font-roboto">{transactionStats.totalCount} transaksi selesai</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Pembayaran Tunai (Cash)</p>
                <p className="text-xl font-bold text-emerald-700 font-roboto mt-1">
                  {formatRupiah(transactionStats.cashTotal)}
                </p>
                <p className="text-[11px] text-slate-400">Uang fisik di laci kasir</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Saved Money (Tabungan)</p>
                <p className="text-xl font-bold text-[#7AAACE] font-roboto mt-1">
                  {formatRupiah(transactionStats.savedMoneyTotal)}
                </p>
                <p className="text-[11px] text-slate-400">Debit otomatis saldo santri</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari transaksi berdasarkan Nama Pembeli, Kode Transaksi, atau Nama Item..."
                    value={dbSearch}
                    onChange={e => setDbSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                  />
                  {dbSearch && (
                    <button
                      onClick={() => setDbSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Payment Method filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                    <button
                      onClick={() => setDbMethodFilter('all')}
                      className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                        dbMethodFilter === 'all' ? 'bg-[#355872] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setDbMethodFilter('cash')}
                      className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                        dbMethodFilter === 'cash' ? 'bg-[#355872] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Cash (Tunai)
                    </button>
                    <button
                      onClick={() => setDbMethodFilter('saved_money')}
                      className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                        dbMethodFilter === 'saved_money' ? 'bg-[#355872] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Tabungan
                    </button>
                  </div>

                  {/* Date filter */}
                  <select
                    value={dbDateFilter}
                    onChange={e => setDbDateFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="today">Hari Ini Saja</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PDF Report Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-[#355872]">Laporan PDF</h3>
                <p className="text-xs text-slate-500">Buat laporan rincian transaksi harian dalam format PDF.</p>
              </div>
              <button
                type="button"
                onClick={() => { setReportDate(''); setIsReportModalOpen(true); }}
                className="py-2.5 px-4 rounded-lg bg-[#355872] hover:bg-[#284357] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Buat Laporan PDF
              </button>
            </div>

            {/* Transactions Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Desktop & Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#355872] text-white text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Waktu & ID</th>
                      <th className="py-3 px-4">Nama Pembeli</th>
                      <th className="py-3 px-4">Total Biaya</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTransactions.map(tx => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTxDetail(tx)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        title="Klik baris ini untuk melihat detail struk"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-[#355872] block">
                            {tx.id}
                          </span>
                          <span className="text-[11px] text-slate-400 font-roboto">
                            {tx.displayDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {tx.customerName}
                          <span className="text-[11px] text-slate-400 font-normal block font-roboto">
                            {tx.items.length} item barang
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 font-roboto whitespace-nowrap">
                          {formatRupiah(tx.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tx.paymentMethod === 'cash' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                              <Banknote className="w-3.5 h-3.5" />
                              Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#9CD5FF]/30 text-[#355872] border border-[#7AAACE]/40 px-2 py-0.5 rounded">
                              <Wallet className="w-3.5 h-3.5" />
                              Uang Tersimpan
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(tx.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                            title="Hapus riwayat transaksi ini"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (Lebih nyaman & rapi di smartphone) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredTransactions.map(tx => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxDetail(tx)}
                    className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                    title="Ketuk untuk melihat detail struk"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#355872] block">
                          {tx.id}
                        </span>
                        <span className="text-[11px] text-slate-400 font-roboto">
                          {tx.displayDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {tx.paymentMethod === 'cash' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                            <Banknote className="w-3 h-3" />
                            Cash
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#9CD5FF]/30 text-[#355872] border border-[#7AAACE]/40 px-2 py-0.5 rounded">
                            <Wallet className="w-3 h-3" />
                            Uang Tersimpan
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(tx.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus transaksi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          {tx.customerName}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5 font-roboto">
                          ({tx.items.length} item)
                        </span>
                      </div>
                      <span className="text-sm font-bold font-roboto text-[#355872] shrink-0">
                        {formatRupiah(tx.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="italic text-[10px]">Ketuk untuk detail struk</span>
                      <span className="text-[#355872] font-semibold flex items-center gap-0.5">
                        Lihat Struk <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#7AAACE]" />
                  <p className="text-sm font-medium">Belum ada riwayat transaksi yang cocok.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODALS & POP-UPS ================= */}

      {/* 0. MOBILE CART POPUP MODAL (Khusus Layar HP / Selain Desktop & Tablet) */}
      {isMobileCartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#9CD5FF]" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Keranjang Kasir</h3>
                  <p className="text-[11px] text-[#9CD5FF]">{cartTotalItems} barang dipilih</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-white/80 hover:text-white underline cursor-pointer px-1 py-0.5"
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileCartModalOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Input Nama Lengkap Pembeli */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Pembeli <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus={!customerName}
                    placeholder="Ketik nama lengkap siswa..."
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] focus:border-[#7AAACE]"
                    list="mobile-students-datalist"
                  />
                  <datalist id="mobile-students-datalist">
                    {students.map(s => (
                      <option key={s.id} value={s.fullName}>
                        {s.classGroup ? `${s.fullName} (${s.classGroup})` : s.fullName} - Saldo: {formatRupiah(s.balance)}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Status Tabungan Siswa jika cocok */}
                {matchedStudent && (
                  <div className="mt-2.5 p-2 bg-[#9CD5FF]/20 border border-[#7AAACE]/40 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-[#355872] min-w-0 pr-2">
                      <Wallet className="w-3.5 h-3.5 text-[#355872] shrink-0" />
                      <span className="font-semibold truncate">{matchedStudent.fullName}</span>
                    </div>
                    <div className="font-roboto font-bold text-[#355872] shrink-0">
                      Saldo: {formatRupiah(matchedStudent.balance)}
                    </div>
                  </div>
                )}
              </div>

              {/* Rincian Barang di Keranjang */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Barang Belanja:
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-1 opacity-40 text-[#7AAACE]" />
                      <p className="text-xs">Keranjang belanja kosong.</p>
                      <p className="text-[11px] text-slate-400">Silakan pilih produk pada daftar barang.</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <h5 className="text-xs font-semibold text-slate-800 truncate">
                            {item.product.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 font-roboto">
                            {formatRupiah(item.product.price)} × {item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#355872] font-roboto">
                            {formatRupiah(item.product.price * item.quantity)}
                          </span>
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold font-roboto">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.product.stock}
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                            title="Hapus item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer / Checkout Action */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-800">
                <span>Total Pembayaran:</span>
                <span className="text-lg sm:text-xl text-[#355872] font-roboto">
                  {formatRupiah(cartTotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileCartModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                >
                  Tambah Lagi
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (cart.length === 0) {
                      showToast('Keranjang belanja masih kosong!');
                      return;
                    }
                    if (!customerName.trim()) {
                      showToast('Harap masukkan Nama Lengkap Pembeli terlebih dahulu!');
                      return;
                    }
                    setIsMobileCartModalOpen(false);
                    setPaymentMethod('cash');
                    setCashAmountReceived(cartTotal);
                    setIsPaymentModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3.5 rounded-lg text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Banknote className="w-3.5 h-3.5 text-[#9CD5FF]" />
                  <span>Lanjut Pembayaran</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. PAYMENT MODAL (POP-UP PEMBAYARAN) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Konfirmasi Pembayaran</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Customer & Items Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Nama Pembeli:</span>
                  <span className="font-bold text-slate-800 text-sm">{customerName}</span>
                </div>
                <div className="border-t border-slate-200/80 pt-2 space-y-1">
                  <span className="text-slate-500 font-medium block">Daftar Item:</span>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="font-roboto font-semibold">
                        {formatRupiah(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-[#355872]">
                  <span>Total Harga Belanja:</span>
                  <span className="text-base font-roboto">{formatRupiah(cartTotal)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pilih Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                      paymentMethod === 'cash'
                        ? 'border-[#355872] bg-[#355872]/5 text-[#355872] font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold">Cash (Tunai)</div>
                      <div className="text-[10px] text-slate-500">Bayar fisik di kasir</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('saved_money')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                      paymentMethod === 'saved_money'
                        ? 'border-[#355872] bg-[#355872]/5 text-[#355872] font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-[#7AAACE]" />
                    <div>
                      <div className="text-xs font-bold">Saved Money</div>
                      <div className="text-[10px] text-slate-500">Potong saldo tabungan</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Detail Per Method */}
              {paymentMethod === 'cash' && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-emerald-900">
                    Uang Tunai Diterima:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={cashAmountReceived}
                      onChange={e => setCashAmountReceived(Number(e.target.value) || '')}
                      placeholder="Masukkan nominal uang..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-roboto font-bold"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {[cartTotal, 10000, 20000, 50000, 100000].map(
                      amt =>
                        amt >= cartTotal && (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashAmountReceived(amt)}
                            className="text-[11px] px-2 py-1 rounded bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-roboto cursor-pointer"
                          >
                            {amt === cartTotal ? 'Uang Pas' : formatRupiah(amt)}
                          </button>
                        )
                    )}
                  </div>

                  {typeof cashAmountReceived === 'number' && cashAmountReceived >= cartTotal && (
                    <div className="pt-2 border-t border-emerald-200/70 flex justify-between items-center text-xs text-emerald-900">
                      <span>Kembalian:</span>
                      <span className="font-bold text-sm font-roboto text-emerald-800">
                        {formatRupiah(cashAmountReceived - cartTotal)}
                      </span>
                    </div>
                  )}

                  {typeof cashAmountReceived === 'number' && cashAmountReceived < cartTotal && (
                    <p className="text-xs text-rose-600 font-medium">
                      Nominal uang kurang {formatRupiah(cartTotal - cashAmountReceived)}!
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === 'saved_money' && (
                <div className="space-y-3">
                  {!matchedStudent ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Siswa Belum Memiliki Tabungan!</span>
                      </div>
                      <p>
                        Nama <strong>"{customerName}"</strong> tidak ditemukan dalam daftar Saved Money.
                        Silakan daftarkan santri ini terlebih dahulu atau gunakan metode pembayaran Tunai.
                      </p>
                    </div>
                  ) : matchedStudent.balance < cartTotal ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Saldo Tabungan Tidak Mencukupi!</span>
                      </div>
                      <div className="font-roboto space-y-1">
                        <div className="flex justify-between">
                          <span>Saldo Siswa Saat Ini:</span>
                          <span className="font-bold">{formatRupiah(matchedStudent.balance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Belanja:</span>
                          <span className="font-bold">{formatRupiah(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700 font-bold border-t border-rose-200 pt-1">
                          <span>Kekurangan Saldo:</span>
                          <span>{formatRupiah(cartTotal - matchedStudent.balance)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-rose-600 italic">
                        Transaksi tidak dapat dilanjutkan dengan tabungan. Silakan top up saldo terlebih dahulu atau pilih Tunai.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-[#9CD5FF]/20 border border-[#7AAACE]/50 rounded-xl text-xs space-y-2 text-[#355872]">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Saldo Mencukupi! Verifikasi Berhasil</span>
                      </div>
                      <div className="font-roboto space-y-1">
                        <div className="flex justify-between">
                          <span>Saldo Sebelum Transaksi:</span>
                          <span className="font-semibold">{formatRupiah(matchedStudent.balance)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700">
                          <span>Debit Belanja Kantin:</span>
                          <span className="font-semibold">-{formatRupiah(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-[#355872] border-t border-[#7AAACE]/30 pt-1 text-sm">
                          <span>Sisa Saldo Setelah Transaksi:</span>
                          <span>{formatRupiah(matchedStudent.balance - cartTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={
                  isSubmitting ||
                  (paymentMethod === 'saved_money' &&
                  (!matchedStudent || matchedStudent.balance < cartTotal))
                }
                className="px-5 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Konfirmasi & Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUCCESS RECEIPT MODAL */}
      {successTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/30">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg">Transaksi Berhasil!</h3>
              <p className="text-xs text-white/90">Data otomatis tersimpan ke Database Transaksi</p>
            </div>

            {/* Receipt Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm text-[#355872]">Kantin Ma'had Bina Tahfidz</h4>
                <p className="text-[11px] text-slate-400">Bukti Pembayaran Resmi</p>
                <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                  ID: {successTransaction.id}
                </p>
                <p className="text-[11px] text-slate-500 font-roboto">{successTransaction.displayDate}</p>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pembeli:</span>
                  <span className="font-bold text-slate-800">{successTransaction.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="font-bold uppercase text-[#355872]">
                    {successTransaction.paymentMethod === 'cash' ? 'Cash (Tunai)' : 'Saved Money (Tabungan)'}
                  </span>
                </div>

                <div className="py-2 border-y border-slate-100 space-y-1">
                  {successTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="font-roboto font-semibold">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1">
                  <span>TOTAL:</span>
                  <span className="text-base text-[#355872] font-roboto">
                    {formatRupiah(successTransaction.totalAmount)}
                  </span>
                </div>

                {successTransaction.paymentMethod === 'cash' && successTransaction.cashReceived !== undefined && (
                  <div className="pt-2 text-slate-600 font-roboto space-y-0.5 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(successTransaction.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(successTransaction.change || 0)}</span>
                    </div>
                  </div>
                )}

                {successTransaction.paymentMethod === 'saved_money' &&
                  successTransaction.studentBalanceAfter !== undefined && (
                    <div className="pt-2 text-[#355872] font-roboto space-y-0.5 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>Saldo Sebelum:</span>
                        <span>{formatRupiah(successTransaction.studentBalanceBefore || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Sisa Saldo Tabungan:</span>
                        <span>{formatRupiah(successTransaction.studentBalanceAfter)}</span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setSuccessTransaction(null)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#355872] hover:bg-[#284357] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCT DETAIL & EDIT/DELETE MODAL (INVENTORY) */}
      {viewProduct && !isEditProductModalOpen && !isDeleteProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Detail Produk</h3>
              </div>
              <button onClick={() => setViewProduct(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <span className="text-[11px] font-semibold text-[#355872] bg-[#9CD5FF]/25 px-2 py-0.5 rounded border border-[#9CD5FF]/40">
                  {viewProduct.category}
                </span>
                <h2 className="text-xl font-bold text-slate-800 mt-2">{viewProduct.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Harga Satuan</span>
                  <span className="text-base font-bold text-[#355872] font-roboto block mt-0.5">
                    {formatRupiah(viewProduct.price)}
                  </span>
                  <span className="text-[11px] text-slate-400">per {viewProduct.unit}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Stok Tersedia</span>
                  <span
                    className={`text-base font-bold font-roboto block mt-0.5 ${
                      viewProduct.stock <= 0
                        ? 'text-rose-600'
                        : viewProduct.stock <= 5
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {viewProduct.stock} {viewProduct.unit}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {viewProduct.stock <= 0 ? 'Stok Habis' : 'Siap Dijual'}
                  </span>
                </div>
              </div>

              {/* Total Potential Revenue Box */}
              <div className="bg-[#9CD5FF]/20 border border-[#7AAACE]/40 p-4 rounded-xl text-center">
                <span className="text-xs font-semibold text-[#355872] uppercase tracking-wider block">
                  Total Pendapatan Potensial
                </span>
                <span className="text-2xl font-bold text-[#355872] font-roboto block mt-1">
                  {formatRupiah(viewProduct.stock * viewProduct.price)}
                </span>
                <span className="text-[11px] text-slate-500 font-roboto">
                  (Dihitung dari {viewProduct.stock} {viewProduct.unit} × {formatRupiah(viewProduct.price)})
                </span>
              </div>
            </div>

            {/* Action buttons: Edit & Delete */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteProductModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Produk
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductFormData({
                    name: viewProduct.name,
                    category: viewProduct.category,
                    price: viewProduct.price,
                    stock: viewProduct.stock,
                    unit: viewProduct.unit
                  });
                  setIsEditProductModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EDIT PRODUCT FORM MODAL */}
      {isEditProductModalOpen && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Data Produk</h3>
              <button onClick={() => setIsEditProductModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={productFormData.name || ''}
                  onChange={e => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={productFormData.category || 'Makanan'}
                  onChange={e => setProductFormData({ ...productFormData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Snack">Snack</option>
                  <option value="Alat Tulis">Alat Tulis</option>
                  <option value="Herbal">Herbal</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.price || 0}
                    onChange={e => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Stok</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.stock || 0}
                    onChange={e => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Unit</label>
                <input
                  type="text"
                  placeholder="pcs, botol, porsi, bks..."
                  value={productFormData.unit || 'pcs'}
                  onChange={e => setProductFormData({ ...productFormData, unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE PRODUCT CONFIRMATION MODAL */}
      {isDeleteProductModalOpen && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800">Hapus Produk Ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>"{viewProduct.name}"</strong> dari inventaris kantin? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteProductModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(viewProduct.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5B. DELETE TRANSACTION CONFIRMATION MODAL (Bebas blokir dialog iframe) */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800">Hapus Riwayat Transaksi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus transaksi <strong className="font-mono text-slate-700">{transactionToDelete.id}</strong> atas nama <strong>{transactionToDelete.customerName}</strong> senilai <strong>{formatRupiah(transactionToDelete.totalAmount)}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-2 font-medium">
                Data transaksi ini akan langsung dihapus dari memori & LocalStorage agar tidak memakan ruang simpan.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTransaction}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5C. DELETE STUDENT / SAVINGS ACCOUNT CONFIRMATION MODAL (Bebas blokir dialog iframe) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800">Hapus Data Tabungan Santri?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus akun tabungan santri <strong>"{studentToDelete.fullName}"</strong> dengan saldo <strong>{formatRupiah(studentToDelete.balance)}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-2 font-medium">
                Seluruh saldo dan riwayat setoran/belanja santri ini akan terhapus permanen dari LocalStorage.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD NEW PRODUCT MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Tambah Produk Baru</h3>
              </div>
              <button onClick={() => setIsAddProductModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Roti Bakar Coklat"
                  value={productFormData.name || ''}
                  onChange={e => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={productFormData.category || 'Makanan'}
                  onChange={e => setProductFormData({ ...productFormData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Snack">Snack</option>
                  <option value="Alat Tulis">Alat Tulis</option>
                  <option value="Herbal">Herbal</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.price || 0}
                    onChange={e => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Stok</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.stock || 0}
                    onChange={e => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Unit</label>
                <input
                  type="text"
                  placeholder="pcs, botol, porsi, bks..."
                  value={productFormData.unit || 'pcs'}
                  onChange={e => setProductFormData({ ...productFormData, unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. STUDENT DEPOSIT / REGISTER MODAL (SAVED MONEY) */}
      {isAddDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Deposit Tabungan Siswa</h3>
              </div>
              <button onClick={() => setIsAddDepositModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepositOrStudent} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama santri..."
                  value={depositFormData.fullName}
                  onChange={e => setDepositFormData({ ...depositFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                  list="deposit-students-list"
                />
                <datalist id="deposit-students-list">
                  {students.map(s => (
                    <option key={s.id} value={s.fullName} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Jika nama sudah terdaftar, saldo akan ditambahkan. Jika belum, akun baru akan dibuat otomatis.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas / Kelompok</label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas Tahfidz 1A"
                  value={depositFormData.classGroup}
                  onChange={e => setDepositFormData({ ...depositFormData, classGroup: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Uang Didepositkan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={depositFormData.amount}
                  onChange={e => setDepositFormData({ ...depositFormData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto font-bold"
                />
                {/* Quick amount presets */}
                <div className="flex gap-1.5 flex-wrap pt-1.5">
                  {[10000, 20000, 50000, 100000, 200000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositFormData({ ...depositFormData, amount: amt })}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-roboto cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={depositFormData.note}
                  onChange={e => setDepositFormData({ ...depositFormData, note: e.target.value })}
                  placeholder="Setoran Mingguan, Uang Saku, dll."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDepositModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Simpan Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. STUDENT DETAIL & USAGE HISTORY MODAL (SAVED MONEY DETAIL) */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Detail Tabungan Santri</h3>
              </div>
              <button onClick={() => setViewStudent(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3.5 bg-[#9CD5FF]/20 border border-[#7AAACE]/40 rounded-xl">
                <div>
                  <h4 className="font-bold text-base text-[#355872]">{viewStudent.fullName}</h4>
                  <p className="text-xs text-slate-600">{viewStudent.classGroup || 'Santri MBTI'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Saldo Terkini</span>
                  <span className="text-xl font-bold text-[#355872] font-roboto block">
                    {formatRupiah(viewStudent.balance)}
                  </span>
                </div>
              </div>

              {/* History list */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                  Riwayat Deposit & Penggunaan Saldo:
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {viewStudent.history.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat transaksi.</p>
                  ) : (
                    viewStudent.history.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            {item.type === 'deposit' ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                [Setoran/Deposit]
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                [Belanja Kantin]
                              </span>
                            )}
                            <span className="truncate max-w-[200px]">{item.description}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-roboto">{item.date}</p>
                        </div>

                        <div className="text-right font-roboto">
                          <span
                            className={`font-bold block ${
                              item.type === 'deposit' ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {item.type === 'deposit' ? '+' : '-'}
                            {formatRupiah(item.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Sisa: {formatRupiah(item.balanceAfter)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteStudent(viewStudent.id, viewStudent.fullName);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                title={`Hapus data tabungan ${viewStudent.fullName}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Akun
              </button>

              <button
                type="button"
                onClick={() => {
                  setDepositFormData({
                    studentId: viewStudent.id,
                    fullName: viewStudent.fullName,
                    classGroup: viewStudent.classGroup || '',
                    amount: 20000,
                    note: 'Top Up Saldo Santri'
                  });
                  setViewStudent(null);
                  setIsAddDepositModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Saldo untuk Santri Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. TRANSACTION DETAIL MODAL (FROM DATABASE TAB) */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Detail Transaksi {selectedTxDetail.id}</h3>
              </div>
              <button onClick={() => setSelectedTxDetail(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Transaksi:</span>
                  <span className="font-roboto font-semibold text-slate-800">
                    {selectedTxDetail.displayDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pembeli:</span>
                  <span className="font-bold text-slate-800">{selectedTxDetail.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="font-bold text-[#355872]">
                    {selectedTxDetail.paymentMethod === 'cash' ? 'Cash (Tunai)' : 'Saved Money (Tabungan)'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">Rincian Barang:</span>
                {selectedTxDetail.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-700">
                    <span>
                      {i.productName} × {i.quantity}
                    </span>
                    <span className="font-roboto font-semibold">{formatRupiah(i.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-[#355872]">
                <span>Total Biaya:</span>
                <span className="text-base font-roboto">{formatRupiah(selectedTxDetail.totalAmount)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteTransaction(selectedTxDetail.id);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Hapus transaksi ini dari database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Transaksi
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-300"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Struk
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTxDetail(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. PDF REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#355872] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#9CD5FF]" />
                <h3 className="font-bold text-base">Buat Laporan PDF</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Tanggal Laporan:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all has-checked:border-[#355872] has-checked:bg-[#355872]/5 border-slate-200 hover:border-slate-300">
                    <input
                      type="radio"
                      name="report-date-mode"
                      checked={reportDate === ''}
                      onChange={() => setReportDate('')}
                      className="accent-[#355872]"
                    />
                    <span className="text-xs font-semibold text-slate-800">Hari Ini</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all has-checked:border-[#355872] has-checked:bg-[#355872]/5 border-slate-200 hover:border-slate-300">
                    <input
                      type="radio"
                      name="report-date-mode"
                      checked={reportDate !== ''}
                      onChange={() => setReportDate(reportDate || wibDateKey(new Date().toISOString()))}
                      className="accent-[#355872]"
                    />
                    <span className="text-xs font-semibold text-slate-800">Pilih Tanggal</span>
                  </label>
                  {reportDate !== '' && (
                    <input
                      type="date"
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7AAACE] font-roboto"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isGeneratingReport}
                onClick={async () => {
                  const targetKey = reportDate === '' ? wibDateKey(new Date().toISOString()) : reportDate;
                  const filtered = transactions.filter(tx => wibDateKey(tx.date) === targetKey);
                  if (filtered.length === 0) {
                    showToast('Tidak ada transaksi pada tanggal tersebut.');
                    return;
                  }
                  setIsGeneratingReport(true);
                  try {
                    await generateTransactionReportPdf(filtered, buildDateLabel(targetKey));
                    setIsReportModalOpen(false);
                    showToast('Laporan PDF berhasil dibuat.');
                  } catch (err) {
                    console.error('[PDF] Gagal membuat laporan:', err);
                    showToast('Gagal membuat laporan PDF.');
                  } finally {
                    setIsGeneratingReport(false);
                  }
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#355872] hover:bg-[#284357] disabled:opacity-40 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {isGeneratingReport ? 'Membuat...' : 'Buat Laporan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-700">© {new Date().getFullYear()} Kantin Ma'had Bina Tahfidz Indonesia. Hak Cipta Dilindungi.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sistem Manajemen Kasir, Stok Inventaris & Tabungan Santri
            </p>
          </div>
        </div>
      </footer>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[70] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
