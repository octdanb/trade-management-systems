/**
 * Mock mode: a fully offline, in-memory backend for demo/test builds.
 *
 * Enabled when the app is built with EXPO_PUBLIC_MOCK=true (see the
 * mobile-mock-build workflow). An axios adapter intercepts every request the
 * app makes — auth, jobs, route optimization, clients, equipment, photos,
 * notifications — and serves it from a seeded in-memory store, so the app is
 * fully interactive with no backend. State lives for the app session.
 */
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import type {
  ClientIn,
  ClientOut,
  EquipmentIn,
  EquipmentOut,
  JobOut,
  NotificationOut,
  ProfileOut,
  ReminderOut,
  RoutePlanOut,
  RouteStopOut,
  SeriesOut,
} from '../gen'

export const MOCK_ENABLED =
  process.env.EXPO_PUBLIC_MOCK === 'true' || process.env.EXPO_PUBLIC_MOCK === '1'

// --- tiny date helpers (duplicated to keep this file dependency-free) -------

function toDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}
const today = () => toDate(new Date())
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDate(d)
}
const nowIso = () => new Date().toISOString()

// --- seed data ---------------------------------------------------------------

const HOME = { lat: -41.311, lng: 174.779 } // Newtown, Wellington

type MockClient = ClientOut
type MockJob = JobOut & { client_lat: number | null; client_lng: number | null; address: string }

let nextId = 1000
const id = () => nextId++

const clients: MockClient[] = [
  {
    id: 1,
    name: 'Alice Harper',
    phone: '021 111 1111',
    email: 'alice@example.com',
    address: '1 Willis Street, Wellington',
    notes: 'Gate code 4321. Friendly labrador.',
    rate: '55.00',
    cost: '12.00',
    is_active: true,
    lat: -41.2865,
    lng: 174.7762,
    geocode_status: 'ok',
    created_at: nowIso(),
    updated_at: nowIso(),
    note_entries: [
      {
        id: 900,
        body: 'Quoted $70 for the hedge — she will think about it.',
        created_at: nowIso(),
      },
    ],
    photos: [],
  },
  {
    id: 2,
    name: 'Bob Ngata',
    phone: '021 222 2222',
    email: 'bob@example.com',
    address: '100 Lambton Quay, Wellington',
    notes: '',
    rate: '40.00',
    cost: '8.00',
    is_active: true,
    lat: -41.2784,
    lng: 174.7767,
    geocode_status: 'ok',
    created_at: nowIso(),
    updated_at: nowIso(),
    note_entries: [],
    photos: [],
  },
  {
    id: 3,
    name: 'Carol Devi',
    phone: '021 333 3333',
    email: '',
    address: 'Island Bay, Wellington',
    notes: 'Steep back section — take the light mower.',
    rate: '60.00',
    cost: '15.00',
    is_active: true,
    lat: -41.335,
    lng: 174.773,
    geocode_status: 'ok',
    created_at: nowIso(),
    updated_at: nowIso(),
    note_entries: [],
    photos: [],
  },
  {
    id: 4,
    name: 'Dave Kowalski',
    phone: '021 444 4444',
    email: 'dave@example.com',
    address: 'Khandallah, Wellington',
    notes: '',
    rate: '50.00',
    cost: '10.00',
    is_active: true,
    lat: -41.245,
    lng: 174.792,
    geocode_status: 'ok',
    created_at: nowIso(),
    updated_at: nowIso(),
    note_entries: [],
    photos: [],
  },
]

const series: SeriesOut[] = clients.map((c, i) => ({
  id: 100 + c.id,
  client_id: c.id,
  client_name: c.name,
  frequency: i % 2 === 0 ? 'fortnightly' : 'weekly',
  start_date: addDays(today(), -14),
  default_time: i === 0 ? '09:00:00' : null,
  duration_minutes: 60,
  end_date: null,
}))

