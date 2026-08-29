/**
 * PostgREST argument mapper for create_company_with_owner.
 * Always includes p_password (string | null) so the key is never omitted.
 */

export interface CreateCompanyWithOwnerInput {
  email: string
  passwordHash: string | null
  firstName: string
  lastName: string
  companyName: string
}

export interface CreateCompanyWithOwnerArgs {
  p_email: string
  p_password: string | null
  p_first_name: string
  p_last_name: string
  p_company_name: string
}

/**
 * Build RPC args for create_company_with_owner.
 * @param input - Signup fields; passwordHash is the bcrypt hash or null for OAuth
 * @returns Named PostgREST arguments including p_password even when null
 */
export function buildCreateCompanyWithOwnerArgs(
  input: CreateCompanyWithOwnerInput
): CreateCompanyWithOwnerArgs {
  return {
    p_email: input.email,
    p_password: input.passwordHash,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_company_name: input.companyName,
  }
}
