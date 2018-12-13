//
// requester.js script a lancer coté "client" pour instancier
// un serveur socks local qui convertit les flux tcp en messages pour le 'bridge'
// usage: node requester.js <port socks> <url du bridge>
//

let socks = require('socksv5');
let WebSocket = require('ws');
let randomInt = require('random-int');

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
  winston.info('attempts websocket connection to ' + bridgeUrl);
  ws = new WebSocket(bridgeUrl);

  ws.on('connect', () => {
    winston.error('websocket connection established');
  })

  //Quand on recoit un message du bridge
  ws.on('open', () => {
    winston.info('websocket connection open');
    ws.send(JSON.stringify({
      senderRole:'client',
      type:'clientDecl'
    }));
  });

  ws.on('message', (incoming) => {

    let msg = JSON.parse(incoming);

    //on recoit des données, les renvoyer a la socket
    if(msg.type == 'data') {
       let connectionId = msg.connectionId;
       let s = connections[connectionId];
       if(s) {
         s.write(new Buffer(msg.data.data));
       }
    }

    //connection fermme coté serveur, on ferme coté client
    else if(msg.type == 'close') {
      let connectionId = msg.connectionId;
      let s = connections[connectionId];
      if(s) {
        delete connections[connectionId];
        s.close();
      }
    }

  });

  //Quand la connection au bridge est perdue
  for(let evt of ['close', 'error']) {
    ws.on(evt, () => (err) => {
      logger.info(err);
      //on recrée la connection vers le bridge aprés une seconde
      setTimeout(() => {
        ws = createWs(bridgeUrl);
      }, 1000);
    });
  }

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
     ws.send(JSON.stringify({
       senderRole:'client',
       type:'connect',
       dstAddr : connInfo.dstAddr,
       dstPort : connInfo.dstPort,
       connectionId:connectionId
     }));

     // quand des données sont lues sur la socket
     socket.on('data', (data) => {
       // envoyer vers le bridge
       ws.send(JSON.stringify({
         senderRole:'client',
         type:'data',
         data:data,
         connectionId:connectionId
       }));

     });

     //quand la socket est fermée
     socket.on('close', () => {
       //envoyer l'info au bridge
       ws.send(JSON.stringify({
         senderRole:'client',
         type:'connectionClosed',
         connectionId:connectionId
       }));
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
