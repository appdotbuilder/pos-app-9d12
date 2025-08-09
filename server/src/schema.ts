import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  user_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Transaction schemas
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  total_amount: z.number().positive(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  subtotal: z.number().positive(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Sale input schemas
export const saleItemInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive()
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const createSaleInputSchema = z.object({
  items: z.array(saleItemInputSchema).min(1)
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Dashboard and analytics schemas
export const dailyRevenueSchema = z.object({
  date: z.string(),
  total_revenue: z.number().nonnegative()
});

export type DailyRevenue = z.infer<typeof dailyRevenueSchema>;

export const dashboardStatsSchema = z.object({
  total_products: z.number().int().nonnegative(),
  low_stock_products: z.number().int().nonnegative(),
  daily_revenue: z.number().nonnegative(),
  total_transactions_today: z.number().int().nonnegative()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Transaction with details for sales history
export const transactionWithDetailsSchema = z.object({
  id: z.number(),
  total_amount: z.number().positive(),
  transaction_date: z.coerce.date(),
  items: z.array(z.object({
    id: z.number(),
    product_name: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    subtotal: z.number().positive()
  }))
});

export type TransactionWithDetails = z.infer<typeof transactionWithDetailsSchema>;

// Auth response schemas
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Generic response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;