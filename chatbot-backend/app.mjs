import cors from 'cors';
import axios from 'axios';
import express from 'express';
import { Client } from '@stomp/stompjs';
import WebSocket from 'ws';
import handle from './Handler.mjs'

Object.assign(global, { WebSocket });

let sessionId = "";
const API_KEY = "my key";
const app = express();

const memory = {};

const wsClient = new Client({
    brokerURL: 'ws://localhost:8080/api',
    connectHeaders: {
        key: API_KEY
    },
    onConnect: async (frame) => {
        console.log("Connected", frame);

        wsClient.subscribe("/user/server/connect", (message) => {
            const sessionId = JSON.parse(message.body).message;
            console.log("Connected with session ID", sessionId);

            wsClient.subscribe("/server/notify/" + sessionId, async (msg) => {
                console.log("Notifed of message", msg.body);

                const context = JSON.parse(msg.body);
                await handle({
                    type: context.type,
                    client: context.from,
                    message: context.message
                }, memory);
                console.log(memory);
            })
            wsClient.unsubscribe("/user/server/connect");
        })

        wsClient.publish({
            destination: '/chatbot-api/connect',
            body: API_KEY
        });
    },
    onWebSocketError: (e) => {
        console.log("Web socket error", e);
    },
    onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
    }

});

app.use(cors({
    origin: 'http://localhost:8080'
}));

app.use(express.json());

app.get('/send', async (req, res) => {

    //await axios.post('http://localhost:8080/server', "sfasdf");

    const result = await axios.post("http://localhost:8080/sendMessage", {
        apiKey: API_KEY,
        type: "message",
        to: "user1", 
        message: "message from server"
    });

    console.log(result);

    res.json({
        status: 0
    });
});

app.get('/sendMessage', async (req, res) => {
    const result = await axios.post("http://localhost:8080/sendMessage", {
        from: "another server",
        to: "client", 
        message: "message"
    });

    res.json({status: 0});
});

app.post('/hook', async (req, res) => {
    const obj = req.body;

    console.log(obj);

    //await axios.post("http://localhost:8080/server-sendMessage", {
        //to: obj.from,
        //from: 'http://localhost:3000',
        //message: 'server response'
    //});

    res.json({status: 0});
});

app.listen(3000, () => {
    // TODO establish ws connection with chatbot API 
    console.log("App listening on 3000");
    wsClient.activate();
});
