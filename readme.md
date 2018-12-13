
a quick&dirty set of scripts that allow me to connect to use various tcp in a particularly hostile network configuration.

requester.js : binds a local SOCKS server and binds to a specified "websocket server"

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
