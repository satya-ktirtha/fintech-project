import QueryBuilder from './query.mjs';
import { executeBuilder } from './db.mjs';
import fs from 'fs';
import path from 'path';

const ANTAR = 1;
const LINTAS = 2;
const JEMPUT = 3;

class Handler {

    constructor(field) {
        this.field = field;
    }

    async handle(session, data, child) {
        try {
            if(data.message_body.toUpperCase() === 'EXIT') {
                sendMessage(session, "Ketik MENU untuk mulai lagi");
                await deleteSession(session.number);
                return;
            }

            if(session.data[this.field] === undefined) {
                await this.notify(session);
                const sessionData = session.data;
                sessionData[this.field] = null;
                await renewSession(session, data.timestamp);
                return;
            } else if(session.data[this.field] === null) {
                const value = await child.check(session, data);
                if(value !== false) {
                    await child.update(session, data, value);
                } else {
                    await this.notify(session);
                    return;
                }
            }

            if(this.next !== undefined && this.next !== null) {
                await this.next.handle(session, data);
            }
        } catch(e) {
            throw e;
        }
    }

    async update(session, data, value) {
        session.data[this.field] = value;
        await renewSession(session, data.timestamp);
    }

    async notify(session) {
        await sendMessage(session, `${this.message}\natau ketik EXIT untuk berhenti`);
    }

    setNotification(message) {
        this.message = message;
    }

    setNext(next) {
        this.next = next;
    }
}

class BaseHandler extends Handler {
    constructor(field) {
        super(field);
    }

    async handle(session, data) {
       await super.handle(session, data, this);
    }
}

class DateTimeHandler extends BaseHandler {
    constructor(prompt) {
        super('date');

        this.prompt = prompt;
        this.setNotification(this.prompt + '\nFormat: MM/DD/YYYY HH:MM');
    }

    async update(session, data, value) {
        await super.update(session, data, value);
    }

    check(session, data) {
        const value = data.message_body;
        const timestamp = new Date(value).getTime();
        if(isNaN(timestamp) || new Date(value).toString() === "Invalid Date") {
            this.setNotification("Format tanggal dan waktu salah");
            return false;
        }

        return new Date(timestamp);
    }
}

class StringHandler extends BaseHandler {
    constructor(field, name, check=undefined) {
        super(field);

        this.name = name;
        this.customCheck = check || ((session, data, context) => data.message_body);
        this.prompt = `Ketik ${name}`;
        this.setNotification(this.prompt);
    }

    async check(session, data) {
        if(data.message_body.length === 0) {
            this.setNotification(`${this.name} tidak boleh kosong`);
            return false;
        }

        return await this.customCheck(session, data, this);
    }

    async update(session, data, value) {
        await super.update(session, data, value);
    }
}

class NumberHandler extends BaseHandler {
    constructor(field, name) {
        super(field);

        this.name = name;
        this.prompt = `Ketik ${name.toLowerCase()}`;
        this.setNotification(this.prompt);
    }

    check(session, data) {
        const value = parseInt(data.message_body);
        if(isNaN(value)) {
            this.setNotification(`${this.name} salah`);
            return false;
        }

        return value;
    }
}

class DecimalHandler extends BaseHandler {
    constructor(field, name, prompt) {
        super(field);

        this.name = name;
        if(!prompt) {
            this.prompt = `Ketik ${name.toLowerCase()}`;
        } else {
            this.prompt = prompt;
        }

        this.setNotification(this.prompt);
    }

    check(session, data) {
        const value = parseFloat(data.message_body);
        if(isNaN(value)) {
            this.setNotification(`${this.name} salah`);
            return;
        }
    }
}


class ListInputHandler extends BaseHandler {
    constructor(field, name, separator) {
        super(field);

        this.name = name;
        this.separator = separator;
        const msg = separator === "\n" ? "garis baru" : separator;
        this.setNotification(`Masukan ${name} (dipisah dengan ${msg})`)
    }

    check(session, data) {
        if(data.message_body.length === 0) {
            this.setNotification(`${this.name} tidak boleh kosong`);
            return false;
        }

        return data.message_body;
    }
    
    async update(session, data, value) {
        await super.update(session, data, value);
    }
}

class ChoiceHandler extends BaseHandler {
    constructor(name, choices) {
        super(name);

        this.choices = choices;
        this.menu = "";

        for(const i in this.choices) {
            this.menu += `${parseInt(i) + 1}. ${this.choices[i]}\n`;
        }

        this.setNotification(`Pilih salah satu:\n${this.menu}`);
    }

    check(session, data) {
        const value = parseInt(data.message_body);

        if(isNaN(value) || value < 1 || value > this.choices.length) {
            this.setNotification(`Pilihan salah, coba lagi:\n${this.menu}`);
            return false;
        }

        return value;
    }

    async update(session, data, value) {
        await super.update(session, data, value);
    }
}

async function handle(session, data) {
    /*
     * Getting user's action (anter, jemput, etc).
     * When adding or removing a menu item:
     * 1. Add appropriate menu list into choices
     * 2. Increase the check for the range of choice
     *
     * There is no need to change anything else
     */
    // Add or remove menu items here
    const choices = "1. Antar Barang\n2. Jemput Barang\n3. Lihat Manifest";
    const initialMessage = "Pilih salah satu:\n" + choices;

    if(session.type === -1) {
        if(data.message_body.toUpperCase() !== "MENU") {
            await sendMessage(session, "Ketik MENU untuk mulai");
        } else {
            await sendMessage(session, initialMessage);
            session.type = 0;
            await renewSession(session, data.timestamp);
        }
    } else if(session.type === 0) {
        const choice = parseInt(data.message_body);
        // Change the range for choice here
        if(!isNaN(choice) && choice === 0 && session.user.role === "ADMIN") {
            session.type = 100;
            await renewSession(session, data.timestamp);
        } else if(isNaN(choice) || choice < 1 || choice > 3) {
            await sendMessage(session, initialMessage);
        } else {
            session.type = choice;
            await renewSession(session, data.timestamp);
        }
    } 

    // Use appropriate handlers here
    // Change depending on needs
    if(session.type === 1) {
        await getSendHandler().handle(session, data); // should be built with handlers
    } else if(session.type === 2) {
        await getFetchHandler().handle(session, data); // should be built with handlers
    } else if(session.type === 3) {
        await getManifestListHandler().handle(session, data); // should be built with handlers
    } else if(session.type === 100) {
        await getAdminHandler().handle(session, data); // should be built with handlers
    }
}

export default handle;
export {
    getSendHandler
}
