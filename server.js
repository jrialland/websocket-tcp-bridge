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
       msg = JSON.parse(incoming);
       CLIENTS[msg.sender] = ws;

       if(msg.type == 'ping') {
         ws.write(JSON.stringify({type:'pong', sender:'server', pong:'pong'}));
         return;
       }

       logger.debug(`[server] : received ${msg.type} from ${msg.sender}`);
       let transferred = false;
       for(let role of Object.keys(CLIENTS)) {
         if(role != msg.sender) {
           logger.debug(`[server] : ...  dispatching to ${role}`);
           transferred = true;
           CLIENTS[role].write(incoming);
         }
       }
       if(!transferred) {
         ws.write(JSON.stringify({
           sender:'server',
           type:'error',
           originalMessage:msg,
           message:'message lost (no peer to read it)'
         }));
       }
    });
});
let http_server = http.createServer();
sockjs_server.installHandlers(http_server, {'prefix':'/bridge'});
http_server.listen({port:PORT});
logger.info('listening on port ' + PORT);
