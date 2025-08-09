import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trpc } from '@/utils/trpc';
import type { TransactionWithDetails, DailyRevenue } from '../../../server/src/schema';

interface SalesHistoryProps {
  userId: number;
}

export function SalesHistory({ userId }: SalesHistoryProps) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<number>(0);
  const [totalTransactionsToday, setTotalTransactionsToday] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const pageSize = 10;
  
  // Date filtering
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFilteringByDate, setIsFilteringByDate] = useState(false);

  const loadTransactions = useCallback(async (page: number = 0, resetData: boolean = false) => {
    if (resetData) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const offset = page * pageSize;
      const result = await trpc.transactions.getHistory.query({
        limit: pageSize,
        offset: offset
      });

      if (resetData) {
        setTransactions(result);
      } else {
        setTransactions((prev: TransactionWithDetails[]) => [...prev, ...result]);
      }
      
      setHasMoreData(result.length === pageSize);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const loadDailyStats = useCallback(async () => {
    try {
      // Load today's revenue
      const revenueResult = await trpc.transactions.getDailyRevenue.query({
        date: new Date()
      });
      setDailyRevenue(revenueResult);

      // Load today's transaction count
      const countResult = await trpc.transactions.getDailyCount.query({
        date: new Date()
      });
      setTotalTransactionsToday(countResult);

    } catch (err: any) {
      console.error('Failed to load daily stats:', err);
    }
  }, []);

  const filterTransactionsByDate = async () => {
    setIsFilteringByDate(true);
    setError(null);
    
    try {
      const startDate = new Date(filterDate + 'T00:00:00');
      const endDate = new Date(filterDate + 'T23:59:59');
      
      const result = await trpc.transactions.getByDateRange.query({
        startDate,
        endDate
      });
      
      setTransactions(result);
      setHasMoreData(false); // No pagination for filtered results
    } catch (err: any) {
      setError(err.message || 'Failed to filter transactions');
    } finally {
      setIsFilteringByDate(false);
    }
  };

  const clearDateFilter = () => {
    setCurrentPage(0);
    setHasMoreData(true);
    loadTransactions(0, true);
  };

  useEffect(() => {
    loadTransactions(0, true);
    loadDailyStats();
  }, [loadTransactions, loadDailyStats]);

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadTransactions(nextPage, false);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
            </CardContent>
          </Card>
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">📈 Sales History</h2>
        <p className="text-muted-foreground">View transaction history and daily revenue</p>
      </div>

      {/* Daily Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dailyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue from {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <span className="text-2xl">🛒</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransactionsToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales completed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="filter-date">Select Date</Label>
              <Input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                className="w-fit"
              />
            </div>
            <Button onClick={filterTransactionsByDate} disabled={isFilteringByDate}>
              {isFilteringByDate ? 'Filtering...' : 'Filter'}
            </Button>
            <Button variant="outline" onClick={clearDateFilter}>
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {filterDate !== new Date().toISOString().split('T')[0] 
                  ? 'No transactions found for the selected date'
                  : 'No sales have been processed yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile-friendly transaction cards for small screens */}
              <div className="md:hidden space-y-3">
                {transactions.map((transaction: TransactionWithDetails) => (
                  <Collapsible key={transaction.id}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">Transaction #{transaction.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.transaction_date.toLocaleDateString()}{' '}
                                {transaction.transaction_date.toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {formatCurrency(transaction.total_amount)}
                              </p>
                              <Badge variant="outline">
                                {transaction.items.length} items
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {transaction.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <div>
                                  <p className="font-medium">{item.product_name}</p>
                                  <p className="text-muted-foreground">
                                    {item.quantity} × {formatCurrency(item.unit_price)}
                                  </p>
                                </div>
                                <p className="font-medium">
                                  {formatCurrency(item.subtotal)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: TransactionWithDetails) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">#{transaction.id}</TableCell>
                        <TableCell>
                          <div>
                            <div>{transaction.transaction_date.toLocaleDateString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.transaction_date.toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.items.length} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(transaction.total_amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Items
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                {transaction.items.map((item) => (
                                  <div key={item.id} className="flex justify-between">
                                    <span>
                                      {item.product_name} × {item.quantity}
                                    </span>
                                    <span>{formatCurrency(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Load More Button */}
              {hasMoreData && filterDate === new Date().toISOString().split('T')[0] && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={loadMore}>
                    Load More Transactions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}