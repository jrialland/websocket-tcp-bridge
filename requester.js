//
// requester.js script a lancer coté "client" pour instancier
// un serveur socks local qui convertit les flux tcp en messages pour le 'bridge'
// usage: node requester.js <port socks> <url du bridge>
//

const socks = require('socksv5');
const  SockJS = require('sockjs-client');
const  randomInt = require('random-int');
const  protocol = require('./protocol');

////////////////////////////////////////////////////////////////////////////////
// Configuration logging
const winston = require('winston');
const logger = winston.createLogger({
   level:'error',
   format: winston.format.simple(),
   transports : [
     new winston.transports.Console({handleExceptions:true,level:'debug',colorize:true})
   ],
   exitOnError:false
});

////////////////////////////////////////////////////////////////////////////////
// Lecture parametres du script
let socksPort = parseInt(process.argv[process.argv.length-2]);
let bridgeUrl = process.argv[process.argv.length-1];
if(!bridgeUrl){
  logger.error('websocket bridge url is not specified !');
}

////////////////////////////////////////////////////////////////////////////////
//Variables globales du script
let connections = {};
let ws = null;

////////////////////////////////////////////////////////////////////////////////
/**
 * Connection au bridge via WebSocket
 */
function createWs(bridgeUrl) {
  logger.info('attempts websocket connection to ' + bridgeUrl);
  ws = new SockJS(bridgeUrl);

  //Se déclarer à l'ouverture de la connection
  ws.onopen = () => {
    logger.info('websocket connection open');
    ws.send(protocol.serialize_client_decl());
  };

  //Quand on recoit un message du bridge
  ws.onmessage = (evt) => {
    
    let msg = protocol.deserialize(evt.data);

    //on recoit des données, les renvoyer a la socket
    if(msg.type == 'data') {
       let connectionId = msg.connectionId;
       let s = connections[connectionId];
       if(s) {
         try {
           s.cork();
           s.write(msg.data);
           process.nextTick(() => s.uncork());
         } catch(e) {
           logger.error('socket write error connectionId ' + connectionId);
           delete connections[connectionId];
           s.destroy();
         }
       }
    }

    //connection fermme coté serveur, on ferme coté client
    else if(msg.type == 'close') {
      let connectionId = msg.connectionId;
      try {
        let s = connections[connectionId];
        if(s) {
          delete connections[connectionId];
          s.destroy();
        }
      } catch(e) {
        logger.error('error closing connectionId ' + connectionId);
      }
    }

  };

  let retry = (err) => {
    logger.info(JSON.stringify(err));
    //on recrée la connection vers le bridge aprés une seconde
    setTimeout(() => {
      ws = createWs(bridgeUrl);
    }, 1000);
  };

  ws.onerror = ws.onclose = retry;

  return ws;
}

//on se connecte au bridge
createWs(bridgeUrl);

/**
 * Creation du serveur socks local
 */
let socksServer = socks.createServer((connInfo, accept, deny) => {
   var socket;

   // quand on demande une nouvelle connection
   if(socket = accept(true)) {

     // envoyer une demande d'ouverture de connection au bridge
     let connectionId = '' + randomInt(0,9999) + '-' + Object.keys(connections).length;
     connections[connectionId] = socket;
     logger.info('new connection to ' + connInfo.dstAddr + ':' + connInfo.dstPort, '\tconnectionId='+connectionId);

     // demande de connection envoyee au bridge
     ws.send(protocol.serialize_connect_request(connInfo.dstAddr, connInfo.dstPort, connectionId));

     // quand des données sont lues sur la socket
     socket.on('data', (data) => {
       // envoyer vers le bridge
       ws.send(protocol.serialize_client_data(data, connectionId));

     });

     //quand la socket est fermée
     socket.on('close', () => {
       //envoyer l'info au bridge
       ws.send(protocol.serialize_client_connection_close(connectionId));
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
