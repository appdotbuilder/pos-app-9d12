import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { 
  createSale, 
  getTransactionHistory, 
  getDailyRevenue, 
  getTransactionsByDateRange, 
  getDailyTransactionCount 
} from '../handlers/transactions';
import { eq, and } from 'drizzle-orm';

describe('Transaction handlers', () => {
  let testUserId: number;
  let testProduct1Id: number;
  let testProduct2Id: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        price: '19.99',
        stock_quantity: 100,
        user_id: testUserId
      })
      .returning()
      .execute();
    testProduct1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        price: '9.99',
        stock_quantity: 50,
        user_id: testUserId
      })
      .returning()
      .execute();
    testProduct2Id = product2Result[0].id;
  });

  afterEach(resetDB);

  describe('createSale', () => {
    const testSaleInput: CreateSaleInput = {
      items: [
        { product_id: 0, quantity: 2 }, // Will be set to testProduct1Id
        { product_id: 0, quantity: 1 }  // Will be set to testProduct2Id
      ]
    };

    beforeEach(() => {
      testSaleInput.items[0].product_id = testProduct1Id;
      testSaleInput.items[1].product_id = testProduct2Id;
    });

    it('should create a sale transaction successfully', async () => {
      const result = await createSale(testSaleInput, testUserId);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(testUserId);
      expect(typeof result.total_amount).toBe('number');
      expect(result.total_amount).toEqual(49.97); // (2 * 19.99) + (1 * 9.99)
      expect(result.transaction_date).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create transaction items in database', async () => {
      const transaction = await createSale(testSaleInput, testUserId);

      const items = await db.select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.transaction_id, transaction.id))
        .execute();

      expect(items).toHaveLength(2);
      
      const item1 = items.find(item => item.product_id === testProduct1Id);
      const item2 = items.find(item => item.product_id === testProduct2Id);

      expect(item1).toBeDefined();
      expect(item1!.quantity).toEqual(2);
      expect(parseFloat(item1!.unit_price)).toEqual(19.99);
      expect(parseFloat(item1!.subtotal)).toEqual(39.98);

      expect(item2).toBeDefined();
      expect(item2!.quantity).toEqual(1);
      expect(parseFloat(item2!.unit_price)).toEqual(9.99);
      expect(parseFloat(item2!.subtotal)).toEqual(9.99);
    });

    it('should update product stock quantities', async () => {
      await createSale(testSaleInput, testUserId);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.user_id, testUserId))
        .execute();

      const product1 = products.find(p => p.id === testProduct1Id);
      const product2 = products.find(p => p.id === testProduct2Id);

      expect(product1!.stock_quantity).toEqual(98); // 100 - 2
      expect(product2!.stock_quantity).toEqual(49); // 50 - 1
    });

    it('should throw error for insufficient stock', async () => {
      const insufficientStockInput: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 150 }] // More than available stock (100)
      };

      await expect(createSale(insufficientStockInput, testUserId))
        .rejects.toThrow(/insufficient stock/i);
    });

    it('should throw error for non-existent product', async () => {
      const invalidProductInput: CreateSaleInput = {
        items: [{ product_id: 99999, quantity: 1 }]
      };

      await expect(createSale(invalidProductInput, testUserId))
        .rejects.toThrow(/product.*not found/i);
    });

    it('should throw error for non-existent user', async () => {
      await expect(createSale(testSaleInput, 99999))
        .rejects.toThrow(/user not found/i);
    });

    it('should handle single item sale', async () => {
      const singleItemInput: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };

      const result = await createSale(singleItemInput, testUserId);

      expect(result.total_amount).toEqual(19.99);
      
      const items = await db.select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.transaction_id, result.id))
        .execute();

      expect(items).toHaveLength(1);
    });
  });

  describe('getTransactionHistory', () => {
    beforeEach(async () => {
      // Create some test transactions
      const sale1: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };
      const sale2: CreateSaleInput = {
        items: [{ product_id: testProduct2Id, quantity: 2 }]
      };

      await createSale(sale1, testUserId);
      await createSale(sale2, testUserId);
    });

    it('should return transaction history with details', async () => {
      const history = await getTransactionHistory(testUserId);

      expect(history).toHaveLength(2);
      
      const transaction1 = history[0];
      expect(transaction1.id).toBeDefined();
      expect(typeof transaction1.total_amount).toBe('number');
      expect(transaction1.transaction_date).toBeInstanceOf(Date);
      expect(transaction1.items).toHaveLength(1);
      
      const item = transaction1.items[0];
      expect(item.id).toBeDefined();
      expect(item.product_name).toBeDefined();
      expect(typeof item.quantity).toBe('number');
      expect(typeof item.unit_price).toBe('number');
      expect(typeof item.subtotal).toBe('number');
    });

    it('should respect limit parameter', async () => {
      const history = await getTransactionHistory(testUserId, 1);

      expect(history).toHaveLength(1);
    });

    it('should respect offset parameter', async () => {
      const firstPage = await getTransactionHistory(testUserId, 1, 0);
      const secondPage = await getTransactionHistory(testUserId, 1, 1);

      expect(firstPage).toHaveLength(1);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toEqual(secondPage[0].id);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getTransactionHistory(99999))
        .rejects.toThrow(/user not found/i);
    });

    it('should return empty array for user with no transactions', async () => {
      // Create another user with no transactions
      const userResult = await db.insert(usersTable)
        .values({
          email: 'empty@example.com',
          password_hash: 'hashed_password',
          full_name: 'Empty User'
        })
        .returning()
        .execute();

      const history = await getTransactionHistory(userResult[0].id);

      expect(history).toHaveLength(0);
    });
  });

  describe('getDailyRevenue', () => {
    beforeEach(async () => {
      // Create transactions for different dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create today's sales
      const todaySale: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 2 }]
      };
      await createSale(todaySale, testUserId);

      // Create yesterday's sale (we'll manually set the date)
      const yesterdaySale: CreateSaleInput = {
        items: [{ product_id: testProduct2Id, quantity: 1 }]
      };
      const yesterdayTransaction = await createSale(yesterdaySale, testUserId);
      
      // Update transaction date to yesterday
      await db.update(transactionsTable)
        .set({ transaction_date: yesterday })
        .where(eq(transactionsTable.id, yesterdayTransaction.id))
        .execute();
    });

    it('should calculate daily revenue for current date', async () => {
      const revenue = await getDailyRevenue(testUserId);

      expect(typeof revenue).toBe('number');
      expect(revenue).toEqual(39.98); // 2 * 19.99
    });

    it('should calculate daily revenue for specific date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const revenue = await getDailyRevenue(testUserId, yesterday);

      expect(revenue).toEqual(9.99); // Yesterday's transaction
    });

    it('should return 0 for date with no transactions', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const revenue = await getDailyRevenue(testUserId, twoDaysAgo);

      expect(revenue).toEqual(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getDailyRevenue(99999))
        .rejects.toThrow(/user not found/i);
    });
  });

  describe('getTransactionsByDateRange', () => {
    beforeEach(async () => {
      // Create transactions across multiple dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Create sales
      const sale1: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };
      const sale2: CreateSaleInput = {
        items: [{ product_id: testProduct2Id, quantity: 1 }]
      };
      const sale3: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };

      const transaction1 = await createSale(sale1, testUserId);
      const transaction2 = await createSale(sale2, testUserId);
      const transaction3 = await createSale(sale3, testUserId);

      // Update transaction dates
      await db.update(transactionsTable)
        .set({ transaction_date: twoDaysAgo })
        .where(eq(transactionsTable.id, transaction1.id))
        .execute();

      await db.update(transactionsTable)
        .set({ transaction_date: yesterday })
        .where(eq(transactionsTable.id, transaction2.id))
        .execute();

      await db.update(transactionsTable)
        .set({ transaction_date: today })
        .where(eq(transactionsTable.id, transaction3.id))
        .execute();
    });

    it('should return transactions within date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Start of yesterday
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

      const transactions = await getTransactionsByDateRange(testUserId, yesterday, tomorrow);

      expect(transactions).toHaveLength(2); // Yesterday and today
      transactions.forEach(transaction => {
        expect(transaction.transaction_date >= yesterday).toBe(true);
        expect(transaction.transaction_date <= tomorrow).toBe(true);
      });
    });

    it('should return empty array for range with no transactions', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 10);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 20);

      const transactions = await getTransactionsByDateRange(testUserId, futureDate1, futureDate2);

      expect(transactions).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(getTransactionsByDateRange(99999, today, tomorrow))
        .rejects.toThrow(/user not found/i);
    });
  });

  describe('getDailyTransactionCount', () => {
    beforeEach(async () => {
      // Create multiple transactions for today
      const sale1: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };
      const sale2: CreateSaleInput = {
        items: [{ product_id: testProduct2Id, quantity: 1 }]
      };

      await createSale(sale1, testUserId);
      await createSale(sale2, testUserId);
    });

    it('should count transactions for current date', async () => {
      const count = await getDailyTransactionCount(testUserId);

      expect(typeof count).toBe('number');
      expect(count).toEqual(2);
    });

    it('should count transactions for specific date', async () => {
      const today = new Date();
      const count = await getDailyTransactionCount(testUserId, today);

      expect(count).toEqual(2);
    });

    it('should return 0 for date with no transactions', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const count = await getDailyTransactionCount(testUserId, yesterday);

      expect(count).toEqual(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getDailyTransactionCount(99999))
        .rejects.toThrow(/user not found/i);
    });

    it('should handle date boundaries correctly', async () => {
      // Create a transaction and set it to very end of day
      const sale: CreateSaleInput = {
        items: [{ product_id: testProduct1Id, quantity: 1 }]
      };
      const transaction = await createSale(sale, testUserId);
      
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      
      await db.update(transactionsTable)
        .set({ transaction_date: endOfToday })
        .where(eq(transactionsTable.id, transaction.id))
        .execute();

      const count = await getDailyTransactionCount(testUserId, new Date());

      expect(count).toEqual(3); // 2 from beforeEach + 1 new
    });
  });
});