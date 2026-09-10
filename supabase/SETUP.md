# Supabase setup

1. Create a free project at [supabase.com](https://supabase.com/).
2. Open **SQL Editor** and run `migrations/20260910000000_device_protection.sql`.
3. In **Authentication → Users**, create the first administrator with email/password.
4. Copy that user's UUID and run the commented `insert into public.admin_users` statement in the migration.
5. Add these Vercel environment variables for Preview and Production:

   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_ANON_KEY`: Project anon/public key
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Project service-role key; never expose this in client code
   - `BAN_HASH_SALT`: a long random secret, different between environments if desired

6. Redeploy the `BETA` branch and open `/admin`.

The client asks for consent before generating its anonymous device signal. Only a
one-way digest is sent to the API. The API stores a second server-salted digest
and a salted IP digest; raw canvas data, hardware values, and raw IP addresses
are not stored. An IP address is never used as the sole ban key, so people on the
same network are not automatically banned together.
