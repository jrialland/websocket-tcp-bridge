
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

My setup:

- requester.js and hpts run as services on my linux desktop, the http_proxy and https_proxy env vars are set to "http://localhost:80"
- server.js is installed on an external server I rent for less that 3€/month
- target.js is "compiled" as a windows executable and runs in the target environment
