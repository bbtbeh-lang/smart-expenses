import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';

function toRow(tx: Transaction, userId: string) {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    date: tx.date,
    has_receipt: tx.hasReceipt,
    merchant: tx.merchant || null,
    tax_amount: tx.taxAmount ?? null,
    original_currency: tx.originalCurrency || null,
    original_amount: tx.originalAmount ?? null,
    items: tx.items || null,
    receipt_hash: tx.receiptHash || null,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as Transaction['type'],
    amount: Number(row.amount),
    description: row.description as string,
    category: row.category as string,
    date: row.date as string,
    hasReceipt: !!row.has_receipt,
    merchant: (row.merchant as string) || undefined,
    taxAmount: row.tax_amount != null ? Number(row.tax_amount) : undefined,
    originalCurrency: (row.original_currency as string) || undefined,
    originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
    items: (row.items as Transaction['items']) || undefined,
    receiptHash: (row.receipt_hash as string) || undefined,
  };
}

/**
 * Fetches this user's transactions from Supabase and merges them with
 * whatever is currently showing locally.
 *
 * IMPORTANT: this never simply returns "whatever the server has" — a
 * transaction the user just added might not have finished writing to the
 * server yet (the write is fire-and-forget for a snappy UI), so blindly
 * trusting a fresh SELECT here would make that transaction vanish from
 * the screen the next time this runs (e.g. on the periodic auth-token
 * refresh). Instead, anything present locally but missing from the
 * server is (a) kept in the returned list so it never disappears, and
 * (b) re-pushed to the server, which also self-heals any write that
 * silently failed earlier.
 */
export async function syncTransactions(userId: string, localTransactions: Transaction[]): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch transactions from server:', error);
    return localTransactions; // fail safe: keep showing whatever was already on screen
  }

  const serverTransactions = (data || []).map(fromRow);
  const serverIds = new Set(serverTransactions.map(t => t.id));
  const missingFromServer = localTransactions.filter(t => !serverIds.has(t.id));

  if (missingFromServer.length > 0) {
    const rows = missingFromServer.map(tx => toRow(tx, userId));
    const { error: pushError } = await supabase.from('transactions').upsert(rows);
    if (pushError) console.error('Failed to push local-only transactions to server:', pushError);
  }

  const merged = [...serverTransactions, ...missingFromServer];
  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return merged;
}

export async function upsertTransaction(tx: Transaction, userId: string) {
  const { error } = await supabase.from('transactions').upsert(toRow(tx, userId));
  if (error) console.error('Failed to save transaction to server:', error);
}

export async function deleteTransactionRemote(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) console.error('Failed to delete transaction on server:', error);
}
