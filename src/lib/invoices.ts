import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  getDoc,
  setDoc,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Client, Invoice, BusinessProfile, InvoiceItem, DocumentType } from '@/types/invoice';

export async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const ref = doc(db, 'users', userId, 'business_profile', '_');
  console.log('[getBusinessProfile] reading path:', ref.path);
  const snap = await getDoc(ref);
  console.log('[getBusinessProfile] exists:', snap.exists(), 'data:', snap.data());
  if (!snap.exists()) return null;
  return snap.data() as BusinessProfile;
}

export async function saveBusinessProfile(userId: string, profile: Partial<BusinessProfile>): Promise<void> {
  const ref = doc(db, 'users', userId, 'business_profile', '_');
  await setDoc(ref, profile, { merge: true });
}

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const profileRef = doc(db, 'users', userId, 'business_profile', '_');

  let nextNumber = 1;
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(profileRef);
    const lastNum = snap.exists() ? (snap.data().last_invoice_number ?? 0) : 0;
    nextNumber = lastNum + 1;
    transaction.set(profileRef, { last_invoice_number: nextNumber }, { merge: true });
  });

  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

export async function getClients(userId: string): Promise<Client[]> {
  const q = query(collection(db, 'users', userId, 'clients'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
}

export async function createClient(
  userId: string,
  client: Omit<Client, 'id' | 'created_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'clients'), {
    ...client,
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateClient(
  userId: string,
  clientId: string,
  updates: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'clients', clientId), updates);
}

export async function deleteClient(userId: string, clientId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
}

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const q = query(collection(db, 'users', userId, 'invoices'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
}

export async function createInvoice(
  userId: string,
  data: {
    document_type: DocumentType;
    issue_date: string;
    client_id: string;
    client_snapshot: Invoice['client_snapshot'];
    items: InvoiceItem[];
    notes?: string;
    linked_event_ids?: string[];
  }
): Promise<Invoice> {
  const document_number = await getNextInvoiceNumber(userId);
  const total = data.items.reduce((sum, item) => sum + item.total, 0);

  const invoiceData = {
    ...data,
    document_number,
    total,
    status: 'issued' as const,
    created_at: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, 'users', userId, 'invoices'), invoiceData);
  return { id: ref.id, ...invoiceData };
}

export async function cancelInvoice(userId: string, invoiceId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'invoices', invoiceId), { status: 'cancelled' });
}
