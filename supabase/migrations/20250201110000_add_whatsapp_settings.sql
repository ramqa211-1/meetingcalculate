-- Add phone number to profiles for WhatsApp identification
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- WhatsApp settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  phone_number TEXT NOT NULL,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own WhatsApp settings"
  ON public.whatsapp_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own WhatsApp settings"
  ON public.whatsapp_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WhatsApp settings"
  ON public.whatsapp_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_user_id ON public.whatsapp_settings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_settings_phone ON public.whatsapp_settings(phone_number);
