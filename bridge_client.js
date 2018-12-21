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
    this.pendingMessages = [];
    this.ws = this._createWs();
    const that = this;
    setInterval(() => {
      that._sendPending();
    }, 500);
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

  _sendPending() {
    if(this.ws.readyState == SockJS.OPEN) {
      let msgs = this.pendingMessages.slice(0);
      this.pendingMessages = [];
      this.ws.send(JSON.stringify(msgs));
    }
  }

  sendMessage(type, msg) {
    msg.type = type;
    msg.sender = this.role;
    if(msg.data) {
      msg.data = msg.data.toString('base64');
    }
    logger.debug(`[${msg.sender}] sending ${msg.type} ${msg.connectionId?(' -- connectiondId ' + msg.connectionId):''}`);
    this.pendingMessages.push(msg);
  }

  _onMessage(event) {
    const msgs = JSON.parse(event.data);
    for(var i =0; i<msgs.length; i++) {
      let msg = msgs[i];
      logger.debug(`receive ${msg.type} from ${msg.sender?msg.sender:'?'} ${msg.connectionId?(' -- connectiondId ' + msg.connectionId):''}`);

      if(msg.data) {
        msg.data = Buffer.from(msg.data, 'base64');
      }

      if(event.sender != this.role) {
          try{
            this.onMessage(msg);
          } catch(e) {
            logger.error('while handling message', e);
          }
      }
    }
  }

  onMessage(message) {
    console.log('received message' + JSON.stringify(message));
  }
}

module.exports = {
  BridgeClient:BridgeClient
};
