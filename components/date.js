import { parse, format } from 'date-fns'

const rawString = 'January 20, 2025 at 2:08:31 PM UTC-5'

/**
 * Parse the date string:
 * The pattern "MMMM dd, yyyy 'at' hh:mm:ss a 'UTC'x" corresponds to:
 * - MMMM: full month name (e.g., January)
 * - dd: day of month (e.g., 20)
 * - yyyy: four-digit year (e.g., 2025)
 * - 'at': literal text "at"
 * - hh: hour (01..12)
 * - mm: minute (00..59)
 * - ss: second (00..59)
 * - a: AM/PM
 * - 'UTC': literal "UTC"
 * - x: time zone offset in ±HH or ±HHmm or ±HH:mm
 *
 * The second argument is the pattern, and the third is a 'base date' fallback.
 */
const parsedDate = parse(
  rawString,
  "MMMM dd, yyyy 'at' hh:mm:ss a 'UTC'x",
  new Date()
)

// Now, format the parsed date in separate fields:
const datePart = format(parsedDate, 'MMMM dd, yyyy') // e.g. "January 20, 2025"
const timePart = format(parsedDate, 'hh:mm a') // e.g. "02:08 PM"

console.log('Date:', datePart)
console.log('Time:', timePart)
