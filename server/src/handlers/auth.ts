import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterInput, type AuthResponse, type User } from '../schema';
import { eq } from 'drizzle-orm';

// In a real app, this would come from environment variables
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Simple JWT implementation without external dependencies
const base64UrlEncode = (str: string): string => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const base64UrlDecode = (str: string): string => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
};

const createJWT = (payload: any): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Date.now();
  const exp = now + JWT_EXPIRES_IN;

  const jwtPayload = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000)
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(jwtPayload));

  const signature = base64UrlEncode(
    Buffer.from(`${headerBase64}.${payloadBase64}.${JWT_SECRET}`).toString('base64')
  );

  return `${headerBase64}.${payloadBase64}.${signature}`;
};

const verifyJWT = (token: string): any => {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');
    
    if (!headerBase64 || !payloadBase64 || !signature) {
      throw new Error('Invalid token format');
    }

    // Verify signature
    const expectedSignature = base64UrlEncode(
      Buffer.from(`${headerBase64}.${payloadBase64}.${JWT_SECRET}`).toString('base64')
    );

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadBase64));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Simple password hashing (in production, use bcrypt)
const hashPassword = (password: string): string => {
  // This is a simple hash for demo purposes
  // In production, use bcrypt with proper salt rounds
  return Buffer.from(password + JWT_SECRET).toString('base64');
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = hashPassword(input.password);

    // Create user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        full_name: input.full_name
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate JWT token
    const token = createJWT({ 
      userId: user.id, 
      email: user.email 
    });

    // Return user data without password hash
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(input.password, user.password_hash)) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = createJWT({ 
      userId: user.id, 
      email: user.email 
    });

    // Return user data without password hash
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Verify JWT token
    const decoded = verifyJWT(token) as { userId: number; email: string };

    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}