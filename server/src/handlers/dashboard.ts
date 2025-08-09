import { db } from '../db';
import { productsTable, transactionsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, sum, gte, lte, and, SQL } from 'drizzle-orm';

const LOW_STOCK_THRESHOLD = 10; // Products with stock <= 10 are considered low stock

export const getDashboardStats = async (userId: number): Promise<DashboardStats> => {
  try {
    // Get today's date range (start and end of today in local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Get total number of products for the user
    const totalProductsResult = await db.select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.user_id, userId))
      .execute();

    const total_products = totalProductsResult[0]?.count || 0;

    // 2. Get number of products with low stock (stock_quantity <= threshold)
    const lowStockResult = await db.select({ count: count() })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.user_id, userId),
          lte(productsTable.stock_quantity, LOW_STOCK_THRESHOLD)
        )
      )
      .execute();

    const low_stock_products = lowStockResult[0]?.count || 0;

    // 3. Get today's revenue (sum of all transactions for today)
    const dailyRevenueResult = await db.select({ 
      revenue: sum(transactionsTable.total_amount)
    })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, userId),
          gte(transactionsTable.transaction_date, today),
          lte(transactionsTable.transaction_date, tomorrow)
        )
      )
      .execute();

    // Convert numeric string to number, default to 0 if null
    const daily_revenue = dailyRevenueResult[0]?.revenue 
      ? parseFloat(dailyRevenueResult[0].revenue) 
      : 0;

    // 4. Get total number of transactions today
    const totalTransactionsResult = await db.select({ count: count() })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, userId),
          gte(transactionsTable.transaction_date, today),
          lte(transactionsTable.transaction_date, tomorrow)
        )
      )
      .execute();

    const total_transactions_today = totalTransactionsResult[0]?.count || 0;

    return {
      total_products,
      low_stock_products,
      daily_revenue,
      total_transactions_today
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
};

export async function getRecentTransactions(userId: number, limit: number = 5): Promise<any[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch the most recent transactions
    // for display on the dashboard for quick overview.
    return Promise.resolve([
        {
            id: 1,
            total_amount: 25.98,
            transaction_date: new Date(),
            item_count: 2
        },
        {
            id: 2,
            total_amount: 15.50,
            transaction_date: new Date(),
            item_count: 1
        }
    ]);
}

export async function getTopSellingProducts(userId: number, limit: number = 5): Promise<any[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch products with highest sales volume
    // for business insights and inventory planning.
    return Promise.resolve([
        {
            product_id: 1,
            product_name: 'Popular Product',
            total_quantity_sold: 50,
            total_revenue: 549.50
        },
        {
            product_id: 2,
            product_name: 'Another Popular Item',
            total_quantity_sold: 35,
            total_revenue: 420.00
        }
    ]);
}