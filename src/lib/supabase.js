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

// ─── Credit Coupon Points ─────────────────────────────────────

export async function getPointsBalance(userId) {
  return supabase
    .from("credit_coupons")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function ensurePointsAccount(userId) {
  // Create a points account if one doesn't exist
  const { data } = await supabase
    .from("credit_coupons")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return { data };

  return supabase
    .from("credit_coupons")
    .insert([{ user_id: userId, balance: 0, lifetime_earned: 0 }])
    .select()
    .single();
}

export async function getPointEarnings(userId) {
  return supabase
    .from("point_earnings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function earnPoints({ userId, transactionId, points, source, description }) {
  // 1. Insert earning log
  const { error: earnError } = await supabase
    .from("point_earnings")
    .insert([{
      user_id: userId,
      transaction_id: transactionId || null,
      points,
      source,
      description: description || null,
    }]);

  if (earnError) return { error: earnError };

  // 2. Update balance (atomic increment via RPC)
  const { error: updateError } = await supabase.rpc("increment_points", {
    p_user_id: userId,
    p_points: points,
  });

  if (updateError) {
    // Fallback: read current balance and update
    const { data: current } = await supabase
      .from("credit_coupons")
      .select("balance, lifetime_earned")
      .eq("user_id", userId)
      .maybeSingle();

    if (!current) {
      // No account yet — create one
      await supabase
        .from("credit_coupons")
        .insert([{ user_id: userId, balance: points, lifetime_earned: points }]);
      return { success: true };
    }

    return supabase
      .from("credit_coupons")
      .update({
        balance: (current.balance || 0) + points,
        lifetime_earned: (current.lifetime_earned || 0) + points,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  return { success: true };
}

// ─── Redemption Items ────────────────────────────────────────

export async function getRedemptionItems() {
  return supabase
    .from("redemption_items")
    .select("*")
    .eq("is_active", true)
    .order("points_required", { ascending: true });
}

export async function getAllRedemptionItems() {
  return supabase
    .from("redemption_items")
    .select("*")
    .order("points_required", { ascending: true });
}

export async function createRedemptionItem(item) {
  return supabase.from("redemption_items").insert([item]).select().single();
}

export async function updateRedemptionItem(id, updates) {
  return supabase
    .from("redemption_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

// ─── Redemption Requests ─────────────────────────────────────

export async function createRedemptionRequest({ userId, itemId, pointsUsed, quantity }) {
  return supabase
    .from("redemption_requests")
    .insert([{
      user_id: userId,
      item_id: itemId,
      points_used: pointsUsed,
      quantity: quantity || 1,
    }])
    .select()
    .single();
}

export async function getRedemptionRequests(userId) {
  return supabase
    .from("redemption_requests")
    .select("*, redemption_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function getAllRedemptionRequests() {
  return supabase
    .from("redemption_requests")
    .select("*, redemption_items(*), profiles!redemption_requests_user_id_fkey(full_name)")
    .order("created_at", { ascending: false });
}

export async function updateRedemptionRequest(id, updates) {
  return supabase
    .from("redemption_requests")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

// ─── Payment Banks ───────────────────────────────────────────

export async function getActivePaymentBanks() {
  return supabase
    .from("payment_banks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

export async function getAllPaymentBanks() {
  return supabase
    .from("payment_banks")
    .select("*")
    .order("sort_order", { ascending: true });
}

export async function createPaymentBank(bank) {
  return supabase.from("payment_banks").insert([bank]).select().single();
}

export async function updatePaymentBank(id, updates) {
  return supabase
    .from("payment_banks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
}

export async function deletePaymentBank(id) {
  return supabase.from("payment_banks").delete().eq("id", id);
}

// ─── Payment Confirmations ───────────────────────────────────

export async function createPaymentConfirmation(confirmation) {
  return supabase
    .from("payment_confirmations")
    .insert([confirmation])
    .select()
    .single();
}

export async function getPaymentConfirmations(userId) {
  return supabase
    .from("payment_confirmations")
    .select("*, payment_banks(*), transactions(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function getAllPaymentConfirmations() {
  return supabase
    .from("payment_confirmations")
    .select("*, payment_banks(*), transactions(*), profiles!payment_confirmations_user_id_fkey(full_name)")
    .order("created_at", { ascending: false });
}

export async function updatePaymentConfirmation(id, updates) {
  return supabase
    .from("payment_confirmations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}
