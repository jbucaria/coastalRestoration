import { parse, format } from 'date-fns'

const rawString = 'January 20, 2025 at 2:08:31 PM UTC-5'
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
