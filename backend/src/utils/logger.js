const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

const logger = {
  info: (message, meta = {}) => {
    console.log(`${colors.blue}${formatMessage('info', message, meta)}${colors.reset}`);
  },

  success: (message, meta = {}) => {
    console.log(`${colors.green}${formatMessage('success', message, meta)}${colors.reset}`);
  },

  warn: (message, meta = {}) => {
    console.warn(`${colors.yellow}${formatMessage('warn', message, meta)}${colors.reset}`);
  },

  error: (message, meta = {}) => {
    if (meta instanceof Error) {
      meta = { error: meta.message, stack: meta.stack };
    }
    console.error(`${colors.red}${formatMessage('error', message, meta)}${colors.reset}`);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.gray}${formatMessage('debug', message, meta)}${colors.reset}`);
    }
  },

  http: (method, path, statusCode, duration) => {
    const color = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    console.log(`${color}${formatMessage('http', `${method} ${path} ${statusCode} ${duration}ms`)}${colors.reset}`);
  },

  db: (operation, table, duration) => {
    console.log(`${colors.magenta}${formatMessage('db', `${operation} ${table} ${duration}ms`)}${colors.reset}`);
  },

  payment: (provider, action, meta = {}) => {
    console.log(`${colors.cyan}${formatMessage('payment', `[${provider}] ${action}`, meta)}${colors.reset}`);
  },

  order: (orderNumber, action, meta = {}) => {
    console.log(`${colors.cyan}${formatMessage('order', `[${orderNumber}] ${action}`, meta)}${colors.reset}`);
  },
};

module.exports = logger;
