
a quick&dirty set of scripts that allow me to use some tcp services in a particularly "network-hostile" environment.

requester.js : binds a local sockjs server and binds to a specified "middleman server"

server.js : a sockjs-enabled server that bridges packets between 'requester' and 'target'

target.js : script that runs in the target environnement - connects to the websocket server and acts as relay for the tcp connections requested on requester side.

http to socks proxy can be achieved on requested side using "http-proxy-to-socks"

```
npm install -g http-proxy-to-socks
hpts -s 127.0.0.1:1080 -p 8080
```

Client Application <=> SOCKS(requester.js) <=> websocket server.js <=> target network(target.js)
```

How to create a windows executable for target.js :
---------
```
npm install -g pkg
pkg -t node8-win-x64 -o target.exe target.js
```

