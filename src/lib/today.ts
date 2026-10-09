// One pick per calendar day, the same for everyone in the same time zone.
const START = new Date(2026, 0, 1)

export function dayNumber(date = new Date()): number {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((today.getTime() - START.getTime()) / 86_400_000)
}

export function pickForToday<T>(list: T[], offset = 0): T {
  const n = list.length
  return list[(((dayNumber() + offset) % n) + n) % n]
}
