import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  const service = new CsrfService();

  it('validates matching header/cookie token and stored hash', () => {
    const token = service.generateToken();
    const storedHash = service.hashToken(token);

    expect(service.isValid(token, token, storedHash)).toBe(true);
  });

  it('rejects mismatched token values', () => {
    const headerToken = service.generateToken();
    const cookieToken = service.generateToken();
    const storedHash = service.hashToken(headerToken);

    expect(service.isValid(headerToken, cookieToken, storedHash)).toBe(false);
  });
});
