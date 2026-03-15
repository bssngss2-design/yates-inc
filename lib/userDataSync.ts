import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export interface UserGameData {
  user_id: string;
  user_type: 'employee' | 'client';
  yates_dollars: number;
  total_clicks: number;
  current_pickaxe_id: number;
  current_rock_id: number;
  current_rock_hp: number;
  rocks_mined_count: number;
  owned_pickaxe_ids: number[];
  coupons_30: number;
  coupons_50: number;
  coupons_100: number;
  has_seen_cutscene: boolean;
  has_autoclicker?: boolean;
  autoclicker_enabled?: boolean;
  prestige_count?: number;
  prestige_multiplier?: number;
  stocks_owned?: number;
  stock_profits?: number;
  // Anti-cheat fields
  anti_cheat_warnings?: number;
  is_on_watchlist?: boolean;
  is_blocked?: boolean;
  appeal_pending?: boolean;
  // Trinkets
  owned_trinket_ids?: string[];
  equipped_trinket_ids?: string[];
  trinket_shop_items?: unknown[];
  trinket_shop_last_refresh?: number;
  has_totem_protection?: boolean;
  has_stocks_unlocked?: boolean;
  // Relics & Talismans
  owned_relic_ids?: string[];
  owned_talisman_ids?: string[];
  // Miners
  miner_count?: number;
  miner_last_tick?: number;
  // Prestige upgrades
  prestige_tokens?: number;
  owned_prestige_upgrade_ids?: string[];
  auto_prestige_enabled?: boolean;
  // Achievements
  unlocked_achievement_ids?: string[];
  // Ranking system
  total_money_earned?: number;
  game_start_time?: number;
  fastest_prestige_time?: number | null;
  // Pro Player Titles
  owned_title_ids?: string[];
  equipped_title_ids?: string[];
  // Buildings (bank, factory, temple, etc.) - stored as JSON
  buildings_data?: string;
  title_win_counts?: Record<string, number>;
  // Path system
  chosen_path?: string | null;
  // Tax system (1QI+ wealth tax)
  last_tax_time?: number | null;
  // Playtime tracking
  total_playtime_seconds?: number;
  // Premium products (game buffs)
  owned_premium_product_ids?: number[];
  // Stokens & Lottery Tickets
  stokens?: number;
  lottery_tickets?: number;
  // Timestamp (set by Supabase)
  updated_at?: string;
}

export interface UserPurchase {
  user_id: string;
  user_type: 'employee' | 'client';
  product_id: number;
  product_name: string;
  purchase_type: 'cash' | 'stocks';
  amount_paid: number;
}

// Table names for normal vs hard mode
const TABLE_NORMAL = 'user_game_data';
const TABLE_HARD = 'user_game_hard_data';

// Get the correct table name based on mode
function getTableName(isHardMode: boolean = false): string {
  return isHardMode ? TABLE_HARD : TABLE_NORMAL;
}

// Fetch user game data from Supabase
export async function fetchUserGameData(userId: string, isHardMode: boolean = false): Promise<UserGameData | null> {
  try {
    const tableName = getTableName(isHardMode);
    console.log(`📥 SUPABASE FETCH: Loading ${isHardMode ? 'HARD MODE' : 'normal'} data for`, userId);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ SUPABASE FETCH FAILED:', error.message, error.details);
      return null;
    }

    if (data) {
      // PostgreSQL NUMERIC columns may come back as strings to preserve precision.
      // Parse them back to JS numbers so the rest of the app works with numbers.
      const numericFields = ['yates_dollars', 'total_money_earned', 'total_clicks', 'rocks_mined_count', 'current_rock_hp'] as const;
      for (const field of numericFields) {
        if (typeof data[field] === 'string') {
          data[field] = parseFloat(data[field] as string) || 0;
        }
      }
      console.log('✅ SUPABASE FETCH SUCCESS:', { prestige: data.prestige_count, clicks: data.total_clicks, dollars: data.yates_dollars });
    } else {
      console.log('⚠️ SUPABASE: No data found for user');
    }

    return data as UserGameData || null;
  } catch (err) {
    console.error('❌ SUPABASE FETCH EXCEPTION:', err);
    return null;
  }
}

