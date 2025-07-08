-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tamagotchi table
CREATE TABLE IF NOT EXISTS tamagotchi (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  stage VARCHAR(20) DEFAULT 'egg' CHECK (stage IN ('egg', 'baby', 'child', 'teen', 'adult', 'dead')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_interacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hunger INTEGER DEFAULT 100 CHECK (hunger >= 0 AND hunger <= 100),
  happiness INTEGER DEFAULT 100 CHECK (happiness >= 0 AND happiness <= 100),
  hygiene INTEGER DEFAULT 100 CHECK (hygiene >= 0 AND hygiene <= 100),
  health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  discipline INTEGER DEFAULT 0 CHECK (discipline >= 0 AND discipline <= 100),
  energy INTEGER DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
  evolution_points INTEGER DEFAULT 0,
  is_sleeping BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tamagotchi_user_id ON tamagotchi(user_id);
CREATE INDEX IF NOT EXISTS idx_tamagotchi_last_interacted ON tamagotchi(last_interacted_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tamagotchi_updated_at BEFORE UPDATE ON tamagotchi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 