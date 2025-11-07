-- TravelView Database Schema for Supabase
-- 在 Supabase SQL Editor 中执行这个脚本

-- ==============================================
-- 1. 创建表结构
-- ==============================================

-- 行程表
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 天数表
CREATE TABLE IF NOT EXISTS days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL,
  date DATE,
  title TEXT,
  notes TEXT,
  UNIQUE(trip_id, day_number)
);

-- 活动表（支持用户自定义）
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID REFERENCES days(id) ON DELETE CASCADE NOT NULL,
  time TEXT,
  type TEXT, -- 'transport', 'sightseeing', 'food', 'accommodation', 'custom'
  description TEXT NOT NULL,
  location JSONB NOT NULL, -- { lat, lng, address, place_id }
  icon TEXT,
  order_index INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb, -- 扩展字段：cost, notes, photos等
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 路由表
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day INT NOT NULL,
  start_location JSONB NOT NULL,
  end_location JSONB NOT NULL,
  color TEXT DEFAULT '#667eea',
  label TEXT,
  route_data JSONB, -- 存储完整的 Google Maps DirectionsResult
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. 创建索引（提升查询性能）
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_days_trip_id ON days(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_day_id ON activities(day_id);
CREATE INDEX IF NOT EXISTS idx_routes_trip_id ON routes(trip_id);

-- ==============================================
-- 3. 启用行级安全（Row Level Security）
-- ==============================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. 创建安全策略
-- ==============================================

-- trips 表策略
CREATE POLICY "Users can view own trips and public trips" ON trips
  FOR SELECT USING (
    auth.uid() = user_id OR is_public = true
  );

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- days 表策略
CREATE POLICY "Users can view days of accessible trips" ON days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = days.trip_id
      AND (trips.user_id = auth.uid() OR trips.is_public = true)
    )
  );

CREATE POLICY "Users can insert days to own trips" ON days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update days of own trips" ON days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete days of own trips" ON days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- activities 表策略
CREATE POLICY "Users can view activities of accessible trips" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN trips ON trips.id = days.trip_id
      WHERE days.id = activities.day_id
      AND (trips.user_id = auth.uid() OR trips.is_public = true)
    )
  );

CREATE POLICY "Users can insert activities to own trips" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM days
      JOIN trips ON trips.id = days.trip_id
      WHERE days.id = activities.day_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities of own trips" ON activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN trips ON trips.id = days.trip_id
      WHERE days.id = activities.day_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities of own trips" ON activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN trips ON trips.id = days.trip_id
      WHERE days.id = activities.day_id
      AND trips.user_id = auth.uid()
    )
  );

-- routes 表策略
CREATE POLICY "Users can view routes of accessible trips" ON routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = routes.trip_id
      AND (trips.user_id = auth.uid() OR trips.is_public = true)
    )
  );

CREATE POLICY "Users can insert routes to own trips" ON routes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = routes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update routes of own trips" ON routes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = routes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete routes of own trips" ON routes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = routes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ==============================================
-- 5. 创建自动更新时间戳的函数
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 trips 表添加触发器
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 6. 插入示例数据（可选 - 用于测试）
-- ==============================================

-- 注意：这部分需要在你注册用户后执行
-- 将 'YOUR_USER_ID' 替换为你的实际用户ID（从 auth.users 表获取）

/*
-- 示例：创建一个测试行程
INSERT INTO trips (user_id, title, destination, start_date, end_date, description)
VALUES (
  'YOUR_USER_ID', -- 替换为你的用户ID
  '关西10日游',
  '日本关西',
  '2025-08-22',
  '2025-08-31',
  '探索关西的历史与文化'
);
*/

-- ==============================================
-- 完成！
-- ==============================================

-- 验证表是否创建成功
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name IN ('trips', 'days', 'activities', 'routes')
ORDER BY table_name;