// Number cap: matches NUMERIC(48) in PostgreSQL (up to ~10^48)
// JS doubles lose precision past ~10^15 but game values don't need exact cents at this scale
const NUMBER_CAP = 1e45;

// Check if a number is corrupt (NaN, Infinity, or not a number type)
export function isCorruptNumber(value: unknown): boolean {
  if (typeof value !== 'number') return true;
  return !Number.isFinite(value);
}

// Sanitize a number: clamp NaN/Infinity to fallback, cap at NUMBER_CAP
export function sanitizeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const safeValue = Math.min(Math.abs(value), NUMBER_CAP);
  return Math.floor(value >= 0 ? safeValue : -safeValue);
}

// Safe addition: prevents NaN/Infinity from propagating, caps at NUMBER_CAP
export function safeAdd(a: number, b: number): number {
  const result = a + b;
  if (!Number.isFinite(result)) return NUMBER_CAP;
  return Math.min(result, NUMBER_CAP);
}

// Safe multiplication: prevents NaN/Infinity from propagating, caps at NUMBER_CAP
export function safeMul(a: number, b: number): number {
  const result = a * b;
  if (!Number.isFinite(result)) return NUMBER_CAP;
  return Math.min(Math.abs(result), NUMBER_CAP) * (result >= 0 ? 1 : -1);
}

// Safe money calculation: sanitize the final money amount (clamp NaN/Infinity/negative to 0)
export function safeMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), NUMBER_CAP);
}

// Helper to safely convert large numbers for PostgreSQL NUMERIC(48)
// Returns STRING for large numbers to avoid JS scientific notation (e.g. "1.23e+21")
// which PostgreSQL cannot parse for bigint/numeric columns.
function safeBigInt(value: number | undefined | null): string | number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    // NaN or Infinity - clamp to 0 instead of returning null (prevents DB corruption)
    console.warn('⚠️ safeBigInt: Clamping corrupt number to 0:', value);
    return 0;
  }
  // Cap at NUMBER_CAP to match NUMERIC(48) in the database
  const safeValue = Math.min(Math.abs(value), NUMBER_CAP);
  const result = Math.floor(value >= 0 ? safeValue : -safeValue);
  // For large numbers (>= 1e15), convert to string to prevent scientific notation
  // e.g. 1007984345771996600000 -> "1007984345771996600000" instead of "1.00798e+21"
  if (Math.abs(result) >= 1e15) {
    return BigInt(result).toString();
  }
  return result;
}

// Strip keys whose value is undefined so partial saves don't overwrite
// existing DB values with null. Keys explicitly set to null are kept.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result as Partial<T>;
}

