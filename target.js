const logger = require('./logger');
const net = require('net');
const minimist = require('minimist');
const BridgeClient = require('./bridge_client').BridgeClient;

////////////////////////////////////////////////////////////////////////////////
// Lecture parametres du script
let bridgeUrl = process.argv[process.argv.length-1];
if(!bridgeUrl){
  logger.error('websocket bridge url is not specified !');
}

const args = minimist(process.argv.slice(2));
if(!args.u) {
  throw new Error('usage : node target.js -u <bridge url>');
}

////////////////////////////////////////////////////////////////////////////////
const SOCKETS = {};
const bridgeClient = new BridgeClient(args.u, 'target');
bridgeClient.onMessage = (message) => {

  if(message.type == 'info') {
    logger.info(message.message);
  }

  if(message.type == 'data') {
    let connectionId = message.connectionId;
    let socket = SOCKETS[connectionId];
    if(socket) {
      socket.cork();
      socket.write(message.data);
      socket.uncork();
    } else {
      bridgeClient.sendMessage('error', {connectionId:connectionId, message:'unknown connectionId'});
    }
  }

  if(message.type == 'close') {
    let connectionId = message.connectionId;
    let socket = SOCKETS[connectionId];
    if(socket) {
      socket.destroy();
      delete SOCKETS[connectionId];
    }
  }

  if(message.type == 'open') {
    let connectionId = message.connectionId;
    let socket = new net.Socket();
    SOCKETS[connectionId] = socket;
    socket.on('connect', () => {
      logger.info('connect ' + socket.remoteAddress + ':' + socket.remotePort);
    });

    socket.on('data', (data) => {
      bridgeClient.sendMessage('data', {connectionId: connectionId, data:data});
    });

    socket.on('close', () => {
      bridgeClient.sendMessage('close', {connectionId:connectionId});
    });

    socket.on('error', (err) => {
      bridgeClient.sendMessage('error', {connectionId:connectionId});
    });

    socket.on('end', () => {
      delete SOCKETS[connectionId];
    });

    socket.connect(message.dstPort, message.dstAddr);
  }

};
