export const logger = {
  info: (event: string, data: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...data }));
  },
  warn: (event: string, data: Record<string, unknown> = {}) => {
    console.warn(JSON.stringify({ level: 'warn', event, timestamp: new Date().toISOString(), ...data }));
  },
  error: (event: string, error: unknown, data: Record<string, unknown> = {}) => {
    const errObj = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    console.error(JSON.stringify({ level: 'error', event, timestamp: new Date().toISOString(), error: errObj, ...data }));
  }
};