// Save/update user game data to Supabase
export async function saveUserGameData(data: Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client' }, versionAtCallTime?: number, isHardMode: boolean = false): Promise<boolean> {
  try {
    const tableName = getTableName(isHardMode);
    const fullData = stripUndefined({
      user_id: data.user_id,
      user_type: data.user_type,
      yates_dollars: safeBigInt(data.yates_dollars),
      total_clicks: safeBigInt(data.total_clicks),
      current_pickaxe_id: data.current_pickaxe_id,
      current_rock_id: data.current_rock_id,
      current_rock_hp: safeBigInt(data.current_rock_hp),
      rocks_mined_count: safeBigInt(data.rocks_mined_count),
      owned_pickaxe_ids: data.owned_pickaxe_ids,
      coupons_30: data.coupons_30,
      coupons_50: data.coupons_50,
      coupons_100: data.coupons_100,
      has_seen_cutscene: data.has_seen_cutscene,
      updated_at: new Date().toISOString(),
      has_autoclicker: data.has_autoclicker,
      autoclicker_enabled: data.autoclicker_enabled,
      prestige_count: data.prestige_count,
      prestige_multiplier: data.prestige_multiplier,
      anti_cheat_warnings: data.anti_cheat_warnings,
      is_on_watchlist: data.is_on_watchlist,
      is_blocked: data.is_blocked,
      appeal_pending: data.appeal_pending,
      owned_trinket_ids: data.owned_trinket_ids,
      equipped_trinket_ids: data.equipped_trinket_ids,
      trinket_shop_items: data.trinket_shop_items,
      trinket_shop_last_refresh: safeBigInt(data.trinket_shop_last_refresh),
      has_totem_protection: data.has_totem_protection,
      has_stocks_unlocked: data.has_stocks_unlocked,
      owned_relic_ids: data.owned_relic_ids,
      owned_talisman_ids: data.owned_talisman_ids,
      miner_count: data.miner_count,
      miner_last_tick: safeBigInt(data.miner_last_tick),
      prestige_tokens: data.prestige_tokens,
      owned_prestige_upgrade_ids: data.owned_prestige_upgrade_ids,
      auto_prestige_enabled: data.auto_prestige_enabled,
      unlocked_achievement_ids: data.unlocked_achievement_ids,
      total_money_earned: safeBigInt(data.total_money_earned),
      game_start_time: safeBigInt(data.game_start_time),
      fastest_prestige_time: safeBigInt(data.fastest_prestige_time),
      owned_title_ids: data.owned_title_ids,
      equipped_title_ids: data.equipped_title_ids,
      title_win_counts: data.title_win_counts,
      chosen_path: data.chosen_path,
      last_tax_time: safeBigInt(data.last_tax_time),
      total_playtime_seconds: safeBigInt(data.total_playtime_seconds),
      ...(data.owned_premium_product_ids?.length ? { owned_premium_product_ids: data.owned_premium_product_ids } : {}),
      ...(data.buildings_data ? { buildings_data: data.buildings_data } : {}),
      stokens: data.stokens,
      lottery_tickets: data.lottery_tickets,
    });

    // FINAL CHECK: If version was provided and has changed, skip this save (a force save happened)
    // This check happens RIGHT BEFORE the DB call to catch race conditions
    if (versionAtCallTime !== undefined && versionAtCallTime !== saveVersion) {
      console.log('🚫 SAVE ABORTED: Force save happened during preparation', { 
        versionAtCallTime, 
        currentVersion: saveVersion,
        wouldHaveSaved: { prestige: data.prestige_count, clicks: data.total_clicks }
      });
      return true; // Return true so it doesn't retry
    }

    console.log(`📤 SUPABASE SAVE (${isHardMode ? 'HARD' : 'normal'}):`, { prestige: data.prestige_count, clicks: data.total_clicks, dollars: data.yates_dollars });
    
    const { error } = await supabase
      .from(tableName)
      .upsert(fullData, { onConflict: 'user_id' });

    if (error) {
      console.error('❌ SUPABASE SAVE FAILED:', error.message, error.details, error.hint);
      return false;
    }
    
    console.log('✅ SUPABASE SAVE SUCCESS');
    return true;
  } catch (err) {
    console.error('❌ SUPABASE SAVE EXCEPTION:', err);
    return false;
  }
}

// Fetch user purchases from Supabase
export async function fetchUserPurchases(userId: string): Promise<UserPurchase[]> {
  try {
    const { data, error } = await supabase
      .from('user_purchases')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user purchases:', error);
      return [];
    }

    return (data as UserPurchase[]) || [];
  } catch (err) {
    console.error('Error fetching user purchases:', err);
    return [];
  }
}

// Save a purchase to Supabase
export async function savePurchase(purchase: UserPurchase): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_purchases')
      .upsert(purchase, {
        onConflict: 'user_id,product_id',
      });

    if (error) {
      console.error('Error saving purchase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving purchase:', err);
    return false;
  }
}

