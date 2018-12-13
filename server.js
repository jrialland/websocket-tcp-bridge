//
// bridge.js : serveur websocket
//
const http = require('http');
const sockjs = require('sockjs');

////////////////////////////////////////////////////////////////////////////////
// Configuration logging
const winston = require('winston');
const logger = winston.createLogger({
   level:'debug',
   format: winston.format.simple(),
   transports : [
     new winston.transports.Console({handleExceptions:true,level:'debug',colorize:true})
   ],
   exitOnError:false
});

let PORT = 80;
if(process.argv.length > 2) {
  PORT = parseInt(process.argv[process.argv.length-1]);
}

//connection websocket courante avec le client
let client = null;

//connection websocket courante avec le serveur
let server = null;

//création du serveur
let sockjs_server = new sockjs.createServer();

sockjs_server.on('connection', (ws) => {

    ws.on('data', (incoming) => {
       msg = JSON.parse(incoming);
       //message depuis un 'serveur'
       if(msg.senderRole == 'server') {

         //le serveur se déclare
         if(msg.type == 'serverDecl') {
           logger.info('TARGET IS CONNECTED');
           server = ws;
         }
         // on reporte tout message du serveur vers le client
         else if(client != null) {
            client.write(incoming);
         }
       }

       else {
         if(msg.type == 'clientDecl') {
           logger.info('CLIENT IS CONNECTED');
           client = ws;
         } else if(server != null) {
           server.write(incoming);
         }
       }
    });
});

let http_server = http.createServer();
sockjs_server.installHandlers(http_server, {'prefix':'/bridge'});
http_server.listen({port:PORT});

logger.info('listening on port ' + PORT);
