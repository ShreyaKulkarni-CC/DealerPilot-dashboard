export const AGE_THRESHOLD_DAYS = 60

export function daysInInventory(createdOn) {
  if (!createdOn) return null
  const created = new Date(createdOn)
  if (Number.isNaN(created.getTime())) return null
  const ms = Date.now() - created.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}
