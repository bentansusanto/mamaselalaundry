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

-- 2.5. Tabel Kecepatan Pengerjaan (Speeds)
create table if not exists public.speeds (
  id text primary key,
  name text not null,
  duration_label text default '2 Hari',
  duration_hours numeric default 48,
  fee numeric default 0, -- Tarif per kg untuk Cuci Setrika
  fee_secondary numeric default 0, -- Tarif per kg untuk Setrika & Cuci Lipat
  created_at timestamptz default now()
);

alter table public.speeds
  add column if not exists fee_secondary numeric default 0;

-- 3. Tabel Pesanan (Orders) - Berelasi dengan Tabel Kecepatan (speeds)
create table if not exists public.orders (
  id text primary key,
  customer_id text,
  customer_name text not null,
  customer_phone text default '',
  created_at timestamptz default now(),
  estimated_completion timestamptz default now(),
  completed_at timestamptz,
  main_service text default 'Cuci setrika',
  speed_id text references public.speeds(id) on update cascade on delete set null,
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

-- Migrasi aman jika tabel orders sudah ada sebelumnya: tambahkan kolom speed_id & foreign key
alter table public.orders
  add column if not exists speed_id text references public.speeds(id) on update cascade on delete set null;

-- 4. Aktifkan Row Level Security (RLS)
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.speeds enable row level security;
alter table public.orders enable row level security;

-- 5. Buat Kebijakan Akses (Policy) untuk Publishable/Anon Key
create policy "Allow all on customers" on public.customers for all using (true) with check (true);
create policy "Allow all on services" on public.services for all using (true) with check (true);
create policy "Allow all on speeds" on public.speeds for all using (true) with check (true);
create policy "Allow all on orders" on public.orders for all using (true) with check (true);

-- 6. Aktifkan Realtime Replication (WebSocket)
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.services;
alter publication supabase_realtime add table public.speeds;
alter publication supabase_realtime add table public.orders;

-- 6.5. Isi Data Awal Kecepatan (Speeds) & Hubungkan Relasi ke Orders
insert into public.speeds (id, name, duration_label, duration_hours, fee, fee_secondary)
values
  ('SPD-01', 'Normal', '2 Hari', 48, 0, 0),
  ('SPD-02', 'Express', '1 Hari', 24, 10000, 6000),
  ('SPD-03', 'Kilat', '8 Jam', 8, 15000, 9000)
on conflict (id) do update
  set fee = excluded.fee,
      fee_secondary = excluded.fee_secondary;

update public.orders o
set speed_id = s.id
from public.speeds s
where lower(o.speed) = lower(s.name) and o.speed_id is null;

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
