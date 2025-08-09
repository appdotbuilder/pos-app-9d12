import { db } from '../db';
import { 
  transactionsTable, 
  transactionItemsTable, 
  productsTable,
  usersTable 
} from '../db/schema';
import { type CreateSaleInput, type Transaction, type TransactionWithDetails } from '../schema';
import { eq, and, gte, lte, sum, count } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function createSale(input: CreateSaleInput, userId: number): Promise<Transaction> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Validate products and calculate total
    let totalAmount = 0;
    const productDetails: Array<{
      id: number;
      name: string;
      price: number;
      stock_quantity: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of input.items) {
      const product = await db.select()
        .from(productsTable)
        .where(and(
          eq(productsTable.id, item.product_id),
          eq(productsTable.user_id, userId)
        ))
        .limit(1)
        .execute();

      if (product.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found or not owned by user`);
      }

      const productData = product[0];
      const currentStock = productData.stock_quantity;
      const price = parseFloat(productData.price);

      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${productData.name}. Available: ${currentStock}, Requested: ${item.quantity}`);
      }

      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      productDetails.push({
        id: productData.id,
        name: productData.name,
        price: price,
        stock_quantity: currentStock,
        quantity: item.quantity,
        subtotal: subtotal
      });
    }

    // Create transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        total_amount: totalAmount.toString()
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items and update stock
    for (const detail of productDetails) {
      // Insert transaction item
      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          product_id: detail.id,
          quantity: detail.quantity,
          unit_price: detail.price.toString(),
          subtotal: detail.subtotal.toString()
        })
        .execute();

      // Update product stock
      await db.update(productsTable)
        .set({
          stock_quantity: detail.stock_quantity - detail.quantity,
          updated_at: new Date()
        })
        .where(eq(productsTable.id, detail.id))
        .execute();
    }

    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
}

export async function getTransactionHistory(userId: number, limit: number = 50, offset: number = 0): Promise<TransactionWithDetails[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Get transactions for the user
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .orderBy(transactionsTable.transaction_date)
      .limit(limit)
      .offset(offset)
      .execute();

    // Get transaction items with product details for each transaction
    const transactionDetails: TransactionWithDetails[] = [];

    for (const transaction of transactions) {
      const items = await db.select({
        id: transactionItemsTable.id,
        product_name: productsTable.name,
        quantity: transactionItemsTable.quantity,
        unit_price: transactionItemsTable.unit_price,
        subtotal: transactionItemsTable.subtotal
      })
        .from(transactionItemsTable)
        .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
        .where(eq(transactionItemsTable.transaction_id, transaction.id))
        .execute();

      transactionDetails.push({
        id: transaction.id,
        total_amount: parseFloat(transaction.total_amount),
        transaction_date: transaction.transaction_date,
        items: items.map(item => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      });
    }

    return transactionDetails;
  } catch (error) {
    console.error('Transaction history retrieval failed:', error);
    throw error;
  }
}

export async function getDailyRevenue(userId: number, date?: Date): Promise<number> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db.select({
      total: sum(transactionsTable.total_amount)
    })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        gte(transactionsTable.transaction_date, startOfDay),
        lte(transactionsTable.transaction_date, endOfDay)
      ))
      .execute();

    const total = result[0]?.total;
    return total ? parseFloat(total) : 0;
  } catch (error) {
    console.error('Daily revenue calculation failed:', error);
    throw error;
  }
}

export async function getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TransactionWithDetails[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Get transactions within date range
    const transactions = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        gte(transactionsTable.transaction_date, startDate),
        lte(transactionsTable.transaction_date, endDate)
      ))
      .orderBy(transactionsTable.transaction_date)
      .execute();

    // Get transaction items with product details for each transaction
    const transactionDetails: TransactionWithDetails[] = [];

    for (const transaction of transactions) {
      const items = await db.select({
        id: transactionItemsTable.id,
        product_name: productsTable.name,
        quantity: transactionItemsTable.quantity,
        unit_price: transactionItemsTable.unit_price,
        subtotal: transactionItemsTable.subtotal
      })
        .from(transactionItemsTable)
        .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
        .where(eq(transactionItemsTable.transaction_id, transaction.id))
        .execute();

      transactionDetails.push({
        id: transaction.id,
        total_amount: parseFloat(transaction.total_amount),
        transaction_date: transaction.transaction_date,
        items: items.map(item => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        }))
      });
    }

    return transactionDetails;
  } catch (error) {
    console.error('Date range transaction retrieval failed:', error);
    throw error;
  }
}

export async function getDailyTransactionCount(userId: number, date?: Date): Promise<number> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db.select({
      count: count()
    })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        gte(transactionsTable.transaction_date, startOfDay),
        lte(transactionsTable.transaction_date, endOfDay)
      ))
      .execute();

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Daily transaction count failed:', error);
    throw error;
  }
}