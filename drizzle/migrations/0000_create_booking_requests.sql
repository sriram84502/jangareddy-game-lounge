CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 20),
  contact_method text NOT NULL CHECK (contact_method IN ('phone', 'whatsapp')),
  visit_date date NOT NULL,
  visit_time text NOT NULL CHECK (visit_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  party_size integer NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  duration_hours smallint NOT NULL CHECK (duration_hours IN (1, 2, 3)),
  game_genre text NOT NULL CHECK (game_genre IN ('sports', 'racing', 'fighting', 'action-adventure', 'open-world', 'multiplayer', 'any')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  estimated_total integer NOT NULL CHECK (estimated_total > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON TABLE public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;