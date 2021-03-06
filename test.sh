#!/bin/bash

node server.js -p 8888 &
server_pid=$!

#node target.js -u http://vps627814.ovh.net/bridge &
node target.js -u http://localhost:8888/bridge &
target_pid=$!
sleep 2
#node requester.js -s 1080 -u http://vps627814.ovh.net/bridge &
node requester.js -s 1080 -u http://localhost:8888/bridge &
requester_pid=$!

sleep 5

function onexit {
   kill -9 $server_pid
   kill -9 $requester_pid
   kill -9 $target_pid

}

trap onexit EXIT
curl -x socks5h://localhost:1080 https://www.google.com
