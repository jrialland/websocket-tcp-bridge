const http = require('http');
const sockjs = require('sockjs');
const logger = require('./logger');
const minimist = require('minimist');

let PORT = 80;
const args = minimist(process.argv.slice(2));
if(args.p) {
  PORT = parseInt(args.p);
}
const CLIENTS = {};

//création du serveur
let sockjs_server = new sockjs.createServer();
sockjs_server.on('connection', (ws) => {
    ws.on('data', (incoming) => {

       const msgs = JSON.parse(incoming);
       if(msgs.length > 0) {
         CLIENTS[msgs[0].sender] = ws;
         for(let role of Object.keys(CLIENTS)) {
           let otherWs = CLIENTS[role]
           if(ws != otherWs) {
             logger.debug(`[server] : ...  dispatching to ${role}`);
             transferred = true;
             CLIENTS[role].write(incoming);
           }
         }
       }
    });
});
let http_server = http.createServer();
sockjs_server.installHandlers(http_server, {'prefix':'/bridge'});
http_server.listen({port:PORT});
logger.info('listening on port ' + PORT);
