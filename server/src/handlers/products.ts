import { db } from '../db';
import { productsTable, usersTable } from '../db/schema';
import { type Product, type CreateProductInput, type UpdateProductInput } from '../schema';
import { eq, and, lt } from 'drizzle-orm';

export async function getProducts(userId: number): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.user_id, userId))
      .execute();

    return results.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}

export async function getProduct(productId: number, userId: number): Promise<Product | null> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(and(
        eq(productsTable.id, productId),
        eq(productsTable.user_id, userId)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const product = results[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  }
}

export async function createProduct(input: CreateProductInput, userId: number): Promise<Product> {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    const results = await db.insert(productsTable)
      .values({
        name: input.name,
        price: input.price.toString(),
        stock_quantity: input.stock_quantity,
        user_id: userId
      })
      .returning()
      .execute();

    const product = results[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Failed to create product:', error);
    throw error;
  }
}

export async function updateProduct(input: UpdateProductInput, userId: number): Promise<Product> {
  try {
    // Check if product exists and belongs to user
    const existingProduct = await getProduct(input.id, userId);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = input.price.toString();
    if (input.stock_quantity !== undefined) updateData.stock_quantity = input.stock_quantity;

    const results = await db.update(productsTable)
      .set(updateData)
      .where(and(
        eq(productsTable.id, input.id),
        eq(productsTable.user_id, userId)
      ))
      .returning()
      .execute();

    const product = results[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
}

export async function deleteProduct(productId: number, userId: number): Promise<boolean> {
  try {
    // Check if product exists and belongs to user
    const existingProduct = await getProduct(productId, userId);
    if (!existingProduct) {
      return false;
    }

    await db.delete(productsTable)
      .where(and(
        eq(productsTable.id, productId),
        eq(productsTable.user_id, userId)
      ))
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw error;
  }
}

export async function getLowStockProducts(userId: number, threshold: number = 10): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(and(
        eq(productsTable.user_id, userId),
        lt(productsTable.stock_quantity, threshold)
      ))
      .execute();

    return results.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}