const { createLogger, format, transports } = require('winston');

const winston = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.errors({ stack: true }),
      format.splat(),
      format.colorize(),
      format.json()
    ),
    defaultMeta: { service: 'lagrange' },
    transports: [
      //
      // - Write to all logs with level `info` and below to `quick-start-combined.log`.
      // - Write all logs error (and below) to `quick-start-error.log`.
      //
      new transports.File({ filename: 'quick-start-error.log', level: 'error' }),
      new transports.File({ filename: 'quick-start-combined.log' }),
      new transports.Console({
        format: format.combine(
          
          
          format.colorize({ all: true }),
          
          format.json(),     
             
          format.simple(), 
          format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          //format.prettyPrint(), 
          //format.errors({ stack: true }),
          
        )
      })
    ]
  });

  const logger = {
    log: (message) => {
      winston.log('info', message);
    },
    dir: (message) => {
      winston.log('info', '%o',  message);
    }
}

  module.exports = logger;