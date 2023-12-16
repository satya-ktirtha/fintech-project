import './App.css';
import { Client } from '@stomp/stompjs';
import { useEffect, useState } from 'react';
import axios from 'axios';

function Chatbox({ client, session, addChat, chat }) {
    const [message, setMessage] = useState("");

    const send = async () => {
        const res = await axios.post("http://localhost:8080/client-sendMessage", {
            type: "message",
            from: "user1",
            to: "localhost:3000",
            message: message
        });


        const msg = {
            type: "message",
            from: "user1",
            to: "localhost:3000",
            message: message
        }

        const newchat = [...chat];
        newchat.push(msg);
        addChat(newchat);
    }

    return (
      <div className="container" id="chat">
          <textarea wrap="hard" rows="4" cols="40" id="chatbox" onChange={(e) => setMessage(e.target.value)}/>
          <button type="button" id="sendButton" title="send message" onClick={send}>Send</button>
      </div>
    );
}

function Chat({ direction, content }) {
    if(direction === "left")
        return (
            <div className="container" id="userChat">
                <div className="bubble left">
                    {content}
                </div>
            </div>
        );
    else if(direction === "right")
        return (
            <div className="container" id="userChat">
                <div className="bubble right">
                    {content}
                </div>
            </div>
        );
}

function Chatarea({ client, session, chat }) {
    console.log(chat);

    const chats = chat.reduce((acc, e, i) => {
        acc.push(<Chat key={i} direction={e.from === "user1" ? "right" : "left"} content={e.message}/>)
        return acc;
    }, []);

    return (
        <div className="container" id="chatarea">
            {chats}
        </div>
    )
}

function App() {
    const [client, connectClient] = useState(undefined);
    const [session, updateSession] = useState(undefined);
    const [chat, updateChat] = useState([]);
    const [notified, setNotified] = useState(false);

    useEffect(() => {
        axios.get('http://localhost:8080/client-getMessage?user=user1')
            .then((res) => {
                console.log("Got chats");
                console.log(res);
            });


        connectClient(new Client({
            brokerURL: 'ws://localhost:8080/chatbot',
            onWebSocketError: (e) => {
                console.log("Web socket error", e);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        }));
    }, []);

    useEffect(() => {
        if(client) {
            client.onConnect = (frame) => {
                console.log("Connected", frame);

                client.subscribe("/user/client/connect", (message) => {
                    updateSession(message.body);

                    client.unsubscribe("/user/client/connect");
                })

                client.publish({
                    destination: '/chatbot-api/client-connect',
                    body: "user1"
                });
            }

            client.activate();

            const disconnect = async () => {
                client.deactivate();
                window.removeEventListener('beforeunload', disconnect);
            };

            window.addEventListener('beforeunload', disconnect);
        }
    }, [client]);

    useEffect(() => {
        if(session)
            client.subscribe("/client/notify/" + session, (message) => {
                console.log("notified of new msg");
                const msg = JSON.parse(message.body);
                setNotified(msg);
            });

    }, [session]);

    useEffect(() => {
        if(notified) {
            const newchat = [...chat];
            newchat.push(notified);
            updateChat(newchat);
        }
    }, [notified])

    return (
      <div id="root">
          <div className="container">
              <Chatarea client={client} session={session} chat={chat} />
              <Chatbox client={client} session={session} addChat={updateChat} chat={chat} />
          </div>
      </div>
    )
}

export default App
