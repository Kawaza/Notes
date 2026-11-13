import { create } from 'zustand';
import { supabase } from '../sync/supabaseClient';
import { generateKdfSaltBase64, KDF_ITERATIONS } from '../sync/syncEncryption';
import { verifyVaultPassword } from '../sync/cloudSync';

interface EncryptionStore {
  /** Account password kept only in memory until lock — used for AES decrypt/encrypt */
  vaultPassword: string | null;
  kdfSaltBase64: string | null;
  unlocked: boolean;
  unlockError: string | null;
  setVaultFromSignIn: (password: string) => void;
  ensureKdfSalt: (userId: string) => Promise<string>;
  lock: () => void;
  tryUnlock: (password: string, userId: string) => Promise<boolean>;
}

export const useEncryptionStore = create<EncryptionStore>((set, get) => ({
  vaultPassword: null,
  kdfSaltBase64: null,
  unlocked: false,
  unlockError: null,

  setVaultFromSignIn: (password) => {
    set({ vaultPassword: password, unlocked: true, unlockError: null });
  },

  ensureKdfSalt: async (userId) => {
    const cached = get().kdfSaltBase64;
    if (cached) return cached;
    if (!supabase) throw new Error('Sync not configured');

    const { data: existing } = await supabase
      .from('user_crypto_meta')
      .select('kdf_salt')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.kdf_salt) {
      set({ kdfSaltBase64: existing.kdf_salt });
      return existing.kdf_salt;
    }

    const kdf_salt = generateKdfSaltBase64();
    const { error } = await supabase.from('user_crypto_meta').insert({
      user_id: userId,
      kdf_salt,
      kdf_iterations: KDF_ITERATIONS,
    });
    if (error) throw error;
    set({ kdfSaltBase64: kdf_salt });
    return kdf_salt;
  },

  lock: () => set({ vaultPassword: null, unlocked: false }),

  tryUnlock: async (password, userId) => {
    try {
      await get().ensureKdfSalt(userId);
      const valid = await verifyVaultPassword(userId, password);
      if (!valid) {
        set({ unlockError: 'Incorrect password', unlocked: false, vaultPassword: null });
        return false;
      }
      set({ vaultPassword: password, unlocked: true, unlockError: null });
      return true;
    } catch {
      set({ unlockError: 'Could not unlock encrypted notes', unlocked: false, vaultPassword: null });
      return false;
    }
  },
}));
