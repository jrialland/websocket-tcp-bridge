
a quick&dirty set of scripts that allow me to use some tcp services in a particularly "network-hostile" environment.

requester.js : binds a local sockjs server and binds to a specified "websocket server"

server.js : a websocket server that bridges packets between 'requester' and 'target'

target.js : script that runs in the target environnement - connects to the websocket server and acts as relay for the tcp connections requested on requester side

```
Client Application <=> SOCKS(requester.js) <=> websocket server.js <=> target network(target.js)
```

create windows executable for target.js :
---------
```
npm install -g pkg
pkg -t node8-win-x64 -o netbridge.exe target.js
```

My setup:

- requester.js runs as a service on my linux desktop, the ALL_PROXY env var is set to "socks://localhost:1080"
- server.js is installed on an external serveur with a public domain name
- targetJs is "compiled" as a windows executable and runs the target environment
