import Peer from 'peerjs';
import {getQuerystringParams} from './helpers';
import {StorageKeysP2P} from './enums';

const {brokerURL} = getQuerystringParams();
let BROKER_URL    = brokerURL;
const ANYONE      = '*';

const connections = {
    broker: null,
    peer:   null
};

function setBrokerURL(url) {
    BROKER_URL = url;
}

// Event: peer disconnects from you
let onDisconnectFromPeer = new Function();

function setOnDisconnectFromPeer(onDisconnect) {
    onDisconnectFromPeer = onDisconnect;
}

// Event: received data from peer
let onDataFromPeer = new Function();

function setOnDataFromPeer(onData) {
    onDataFromPeer = onData;
}

function disconnectFromBrokerIntentionally() {
    const oldOnDisconnectFromBrokerFunc = onDisconnectFromBroker;

    setOnDisconnectFromBroker(new Function());

    // Kill the connection to the broker as soon as our peer connection is opened
    // this is on purpose, so the onDisconnect should not be fired here
    connections.broker.disconnect();
    connections.broker.off('open');
    connections.broker.off('connection');
    connections.broker.off('disconnected');

    setOnDisconnectFromBroker(oldOnDisconnectFromBrokerFunc);
}

let onConnectedToPeer = new Function();

export function setOnConnectedToPeer(onConnected) {
    onConnectedToPeer = onConnected;
}

let lastConnectedPeer;
// Event: a peer attempts to connect to you
// If whitelisted, this connection will remain open, otherwise will immediately close
function onOpen() {
    const {peer} = connections.peer;

    // Ignore all non-whitelisted connections
    if (peerWhitelist.includes(ANYONE) || peerWhitelist.includes(peer)) {
        disconnectFromBrokerIntentionally();

        onConnectedToPeer();
        lastConnectedPeer = peer;
    }
}


let peerId        = localStorage.getItem(StorageKeysP2P.UserId) || Date.now().toString(16);
let peerWhitelist = localStorage.getItem(StorageKeysP2P.Whitelist) || '*';
if (peerWhitelist && peerWhitelist.length) {
    peerWhitelist = peerWhitelist.split(',');
}

function setPeerId(pId) {
    if (pId) {
        peerId = pId;
    } else {
        peerId = prompt(
            'Set your user id',
            localStorage.getItem(StorageKeysP2P.UserId) || Date.now().toString(16)
        ) || Date.now().toString(16);
    }

    localStorage.setItem(StorageKeysP2P.UserId, peerId);
}

function setPeerWhitelist(whitelist) {
    if (whitelist) {
        peerWhitelist = whitelist;
    } else {
        peerWhitelist = (prompt('Users allowed to connect to you (comma-separated, use * for anyone)',
            localStorage.getItem(StorageKeysP2P.Whitelist) || '*'
        ) || '').split(',');
    }

    localStorage.setItem(StorageKeysP2P.Whitelist, peerWhitelist.join(','));
}

const bindPeerConnectionEvents = potentialConnection => {
    potentialConnection.on('data', onDataFromPeer);
    potentialConnection.on('close', () => {
        connections.peer = null;
        onDisconnectFromPeer();
    });
};

const connectToPeer = toPeerId => {
    if (toPeerId === peerId) {
        return Promise.reject('Cannot connect to yourself!');
    }

    return new Promise((resolve, reject) => {
        if (toPeerId) {
            const potentialPeerConnection = connections.broker.connect(toPeerId);
            potentialPeerConnection.on('open', () => {
                lastConnectedPeer = toPeerId;
                connections.peer  = potentialPeerConnection;
                disconnectFromBrokerIntentionally();
                resolve(connections);
            });
            bindPeerConnectionEvents(potentialPeerConnection);
        } else {
            reject(new Error('No peer id given for connection attempt!'));
        }
    });

};

const sendToPeer = data => {
    if (connections.peer) {
        connections.peer.send(data);
    }
};

function getActivePeers() {
    return fetch(`${BROKER_URL}/peers`, {
        method:  'post',
        body:    JSON.stringify({id: peerId}),
        headers: {'Content-Type': 'application/json'}
    })
        .then(res => res.json());
}

function postLobbyChat(message) {
    return fetch(`${BROKER_URL}/lobby`, {
        method:  'post',
        body:    JSON.stringify({id: peerId, message}),
        headers: {'Content-Type': 'application/json'}
    })
        .then(res => res.json());
}

function sendWhitelistToBroker() {
    return fetch(`${BROKER_URL}/whitelist`,
        {
            method:  'post',
            body:    JSON.stringify({id: peerId, peerWhitelist}),
            headers: {'Content-Type': 'application/json'}
        }
    );
}

// Event: broker connection was lost unintentionally
let onDisconnectFromBroker = new Function();

function setOnDisconnectFromBroker(onDisconnect) {
    onDisconnectFromBroker = onDisconnect;
}

function connectToBroker() {
    connections.broker = new Peer(peerId, {
        host:   BROKER_URL.split('//')[1],
        port:   /https/g.test(BROKER_URL) ? 443 : 80,
        path:   '/',
        secure: /https/g.test(BROKER_URL)
    });


    return new Promise((resolve, reject) => {
        const timeoutFetch = setTimeout(reject, 30000);

        connections.broker.on('open', () => {
            // Connection to broker successful
            sendWhitelistToBroker()
                .then(() => clearTimeout(timeoutFetch))
                .then(getActivePeers)
                .then(resolve)
                .catch(reject);
        });

        connections.broker.on('connection', connectionPeer => {
            // Connection with peer established
            connections.peer = connectionPeer;
            connectionPeer.on('open', onOpen);
            bindPeerConnectionEvents(connectionPeer);
        });

        connections.broker.on('disconnected', () => {
            // Connection to broker lost
            // Attempt to reconnect if it was lost unintentionally
            connections.broker.destroy();
            onDisconnectFromBroker();
        });

    });
}

function getPeerIds() {
    return {
        self:  peerId,
        other: connections.peer && connections.peer.peer || lastConnectedPeer
    };
}

export default {
    // 0. Bind handlers for various connection events
    setOnConnectedToPeer,
    setOnDataFromPeer,
    setOnDisconnectFromPeer,
    setOnDisconnectFromBroker,

    // 1. Set user id and whitelist of trusted users you want to be able to connect to you
    setBrokerURL,
    setPeerId,
    setPeerWhitelist,

    // 2. Connect to broker to discover peers and let them discover you
    connectToBroker,
    postLobbyChat,      // optionally, send chat messages to others in the lobby
    getActivePeers,     // optionally, retrieve list of peers that allow you to see them

    // 3. Connect to a peer and send data to them
    connectToPeer,
    sendToPeer,

    // 4. Get your own id and that of the current / last P2P connection
    getPeerIds
};
