#!/bin/bash

node server.js 8888 &
server_pid=$!
sleep 1

node requester.js 1080 http://localhost:8888/bridge &
requester_pid=$!
sleep 1

node target.js http://localhost:8888/bridge &
target_pid=$!
sleep 1

function onexit {
   kill -9 $server_pid
   kill -9 $requester_pid
   kill -9 $target_pid

}

trap onexit EXIT
curl -x socks5h://localhost:1080 https://www.google.com