/**
 * Owner check for company invite APIs (TENANT-01/02).
 * Ownership is companies.owner_id equality, not users.role === admin.
 */

/**
 * Whether the session user is the company owner.
 * @param userId - Session user id
 * @param ownerId - companies.owner_id
 * @returns true only when both strings are non-empty and equal
 */
export function isCompanyOwner(userId: string, ownerId: string): boolean {
  return userId.length > 0 && ownerId.length > 0 && userId === ownerId
}
