const logger = require('./logger');
const SockJS = require('sockjs-client');
const minimist = require('minimist');
//configuration proxy
const args = minimist(process.argv.slice(2));
if(args.p) {
  logger.info('using http proxy : ' + args.p)
  require('proxying-agent').globalize(args.p.trim());
}

//classe d'envoi de messages
class BridgeClient {

  constructor(url, role) {
    this.url = url;
    this.role = role;
    this.ws = this._createWs();
    this.seq = 1;
    this.incomingMessages = [];
    const that = this;
    setInterval(this._dispatch.bind(this), 1000);
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
    this.incomingMessages.push(msg);
  }

  _dispatch() {
    let msgs = this.incomingMessages.slice(0);
    this.incomingMessages = [];
    msgs.sort( (a,b) => {
      return a.seq - b.seq;
    });
    msgs.forEach(msg => {
      try {
        this.onMessage(msg);
      } catch(e) {
        logger.error(e);
      }
    });
  }

  onMessage(message) {
    console.log('received message' + JSON.stringify(message));
  }
}

module.exports = {
  BridgeClient:BridgeClient
};