const jobs: MockJob[] = []
function seedJobs() {
  for (const s of series) {
    const client = clients.find((c) => c.id === s.client_id)
    if (!client) continue
    const interval = s.frequency === 'weekly' ? 7 : 14
    for (let d = s.start_date; d <= addDays(today(), 42); d = addDays(d, interval)) {
      const past = d < today()
      jobs.push({
        id: id(),
        client_id: client.id,
        client_name: client.name,
        series_id: s.id,
        scheduled_date: d,
        scheduled_time: s.default_time,
        duration_minutes: 60,
        kind: 'job',
        status: past ? 'completed' : 'scheduled',
        price: client.rate,
        paid: past,
        notes: '',
        route_order: null,
        photos: [],
        client_lat: client.lat,
        client_lng: client.lng,
        address: client.address,
      })
    }
  }
}
seedJobs()
// A pending quote appointment for tomorrow, so the demo shows the flow.
jobs.push({
  id: id(),
  client_id: 3,
  client_name: 'Carol Devi',
  series_id: null,
  scheduled_date: addDays(today(), 1),
  scheduled_time: '15:30:00',
  duration_minutes: 30,
  kind: 'quote',
  status: 'scheduled',
  price: '0',
  paid: false,
  notes: 'Wants the back hedge trimmed and green waste removed.',
  route_order: null,
  photos: [],
  client_lat: -41.335,
  client_lng: 174.773,
  address: 'Island Bay, Wellington',
})

const equipment: EquipmentOut[] = [
  {
    id: 1,
    name: 'Honda ride-on mower',
    make_model: 'HRU19',
    serial_number: 'HR-2211-88',
    purchase_date: '2024-11-01',
    notes: '',
    status: 'active',
    service_interval_days: 90,
    last_serviced_on: addDays(today(), -95),
    next_service_due: addDays(today(), -5),
    service_contact_name: 'Small Engines Ltd',
    service_contact_phone: '04 555 0199',
    service_contact_email: 'workshop@smallengines.example',
    service_contact_notes: 'Ask for Steve.',
    photos: [],
    service_records: [
      {
        id: 1,
        serviced_on: addDays(today(), -95),
        notes: 'Full service, new blades',
        cost: '180.00',
      },
    ],
  },
  {
    id: 2,
    name: 'Stihl line trimmer',
    make_model: 'FS 91',
    serial_number: '',
    purchase_date: '2025-03-15',
    notes: '',
    status: 'active',
    service_interval_days: 180,
    last_serviced_on: addDays(today(), -40),
    next_service_due: addDays(today(), 140),
    service_contact_name: '',
    service_contact_phone: '',
    service_contact_email: '',
    service_contact_notes: '',
    photos: [],
    service_records: [],
  },
]

const notifications: NotificationOut[] = [
  {
    id: 1,
    title: 'Honda ride-on mower service overdue',
    body: `Service was due 5 days ago (${addDays(today(), -5)}). Contact: Small Engines Ltd 04 555 0199.`,
    data: { type: 'equipment_service', equipment_id: 1 },
    created_at: nowIso(),
    read_at: null,
  },
]

const profile: ProfileOut = {
  business_name: 'Mow Demo Lawns',
  home_address: 'Newtown, Wellington',
  home_lat: HOME.lat,
  home_lng: HOME.lng,
  geocode_status: 'ok',
}

const user = {
  id: 1,
  display: 'demo',
  email: 'demo@mow.test',
  username: 'demo',
  has_usable_password: true,
}

// --- helpers -----------------------------------------------------------------

function haversineS(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const h =
    Math.sin(toRad(bLat - aLat) / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLng - aLng) / 2) ** 2
  const km = 2 * r * Math.asin(Math.sqrt(h))
  return (km / 40) * 3600 // seconds at 40 km/h
}

function recomputeNextDue(item: EquipmentOut) {
  const anchor = item.last_serviced_on ?? item.purchase_date
  item.next_service_due =
    item.service_interval_days && anchor ? addDays(anchor, item.service_interval_days) : null
}

function toStop(job: MockJob, leg: number | null): RouteStopOut {
  return { ...job, lat: job.client_lat, lng: job.client_lng, leg_duration_s: leg }
}

function routePlan(date: string): RoutePlanOut {
  const dayJobs = jobs.filter((j) => j.scheduled_date === date && j.status !== 'cancelled')
  const routed = dayJobs
    .filter((j) => j.client_lat != null)
    .sort((a, b) => (a.route_order ?? 999) - (b.route_order ?? 999))
  const unrouted = dayJobs.filter((j) => j.client_lat == null)
  let total = 0
  const stops: RouteStopOut[] = []
  let prev = HOME
  for (const job of routed) {
    const leg = haversineS(prev.lat, prev.lng, job.client_lat as number, job.client_lng as number)
    total += leg
    stops.push(toStop(job, leg))
    prev = { lat: job.client_lat as number, lng: job.client_lng as number }
  }
  return {
    date,
    home: HOME,
    stops,
    unrouted: unrouted.map((j) => toStop(j, null)),
    total_duration_s: stops.length ? total : null,
    used_fallback_matrix: false,
  }
}