// Throttled save - saves at most every SAVE_INTERVAL ms
const BASE_SAVE_INTERVAL = 3000; // Save every 3 seconds normally
const ACTIVE_SAVE_INTERVAL = 4000; // Save every 4 seconds when autoclicker/miners active
const FORCE_SAVE_COOLDOWN = 2000; // Block regular saves for 2s after force save
const IDLE_SAVE_DELAY = 3000; // Save after 3s of no state changes
let saveTimeout: NodeJS.Timeout | null = null;
let idleSaveTimeout: NodeJS.Timeout | null = null; // For idle save mechanism
let pendingData: (Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client'; _isHardMode?: boolean }) | null = null;
let lastSaveTime = 0;
let isSaving = false;
let saveVersion = 0; // Increments on force save to invalidate old in-flight saves
let lastForceSaveTime = 0; // Track when force save happened to block stale saves

// Get save interval based on whether autoclicker/miners are active
function getSaveInterval(data: Partial<UserGameData>): number {
  const hasActiveMining = (data.autoclicker_enabled && data.has_autoclicker) || (data.miner_count && data.miner_count > 0);
  return hasActiveMining ? ACTIVE_SAVE_INTERVAL : BASE_SAVE_INTERVAL;
}

export function debouncedSaveUserGameData(data: Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client' }, isHardMode: boolean = false): void {
  // CRITICAL: Block saves when core data is undefined/null/NaN/Infinity (prevents overwriting with empty/corrupt data)
  // This happens during initial load before Supabase fetch completes, or if game state gets corrupted
  if (isCorruptNumber(data.yates_dollars) ||
      isCorruptNumber(data.total_clicks) ||
      isCorruptNumber(data.prestige_count)) {
    console.log('🚫 DEBOUNCED SAVE BLOCKED: Core data is corrupt/undefined/null (waiting for load)', {
      dollars: data.yates_dollars,
      clicks: data.total_clicks,
      prestige: data.prestige_count
    });
    return;
  }
  
  // Always accumulate latest data first (so nothing is ever dropped)
  pendingData = { ...pendingData, ...data, _isHardMode: isHardMode };
  
  // Block EXECUTING saves during cooldown after force save (prevents stale data from overwriting)
  // But data is still accumulated above so it's ready when cooldown expires
  const timeSinceForceSave = Date.now() - lastForceSaveTime;
  if (timeSinceForceSave < FORCE_SAVE_COOLDOWN) {
    // Schedule a save for right after cooldown expires (if not already scheduled)
    if (!saveTimeout) {
      const timeUntilCooldownEnds = FORCE_SAVE_COOLDOWN - timeSinceForceSave + 100;
      saveTimeout = setTimeout(() => {
        saveTimeout = null;
        if (pendingData && !isSaving) {
          executeSave();
        }
      }, timeUntilCooldownEnds);
    }
    return;
  }
  
  const now = Date.now();
  const timeSinceLastSave = now - lastSaveTime;
  const saveInterval = getSaveInterval(pendingData);
  
  // If enough time has passed and we're not already saving, save immediately
  if (timeSinceLastSave >= saveInterval && !isSaving) {
    executeSave();
  } else if (!saveTimeout) {
    // Schedule a save for when the interval completes
    const timeUntilNextSave = Math.max(0, saveInterval - timeSinceLastSave);
    saveTimeout = setTimeout(() => {
      if (pendingData && !isSaving) {
        executeSave();
      }
    }, timeUntilNextSave);
  }
  
  // IDLE SAVE: Schedule a save that fires if no new changes come in for 2 seconds
  // This ensures data is saved even when user stops playing
  if (idleSaveTimeout) {
    clearTimeout(idleSaveTimeout);
  }
  idleSaveTimeout = setTimeout(() => {
    if (pendingData && !isSaving) {
      console.log('💤 IDLE SAVE: No activity for 2s, saving pending data...');
      executeSave();
    }
    idleSaveTimeout = null;
  }, IDLE_SAVE_DELAY);
}

async function executeSave(): Promise<void> {
  if (!pendingData || isSaving) return;
  
  // Check cooldown BEFORE executing - this catches saves that were queued before prestige
  const timeSinceForceSave = Date.now() - lastForceSaveTime;
  if (timeSinceForceSave < FORCE_SAVE_COOLDOWN) {
    console.log('🚫 EXECUTE SAVE BLOCKED: Force save cooldown active (data preserved)', { 
      timeSinceForceSave, 
      cooldown: FORCE_SAVE_COOLDOWN,
    });
    // DON'T null pendingData — keep it for the next save cycle
    return;
  }
  
  isSaving = true;
  const dataToSave = pendingData;
  const versionAtStart = saveVersion; // Capture version before async operation
  pendingData = null;
  lastSaveTime = Date.now();
  
  // Clear both timeouts when executing save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (idleSaveTimeout) {
    clearTimeout(idleSaveTimeout);
    idleSaveTimeout = null;
  }
  
  try {
    // Check if a force save happened while we were preparing
    if (saveVersion !== versionAtStart) {
      console.log('🚫 DEBOUNCED SAVE SKIPPED: Force save happened, version changed');
      return;
    }
    // Extract isHardMode flag and pass version so saveUserGameData can double-check before actual DB write
    const isHardMode = dataToSave._isHardMode || false;
    await saveUserGameData(dataToSave, versionAtStart, isHardMode);
  } catch {
    // Put the data back if save failed
    pendingData = { ...(dataToSave || {}), ...(pendingData || {}) } as UserGameData;
  } finally {
    isSaving = false;
  }
}

