/**
 * Calendar year of a leave request start_date from the ISO date prefix (D-02).
 * Do not construct a Date — UTC midnight can shift the year in UTC-behind zones.
 */

/**
 * @param startDate - persisted start_date, expected yyyy-MM-dd
 * @returns integer year from the first four characters
 * @throws Error Invalid start_date when the prefix is not an integer
 */
export function yearFromStartDate(startDate: string): number {
  const year = Number(startDate.slice(0, 4))
  if (!Number.isInteger(year)) {
    throw new Error('Invalid start_date')
  }
  return year
}