function optimize(date: string) {
  const dayJobs = jobs.filter(
    (j) => j.scheduled_date === date && j.status !== 'cancelled' && j.client_lat != null,
  )
  const remaining = [...dayJobs]
  let prev = HOME
  let order = 0
  while (remaining.length) {
    remaining.sort(
      (a, b) =>
        haversineS(prev.lat, prev.lng, a.client_lat as number, a.client_lng as number) -
        haversineS(prev.lat, prev.lng, b.client_lat as number, b.client_lng as number),
    )
    const next = remaining.shift() as MockJob
    next.route_order = order++
    prev = { lat: next.client_lat as number, lng: next.client_lng as number }
  }
}

function materializeSeries(s: SeriesOut, client: MockClient) {
  const interval =
    s.frequency === 'weekly'
      ? 7
      : s.frequency === 'fortnightly'
        ? 14
        : s.frequency === 'every_3_weeks'
          ? 21
          : 28
  for (let d = s.start_date; d <= addDays(today(), 42); d = addDays(d, interval)) {
    jobs.push({
      id: id(),
      client_id: client.id,
      client_name: client.name,
      series_id: s.id,
      scheduled_date: d,
      scheduled_time: s.default_time,
      duration_minutes: s.duration_minutes,
      kind: 'job',
      status: 'scheduled',
      price: client.rate,
      paid: false,
      notes: '',
      route_order: null,
      photos: [],
      client_lat: client.lat,
      client_lng: client.lng,
      address: client.address,
    })
  }
}

function reminders(): ReminderOut[] {
  const t = today()
  return equipment
    .filter(
      (e) =>
        e.status === 'active' && e.next_service_due != null && addDays(e.next_service_due, -7) <= t,
    )
    .map((e) => ({
      equipment_id: e.id,
      equipment_name: e.name,
      due_on: e.next_service_due as string,
      days_until: Math.round(
        (new Date(`${e.next_service_due}T00:00:00`).getTime() -
          new Date(`${t}T00:00:00`).getTime()) /
          86_400_000,
      ),
      overdue: (e.next_service_due as string) < t,
      service_contact_name: e.service_contact_name,
      service_contact_phone: e.service_contact_phone,
    }))
}

// --- request handling ---------------------------------------------------------

type Body = unknown
type Result = [number, Body]

function jsonBody(config: AxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data)
    } catch {
      return {}
    }
  }
  return (config.data as Record<string, unknown>) ?? {}
}

type FormPart = { fieldName?: string; uri?: string; string?: string }

function formParts(config: AxiosRequestConfig): FormPart[] {
  const data = config.data as { getParts?: () => FormPart[] } | undefined
  return data?.getParts?.() ?? []
}

const authPayload = {
  status: 200,
  data: { user, methods: [] },
  meta: { is_authenticated: true, session_token: 'mock-session', access_token: 'mock-access' },
}

function handleAllauth(method: string, url: string): Result | null {
  if (url.endsWith('/auth/session') && method === 'get') return [200, authPayload]
  if (url.endsWith('/auth/session') && method === 'delete') return [401, { status: 401 }]
  if (url.endsWith('/auth/login') || url.endsWith('/auth/signup')) return [200, authPayload]
  if (url.endsWith('/auth/password/request')) return [200, { status: 200 }]
  if (url.endsWith('/account/password/change')) return [200, { status: 200 }]
  return [404, { status: 404 }]
}

