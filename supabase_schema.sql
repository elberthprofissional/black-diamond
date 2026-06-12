# SQL para criar as tabelas no Supabase

-- Tabela de Serviços
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- em minutos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Agendamentos
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_ids UUID[] NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  total_duration INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Despesas
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir Serviços Iniciais
INSERT INTO services (name, price, duration, description) VALUES
('Corte de Cabelo', 35.00, 40, 'Corte moderno e personalizado.'),
('Barba', 27.00, 20, 'Aparação e modelagem de barba.'),
('Barba com Toalha Quente', 30.00, 30, 'Experiência relaxante com toalha quente.'),
('Sobrancelha', 15.00, 10, 'Limpeza e design de sobrancelha.'),
('Pezinho', 15.00, 10, 'Acabamento perfeito.');
