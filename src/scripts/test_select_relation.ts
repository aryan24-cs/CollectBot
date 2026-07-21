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
  console.log("Testing employees select query with relations...")
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("*, department:departments(id, name), custom_role:custom_roles(id, name), branch:branches(id, name)")
  
  if (empError) {
    console.error("Query failed! Postgres Error:", empError)
  } else {
    console.log("Query succeeded! Retrieved employees count:", employees?.length)
  }
}

run()
