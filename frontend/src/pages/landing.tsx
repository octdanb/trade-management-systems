import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Car,
  Check,
  CircleDollarSign,
  MapPin,
  Route,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Users,
    title: 'Clients in one place',
    text: 'Names, phones, addresses, gate codes and lawn quirks — plus a rate and cost per visit so every job is priced before you arrive.',
  },
  {
    icon: CalendarDays,
    title: 'Set-and-forget scheduling',
    text: 'Weekly, fortnightly or monthly-ish rounds that fill the calendar themselves. Drag a visit to reschedule; the series stays intact.',
  },
  {
    icon: Route,
    title: 'Smartest order to drive',
    text: 'One tap plans the day’s route in the best driving order from your place, with leg times — then opens straight in Google Maps.',
  },
  {
    icon: CircleDollarSign,
    title: 'Done and paid, tracked',
    text: 'Tick jobs off as you mow, flag them paid or owing, and see the day’s earnings add up at the top of the run sheet.',
  },
  {
    icon: Wrench,
    title: 'Gear that stays sharp',
    text: 'Every mower and trimmer with photos, serial numbers, service history and who to call — reminded before it’s overdue.',
  },
  {
    icon: Smartphone,
    title: 'Built for the truck',
    text: 'Fast and phone-friendly today, with a native app on the roadmap — reminders arrive as push notifications when it lands.',
  },
]

const STEPS = [
  {
    title: 'Add your clients',
    text: 'Contact details, address and your price per visit. Addresses are located automatically for routing.',
  },
  {
    title: 'Set the round',
    text: 'One-off or repeating visits — the schedule fills itself months ahead and handles skips and reschedules.',
  },
  {
    title: 'Drive the day',
    text: 'Optimize the route each morning, tick off jobs, and watch the takings tally as you go.',
  },
]

function RouteMock() {
  const stops = [
    { n: 1, name: 'Alice — 1 Willis St', price: '$55', leg: '4 min', done: true },
    { n: 2, name: 'Bob — 100 Lambton Quay', price: '$40', leg: '6 min', done: true },
    { n: 3, name: 'Carol — Island Bay', price: '$60', leg: '11 min', done: false },
    { n: 4, name: 'Dave — Khandallah', price: '$50', leg: '14 min', done: false },
  ]
  return (
    <div className="relative mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-sm font-semibold">Today’s route</p>
          <p className="text-xs text-muted-foreground">4 stops · 35 min driving</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Car className="size-3.5" /> Optimized
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {stops.map((stop) => (
          <div
            key={stop.n}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3',
              stop.done && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                stop.done ? 'bg-emerald-500 text-white' : 'bg-secondary',
              )}
            >
              {stop.done ? <Check className="size-4" /> : stop.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-medium', stop.done && 'line-through')}>
                {stop.name}
              </p>
              <p className="text-xs text-muted-foreground">{stop.leg} drive</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{stop.price}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Earned today</span>
        <span className="font-semibold tabular-nums">$95.00</span>
      </div>
    </div>
  )
}

export function LandingPage() {
  const session = useSession()
  const authed = !!session.data

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-lg">
              🌱
            </span>
            Mow
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {authed ? (
              <Button asChild>
                <Link to="/today">
                  Open app <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-emerald-500" />
                Built for solo lawn & garden rounds
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Your whole mowing round,{' '}
                <span className="text-emerald-600 dark:text-emerald-400">sorted by smoko</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground text-pretty">
                Clients, repeat visits, the best driving order, who’s paid and when the mower needs
                a service — one simple app instead of a notebook on the dash.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to={authed ? '/today' : '/signup'}>
                    {authed ? 'Open the app' : 'Start free'} <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">See what it does</a>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {['No setup fees', 'Works on your phone', 'Sign in with Google'].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <RouteMock />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-secondary/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything the round needs, nothing it doesn’t
              </h2>
              <p className="mt-3 text-muted-foreground">
                Made for one person, a ute and a trailer full of gear.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Up and running today
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three steps between you and a tidier week.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative flex flex-col items-center text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-secondary/30">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:py-20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <MapPin className="size-5" />
              <BellRing className="size-5" />
              <Wrench className="size-5" />
            </div>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Spend the day mowing, not working out where to go next
            </h2>
            <Button size="lg" asChild>
              <Link to={authed ? '/today' : '/signup'}>
                {authed ? 'Open the app' : 'Create your free account'} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <span>🌱</span> Mow — trade management for solo operators
          </span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link to="/signup" className="transition-colors hover:text-foreground">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
