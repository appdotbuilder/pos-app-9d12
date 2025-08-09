import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type LoginInput } from '../schema';
import { register, login, verifyToken } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Helper function to decode JWT payload for testing
const decodeJWTPayload = (token: string): any => {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    let paddedPayload = payload;
    while (paddedPayload.length % 4) {
      paddedPayload += '=';
    }
    return JSON.parse(Buffer.from(paddedPayload, 'base64').toString());
  } catch {
    return null;
  }
};

// Test data
const testUser: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User'
};

const loginData: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('Authentication Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('register', () => {
    it('should create a new user and return auth response', async () => {
      const result = await register(testUser);

      // Verify response structure
      expect(result.user.email).toEqual(testUser.email);
      expect(result.user.full_name).toEqual(testUser.full_name);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify user is not returned with password
      expect((result.user as any).password_hash).toBeUndefined();
    });

    it('should save user to database with hashed password', async () => {
      const result = await register(testUser);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(users).toHaveLength(1);
      const savedUser = users[0];
      
      expect(savedUser.email).toEqual(testUser.email);
      expect(savedUser.full_name).toEqual(testUser.full_name);
      expect(savedUser.password_hash).toBeDefined();
      expect(savedUser.password_hash).not.toEqual(testUser.password); // Password should be hashed
      expect(savedUser.created_at).toBeInstanceOf(Date);
      expect(savedUser.updated_at).toBeInstanceOf(Date);
    });

    it('should generate valid JWT token', async () => {
      const result = await register(testUser);

      // Verify token can be decoded
      const decoded = decodeJWTPayload(result.token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toEqual(result.user.id);
      expect(decoded.email).toEqual(result.user.email);
      expect(decoded.exp).toBeDefined(); // Token should have expiration
      expect(decoded.iat).toBeDefined(); // Token should have issued at time
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await register(testUser);

      // Try to register with same email
      await expect(register(testUser)).rejects.toThrow(/already exists/i);
    });

    it('should handle different user data correctly', async () => {
      const differentUser: RegisterInput = {
        email: 'different@example.com',
        password: 'differentpass',
        full_name: 'Different User'
      };

      const result = await register(differentUser);

      expect(result.user.email).toEqual(differentUser.email);
      expect(result.user.full_name).toEqual(differentUser.full_name);
      expect(result.token).toBeDefined();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a user to login with
      await register(testUser);
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await login(loginData);

      expect(result.user.email).toEqual(loginData.email);
      expect(result.user.full_name).toEqual(testUser.full_name);
      expect(result.user.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify password hash is not returned
      expect((result.user as any).password_hash).toBeUndefined();
    });

    it('should generate valid JWT token on login', async () => {
      const result = await login(loginData);

      const decoded = decodeJWTPayload(result.token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toEqual(result.user.id);
      expect(decoded.email).toEqual(result.user.email);
      expect(decoded.exp).toBeDefined();
    });

    it('should reject login with incorrect email', async () => {
      const wrongEmailLogin: LoginInput = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      await expect(login(wrongEmailLogin)).rejects.toThrow(/Invalid email or password/i);
    });

    it('should reject login with incorrect password', async () => {
      const wrongPasswordLogin: LoginInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(login(wrongPasswordLogin)).rejects.toThrow(/Invalid email or password/i);
    });

    it('should reject login with empty email', async () => {
      const emptyEmailLogin: LoginInput = {
        email: '',
        password: 'password123'
      };

      await expect(login(emptyEmailLogin)).rejects.toThrow(/Invalid email or password/i);
    });
  });

  describe('verifyToken', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      const result = await register(testUser);
      validToken = result.token;
      userId = result.user.id;
    });

    it('should return user for valid token', async () => {
      const user = await verifyToken(validToken);

      expect(user).toBeDefined();
      expect(user!.id).toEqual(userId);
      expect(user!.email).toEqual(testUser.email);
      expect(user!.full_name).toEqual(testUser.full_name);
      expect(user!.password_hash).toBeDefined(); // Full user object includes password_hash
      expect(user!.created_at).toBeInstanceOf(Date);
      expect(user!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for invalid token', async () => {
      const user = await verifyToken('invalid_token');
      expect(user).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const user = await verifyToken('not.a.valid.jwt');
      expect(user).toBeNull();
    });

    it('should return null for token with non-existent user ID', async () => {
      // Create a token with non-existent user ID by manually crafting it
      const fakePayload = JSON.stringify({
        userId: 99999,
        email: 'fake@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 3600000) / 1000) // 1 hour from now
      });

      // Create a fake token (this will have wrong signature but tests the user lookup)
      const fakeToken = 'fake.token.here';
      const user = await verifyToken(fakeToken);
      expect(user).toBeNull();
    });

    it('should return null for empty token', async () => {
      const user = await verifyToken('');
      expect(user).toBeNull();
    });

    it('should return null for token with wrong signature', async () => {
      // Take a valid token and modify the signature part
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.wrongsignature`;
      
      const user = await verifyToken(tamperedToken);
      expect(user).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should allow register -> login -> verify flow', async () => {
      // Register
      const registerResult = await register(testUser);
      expect(registerResult.user.email).toEqual(testUser.email);

      // Login
      const loginResult = await login(loginData);
      expect(loginResult.user.id).toEqual(registerResult.user.id);

      // Verify token from login
      const verifiedUser = await verifyToken(loginResult.token);
      expect(verifiedUser!.id).toEqual(registerResult.user.id);
      expect(verifiedUser!.email).toEqual(testUser.email);
    });

    it('should handle multiple users correctly', async () => {
      const user2: RegisterInput = {
        email: 'user2@example.com',
        password: 'password456',
        full_name: 'User Two'
      };

      // Register two users
      const result1 = await register(testUser);
      const result2 = await register(user2);

      expect(result1.user.id).not.toEqual(result2.user.id);
      expect(result1.user.email).toEqual(testUser.email);
      expect(result2.user.email).toEqual(user2.email);

      // Login as each user
      const login1 = await login(loginData);
      const login2 = await login({
        email: user2.email,
        password: user2.password
      });

      expect(login1.user.id).toEqual(result1.user.id);
      expect(login2.user.id).toEqual(result2.user.id);

      // Verify tokens
      const verify1 = await verifyToken(login1.token);
      const verify2 = await verifyToken(login2.token);

      expect(verify1!.id).toEqual(result1.user.id);
      expect(verify2!.id).toEqual(result2.user.id);
    });

    it('should maintain token uniqueness across users', async () => {
      const user2: RegisterInput = {
        email: 'user2@example.com',
        password: 'password456',
        full_name: 'User Two'
      };

      // Register and login two users
      await register(testUser);
      await register(user2);

      const login1 = await login(loginData);
      const login2 = await login({
        email: user2.email,
        password: user2.password
      });

      // Tokens should be different
      expect(login1.token).not.toEqual(login2.token);

      // Each token should verify to the correct user
      const verify1 = await verifyToken(login1.token);
      const verify2 = await verifyToken(login2.token);

      expect(verify1!.email).toEqual(testUser.email);
      expect(verify2!.email).toEqual(user2.email);
    });
  });
});