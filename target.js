

const WebSocket = require('ws');
const net = require('net');
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
let bridgeUrl = process.argv[process.argv.length-1];
if(!bridgeUrl){
  logger.error('websocket bridge url is not specified !');
}

////////////////////////////////////////////////////////////////////////////////
//Variables globales du script
let ws = null;
let connections = {};

////////////////////////////////////////////////////////////////////////////////
function createWs(bridgeUrl) {
  ws = new WebSocket(bridgeUrl);

  ws.on('open', () => {
    //se déclarer auprés du bridge
    ws.send(JSON.stringify({
      senderRole:'server',
      type:'serverDecl'
    }));
  });

  ws.on('message', (incoming) => {
    let msg = JSON.parse(incoming);

    //demande de connection
    if(msg.type=='connect') {

      let connectionId = msg.connectionId;
      let dstAddr = msg.dstAddr;
      let dstPort = msg.dstPort;

      let socket = connections[connectionId] = new net.Socket();

      socket.on('error', (err) => {
        logger.error(err);
      });

      //Quand on recoit des données sur la socket
      socket.on('data', (data) => {
        //renvoyer vers le bridge
        ws.send(JSON.stringify({
          senderRole:'server',
          type:'data',
          data:data,
          connectionId:connectionId
        }));

      });

      //Quand la connection fermee de notre coté
      socket.on('close', () => {
        logger.info('connection close');
        //renvoyer l'info vers le bridge
        delete connections[connectionId];
        ws.send(JSON.stringify({
          senderRole:'server',
          type:'connectionClosed',
          connectionId:connectionId
        }));
      });

      //connecter la socket
      socket.connect(dstPort, dstAddr, () => {
        logger.info('connected to ' + dstAddr + ':' + dstPort);
      });

    }

    // on recoit des data du client, on envoie sur la socket
    else if(msg.type == 'data') {
      let socket = connections[msg.connectionId];
      if(socket != null) {
        socket.write(new Buffer(msg.data.data));
      }
    }

    //connection fermée coté client => on ferme la socket
    else if(msg.type == 'connectionClosed') {
      let connection = connections[msg.connectionId];
      if(connection != null) {
        connection.close();
        delete connections[msg.connectionId];
      }
    }

  });

  for(let evt of ['error', 'close']) {
    //Quand la connection au bridge est perdue
    ws.on(evt, (err) => {
      logger.error(err);
      //on recrée la connection vers le bridge aprés une seconde
      setTimeout(() => {
        ws = createWs(bridgeUrl);
      }, 1000);
    });
  }

  return ws;
};

//connection initiale
ws = createWs(bridgeUrl);
