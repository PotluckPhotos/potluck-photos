// Human-typable codes: no 0/O/1/I to avoid confusion when read aloud or typed.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 5): string {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
