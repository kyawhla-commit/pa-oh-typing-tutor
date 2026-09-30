import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const userId = process.env.ADMIN_USER_ID;
if (!userId) throw new Error("ADMIN_USER_ID is required");

const { data: { user }, error: getError } =
  await supabase.auth.admin.getUserById(userId);

if (getError) throw getError;
if (!user) throw new Error("User not found");

const { error: updateError } =
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...user.app_metadata,
      role: "admin",
    },
  });

if (updateError) throw updateError;

console.log(`Admin role assigned to ${user.email}`);