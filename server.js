//
// bridge.js : serveur websocket
//
const WebSocket = require('ws');

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
const wss = new WebSocket.Server({
  port : PORT,
  zlibDeflateOptions: {
    chunkSize: 1024,
    memLevel: 7,
    level: 3
  },
  zlibInflateOptions: {
    chunkSize: 10 * 1024
  },
  clientNoContextTakeover: true,
  serverNoContextTakeover: true,
  serverMaxWindowBits: 10,
  concurrencyLimit: 10,
  threshold: 1024
});

wss.on('connection', (ws, req) => {

    ws.on('message', (incoming) => {
       msg = JSON.parse(incoming);
       //message depuis un 'serveur'
       if(msg.senderRole == 'server') {

         //le serveur se déclare
         if(msg.type == 'serverDecl') {
           winston.info('SERVER is ' + req.connection.remoteAddress);
           server = ws;
         }
         // on reporte tout message du serveur vers le client
         else if(client != null) {
            client.send(incoming);
         }
       }

       else {
         if(msg.type == 'clientDecl') {
           winston.info('CLIENT is ' + req.connection.remoteAddress);
           client = ws;
         } else if(server != null) {
           server.send(incoming);
         }
       }
    });
});

winston.info('listening on port ' + PORT);
