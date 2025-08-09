import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput } from '../schema';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from '../handlers/products';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User'
};

const testProductInput: CreateProductInput = {
  name: 'Test Product',
  price: 29.99,
  stock_quantity: 100
};

const lowStockProductInput: CreateProductInput = {
  name: 'Low Stock Product',
  price: 15.99,
  stock_quantity: 5
};

describe('Products Handler', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResults[0].id;
  });

  afterEach(resetDB);

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const result = await createProduct(testProductInput, userId);

      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(29.99);
      expect(typeof result.price).toBe('number');
      expect(result.stock_quantity).toBe(100);
      expect(result.user_id).toBe(userId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save product to database', async () => {
      const result = await createProduct(testProductInput, userId);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Test Product');
      expect(parseFloat(products[0].price)).toBe(29.99);
      expect(products[0].stock_quantity).toBe(100);
      expect(products[0].user_id).toBe(userId);
    });

    it('should throw error for non-existent user', async () => {
      await expect(createProduct(testProductInput, 999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getProducts', () => {
    it('should return empty array when no products exist', async () => {
      const result = await getProducts(userId);
      expect(result).toEqual([]);
    });

    it('should return all products for user', async () => {
      // Create test products
      await createProduct(testProductInput, userId);
      await createProduct({
        name: 'Second Product',
        price: 19.99,
        stock_quantity: 50
      }, userId);

      const result = await getProducts(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Product');
      expect(result[0].price).toBe(29.99);
      expect(typeof result[0].price).toBe('number');
      expect(result[1].name).toBe('Second Product');
      expect(result[1].price).toBe(19.99);
    });

    it('should only return products for specified user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();
      const otherUserId = otherUserResult[0].id;

      // Create products for both users
      await createProduct(testProductInput, userId);
      await createProduct({
        name: 'Other User Product',
        price: 39.99,
        stock_quantity: 25
      }, otherUserId);

      const result = await getProducts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
      expect(result[0].user_id).toBe(userId);
    });
  });

  describe('getProduct', () => {
    let productId: number;

    beforeEach(async () => {
      const product = await createProduct(testProductInput, userId);
      productId = product.id;
    });

    it('should return product when found', async () => {
      const result = await getProduct(productId, userId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(productId);
      expect(result!.name).toBe('Test Product');
      expect(result!.price).toBe(29.99);
      expect(typeof result!.price).toBe('number');
      expect(result!.user_id).toBe(userId);
    });

    it('should return null when product not found', async () => {
      const result = await getProduct(999, userId);
      expect(result).toBeNull();
    });

    it('should return null when product belongs to different user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();
      const otherUserId = otherUserResult[0].id;

      const result = await getProduct(productId, otherUserId);
      expect(result).toBeNull();
    });
  });

  describe('updateProduct', () => {
    let productId: number;

    beforeEach(async () => {
      const product = await createProduct(testProductInput, userId);
      productId = product.id;
    });

    it('should update product name only', async () => {
      const updateInput: UpdateProductInput = {
        id: productId,
        name: 'Updated Product Name'
      };

      const result = await updateProduct(updateInput, userId);

      expect(result.name).toBe('Updated Product Name');
      expect(result.price).toBe(29.99);  // unchanged
      expect(result.stock_quantity).toBe(100);  // unchanged
    });

    it('should update product price only', async () => {
      const updateInput: UpdateProductInput = {
        id: productId,
        price: 39.99
      };

      const result = await updateProduct(updateInput, userId);

      expect(result.name).toBe('Test Product');  // unchanged
      expect(result.price).toBe(39.99);
      expect(typeof result.price).toBe('number');
      expect(result.stock_quantity).toBe(100);  // unchanged
    });

    it('should update stock quantity only', async () => {
      const updateInput: UpdateProductInput = {
        id: productId,
        stock_quantity: 75
      };

      const result = await updateProduct(updateInput, userId);

      expect(result.name).toBe('Test Product');  // unchanged
      expect(result.price).toBe(29.99);  // unchanged
      expect(result.stock_quantity).toBe(75);
    });

    it('should update multiple fields', async () => {
      const updateInput: UpdateProductInput = {
        id: productId,
        name: 'Completely Updated Product',
        price: 49.99,
        stock_quantity: 200
      };

      const result = await updateProduct(updateInput, userId);

      expect(result.name).toBe('Completely Updated Product');
      expect(result.price).toBe(49.99);
      expect(result.stock_quantity).toBe(200);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save updates to database', async () => {
      const updateInput: UpdateProductInput = {
        id: productId,
        name: 'Database Updated Product',
        price: 55.99
      };

      await updateProduct(updateInput, userId);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .execute();

      expect(products[0].name).toBe('Database Updated Product');
      expect(parseFloat(products[0].price)).toBe(55.99);
    });

    it('should throw error when product not found', async () => {
      const updateInput: UpdateProductInput = {
        id: 999,
        name: 'Non-existent Product'
      };

      await expect(updateProduct(updateInput, userId)).rejects.toThrow(/product not found/i);
    });

    it('should throw error when product belongs to different user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();
      const otherUserId = otherUserResult[0].id;

      const updateInput: UpdateProductInput = {
        id: productId,
        name: 'Unauthorized Update'
      };

      await expect(updateProduct(updateInput, otherUserId)).rejects.toThrow(/product not found/i);
    });
  });

  describe('deleteProduct', () => {
    let productId: number;

    beforeEach(async () => {
      const product = await createProduct(testProductInput, userId);
      productId = product.id;
    });

    it('should delete product successfully', async () => {
      const result = await deleteProduct(productId, userId);

      expect(result).toBe(true);

      // Verify product is deleted
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .execute();

      expect(products).toHaveLength(0);
    });

    it('should return false when product not found', async () => {
      const result = await deleteProduct(999, userId);
      expect(result).toBe(false);
    });

    it('should return false when product belongs to different user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();
      const otherUserId = otherUserResult[0].id;

      const result = await deleteProduct(productId, otherUserId);
      expect(result).toBe(false);

      // Verify product still exists
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .execute();

      expect(products).toHaveLength(1);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return empty array when no low stock products', async () => {
      await createProduct(testProductInput, userId);  // stock: 100

      const result = await getLowStockProducts(userId, 10);
      expect(result).toEqual([]);
    });

    it('should return products below default threshold (10)', async () => {
      await createProduct(testProductInput, userId);  // stock: 100
      await createProduct(lowStockProductInput, userId);  // stock: 5

      const result = await getLowStockProducts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Stock Product');
      expect(result[0].stock_quantity).toBe(5);
      expect(result[0].price).toBe(15.99);
      expect(typeof result[0].price).toBe('number');
    });

    it('should return products below custom threshold', async () => {
      await createProduct(testProductInput, userId);  // stock: 100
      await createProduct({
        name: 'Medium Stock Product',
        price: 25.99,
        stock_quantity: 15
      }, userId);
      await createProduct(lowStockProductInput, userId);  // stock: 5

      const result = await getLowStockProducts(userId, 20);

      expect(result).toHaveLength(2);
      expect(result.some(p => p.name === 'Medium Stock Product')).toBe(true);
      expect(result.some(p => p.name === 'Low Stock Product')).toBe(true);
    });

    it('should only return low stock products for specified user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();
      const otherUserId = otherUserResult[0].id;

      // Create low stock products for both users
      await createProduct(lowStockProductInput, userId);
      await createProduct({
        name: 'Other User Low Stock',
        price: 12.99,
        stock_quantity: 3
      }, otherUserId);

      const result = await getLowStockProducts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Stock Product');
      expect(result[0].user_id).toBe(userId);
    });

    it('should return products with exact threshold stock', async () => {
      await createProduct({
        name: 'Threshold Product',
        price: 20.99,
        stock_quantity: 10
      }, userId);

      // Product with stock = 10 should NOT be included when threshold = 10
      const result = await getLowStockProducts(userId, 10);
      expect(result).toHaveLength(0);

      // Product with stock = 10 should be included when threshold = 11
      const result2 = await getLowStockProducts(userId, 11);
      expect(result2).toHaveLength(1);
      expect(result2[0].stock_quantity).toBe(10);
    });
  });
});