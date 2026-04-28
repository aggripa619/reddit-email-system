const UK_TZ = 'Europe/London';

export function getUKDatetimeMin(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return toUKDatetimeLocal(d);
}

export function ukDatetimeToISO(localStr: string): string {
  // Parse user input as if it were UTC to get a reference point
  const tempDate = new Date(localStr + ':00Z');

  // Read back the hour/minute the UK timezone sees at that instant
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(tempDate);

  const ukHour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const ukMin = parseInt(parts.find(p => p.type === 'minute')!.value, 10);

  // The user intended localStr as UK time, but we parsed it as UTC.
  // offset = UK_time_of_tempDate - UTC_time_of_tempDate
  // To get real UTC: subtract offset from tempDate.
  const utcHour = tempDate.getUTCHours();
  const utcMin = tempDate.getUTCMinutes();

  let offsetMinutes = (ukHour * 60 + ukMin) - (utcHour * 60 + utcMin);
  // Clamp to ±720 to handle midnight-crossing edge cases
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;

  return new Date(tempDate.getTime() - offsetMinutes * 60_000).toISOString();
}

function toUKDatetimeLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
