import { createClient } from "@supabase/supabase-js";

const DEFAULT_MASTER_ITEMS = [
  { category: "food", itemName: "rice", unitCost: 0 },
  { category: "utility", itemName: "electricity", unitCost: 0 },
  { category: "salary", itemName: "staff wage", unitCost: 0 }
];

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMasterItem(row) {
  return {
    id: row.id,
    category: row.category,
    itemName: row.item_name,
    unitCost: asNumber(row.unit_cost),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeDailyRow(row) {
  return {
    itemId: row.item_id,
    category: row.category,
    itemName: row.item_name,
    unitCost: asNumber(row.unit_cost),
    quantity: asNumber(row.quantity),
    amount: asNumber(row.amount)
  };
}

export function buildAppDataFromRows(masterItemsRows = [], dailyRecordRows = [], dailyExpenseRows = []) {
  const byRecordId = {};
  dailyExpenseRows.forEach((row) => {
    const key = row.daily_record_id;
    if (!byRecordId[key]) byRecordId[key] = [];
    byRecordId[key].push(normalizeDailyRow(row));
  });

  const dailyRecords = {};
  dailyRecordRows.forEach((record) => {
    dailyRecords[record.date] = {
      date: record.date,
      revenue: asNumber(record.revenue),
      rows: byRecordId[record.id] || [],
      totalExpenses: asNumber(record.total_expenses),
      profit: asNumber(record.profit),
      notes: record.notes || "",
      updatedAt: record.updated_at
    };
  });

  return {
    masterItems: masterItemsRows.map(normalizeMasterItem),
    dailyRecords
  };
}

export function buildDailyRecordRowPayload(userId, dailyRecordId, rows) {
  return rows.map((row) => ({
    user_id: userId,
    daily_record_id: dailyRecordId,
    item_id: row.itemId || null,
    category: row.category,
    item_name: row.itemName,
    unit_cost: asNumber(row.unitCost),
    quantity: asNumber(row.quantity),
    amount: asNumber(row.amount)
  }));
}

export function hasCloudConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function createCloudClient() {
  if (!hasCloudConfig()) return null;
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export async function signUpWithPassword(client, email, password) {
  return client.auth.signUp({ email, password });
}

export async function signInWithPassword(client, email, password) {
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut(client) {
  return client.auth.signOut();
}

export async function getCurrentSession(client) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function ensureProfileAndSeed(client, userId) {
  const { error: profileError } = await client
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { count, error: countError } = await client
    .from("master_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;
  if ((count || 0) > 0) return;

  const now = new Date().toISOString();
  const seedRows = DEFAULT_MASTER_ITEMS.map((item) => ({
    user_id: userId,
    category: item.category,
    item_name: item.itemName,
    unit_cost: item.unitCost,
    created_at: now,
    updated_at: now
  }));
  const { error: seedError } = await client.from("master_items").insert(seedRows);
  if (seedError) throw seedError;
}

export async function loadCloudAppData(client, userId) {
  const { data: masterRows, error: masterError } = await client
    .from("master_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (masterError) throw masterError;

  const { data: recordRows, error: recordsError } = await client
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (recordsError) throw recordsError;

  const recordIds = (recordRows || []).map((row) => row.id);
  let rows = [];
  if (recordIds.length) {
    const { data: dailyRows, error: rowsError } = await client
      .from("daily_record_rows")
      .select("*")
      .eq("user_id", userId)
      .in("daily_record_id", recordIds);
    if (rowsError) throw rowsError;
    rows = dailyRows || [];
  }

  return buildAppDataFromRows(masterRows || [], recordRows || [], rows);
}

export async function upsertCloudMasterItem(client, userId, payload, editingId = null) {
  const baseRow = {
    user_id: userId,
    category: payload.category,
    item_name: payload.itemName,
    unit_cost: asNumber(payload.unitCost),
    updated_at: new Date().toISOString()
  };

  if (editingId) {
    const { data, error } = await client
      .from("master_items")
      .update(baseRow)
      .eq("id", editingId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeMasterItem(data);
  }

  const { data, error } = await client
    .from("master_items")
    .insert({ ...baseRow, created_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeMasterItem(data);
}

export async function deleteCloudMasterItem(client, userId, itemId) {
  const { error } = await client
    .from("master_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function upsertCloudDailyRecord(client, userId, record) {
  const baseRecord = {
    user_id: userId,
    date: record.date,
    revenue: asNumber(record.revenue),
    total_expenses: asNumber(record.totalExpenses),
    profit: asNumber(record.profit),
    notes: record.notes || "",
    updated_at: record.updatedAt || new Date().toISOString()
  };

  const { data, error } = await client
    .from("daily_records")
    .upsert(baseRecord, { onConflict: "user_id,date" })
    .select("*")
    .single();
  if (error) throw error;

  const { error: deleteRowsError } = await client
    .from("daily_record_rows")
    .delete()
    .eq("daily_record_id", data.id)
    .eq("user_id", userId);
  if (deleteRowsError) throw deleteRowsError;

  const payloadRows = buildDailyRecordRowPayload(userId, data.id, record.rows || []);
  if (payloadRows.length) {
    const { error: insertRowsError } = await client.from("daily_record_rows").insert(payloadRows);
    if (insertRowsError) throw insertRowsError;
  }
}
