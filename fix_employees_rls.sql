-- ============================================================
-- FIX: Infinite recursion in employees RLS policy
-- ============================================================
-- The existing employees_RLS policy queries the employees table itself
-- to check if the user is an employee. This causes infinite recursion
-- because PostgREST re-applies RLS on the nested query.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS
-- to check employee membership, then use that function in the policy.
-- ============================================================

-- Step 1: Create a helper function with SECURITY DEFINER
-- This function runs with the permissions of the function owner (postgres),
-- NOT the calling user, so it bypasses RLS when checking employee records.
CREATE OR REPLACE FUNCTION get_employee_business_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM employees WHERE user_id = p_user_id;
$$;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "employees_RLS" ON employees;

-- Step 3: Re-create the policy using the helper function (no recursion)
CREATE POLICY "employees_RLS" ON employees
FOR ALL
USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  OR
  business_id IN (SELECT get_employee_business_ids(auth.uid()))
);

-- Done! The employees table now has a non-recursive RLS policy.
