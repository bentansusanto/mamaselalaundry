-- ==========================================
-- Schema Database Mama Sela Laundry (Supabase)
-- Jalankan skrip ini di SQL Editor Supabase
-- ==========================================

-- 1. Tabel Pelanggan (Customers)
create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text default '',
  address text default '-',
  created_at timestamptz default now()
);

-- 2. Tabel Layanan (Services)
create table if not exists public.services (
  id text primary key,
  name text not null,
  category text default 'Kiloan',
  variant text,
  unit text default 'kg',
  price numeric default 0,
  hpp numeric default 0,
  profit_margin_percent numeric default 0,
  created_at timestamptz default now()
);

-- 3. Tabel Pesanan (Orders)
create table if not exists public.orders (
  id text primary key,
  customer_id text,
  customer_name text not null,
  customer_phone text default '',
  created_at timestamptz default now(),
  estimated_completion timestamptz default now(),
  completed_at timestamptz,
  main_service text default 'Cuci setrika',
  speed text default 'Normal',
  speed_fee numeric default 0,
  actual_weight numeric default 0,
  billed_weight numeric default 0,
  items jsonb default '[]'::jsonb,
  main_service_total numeric default 0,
  items_total numeric default 0,
  total_price numeric default 0,
  payment_status text default 'Belum Bayar',
  payment_method text default 'Cash',
  payment_date timestamptz,
  progress_status text default 'Proses',
  notes text default '',
  cashier_name text default 'Mama Sela'
);

-- 4. Aktifkan Row Level Security (RLS)
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;

-- 5. Buat Kebijakan Akses (Policy) untuk Publishable/Anon Key
create policy "Allow all on customers" on public.customers for all using (true) with check (true);
create policy "Allow all on services" on public.services for all using (true) with check (true);
create policy "Allow all on orders" on public.orders for all using (true) with check (true);

-- 6. Aktifkan Realtime Replication (WebSocket)
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.services;
alter publication supabase_realtime add table public.orders;

-- 7. Isi Data Awal Layanan (Services)
insert into public.services (id, name, category, unit, price, hpp, profit_margin_percent)
values
  ('SRV-01', 'Cuci setrika', 'Kiloan', 'kg', 6000, 2500, 58),
  ('SRV-02', 'Setrika', 'Kiloan', 'kg', 5000, 1500, 70),
  ('SRV-03', 'Cuci lipat', 'Kiloan', 'kg', 5000, 2000, 60),
  ('SRV-04', 'Bedcover S', 'Satuan', 'pcs', 10000, 3500, 65),
  ('SRV-05', 'Bedcover M', 'Satuan', 'pcs', 15000, 5500, 63),
  ('SRV-06', 'Bedcover L', 'Satuan', 'pcs', 25000, 9000, 64),
  ('SRV-07', 'Selimut S', 'Satuan', 'pcs', 10000, 3000, 70),
  ('SRV-08', 'Selimut M', 'Satuan', 'pcs', 15000, 5000, 67),
  ('SRV-09', 'Selimut L', 'Satuan', 'pcs', 25000, 8000, 68)
on conflict (id) do nothing;
