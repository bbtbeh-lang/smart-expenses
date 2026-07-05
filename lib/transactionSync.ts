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
  };
}

/**
 * Fetches this user's transactions from Supabase. If the server has none
 * yet but the caller passes existing local transactions (from
 * localStorage, e.g. from before this device had server sync), those get
 * uploaded once so they aren't lost — after that, the server is always
 * the source of truth.
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

  if ((data?.length || 0) === 0 && localTransactions.length > 0) {
    const rows = localTransactions.map(tx => toRow(tx, userId));
    const { error: insertError } = await supabase.from('transactions').insert(rows);
    if (insertError) console.error('One-time local->server transaction migration failed:', insertError);
    return localTransactions;
  }

  return (data || []).map(fromRow);
}

export async function upsertTransaction(tx: Transaction, userId: string) {
  const { error } = await supabase.from('transactions').upsert(toRow(tx, userId));
  if (error) console.error('Failed to save transaction to server:', error);
}

export async function deleteTransactionRemote(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) console.error('Failed to delete transaction on server:', error);
}