// Force immediate save (call on logout or page unload)
export async function flushPendingData(): Promise<void> {
  // Clear all timeouts
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (idleSaveTimeout) {
    clearTimeout(idleSaveTimeout);
    idleSaveTimeout = null;
  }
  
  if (pendingData) {
    // Wait briefly for in-flight save to finish, then save
    if (isSaving) {
      // Give the in-flight save up to 2s to finish
      let waited = 0;
      while (isSaving && waited < 2000) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
      }
    }
    
    if (pendingData && !isSaving) {
      isSaving = true;
      const dataToSave = pendingData;
      pendingData = null;
      
      try {
        await saveUserGameData(dataToSave);
      } catch (err) {
        console.error('Failed to flush game data:', err);
      } finally {
        isSaving = false;
      }
    }
  }
}

// Force immediate save with specific data (bypass debounce completely)
// Use this after critical actions like prestige
export async function forceImmediateSave(data: Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client' }): Promise<boolean> {
  // CRITICAL: Block saves when core data is undefined/null/NaN/Infinity
  if (isCorruptNumber(data.yates_dollars) ||
      isCorruptNumber(data.total_clicks) ||
      isCorruptNumber(data.prestige_count)) {
    console.log('🚫 FORCE SAVE BLOCKED: Core data is corrupt/undefined/null', {
      dollars: data.yates_dollars,
      clicks: data.total_clicks,
      prestige: data.prestige_count
    });
    return false;
  }
  
  console.log('⚡ FORCE SAVE: Bypassing debounce...', { prestige: data.prestige_count, clicks: data.total_clicks });
  
  // Increment version to invalidate any in-flight debounced saves
  saveVersion++;
  // Set cooldown to block stale saves from useEffects that captured old state
  lastForceSaveTime = Date.now();
  console.log('⚡ FORCE SAVE: Invalidated old saves, version now:', saveVersion, '+ 3s cooldown active');
  
  // Clear any pending debounced saves and idle saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (idleSaveTimeout) {
    clearTimeout(idleSaveTimeout);
    idleSaveTimeout = null;
  }
  pendingData = null;
  
  // Save immediately
  try {
    const result = await saveUserGameData(data);
    lastSaveTime = Date.now();
    console.log('⚡ FORCE SAVE RESULT:', result ? '✅ SUCCESS' : '❌ FAILED');
    return result;
  } catch (err) {
    console.error('⚡ FORCE SAVE EXCEPTION:', err);
    return false;
  }
}

