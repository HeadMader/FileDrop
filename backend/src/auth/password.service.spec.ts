import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password', async () => {
    const password = 'StrongPass123!';
    const hash = await service.hashPassword(password);

    expect(hash).not.toEqual(password);
    await expect(service.verifyPassword(password, hash)).resolves.toBe(true);
    await expect(service.verifyPassword('wrong-password', hash)).resolves.toBe(
      false,
    );
  });
});
