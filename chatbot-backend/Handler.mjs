import axios from 'axios';

// TODO would be handled with a config file
const API_KEY = "my key";

async function sendMessage(context, message) {
    const result = await axios.post("http://localhost:8080/sendMessage", {
        apiKey: API_KEY,
        type: "message",
        to: context.client,
        message: message
    })

    return result;
}

async function handle(context, memory) {
    if(Object.keys(memory).length == 0 && context.message !== "menu") {
        await sendMessage(context, "1. I would like to know what market to invest in");
        memory['invest'] = null;
        return;
    }

    if(memory['invest'] === null) {
        if(context.message !== '1') {
            await sendMessage(context, "Invalid choice");
            return;
        }

        await sendMessage(context, "Would you like a high or low risk market?");
        await sendMessage(context, "1. High");
        await sendMessage(context, "2. Low");
        memory['invest'] = context.message;
        memory['volatility'] = null;
        return;
    }

    if(memory['volatility'] === null) {
        if(context.message.toLowerCase() !== '1' && context.message.toLowerCase() !== '2') {
            await sendMessage(context, "invalid choice");
            return;
        }

        await sendMessage(context, "How long would you invest for?");
        await sendMessage(context, "1. Less than five years");
        await sendMessage(context, "2. More than five years");

        memory['volatility'] = context.message === '1' ? 'high' : 'low';
        memory['length'] = null;

        return;
    }

    if(memory['length'] === null) {
        if(context.message.toLowerCase() !== '1' && context.message.toLowerCase() !== '2') {
            await sendMessage(context, "invalid choice");
            return;
        }

        memory['length'] = context.message === '1' ? 'short' : 'long';

        await sendMessage(context, "We recommend you to invest in [market name] for [duration] years");

        return;
    }
}

export default handle;
