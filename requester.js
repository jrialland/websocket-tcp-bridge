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
const bc = require('./bridge_client');

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
let bridgeClient = new bc.BridgeClient(bridgeUrl, 'requester');

////////////////////////////////////////////////////////////////////////////////

/**
 * Creation du serveur socks local
 */
let socksServer = socks.createServer((connInfo, accept, deny) => {
   var socket;
   if(socket = accept(true)) {
     new bc.SocketWrapper(bridgeClient, socket, createConnectionId(socket))
     .sendConnectionRequest(connInfo.dstPort, connInfo.dstAddr);
   } else {
     accept();
   }
});

//démarrer le serveur socks
socksServer.listen(socksPort, 'localhost', () => {
   logger.info('[requester] SOCKS Server listening on port ' + socksPort);
});
socksServer.useAuth(socks.auth.None());
