import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  firebaseConfig,
  signInWithFirebaseGoogle,
} from './firebase';
import { Shop, Product, Customer, Invoice, User } from '../types';
import { StorageService } from './storage';

export interface FirebaseSyncStats {
  shopsCount: number;
  productsCount: number;
  customersCount: number;
  invoicesCount: number;
  timestamp: string;
}

/**
 * Upload current shop and all its data to Firestore
 */
export async function pushAllToFirestore(
  shop: Shop,
  products: Product[],
  customers: Customer[],
  invoices: Invoice[]
): Promise<FirebaseSyncStats> {
  try {
    // 1. Save Shop profile
    const shopRef = doc(db, 'shops', shop.id);
    await setDoc(shopRef, shop, { merge: true });

    // 2. Write products
    for (const prod of products) {
      if (prod.id) {
        const prodRef = doc(db, 'products', prod.id);
        await setDoc(prodRef, prod, { merge: true });
      }
    }

    // 3. Write customers
    for (const cust of customers) {
      if (cust.id) {
        const custRef = doc(db, 'customers', cust.id);
        await setDoc(custRef, cust, { merge: true });
      }
    }

    // 4. Write invoices
    for (const inv of invoices) {
      if (inv.id) {
        const invRef = doc(db, 'invoices', inv.id);
        await setDoc(invRef, inv, { merge: true });
      }
    }

    const timestamp = new Date().toISOString();
    return {
      shopsCount: 1,
      productsCount: products.length,
      customersCount: customers.length,
      invoicesCount: invoices.length,
      timestamp,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'shops/products/customers/invoices');
    throw error;
  }
}

/**
 * Fetch all products, customers, and invoices for a shop from Firestore
 */
export async function pullAllFromFirestore(shopId: string): Promise<{
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
}> {
  try {
    // 1. Fetch Products
    const productsSnap = await getDocs(
      query(collection(db, 'products'), where('shopId', '==', shopId))
    );
    const products: Product[] = [];
    productsSnap.forEach((d) => {
      products.push(d.data() as Product);
    });

    // 2. Fetch Customers
    const customersSnap = await getDocs(
      query(collection(db, 'customers'), where('shopId', '==', shopId))
    );
    const customers: Customer[] = [];
    customersSnap.forEach((d) => {
      customers.push(d.data() as Customer);
    });

    // 3. Fetch Invoices
    const invoicesSnap = await getDocs(
      query(collection(db, 'invoices'), where('shopId', '==', shopId))
    );
    const invoices: Invoice[] = [];
    invoicesSnap.forEach((d) => {
      invoices.push(d.data() as Invoice);
    });

    return { products, customers, invoices };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `shop/${shopId}`);
    throw error;
  }
}

/**
 * Sync single product immediately to Firestore (for real-time stock/item updates)
 */
export async function pushProductToFirestore(product: Product): Promise<void> {
  if (!product || !product.id) return;
  try {
    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, product, { merge: true });
    console.info(`[Firestore Sync] Product "${product.name}" (${product.id}) persisted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background product push warning:', error?.message);
  }
}

/**
 * Delete product immediately from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  if (!productId) return;
  try {
    const prodRef = doc(db, 'products', productId);
    await deleteDoc(prodRef);
    console.info(`[Firestore Sync] Product ${productId} deleted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background product delete warning:', error?.message);
  }
}

/**
 * Sync single customer immediately to Firestore
 */
