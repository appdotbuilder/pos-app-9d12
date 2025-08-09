import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  registerInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createSaleInputSchema
} from './schema';

// Import handlers
import { login, register, verifyToken } from './handlers/auth';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from './handlers/products';
import {
  createSale,
  getTransactionHistory,
  getDailyRevenue,
  getTransactionsByDateRange,
  getDailyTransactionCount
} from './handlers/transactions';
import {
  getDashboardStats,
  getRecentTransactions,
  getTopSellingProducts
} from './handlers/dashboard';

// Create TRPC context with user authentication
const createContext = async ({ req }: { req: any }) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { user: null };
  }

  try {
    const user = await verifyToken(token);
    return { user };
  } catch (error) {
    return { user: null };
  }
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    
    register: publicProcedure
      .input(registerInputSchema)
      .mutation(({ input }) => register(input)),
  }),

  // Product management routes
  products: router({
    getAll: protectedProcedure
      .query(({ ctx }) => getProducts(ctx.user.id)),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input, ctx }) => getProduct(input.id, ctx.user.id)),
    
    create: protectedProcedure
      .input(createProductInputSchema)
      .mutation(({ input, ctx }) => createProduct(input, ctx.user.id)),
    
    update: protectedProcedure
      .input(updateProductInputSchema)
      .mutation(({ input, ctx }) => updateProduct(input, ctx.user.id)),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => deleteProduct(input.id, ctx.user.id)),
    
    getLowStock: protectedProcedure
      .input(z.object({ threshold: z.number().optional() }))
      .query(({ input, ctx }) => getLowStockProducts(ctx.user.id, input.threshold)),
  }),

  // Transaction/Sales routes
  transactions: router({
    createSale: protectedProcedure
      .input(createSaleInputSchema)
      .mutation(({ input, ctx }) => createSale(input, ctx.user.id)),
    
    getHistory: protectedProcedure
      .input(z.object({ 
        limit: z.number().optional(), 
        offset: z.number().optional() 
      }))
      .query(({ input, ctx }) => getTransactionHistory(ctx.user.id, input.limit, input.offset)),
    
    getDailyRevenue: protectedProcedure
      .input(z.object({ date: z.date().optional() }))
      .query(({ input, ctx }) => getDailyRevenue(ctx.user.id, input.date)),
    
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date()
      }))
      .query(({ input, ctx }) => getTransactionsByDateRange(ctx.user.id, input.startDate, input.endDate)),
    
    getDailyCount: protectedProcedure
      .input(z.object({ date: z.date().optional() }))
      .query(({ input, ctx }) => getDailyTransactionCount(ctx.user.id, input.date)),
  }),

  // Dashboard routes
  dashboard: router({
    getStats: protectedProcedure
      .query(({ ctx }) => getDashboardStats(ctx.user.id)),
    
    getRecentTransactions: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input, ctx }) => getRecentTransactions(ctx.user.id, input.limit)),
    
    getTopProducts: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input, ctx }) => getTopSellingProducts(ctx.user.id, input.limit)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true,
      })(req, res, next);
    },
    router: appRouter,
    createContext,
  });
  
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- POST /auth.login');
  console.log('- POST /auth.register');
  console.log('- GET /products.getAll');
  console.log('- POST /products.create');
  console.log('- POST /products.update');
  console.log('- POST /products.delete');
  console.log('- POST /transactions.createSale');
  console.log('- GET /transactions.getHistory');
  console.log('- GET /dashboard.getStats');
}

start().catch(console.error);