// biome-ignore-start lint/style/noNonNullAssertion: handlers guard existence via find()
function handleApi(method: string, url: string, config: AxiosRequestConfig): Result | null {
  const params = (config.params ?? {}) as Record<string, string | number | boolean>
  const q = (k: string) => (params[k] != null ? String(params[k]) : undefined)

  // -- app distribution: pretend we're up to date (hides the update banner)
  if (url === '/api/app/latest') return [404, { detail: 'No build available yet.' }]

  if (url === '/api/health') return [200, { status: 'ok' }]
  if (url === '/api/me') return [200, { ...user, first_name: '', last_name: '' }]

  // -- profile
  if (url === '/api/profile' && method === 'get') return [200, profile]
  if (url === '/api/profile' && method === 'put') {
    const body = jsonBody(config)
    profile.business_name = String(body.business_name ?? '')
    profile.home_address = String(body.home_address ?? '')
    profile.geocode_status = profile.home_address ? 'ok' : 'pending'
    return [200, profile]
  }

  // -- clients
  if (url === '/api/clients' && method === 'get') {
    let list = [...clients]
    const search = q('search')?.toLowerCase()
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search))
    if (q('active') === 'true') list = list.filter((c) => c.is_active)
    return [200, list]
  }
  if (url === '/api/clients' && method === 'post') {
    const body = jsonBody(config) as unknown as ClientIn
    const client: MockClient = {
      id: id(),
      name: body.name,
      phone: body.phone ?? '',
      email: body.email ?? '',
      address: body.address ?? '',
      notes: body.notes ?? '',
      rate: String(body.rate),
      cost: String(body.cost ?? '0'),
      is_active: body.is_active ?? true,
      lat: body.address ? HOME.lat + (Math.random() - 0.5) / 10 : null,
      lng: body.address ? HOME.lng + (Math.random() - 0.5) / 10 : null,
      geocode_status: body.address ? 'ok' : 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
      note_entries: [],
      photos: [],
    }
    clients.push(client)
    return [201, client]
  }
  let m = url.match(/^\/api\/clients\/(\d+)$/)
  if (m) {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    if (method === 'get') return [200, client]
    if (method === 'put') {
      Object.assign(client, jsonBody(config), { updated_at: nowIso() })
      client.rate = String(client.rate)
      client.cost = String(client.cost)
      return [200, client]
    }
    if (method === 'delete') {
      clients.splice(clients.indexOf(client), 1)
      for (let i = jobs.length - 1; i >= 0; i--)
        if (jobs[i].client_id === client.id) jobs.splice(i, 1)
      return [204, null]
    }
  }
  m = url.match(/^\/api\/clients\/(\d+)\/geocode$/)
  if (m) {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    client.geocode_status = 'ok'
    client.lat = HOME.lat + (Math.random() - 0.5) / 10
    client.lng = HOME.lng + (Math.random() - 0.5) / 10
    return [200, client]
  }

  m = url.match(/^\/api\/clients\/(\d+)\/notes$/)
  if (m && method === 'post') {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    const note = { id: id(), body: String(jsonBody(config).body ?? ''), created_at: nowIso() }
    client.note_entries.unshift(note)
    return [201, note]
  }
  m = url.match(/^\/api\/clients\/(\d+)\/notes\/(\d+)$/)
  if (m && method === 'delete') {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    client.note_entries = client.note_entries.filter((n) => n.id !== Number(m![2]))
    return [204, null]
  }
  m = url.match(/^\/api\/clients\/(\d+)\/photos$/)
  if (m && method === 'post') {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    const filePart = formParts(config).find((p) => p.fieldName === 'file')
    const photo = {
      id: id(),
      url: filePart?.uri ?? 'https://placehold.co/300x300',
      caption: '',
      uploaded_at: nowIso(),
    }
    client.photos.unshift(photo)
    return [201, photo]
  }
  m = url.match(/^\/api\/clients\/(\d+)\/photos\/(\d+)$/)
  if (m && method === 'delete') {
    const client = clients.find((c) => c.id === Number(m![1]))
    if (!client) return [404, {}]
    client.photos = client.photos.filter((p) => p.id !== Number(m![2]))
    return [204, null]
  }

  // -- series
  if (url === '/api/series' && method === 'get') {
    const cid = q('client_id')
    return [200, cid ? series.filter((s) => s.client_id === Number(cid)) : series]
  }
  if (url === '/api/series' && method === 'post') {
    const body = jsonBody(config)
    const client = clients.find((c) => c.id === Number(body.client_id))
    if (!client) return [404, {}]
    const s: SeriesOut = {
      id: id(),
      client_id: client.id,
      client_name: client.name,
      frequency: body.frequency as SeriesOut['frequency'],
      start_date: String(body.start_date),
      default_time: (body.default_time as string | null) ?? null,
      duration_minutes: Number(body.duration_minutes ?? 60),
      end_date: null,
    }
    series.push(s)
    materializeSeries(s, client)
    return [201, s]
  }
  m = url.match(/^\/api\/series\/(\d+)\/end$/)
  if (m) {
    const s = series.find((x) => x.id === Number(m![1]))
    if (!s) return [404, {}]
    s.end_date = String(jsonBody(config).end_date)
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i]
      if (j.series_id === s.id && j.status === 'scheduled' && j.scheduled_date > s.end_date) {
        jobs.splice(i, 1)
      }
    }
    return [200, s]
  }

  // -- jobs
  if (url === '/api/jobs' && method === 'get') {
    const start = q('start') ?? '0000'
    const end = q('end') ?? '9999'
    const kind = q('kind')
    return [
      200,
      jobs.filter(
        (j) => j.scheduled_date >= start && j.scheduled_date <= end && (!kind || j.kind === kind),
      ),
    ]
  }
  if (url === '/api/jobs' && method === 'post') {
    const body = jsonBody(config)
    const client = clients.find((c) => c.id === Number(body.client_id))
    if (!client) return [404, {}]
    const job: MockJob = {
      id: id(),
      client_id: client.id,
      client_name: client.name,
      series_id: null,
      scheduled_date: String(body.scheduled_date),
      scheduled_time: (body.scheduled_time as string | null) ?? null,
      duration_minutes: 60,
      kind: (body.kind as MockJob['kind']) ?? 'job',
      status: 'scheduled',
      price: body.price != null ? String(body.price) : client.rate,
      paid: false,
      notes: String(body.notes ?? ''),
      route_order: null,
      photos: [],
      client_lat: client.lat,
      client_lng: client.lng,
      address: client.address,
    }
    jobs.push(job)
    return [201, job]
  }
  m = url.match(/^\/api\/jobs\/(\d+)$/)
  if (m) {
    const job = jobs.find((j) => j.id === Number(m![1]))
    if (!job) return [404, {}]
    if (method === 'patch') {
      Object.assign(job, jsonBody(config))
      job.price = String(job.price)
      return [200, job]
    }
    if (method === 'delete') {
      jobs.splice(jobs.indexOf(job), 1)
      return [204, null]
    }
  }

  m = url.match(/^\/api\/jobs\/(\d+)\/photos$/)
  if (m && method === 'post') {
    const job = jobs.find((j) => j.id === Number(m![1]))
    if (!job) return [404, {}]
    const filePart = formParts(config).find((p) => p.fieldName === 'file')
    const photo = {
      id: id(),
      url: filePart?.uri ?? 'https://placehold.co/300x300',
      caption: '',
      uploaded_at: nowIso(),
    }
    job.photos.unshift(photo)
    return [201, photo]
  }
  m = url.match(/^\/api\/jobs\/(\d+)\/photos\/(\d+)$/)
  if (m && method === 'delete') {
    const job = jobs.find((j) => j.id === Number(m![1]))
    if (!job) return [404, {}]
    job.photos = job.photos.filter((p) => p.id !== Number(m![2]))
    return [204, null]
  }

  // -- route
  if (url === '/api/route' && method === 'get') return [200, routePlan(q('date') ?? today())]
  if (url === '/api/route/optimize') {
    const date = String(jsonBody(config).date)
    optimize(date)
    return [200, routePlan(date)]
  }
  if (url === '/api/route/reorder') {
    const body = jsonBody(config)
    const ids = (body.job_ids as number[]) ?? []
    ids.forEach((jobId, index) => {
      const job = jobs.find((j) => j.id === jobId)
      if (job) job.route_order = index
    })
    return [200, routePlan(String(body.date))]
  }

  // -- equipment
  if (url === '/api/equipment' && method === 'get') return [200, equipment]
  if (url === '/api/equipment' && method === 'post') {
    const body = jsonBody(config) as unknown as EquipmentIn
    const item: EquipmentOut = {
      id: id(),
      name: body.name,
      make_model: body.make_model ?? '',
      serial_number: body.serial_number ?? '',
      purchase_date: body.purchase_date ?? null,
      notes: body.notes ?? '',
      status: body.status ?? 'active',
      service_interval_days: body.service_interval_days ?? null,
      last_serviced_on: body.last_serviced_on ?? null,
      next_service_due: null,
      service_contact_name: body.service_contact_name ?? '',
      service_contact_phone: body.service_contact_phone ?? '',
      service_contact_email: body.service_contact_email ?? '',
      service_contact_notes: body.service_contact_notes ?? '',
      photos: [],
      service_records: [],
    }
    recomputeNextDue(item)
    equipment.push(item)
    return [201, item]
  }
  m = url.match(/^\/api\/equipment\/(\d+)$/)
  if (m) {
    const item = equipment.find((e) => e.id === Number(m![1]))
    if (!item) return [404, {}]
    if (method === 'get') return [200, item]
    if (method === 'put') {
      Object.assign(item, jsonBody(config))
      recomputeNextDue(item)
      return [200, item]
    }
    if (method === 'delete') {
      equipment.splice(equipment.indexOf(item), 1)
      return [204, null]
    }
  }
  m = url.match(/^\/api\/equipment\/(\d+)\/photos$/)
  if (m && method === 'post') {
    const item = equipment.find((e) => e.id === Number(m![1]))
    if (!item) return [404, {}]
    const filePart = formParts(config).find((p) => p.fieldName === 'file')
    const photo = {
      id: id(),
      url: filePart?.uri ?? 'https://placehold.co/300x300',
      caption: '',
      uploaded_at: nowIso(),
    }
    item.photos.unshift(photo)
    return [201, photo]
  }
  m = url.match(/^\/api\/equipment\/(\d+)\/photos\/(\d+)$/)
  if (m && method === 'delete') {
    const item = equipment.find((e) => e.id === Number(m![1]))
    if (!item) return [404, {}]
    item.photos = item.photos.filter((p) => p.id !== Number(m![2]))
    return [204, null]
  }
  m = url.match(/^\/api\/equipment\/(\d+)\/service$/)
  if (m && method === 'post') {
    const item = equipment.find((e) => e.id === Number(m![1]))
    if (!item) return [404, {}]
    const body = jsonBody(config)
    const record = {
      id: id(),
      serviced_on: String(body.serviced_on),
      notes: String(body.notes ?? ''),
      cost: body.cost != null && body.cost !== '' ? String(body.cost) : null,
    }
    item.service_records.unshift(record)
    if (!item.last_serviced_on || record.serviced_on > item.last_serviced_on) {
      item.last_serviced_on = record.serviced_on
    }
    recomputeNextDue(item)
    return [201, record]
  }
  m = url.match(/^\/api\/equipment\/(\d+)\/service\/(\d+)$/)
  if (m && method === 'delete') {
    const item = equipment.find((e) => e.id === Number(m![1]))
    if (!item) return [404, {}]
    item.service_records = item.service_records.filter((r) => r.id !== Number(m![2]))
    item.last_serviced_on = item.service_records[0]?.serviced_on ?? null
    recomputeNextDue(item)
    return [204, null]
  }

  // -- reminders & notifications
  if (url === '/api/reminders' && method === 'get') return [200, reminders()]
  if (url === '/api/reminders/run') {
    const created: NotificationOut[] = []
    for (const r of reminders()) {
      const title = `${r.equipment_name} service ${r.overdue ? 'overdue' : 'due soon'}`
      const already = notifications.some(
        (n) => n.title === title && n.created_at.slice(0, 10) === today(),
      )
      if (!already) {
        const n: NotificationOut = {
          id: id(),
          title,
          body: `Due ${r.due_on}.${r.service_contact_name ? ` Contact: ${r.service_contact_name} ${r.service_contact_phone}.` : ''}`,
          data: { type: 'equipment_service', equipment_id: r.equipment_id },
          created_at: nowIso(),
          read_at: null,
        }
        notifications.unshift(n)
        created.push(n)
      }
    }
    return [200, created]
  }
  if (url === '/api/notifications' && method === 'get') {
    let list = [...notifications]
    if (q('unread') === 'true') list = list.filter((n) => !n.read_at)
    return [200, list]
  }
  m = url.match(/^\/api\/notifications\/(\d+)\/read$/)
  if (m) {
    const n = notifications.find((x) => x.id === Number(m![1]))
    if (!n) return [404, {}]
    n.read_at = nowIso()
    return [200, n]
  }
  if (url === '/api/notifications/read-all') {
    for (const n of notifications) n.read_at = n.read_at ?? nowIso()
    return [204, null]
  }
  if (url === '/api/devices' && method === 'post') {
    return [201, { id: 1, token: 'mock', platform: 'android', created_at: nowIso() }]
  }

  return [404, { detail: `mock: no handler for ${method.toUpperCase()} ${url}` }]
}
// biome-ignore-end lint/style/noNonNullAssertion: end handler block

export function installMock(instance: AxiosInstance, kind: 'api' | 'allauth') {
  instance.defaults.adapter = async (config): Promise<AxiosResponse> => {
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''
    // Small delay so loading states are visible and feel real.
    await new Promise((resolve) => setTimeout(resolve, 150))
    const [status, data] = (kind === 'allauth'
      ? handleAllauth(method, url)
      : handleApi(method, url, config)) ?? [404, {}]
    const response: AxiosResponse = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config: config as AxiosResponse['config'],
    }
    if (status >= 400) {
      const error = Object.assign(new Error(`mock ${status}`), {
        isAxiosError: true,
        config,
        response,
        toJSON: () => ({}),
      })
      throw error
    }
    return response
  }
}