export async function pushCustomerToFirestore(customer: Customer): Promise<void> {
  if (!customer || !customer.id) return;
  try {
    const custRef = doc(db, 'customers', customer.id);
    await setDoc(custRef, customer, { merge: true });
    console.info(`[Firestore Sync] Customer "${customer.name}" (${customer.id}) persisted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background customer push warning:', error?.message);
  }
}

/**
 * Sync single invoice immediately to Firestore
 */
export async function pushInvoiceToFirestore(invoice: Invoice): Promise<void> {
  if (!invoice || !invoice.id) return;
  try {
    const invRef = doc(db, 'invoices', invoice.id);
    await setDoc(invRef, invoice, { merge: true });
    console.info(`[Firestore Sync] Invoice "${invoice.invoiceNumber}" (${invoice.id}) persisted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background invoice push warning:', error?.message);
  }
}

/**
 * Sync shop profile immediately to Firestore
 */
export async function pushShopToFirestore(shop: Shop): Promise<void> {
  if (!shop || !shop.id) return;
  try {
    const shopRef = doc(db, 'shops', shop.id);
    await setDoc(shopRef, shop, { merge: true });
    console.info(`[Firestore Sync] Shop "${shop.name}" (${shop.id}) persisted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background shop push warning:', error?.message);
  }
}

/**
 * Sync user profile immediately to Firestore
 */
export async function pushUserToFirestore(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, user, { merge: true });
    console.info(`[Firestore Sync] User "${user.username}" (${user.id}) persisted`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background user push warning:', error?.message);
  }
}

/**
 * Sync bulk products list immediately to Firestore
 */
export async function pushProductsBulkToFirestore(products: Product[]): Promise<void> {
  if (!products || !products.length) return;
  try {
    for (const p of products) {
      if (p.id) {
        const prodRef = doc(db, 'products', p.id);
        await setDoc(prodRef, p, { merge: true });
      }
    }
    console.info(`[Firestore Sync] Synced ${products.length} products in bulk`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Background bulk products push warning:', error?.message);
  }
}

/**
 * Global Real-time Auto-Sync Listener for Firestore
 * Automatically syncs every change (products, stock, customers, sales, shops, users) directly to Firestore
 */
export function initFirebaseAutoSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleProductSaved = (e: any) => {
    const product = e.detail as Product;
    if (product) pushProductToFirestore(product);
  };

  const handleProductDeleted = (e: any) => {
    const productId = e.detail?.productId;
    if (productId) deleteProductFromFirestore(productId);
  };

  const handleBulkProductsSaved = (e: any) => {
    const products = e.detail?.products as Product[];
    if (products?.length) pushProductsBulkToFirestore(products);
  };

  const handleStockAdjusted = (e: any) => {
    const shopId = e.detail?.shopId;
    if (shopId) {
      const liveProducts = StorageService.getProducts(shopId);
      pushProductsBulkToFirestore(liveProducts);
    }
  };

  const handleCustomerSaved = (e: any) => {
    const customer = e.detail as Customer;
    if (customer) pushCustomerToFirestore(customer);
  };

  const handleInvoiceSaved = (e: any) => {
    const invoice = e.detail as Invoice;
    if (invoice) pushInvoiceToFirestore(invoice);
  };

  const handleShopSaved = (e: any) => {
    const shop = e.detail as Shop;
    if (shop) pushShopToFirestore(shop);
  };

  const handleUserSaved = (e: any) => {
    const user = e.detail as User;
    if (user) pushUserToFirestore(user);
  };

  window.addEventListener('pandit-product-saved', handleProductSaved);
  window.addEventListener('pandit-product-deleted', handleProductDeleted);
  window.addEventListener('pandit-products-bulk-saved', handleBulkProductsSaved);
  window.addEventListener('pandit-stock-adjusted', handleStockAdjusted);
  window.addEventListener('pandit-customer-saved', handleCustomerSaved);
  window.addEventListener('pandit-invoice-saved', handleInvoiceSaved);
  window.addEventListener('pandit-shop-saved', handleShopSaved);
  window.addEventListener('pandit-user-saved', handleUserSaved);

  return () => {
    window.removeEventListener('pandit-product-saved', handleProductSaved);
    window.removeEventListener('pandit-product-deleted', handleProductDeleted);
    window.removeEventListener('pandit-products-bulk-saved', handleBulkProductsSaved);
    window.removeEventListener('pandit-stock-adjusted', handleStockAdjusted);
    window.removeEventListener('pandit-customer-saved', handleCustomerSaved);
    window.removeEventListener('pandit-invoice-saved', handleInvoiceSaved);
    window.removeEventListener('pandit-shop-saved', handleShopSaved);
    window.removeEventListener('pandit-user-saved', handleUserSaved);
  };
}
