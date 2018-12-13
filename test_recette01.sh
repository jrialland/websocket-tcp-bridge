#!/bin/bash

node requester.js 1080 wss://10.1.7.17 &
requester_pid=$!
sleep 1

node target.js wss://10.1.7.17 &
target_pid=$!

function onexit {
   kill -9 $requester_pid
   kill -9 $target_pid
}

trap onexit EXIT
curl -x socks5h://localhost:1080 https://www.google.com
