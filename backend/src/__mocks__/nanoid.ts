// CJS-friendly shim for nanoid in Jest (the real package is ESM-only).
export function customAlphabet(_alphabet: string, size = 21) {
  return () => {
    let out = '';
    for (let i = 0; i < size; i++) {
      out += Math.floor(Math.random() * 36).toString(36);
    }
    return out;
  };
}

export function nanoid(size = 21) {
  return customAlphabet('', size)();
}
