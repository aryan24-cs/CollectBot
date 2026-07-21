import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase credentials in env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("Testing Supabase Admin Auth user creation...")
  // Test if we can create a mock user
  const email = `test_emp_${Date.now()}@example.com`
  const password = "password123"
  
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Test Employee" }
  })

  if (authError) {
    console.error("Auth creation failed:", authError.message, authError)
  } else {
    console.log("Auth creation succeeded:", authUser.user.id)
    
    // Clean up
    await supabase.auth.admin.deleteUser(authUser.user.id)
    console.log("Cleaned up test user.")
  }
}

run()
