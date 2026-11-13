const INVITE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateInviteCode(): string {
  const block = (len: number) => {
    let out = '';
    for (let i = 0; i < len; i++) {
      out += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
    }
    return out;
  };
  return `${block(4)}-${block(4)}`;
}

export function normalizeInviteCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}
