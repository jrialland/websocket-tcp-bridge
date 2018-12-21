const logger = require('./logger');
const net = require('net');
const SockJS = require('sockjs-client');
const minimist = require('minimist');
//configuration proxy
const args = minimist(process.argv.slice(2));
if(args.p) {
  logger.info('using http proxy : ' + args.p)
  require('proxying-agent').globalize(args.p.trim());
}


const CONNECTIONS = {};

//classe d'envoi de messages
class BridgeClient {

  constructor(url, role) {
    this.url = url;
    this.role = role;
    this.ws = this._createWs();
  }

  _createWs() {
    const that = this;
    let ws = new SockJS(this.url);

    ws.onopen = () => {
      logger.info('connected to ' + this.url);
      that.sendMessage('subscribe',{});
    };

    ws.onerror = () => {
      setTimeout(() => {that.ws = that.createWs()}, 3500);
    };

    ws.onmessage = this._onMessage.bind(this);

    return ws;
  }

  sendMessage(type, msg) {
    msg.type = type;
    msg.sender = this.role;
    msg.seq = this.seq++;
    if(msg.data) {
      msg.data = msg.data.toString('base64');
    }
    logger.debug(`[${msg.sender}] sending ${msg.type} ${msg.connectionId?(' -- connectiondId ' + msg.connectionId):''}`);
    this.ws.send(JSON.stringify(msg));
  }

  _onMessage(event) {
    const msg = JSON.parse(event.data);
    if(msg.data) {
      msg.data = Buffer.from(msg.data, 'base64');
    }
    this.onMessage(msg);
  }

  onMessage(message) {

    logger.debug(`[${this.role}] received ${message.type}`);

    if(message.type == 'info') {
      logger.info(message.message);
    }

    else if(message.type == 'error') {
      logger.error(message.message);
    }

    else if(message.type == 'data') {
      let connectionId = message.connectionId;
      let s = CONNECTIONS[connectionId];
      if(s) {
        if(message.data.length > 0) {
          s.write(message.data);
        }

        if(message.connection && message.connection == 'close') {
          s.destroy();
        }

      } else {
        this.sendMessage('error', {connectionId:connectionId, message:'unknown connectionId ' + connectionId });
      }

    }

    else if(message.type == 'open') {
      let connectionId = message.connectionId;
      let socket = new net.Socket();
      new SocketWrapper(this, socket, connectionId)
        .connect(message.dstPort, message.dstAddr);
    }

  }
}

class SocketWrapper {
  constructor(bridgeClient, socket, connectionId) {
    CONNECTIONS[connectionId] = this;
    const that = this;
    this.socket = socket;
    this.connectionId = connectionId;
    this.bridgeClient = bridgeClient;

    socket.on('connect', () => {
      logger.info('socket connected ' + socket.remoteAddress + ':' + socket.remotePort);
    });

    socket.on('data', (data) => {
      bridgeClient.sendMessage('data', {connectionId:that.connectionId, data:data});
    });

    socket.on('error', (err) => {
      console.log(err);
      bridgeClient.sendMessage('error', {connectionId:connectionId, error:err});
    });

    socket.on('end', () => {
      bridgeClient.sendMessage('data', {connectionId:connectionId, data:Buffer.from([]), connection:'close'});
      delete CONNECTIONS[connectionId];
    });
  }

  connect(port, addr) {
    this.socket.connect(port, addr);
  }

  sendConnectionRequest(port, addr) {
    this.bridgeClient.sendMessage('open', {connectionId:this.connectionId, dstAddr:addr, dstPort:port});
  }

  write(data) {
    this.socket.cork();
    this.socket.write(data);
    this.socket.uncork();
  }

  destroy() {
    this.socket.destroy();
    delete CONNECTIONS[this.connectionId];
  }
}

module.exports = {
  BridgeClient:BridgeClient,
  SocketWrapper:SocketWrapper
};
