export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateRandomPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return chars[arr[0] % chars.length];
  };

  const result = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = result.length; i < length; i++) {
    result.push(pick(all));
  }
  for (let i = result.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}
