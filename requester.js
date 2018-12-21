//
// requester.js script a lancer coté "client" pour instancier
// un serveur socks local qui convertit les flux tcp en messages pour le 'bridge'
// usage: node requester.js -S <port socks> -u <url du bridge>
//

const socks = require('socksv5');
const  SockJS = require('sockjs-client');
const minimist = require('minimist');
const fnv = require('fnv-plus');
const logger = require('./logger');

////////////////////////////////////////////////////////////////////////////////
// Lecture parametres du script
let socksPort = 1080;
let bridgeUrl = null;

const args = minimist(process.argv.slice(2));
if(args.S) {
  socksPort = parseInt(args.S);
}
if(args.u) {
  bridgeUrl = args.u.trim();
} else {
  throw Error('Usage : node requester.js -S <port socks> -u <url du bridge>')
}

function createConnectionId(socket) {
  let r = Math.floor(Math.random() * Math.floor(1024));
  let connectionId = parseInt(fnv.hash(socket.removeAddress + socket.remotePort + r).dec());
  return connectionId;
}
////////////////////////////////////////////////////////////////////////////////
//Connection au bridge
const BridgeClient = require('./bridge_client').BridgeClient;
let bridgeClient = new BridgeClient(bridgeUrl, 'requester');

////////////////////////////////////////////////////////////////////////////////

let SOCKETS = {};

bridgeClient.onMessage = (message) => {

  if(message.type == 'data') {
    let connectionId = message.connectionId;
    let socket = SOCKETS[connectionId];
    if(socket) {
      try {
        socket.cork();
        socket.write(message.data);
        socket.uncork();
      } catch(e) {
        logger.error('write error');
      }
    }
  }

  else if(message.type == 'close') {
    let connectionId = message.connectionId;
    let socket = SOCKETS[connectionId];
    if(socket) {
      socket.destroy();
    }
  }

  else if(message.type != 'pong'){
    logger.info(JSON.stringify(message));
  }

};

/**
 * Creation du serveur socks local
 */
let socksServer = socks.createServer((connInfo, accept, deny) => {
   var socket;

   // quand un client se connecte a socks
   if(socket = accept(true)) {

     //attribuer un id;
     let connectionId = createConnectionId(socket);
     SOCKETS[connectionId] = socket;

     //quand on recoit de la donnée on l'envoie au bridge
     socket.on('data', (data) => {
       bridgeClient.sendMessage('data', {connectionId:connectionId, data:data});
     });

     //quand on a une erreur on envoie au bridge
     socket.on('error', (err) => {
       console.log(err);
       bridgeClient.sendMessage('error', {connectionId:connectionId, error:err});
     });

     //a la fin on supprime de la liste des connections
     socket.on('end', () => {
       delete SOCKETS[connectionId];
     });

     logger.info('connect ' + connInfo.dstAddr + ':' + connInfo.dstPort);
     bridgeClient.sendMessage('open', {
       dstAddr : connInfo.dstAddr,
       dstPort : connInfo.dstPort,
       connectionId : connectionId
     });

   } else {
     accept();
   }
});

//démarrer le serveur socks
socksServer.listen(socksPort, 'localhost', () => {
   logger.info('SOCKS Server listening on port ' + socksPort);
});
socksServer.useAuth(socks.auth.None());
