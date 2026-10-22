import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  firebaseConfig,
  signInWithFirebaseGoogle,
} from './firebase';
import { Shop, Product, Customer, Invoice } from '../types';
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
    // Ensure user is authenticated with Firebase before attempting write
    if (!auth.currentUser) {
      await signInWithFirebaseGoogle();
    }

    // 1. Save Shop profile
    const shopRef = doc(db, 'shops', shop.id);
    await setDoc(shopRef, shop, { merge: true });

    // 2. Batch write products
    for (const prod of products) {
      const prodRef = doc(db, 'products', prod.id);
      await setDoc(prodRef, prod, { merge: true });
    }

    // 3. Batch write customers
    for (const cust of customers) {
      const custRef = doc(db, 'customers', cust.id);
      await setDoc(custRef, cust, { merge: true });
    }

    // 4. Batch write invoices
    for (const inv of invoices) {
      const invRef = doc(db, 'invoices', inv.id);
      await setDoc(invRef, inv, { merge: true });
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
    // Ensure user is authenticated with Firebase before attempting read
    if (!auth.currentUser) {
      await signInWithFirebaseGoogle();
    }

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
  // If not authenticated with Firebase, skip background push to prevent permission error
  if (!auth.currentUser) {
    return;
  }
  try {
    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

/**
 * Global Real-time Auto-Sync Listener for Firestore
 * Automatically syncs newly added or edited products directly to Firestore
 */
export function initFirebaseAutoSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleProductSaved = (e: any) => {
    const product = e.detail as Product;
    if (product) {
      pushProductToFirestore(product).catch((err) => {
        console.warn('Firebase auto-sync product push skipped:', err?.message);
      });
    }
  };

  window.addEventListener('pandit-product-saved', handleProductSaved);
  return () => {
    window.removeEventListener('pandit-product-saved', handleProductSaved);
  };
}

