interface DateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partsAt(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: values.year ?? "",
    month: values.month ?? "",
    day: values.day ?? "",
    hour: values.hour ?? "00",
    minute: values.minute ?? "00",
    second: values.second ?? "00",
  };
}

export function localDate(date: Date, timeZone: string): string {
  const parts = partsAt(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function localDateTimeToUtc(date: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError("Date must use YYYY-MM-DD format.");
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let estimate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = partsAt(new Date(estimate), timeZone);
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const adjustment = target - represented;
    estimate += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(estimate);
}
