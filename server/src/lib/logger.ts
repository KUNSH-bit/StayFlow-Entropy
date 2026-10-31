type LogFields = Record<string, string | number | boolean | undefined>;

function writeLog(level: "info" | "error", message: string, fields: LogFields = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    writeLog("info", message, fields);
  },
  error(message: string, fields?: LogFields): void {
    writeLog("error", message, fields);
  },
};
