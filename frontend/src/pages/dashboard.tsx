import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  listTradesQueryKey,
  useCreateTrade,
  useDeleteTrade,
  useListTrades,
} from '@/gen'
import { sideEnum, type Side } from '@/gen'
import { useLogout, useSession } from '@/hooks/use-auth'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const session = useSession()
  const logoutMutation = useLogout()

  const trades = useListTrades()
  const createTrade = useCreateTrade({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listTradesQueryKey() }),
    },
  })
  const deleteTrade = useDeleteTrade({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listTradesQueryKey() }),
    },
  })

  const [symbol, setSymbol] = useState('')
  const [side, setSide] = useState<Side>(sideEnum.buy)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    createTrade.mutate(
      { data: { symbol: symbol.toUpperCase(), side, quantity, price } },
      {
        onSuccess: () => {
          setSymbol('')
          setQuantity('')
          setPrice('')
        },
      },
    )
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trade Management</h1>
          <p className="text-sm text-muted-foreground">{session.data?.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          Sign out
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New trade</CardTitle>
          <CardDescription>Record a buy or sell</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Side</Label>
              <div className="flex gap-1">
                {(Object.values(sideEnum) as Side[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={side === value ? 'default' : 'outline'}
                    onClick={() => setSide(value)}
                    className="capitalize"
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="any"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createTrade.isPending}>
              {createTrade.isPending ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
          <CardDescription>
            {trades.data?.length ?? 0} trade{(trades.data?.length ?? 0) === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : trades.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.data.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell className="capitalize">{trade.side}</TableCell>
                    <TableCell className="text-right tabular-nums">{trade.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{trade.price}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(trade.executed_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete trade ${trade.id}`}
                        onClick={() => deleteTrade.mutate({ trade_id: trade.id })}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No trades yet. Add your first one above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