// Fire-and-forget save using fetch with keepalive
// This survives page unload better than regular async requests
// Used as fallback when beforeunload fires
export function keepaliveSave(data: Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client' }, isHardMode: boolean = false): void {
  // CRITICAL: Block saves when core data is undefined/null/NaN/Infinity
  if (isCorruptNumber(data.yates_dollars) ||
      isCorruptNumber(data.total_clicks) ||
      isCorruptNumber(data.prestige_count)) {
    console.log('🚫 KEEPALIVE SAVE BLOCKED: Core data is corrupt/undefined/null', {
      dollars: data.yates_dollars, clicks: data.total_clicks, prestige: data.prestige_count
    });
    return;
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ KEEPALIVE SAVE: Missing Supabase config');
    return;
  }

  const fullData = stripUndefined({
    user_id: data.user_id,
    user_type: data.user_type,
    yates_dollars: safeBigInt(data.yates_dollars),
    total_clicks: safeBigInt(data.total_clicks),
    current_pickaxe_id: data.current_pickaxe_id,
    current_rock_id: data.current_rock_id,
    current_rock_hp: safeBigInt(data.current_rock_hp),
    rocks_mined_count: safeBigInt(data.rocks_mined_count),
    owned_pickaxe_ids: data.owned_pickaxe_ids,
    coupons_30: data.coupons_30,
    coupons_50: data.coupons_50,
    coupons_100: data.coupons_100,
    has_seen_cutscene: data.has_seen_cutscene,
    updated_at: new Date().toISOString(),
    has_autoclicker: data.has_autoclicker,
    autoclicker_enabled: data.autoclicker_enabled,
    prestige_count: data.prestige_count,
    prestige_multiplier: data.prestige_multiplier,
    anti_cheat_warnings: data.anti_cheat_warnings,
    is_on_watchlist: data.is_on_watchlist,
    is_blocked: data.is_blocked,
    appeal_pending: data.appeal_pending,
    owned_trinket_ids: data.owned_trinket_ids,
    equipped_trinket_ids: data.equipped_trinket_ids,
    trinket_shop_items: data.trinket_shop_items,
    trinket_shop_last_refresh: safeBigInt(data.trinket_shop_last_refresh),
    has_totem_protection: data.has_totem_protection,
    has_stocks_unlocked: data.has_stocks_unlocked,
    owned_relic_ids: data.owned_relic_ids,
    owned_talisman_ids: data.owned_talisman_ids,
    miner_count: data.miner_count,
    miner_last_tick: safeBigInt(data.miner_last_tick),
    prestige_tokens: data.prestige_tokens,
    owned_prestige_upgrade_ids: data.owned_prestige_upgrade_ids,
    auto_prestige_enabled: data.auto_prestige_enabled,
    unlocked_achievement_ids: data.unlocked_achievement_ids,
    total_money_earned: safeBigInt(data.total_money_earned),
    game_start_time: safeBigInt(data.game_start_time),
    fastest_prestige_time: safeBigInt(data.fastest_prestige_time),
    owned_title_ids: data.owned_title_ids,
    equipped_title_ids: data.equipped_title_ids,
    title_win_counts: data.title_win_counts,
    chosen_path: data.chosen_path,
    last_tax_time: safeBigInt(data.last_tax_time),
    total_playtime_seconds: safeBigInt(data.total_playtime_seconds),
    ...(data.owned_premium_product_ids?.length ? { owned_premium_product_ids: data.owned_premium_product_ids } : {}),
    ...(data.buildings_data ? { buildings_data: data.buildings_data } : {}),
    stokens: data.stokens,
    lottery_tickets: data.lottery_tickets,
  });

  // Use correct table based on game mode (was hardcoded to user_game_data before - corrupted hard mode players!)
  const tableName = getTableName(isHardMode);
  const url = `${supabaseUrl}/rest/v1/${tableName}?on_conflict=user_id`;
  
  console.log(`🚀 KEEPALIVE SAVE (${isHardMode ? 'HARD' : 'normal'}): Firing save before page unload...`, { prestige: data.prestige_count });
  
  // Use fetch with keepalive - this survives page unload
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(fullData),
    keepalive: true, // This is the key - survives page unload
  }).catch(() => {
    // Fire and forget - we can't do anything with errors during page unload
  });
}

// Get the current pending data (for use in keepalive save)
export function getPendingData(): (Partial<UserGameData> & { user_id: string; user_type: 'employee' | 'client' }) | null {
  return pendingData;
}
