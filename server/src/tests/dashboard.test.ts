import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { getDashboardStats } from '../handlers/dashboard';
import { eq } from 'drizzle-orm';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test User'
        },
        {
          email: 'other@example.com', 
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;
  });

  it('should return zero stats for user with no data', async () => {
    const result = await getDashboardStats(testUserId);

    expect(result.total_products).toEqual(0);
    expect(result.low_stock_products).toEqual(0);
    expect(result.daily_revenue).toEqual(0);
    expect(result.total_transactions_today).toEqual(0);
  });

  it('should count total products correctly', async () => {
    // Create products for test user
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          price: '10.00',
          stock_quantity: 5,
          user_id: testUserId
        },
        {
          name: 'Product 2',
          price: '20.00',
          stock_quantity: 15,
          user_id: testUserId
        },
        {
          name: 'Product 3',
          price: '30.00',
          stock_quantity: 25,
          user_id: testUserId
        }
      ])
      .execute();

    // Create product for other user (should not be counted)
    await db.insert(productsTable)
      .values({
        name: 'Other Product',
        price: '40.00',
        stock_quantity: 10,
        user_id: otherUserId
      })
      .execute();

    const result = await getDashboardStats(testUserId);

    expect(result.total_products).toEqual(3);
  });

  it('should count low stock products correctly', async () => {
    // Create products with different stock levels
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock 1',
          price: '10.00',
          stock_quantity: 5, // Low stock (≤ 10)
          user_id: testUserId
        },
        {
          name: 'Low Stock 2',
          price: '20.00',
          stock_quantity: 10, // At threshold (≤ 10)
          user_id: testUserId
        },
        {
          name: 'Normal Stock',
          price: '30.00',
          stock_quantity: 15, // Normal stock (> 10)
          user_id: testUserId
        },
        {
          name: 'High Stock',
          price: '40.00',
          stock_quantity: 100, // High stock (> 10)
          user_id: testUserId
        }
      ])
      .execute();

    const result = await getDashboardStats(testUserId);

    expect(result.total_products).toEqual(4);
    expect(result.low_stock_products).toEqual(2); // Only first two products
  });

  it('should calculate daily revenue correctly', async () => {
    // Create transactions for today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          total_amount: '25.50',
          transaction_date: today
        },
        {
          user_id: testUserId,
          total_amount: '30.75',
          transaction_date: today
        },
        {
          user_id: testUserId,
          total_amount: '15.00',
          transaction_date: yesterday // Should not be included
        },
        {
          user_id: otherUserId,
          total_amount: '100.00',
          transaction_date: today // Should not be included
        }
      ])
      .execute();

    const result = await getDashboardStats(testUserId);

    expect(result.daily_revenue).toEqual(56.25); // 25.50 + 30.75
    expect(result.total_transactions_today).toEqual(2);
  });

  it('should handle transactions at different times of day', async () => {
    const today = new Date();
    const earlyMorning = new Date(today);
    earlyMorning.setHours(2, 30, 0, 0);
    
    const lateEvening = new Date(today);
    lateEvening.setHours(23, 59, 59, 999);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          total_amount: '10.00',
          transaction_date: earlyMorning
        },
        {
          user_id: testUserId,
          total_amount: '20.00',
          transaction_date: lateEvening
        }
      ])
      .execute();

    const result = await getDashboardStats(testUserId);

    expect(result.daily_revenue).toEqual(30.00);
    expect(result.total_transactions_today).toEqual(2);
  });

  it('should return correct data types', async () => {
    // Create some test data
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        price: '10.50',
        stock_quantity: 5,
        user_id: testUserId
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        total_amount: '25.75'
      })
      .execute();

    const result = await getDashboardStats(testUserId);

    // Verify all fields are numbers
    expect(typeof result.total_products).toBe('number');
    expect(typeof result.low_stock_products).toBe('number');
    expect(typeof result.daily_revenue).toBe('number');
    expect(typeof result.total_transactions_today).toBe('number');

    // Verify specific values
    expect(result.total_products).toEqual(1);
    expect(result.low_stock_products).toEqual(1);
    expect(result.daily_revenue).toEqual(25.75);
    expect(result.total_transactions_today).toEqual(1);
  });

  it('should handle edge case with zero revenue but transactions exist', async () => {
    // Create a transaction with zero amount (edge case)
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        total_amount: '0.00'
      })
      .execute();

    const result = await getDashboardStats(testUserId);

    expect(result.daily_revenue).toEqual(0);
    expect(result.total_transactions_today).toEqual(1);
  });

  it('should isolate data between different users', async () => {
    // Create data for both users
    await db.insert(productsTable)
      .values([
        {
          name: 'User 1 Product',
          price: '10.00',
          stock_quantity: 5,
          user_id: testUserId
        },
        {
          name: 'User 2 Product 1',
          price: '20.00',
          stock_quantity: 8,
          user_id: otherUserId
        },
        {
          name: 'User 2 Product 2',
          price: '30.00',
          stock_quantity: 15,
          user_id: otherUserId
        }
      ])
      .execute();

    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          total_amount: '50.00'
        },
        {
          user_id: otherUserId,
          total_amount: '75.00'
        },
        {
          user_id: otherUserId,
          total_amount: '25.00'
        }
      ])
      .execute();

    // Test first user's stats
    const user1Stats = await getDashboardStats(testUserId);
    expect(user1Stats.total_products).toEqual(1);
    expect(user1Stats.low_stock_products).toEqual(1);
    expect(user1Stats.daily_revenue).toEqual(50.00);
    expect(user1Stats.total_transactions_today).toEqual(1);

    // Test second user's stats
    const user2Stats = await getDashboardStats(otherUserId);
    expect(user2Stats.total_products).toEqual(2);
    expect(user2Stats.low_stock_products).toEqual(1); // Only product with stock 8
    expect(user2Stats.daily_revenue).toEqual(100.00); // 75 + 25
    expect(user2Stats.total_transactions_today).toEqual(2);
  });
});