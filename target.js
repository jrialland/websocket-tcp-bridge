const logger = require('./logger');
const net = require('net');
const minimist = require('minimist');
const bc = require('./bridge_client');

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
const bridgeClient = new bc.BridgeClient(args.u, 'target');
