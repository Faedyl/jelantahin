import { supabase } from "./supabaseClient.js";

// ─── Auth ────────────────────────────────────────────────────

export async function signUp({ email, password, role, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  });
  return { data, error };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─── Profiles ────────────────────────────────────────────────

export async function getProfile(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return { data, error };
}

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  return { data, error };
}

// ─── Oil Listings (UMKM) ─────────────────────────────────────

export async function createListing(listing) {
  return supabase.from("oil_listings").insert([listing]).select().single();
}

export async function getMyListings(umkmId) {
  return supabase
    .from("oil_listings")
    .select("*")
    .eq("umkm_id", umkmId)
    .order("created_at", { ascending: false });
}

export async function getAvailableListings() {
  return supabase
    .from("oil_listings")
    .select(
      "*, profiles!oil_listings_umkm_id_fkey(full_name, umkm_name, phone, address)",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false });
}

export async function updateListing(id, updates) {
  return supabase
    .from("oil_listings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

// ─── Orders ──────────────────────────────────────────────────

export async function createOrder(order) {
  return supabase.from("orders").insert([order]).select().single();
}

export async function getOrdersAsUmkm(umkmId) {
  return supabase
    .from("orders")
    .select("*, oil_listings(*)")
    .eq("umkm_id", umkmId)
    .order("created_at", { ascending: false });
}

export async function getOrdersAsPerusahaan(perusahaanId) {
  return supabase
    .from("orders")
    .select("*, oil_listings(*)")
    .eq("perusahaan_id", perusahaanId)
    .order("created_at", { ascending: false });
}

export async function updateOrder(id, updates) {
  return supabase
    .from("orders")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

// ─── Transactions ────────────────────────────────────────────

export async function createTransaction(tx) {
  return supabase.from("transactions").insert([tx]).select().single();
}

export async function getTransactionsForUser(userId) {
  return supabase
    .from("transactions")
    .select("*, orders!inner(umkm_id, perusahaan_id, oil_listings(*))")
    .or(`orders.umkm_id.eq.${userId},orders.perusahaan_id.eq.${userId}`)
    .order("completed_at", { ascending: false });
}
