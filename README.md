# p2p.system

This is a P2P networking library that contains both the peer-client `peer.js`
and the broker server `broker.js` to be used together as a system for discovering
and connecting to other applications that use this system.

Usage: `yarn add p2p.system`

It is built upon PeerJS and adds:
- connection security (via whitelist) 
- peer discovery
- lobby chat

## Server API

The `broker.js` module extends the [PeerJS PeerServer](https://github.com/peers/peerjs-server) with 3 additional endpoints:

- POST `/whitelist` sets your own whitelist of the peers that can see you on this server
- POST `/peers` retrieves the list of peers that have whitelisted your id
- POST `/lobby` (can) send a message to the lobby chat and returns the current chat messages

Please take a look inside the [source for further details](https://github.com/jsyang/p2p.system/blob/master/broker.js), it is a mere 72 lines.

## Client API

The `peer.js` module exports an object with functions organized by
the stages of a p2p connection:

#### 1. Bind handlers for various connection events
- `setOnConnectedToPeer(:function)` sets callback for when peer connection is successful
- `setOnDataFromPeer(:function)` sets callback for when data is received from a peer
- `setOnDisconnectFromPeer(:function)` sets callback for when a peer disconnects
- `setOnDisconnectFromBroker(:function)` sets callback for when connection to broker was lost unintentionally
  
#### 2. Set parameters for connections
- `setBrokerURL(:string)` set which broker server to connect to initially, for discovering peers 
- `setPeerId(:string)` set your own "username"
- `setPeerWhitelist(:csv-string)` set your peer whitelist (list of "usernames" allowed to connect to you)

#### 3. Connect to broker to discover peers and let them discover you
- `connectToBroker()`
- `postLobbyChat(:string)` send chat messages to others in the lobby
- `getActivePeers()` retrieve list of peers that allowed you to see them

#### 4. Connect to a peer and send data to them
- `connectToPeer(:string)` attempt to establish a peer connection to a specific peer
- `sendToPeer(:peerjs-data-channel-object)` send some data to the connected peer (object|blob|array|...)

#### 5. Get your own id and that of the current / last P2P connection
- `getPeerIds()` returns an object containing your own "username" and that of the peer, to whom you last / currently are connected

Please take a look inside the [source for further details](https://github.com/jsyang/p2p.system/blob/master/peer.js), it is a mere 240 lines.

## Sample application

Here is a simple real-time artillery game that makes use of p2p.system:
https://github.com/jsyang/artillery-p2p

## License

MIT licensed.