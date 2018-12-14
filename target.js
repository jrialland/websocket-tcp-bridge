

const SockJS = require('sockjs-client');
const http = require('http');
const net = require('net');
const protocol = require('./protocol');

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

for(let arg of process.argv) {
  if(arg.startsWith('--proxy=')) {
    let proxy = arg.slice(8).trim();
    logger.info("using HTTP PROXY " + proxy);
    require('proxying-agent').globalize(proxy);
  }
}

////////////////////////////////////////////////////////////////////////////////
//Variables globales du script
let ws = null;
let connections = {};

////////////////////////////////////////////////////////////////////////////////
function createWs(bridgeUrl) {

  ws = new SockJS(bridgeUrl);

  ws.onopen = () => {
    //se déclarer auprés du bridge
    ws.send(protocol.serialize({
      senderRole:'server',
      type:'serverDecl'
    }));
  };

  ws.onmessage = (evt) => {
    let incoming = evt.data;
    let msg = protocol.deserialize(incoming);

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
        ws.send(protocol.serialize({
          senderRole:'server',
          type:'data',
          data:data,
          connectionId:connectionId
        }));

      });

      //Quand la connection fermee de notre coté
      socket.on('close', () => {

        logger.info('connection close connectionId ' + msg.connectionId);
        //renvoyer l'info vers le bridge
        delete connections[connectionId];
        ws.send(protocol.serialize({
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
    else if(msg.type == 'data' && msg.connectionId && msg.data) {
      let socket = connections[msg.connectionId];
      if(socket != null) {
        socket.cork()
        socket.write(new Buffer(msg.data.data));
        process.nextTick(() => socket.uncork());
      }
    }

    //connection fermée coté client => on ferme la socket
    else if(msg.type == 'connectionClosed' && msg.connectionId) {
      let connection = connections[msg.connectionId];
      if(connection != null) {
        delete connections[msg.connectionId];
        connection.destroy();
      }
    }

  };

  let retry = (err) => {
    if(err) {
      logger.error(JSON.stringify(err));
    } else {
      //on recrée la connection vers le bridge aprés une seconde
      setTimeout(() => {
        ws = createWs(bridgeUrl);
      }, 1000);
    }
  };

  ws.onerror = ws.onclose =retry;

  return ws;
};

//connection initiale
ws = createWs(bridgeUrl);
