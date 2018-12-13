
a quick&dirty set of scripts that allow me to use some tcp services in a particularly "network-hostile" environment.

requester.js : binds a local sockjs server and binds to a specified "websocket server"

server.js : a websocket server that bridges packets between 'requester' and 'target'

target.js : script that runs in the target environnement - connects to the websocket server and acts as relay for the tcp connections requested on requester side

```
Client Application <=> SOCKS <=> websocket server <=> target network
```

create windows executable for target.js :
---------
```
npm install -g pkg
pkg -t node8-win-x64 -o netbridge.exe target.js
```

a websocket server instance : wss://netbridge-dciujjeqfr.now.sh
