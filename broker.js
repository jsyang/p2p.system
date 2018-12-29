const express    = require('express');
const PeerServer = require('peer').PeerServer;

const visibleToAllConnections = {};
const activeConnections       = {};
const port                    = process.env.PORT;

const server = PeerServer({port, path: '/'});
server.use(express.json());

const ANYONE = '*';

server.on('connection', id => activeConnections[id] = []);

// Once your whitelist is registered, it is used to form the GET response:
// registered id that do not include the GET requester's id will not be part
// of that response
server.post('/whitelist', (req, res) => {
    const {id, peerWhitelist} = req.body;
    if (activeConnections[id]) {
        activeConnections[id] = peerWhitelist;

        if (peerWhitelist.includes(ANYONE)) {
            visibleToAllConnections[id] = true;
        }

        res.status(200).send();
    } else {
        res.status(400).send(`User with id ${id} already active in lobby.`);
    }
});

server.post('/peers', (req, res) => {
    const {id} = req.body;

    if (id && activeConnections[id]) {
        res.json(
            Object.keys(activeConnections).filter(activeId => {
                return visibleToAllConnections[activeId] ||
                    activeConnections[activeId].includes(id);
            })
        );
    }
});

const chat = {};
chat.SIZE  = 10;
chat.text  = new Array(chat.SIZE).fill('');
chat.ERROR = ['Error: server did not receive your message!'];

server.post('/lobby', (req, res) => {
    const {id, message} = req.body;

    if (activeConnections[id]) {
        const newMessage = message.trim();

        if (newMessage && newMessage.length < 128) {
            chat.text.push(`${id}: ${newMessage}`);
            chat.text.shift();
        }

        res.status(200).json(chat.text);

    } else {
        res.status(400).json(chat.ERROR);
    }
});

server.on('disconnect', id => delete activeConnections[id]);

console.log(`P2P broker listening on port ${port}!`);
