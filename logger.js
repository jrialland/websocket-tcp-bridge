const winston = require('winston');
module.exports = winston.createLogger({
     level:'error',
     format: winston.format.simple(),
     transports : [
       new winston.transports.Console({handleExceptions:true,level:'debug',colorize:true})
     ],
     exitOnError:false
});
