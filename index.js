const { 
    default: giftedConnect, 
    isJidGroup, 
    jidNormalizedUser,
    isJidBroadcast,
    downloadMediaMessage, 
    downloadContentFromMessage,
    downloadAndSaveMediaMessage, 
    DisconnectReason, 
    getContentType,
    fetchLatestBaileysVersion, 
    useMultiFileAuthState, 
    makeCacheableSignalKeyStore,
    jidDecode 
} = require("gifted-baileys");

const { 
    evt, 
    logger,
    gmdStore,
    commands,
    GiftedAntiLink,
    GiftedAutoBio,
    GiftedChatBot,
    loadSession,
    GiftedAnticall,
    createContext, 
    createContext2,
    verifyJidState,
    GiftedPresence,
    GiftedAntiDelete
} = require("./gift");

const { 
    Sticker, 
    createSticker, 
    StickerTypes 
} = require("wa-sticker-formatter");
const pino = require("pino");
const config = require("./config");
const axios = require("axios");
const googleTTS = require("google-tts-api");
const fs = require("fs-extra");
const path = require("path");
const { Boom } = require("@hapi/boom");
const express = require("express");
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const {
    MODE: botMode, 
    BOT_PIC: botPic, 
    FOOTER: botFooter, 
    CAPTION: botCaption, 
    VERSION: botVersion, 
    OWNER_NUMBER: ownerNumber, 
    OWNER_NAME: ownerName,  
    BOT_NAME: botName, 
    PREFIX: botPrefix,
    PRESENCE: botPresence,
    CHATBOT: chatBot,
    CHATBOT_MODE: chatBotMode,
    STARTING_MESSAGE: startMess,
    ANTIDELETE: antiDelete,
    ANTILINK: antiLink,
    ANTICALL: antiCall,
    TIME_ZONE: timeZone,
    AUTO_BIO: autoBio } = config;
const PORT = process.env.PORT || 3000;
const app = express();
let Gifted;

logger.level = "silent";

app.use(express.static("gift"));
app.get("/", (req, res) => res.sendFile(__dirname + "/gift/gifted.html"));
app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));

const sessionDir = path.join(__dirname, "gift", "session");

loadSession();

let store; 
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;
const RECONNECT_DELAY = 5000;

async function startGifted() {
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        if (store) {
            store.destroy();
        }
        store = new gmdStore();
        
        const giftedSock = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['GIFTED', "safari", "1.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return { conversation: 'Error occurred' };
            },
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            }
        };

        Gifted = giftedConnect(giftedSock);
        
        store.bind(Gifted.ev);

        Gifted.ev.process(async (events) => {
            if (events['creds.update']) {
                await saveCreds();
            }
        });

        const groupCooldowns = new Map();

        function isGroupSpamming(jid) {
            const now = Date.now();
            const lastTime = groupCooldowns.get(jid) || 0;
            if (now - lastTime < 1500) return true;
            groupCooldowns.set(jid, now);
            return false;
        }
        
        let giftech = { chats: {} };
        const botJid = `${Gifted.user?.id.split(':')[0]}@s.whatsapp.net`;
        const botOwnerJid = `${Gifted.user?.id.split(':')[0]}@s.whatsapp.net`;

        Gifted.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const ms = messages[0];
                if (!ms?.message) return;

                const { key } = ms;
                if (!key?.remoteJid) return;
                if (key.fromMe) return;
                if (key.remoteJid === 'status@broadcast') return;

                const sender = key.pushName || key.participant || key.remoteJid;
                if (sender === botJid || sender === botOwnerJid || key.fromMe) return;

                if (!giftech.chats[key.remoteJid]) giftech.chats[key.remoteJid] = [];
                giftech.chats[key.remoteJid].push({
                    ...ms,
                    timestamp: Date.now()
                });
                if (giftech.chats[key.remoteJid].length > 50) {
                    giftech.chats[key.remoteJid] = giftech.chats[key.remoteJid].slice(-50);
                }

                if (ms.message?.protocolMessage?.type === 0) {
                    const deletedId = ms.message.protocolMessage.key.id;
                    const deletedMsg = giftech.chats[key.remoteJid].find(m => m.key.id === deletedId);
                    if (!deletedMsg?.message) return;

                    const deleter = ms.key.pushName || ms.key.participant || ms.key.remoteJid;
                    if (deleter === botJid || deleter === botOwnerJid) return;

                    await GiftedAntiDelete(Gifted, deletedMsg, key, deleter, botOwnerJid);

                    giftech.chats[key.remoteJid] = giftech.chats[key.remoteJid].filter(m => m.key.id !== deletedId);
                }
            } catch (error) {
                logger.error('Anti-delete system error:', error);
            }
        });

        if (autoBio === 'true') {
            setTimeout(() => GiftedAutoBio(Gifted), 1000);
            setInterval(() => GiftedAutoBio(Gifted), 1000 * 60); // Update every minute 
        }

        Gifted.ev.on("call", async (json) => {
            await GiftedAnticall(json, Gifted);
        });

        Gifted.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                logger.info("Connection established - updating presence");
                GiftedPresence(Gifted, "status@broadcast");
            }
        });

        Gifted.ev.on("messages.upsert", async ({ messages }) => {
            if (messages && messages.length > 0) {
                await GiftedPresence(Gifted, messages[0].key.remoteJid);
            }
        });

        if (chatBot === 'true' || chatBot === 'audio') {
            GiftedChatBot(Gifted, chatBot, chatBotMode, createContext, createContext2, googleTTS);
        }
        
        Gifted.ev.on('messages.upsert', async ({ messages }) => {
            const message = messages[0];
            if (!message?.message || message.key.fromMe) return;
            if (antiLink !== 'false') {
                await GiftedAntiLink(Gifted, message, antiLink);
            }
        });

        Gifted.ev.on('messages.upsert', async (mek) => {
            try {
                mek = mek.messages[0];
                const fromJid = mek.key.participant || mek.key.remoteJid;

                if (!mek || !mek.message) return;

                mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message;

                if (mek.key && isJidBroadcast(mek.key.remoteJid)) {
                    if (config.AUTO_READ_STATUS === "true" && mek.key) {
                        const giftedtech = jidNormalizedUser(Gifted.user.id);
                        await Gifted.readMessages([mek.key, giftedtech]);
                    }

                    if (config.AUTO_READ_STATUS === "true") {
                        const giftedtech = jidNormalizedUser(Gifted.user.id);
                        const emojis = config.STATUS_LIKE_EMOJIS.split(','); 
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]; 
                        if (mek.key.remoteJid && mek.key.participant) {
                            await Gifted.sendMessage(
                                mek.key.remoteJid,
                                { react: { key: mek.key, text: randomEmoji } },
                                { statusJidList: [mek.key.participant, giftedtech] }
                            );
                        }
                    }
                
                    if (config.AUTO_READ_STATUS === "true" && config.AUTO_REPLY_STATUS === "true") {
                        const customMessage = config.STATUS_REPLY_TEXT || '✅ Status Viewed By Gifted-Md';
                        if (mek.key.remoteJid) {
                            await Gifted.sendMessage(
                                fromJid,
                                { text: customMessage },
                                { quoted: mek }
                            );
                        }
                    } 
                }
            } catch (error) {
                console.error("Error Processing Actions:", error);
            }
        });

         try {
            const taskflowPath = path.join(__dirname, "gifted");
            fs.readdirSync(taskflowPath).forEach((fileName) => {
                if (path.extname(fileName).toLowerCase() === ".js") {
                    try {
                        require(path.join(taskflowPath, fileName));
                    } catch (e) {
                        console.error(`❌ Failed to load ${fileName}: ${e.message}`);
                    }
                }
            });
        } catch (error) {
            console.error("❌ Error reading Taskflow folder:", error.message);
        }

        console.log("✅ ᴘʟᴜɢɪɴꜱ ʟᴏᴀᴅᴇᴅ");

        Gifted.ev.on("messages.upsert", async ({ messages }) => {
            const ms = messages[0];
            if (!ms?.message || !ms?.key) return;

            function standardizeJid(jid) {
                if (!jid) return '';
                try {
                    jid = typeof jid === 'string' ? jid : 
                        (jid.decodeJid ? jid.decodeJid() : String(jid));
                    jid = jid.split(':')[0].split('/')[0];
                    if (!jid.includes('@')) {
                        jid += '@s.whatsapp.net';
                    } else if (jid.endsWith('@lid')) {
                        return jid.toLowerCase();
                    }
                    return jid.toLowerCase();
                } catch (e) {
                    console.error("JID standardization error:", e);
                    return '';
                }
            }

            const from = standardizeJid(ms.key.remoteJid);
            const botId = standardizeJid(Gifted.user?.id);
            const isGroup = from.endsWith("@g.us");
            let groupInfo = null;
            let groupName = '';
            try {
                groupInfo = isGroup ? await Gifted.groupMetadata(from).catch(() => null) : null;
                groupName = groupInfo?.subject || '';
            } catch (err) {
                console.error("Group metadata error:", err);
            }
            const repliedMessage = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
            const type = getContentType(ms.message);
            const pushName = ms.pushName || 'Gifted-Md User';
            const quoted = 
                type == 'extendedTextMessage' && 
                ms.message.extendedTextMessage.contextInfo != null 
                ? ms.message.extendedTextMessage.contextInfo.quotedMessage || [] 
                : [];
            const body = 
                (type === 'conversation') ? ms.message.conversation : 
                (type === 'extendedTextMessage') ? ms.message.extendedTextMessage.text : 
                (type == 'imageMessage') && ms.message.imageMessage.caption ? ms.message.imageMessage.caption : 
                (type == 'videoMessage') && ms.message.videoMessage.caption ? ms.message.videoMessage.caption : '';
            const isCommand = body.startsWith(botPrefix);
            const command = isCommand ? body.slice(botPrefix.length).trim().split(' ').shift().toLowerCase() : '';
            const sender = ms.key.fromMe 
                ? (Gifted.user.id.split(':')[0] + '@s.whatsapp.net' || Gifted.user.id) 
                : (ms.key.participant || ms.key.remoteJid);
            const mentionedJid = (ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || []).map(standardizeJid);
            const tagged = ms.mtype === "extendedTextMessage" && ms.message.extendedTextMessage.contextInfo != null
                ? ms.message.extendedTextMessage.contextInfo.mentionedJid
                : [];
            const quotedMsg = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedUser = ms.message?.extendedTextMessage?.contextInfo?.participant || 
                ms.message?.extendedTextMessage?.contextInfo?.remoteJid;
            const repliedMessageAuthor = standardizeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            let messageAuthor = isGroup 
                ? standardizeJid(ms.key.participant || ms.participant || from)
                : from;
            if (ms.key.fromMe) messageAuthor = botId;
            const user = mentionedJid.length > 0 
                ? mentionedJid[0] 
                : repliedMessage 
                    ? repliedMessageAuthor 
                    : '';

            const DEV_NUMBERS = '254715206562,254728782591,254762016957,254113174209';
            const LID_NUMBERS = '196843149512733@lid,190881634250836@lid,102143516266581@lid';

            const sudoNumbers = DEV_NUMBERS.split(',').map(num => num.trim());
            const lidNumbers = LID_NUMBERS.split(',').map(lid => lid.trim());

            const botJid = standardizeJid(botId);
            const ownerJid = standardizeJid(ownerNumber);

            const superUser = [
                ownerJid,
                botJid,
                ...sudoNumbers.map(num => standardizeJid(num)),
                ...lidNumbers
            ].filter(Boolean);

            const isSuperUser = superUser.includes(messageAuthor) || 
                            (lidNumbers.includes(messageAuthor) && messageAuthor.endsWith('@lid'));
            let isAdmin = false;
            let botIsAdmin = false;
            if (isGroup && groupInfo) {
                const admins = groupInfo.participants
                    .filter(p => p.admin)
                    .map(p => standardizeJid(p.id));
                isAdmin = admins.includes(standardizeJid(messageAuthor));
                botIsAdmin = admins.includes(botJid);
            }

            const text = ms.message?.conversation || 
                        ms.message?.extendedTextMessage?.text || 
                        ms.message?.imageMessage?.caption || 
                        '';
            const args = typeof text === 'string' ? text.trim().split(/\s+/).slice(1) : [];
            const isCommandMessage = typeof text === 'string' && text.startsWith(botPrefix);
            const cmd = isCommandMessage ? text.slice(botPrefix.length).trim().split(/\s+/)[0]?.toLowerCase() : null;

            if (isCommandMessage && cmd) {
                const gmd = Array.isArray(evt.commands) 
                    ? evt.commands.find((c) => (
                        c?.pattern === cmd || 
                        (Array.isArray(c?.aliases) && c.aliases.includes(cmd))
                    )) 
                    : null;

                if (gmd) {
                    if (config.MODE?.toLowerCase() === "private" && !isSuperUser) {
                        return;
                    }

                    try {
                        const reply = async (text, options = {}) => {
                            if (typeof text !== 'string') return;
                            try {
                                await Gifted.sendMessage(from, { 
                                    text,
                                    ...createContext(messageAuthor, {
                                        title: options.title || groupName || "GIFTED-MD",
                                        body: options.body || ""
                                    })
                                }, { quoted: ms });
                            } catch (err) {
                                console.error("Reply error:", err);
                            }
                        };

                        const react = async (emoji) => {
                            if (typeof emoji !== 'string') return;
                            try {
                                await Gifted.sendMessage(from, { 
                                    react: { 
                                        key: ms.key, 
                                        text: emoji
                                    }
                                });
                            } catch (err) {
                                console.error("Reaction error:", err);
                            }
                        };

                        const edit = async (text, message) => {
                            if (typeof text !== 'string') return;
                            
                            try {
                                await Gifted.sendMessage(from, {
                                    text: text,
                                    edit: message.key
                                }, { 
                                    quoted: ms 
                                });
                            } catch (err) {
                                console.error("Edit error:", err);
                            }
                        };

                        const del = async (message) => {
                            if (!message?.key) return; 

                            try {
                                await Gifted.sendMessage(from, {
                                    delete: message.key
                                }, { 
                                    quoted: ms 
                                });
                            } catch (err) {
                                console.error("Delete error:", err);
                            }
                        };

                        if (gmd.react) {
                            try {
                                await Gifted.sendMessage(from, {
                                    react: { 
                                        key: ms.key, 
                                        text: gmd.react
                                    }
                                });
                            } catch (err) {
                                console.error("Reaction error:", err);
                            }
                        }

                        let fileType;
                        (async () => {
                            fileType = await import('file-type');
                        })();

                        Gifted.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
                            try {
                                let quoted = message.msg ? message.msg : message;
                                let mime = (message.msg || message).mimetype || '';
                                let messageType = message.mtype ? 
                                    message.mtype.replace(/Message/gi, '') : 
                                    mime.split('/')[0];
                                
                                const stream = await downloadContentFromMessage(quoted, messageType);
                                let buffer = Buffer.from([]);
                                
                                for await (const chunk of stream) {
                                    buffer = Buffer.concat([buffer, chunk]);
                                }

                                let fileTypeResult;
                                try {
                                    fileTypeResult = await fileType.fileTypeFromBuffer(buffer);
                                } catch (e) {
                                    console.log("file-type detection failed, using mime type fallback");
                                }

                                const extension = fileTypeResult?.ext || 
                                            mime.split('/')[1] || 
                                            (messageType === 'image' ? 'jpg' : 
                                            messageType === 'video' ? 'mp4' : 
                                            messageType === 'audio' ? 'mp3' : 'bin');

                                const trueFileName = attachExtension ? 
                                    `${filename}.${extension}` : 
                                    filename;
                                
                                await fs.writeFile(trueFileName, buffer);
                                return trueFileName;
                            } catch (error) {
                                console.error("Error in downloadAndSaveMediaMessage:", error);
                                throw error;
                            }
                        };
                        
                        const conText = {
                            m: ms,
                            mek: ms,
                            edit,
                            react,
                            del,
                            arg: args,
                            quoted,
                            isCmd: isCommand,
                            command,
                            sender,
                            pushName,
                            q: args.join(" "),
                            reply,
                            config,
                            superUser,
                            isAdmin,
                            tagged,
                            mentionedJid,
                            isBotAdmin: botIsAdmin,
                            isGroup,
                            groupInfo,
                            groupName,
                            authorMessage: messageAuthor,
                            user: user || '',
                            groupMember: isGroup ? messageAuthor : '',
                            from,
                            repliedMessage,
                            quotedMsg,
                            quotedUser,
                            isSuperUser,
                            botMode,
                            botPic,
                            botFooter,
                            botCaption,
                            botVersion,
                            ownerNumber,
                            ownerName,
                            botName,
                            botPrefix,
                            timeZone };

                        await gmd.function(from, Gifted, conText);

                    } catch (error) {
                        console.error(`Command error [${cmd}]:`, error);
                        try {
                            await Gifted.sendMessage(from, {
                                text: `🚨 Command failed: ${error.message}`,
                                ...createContext(messageAuthor, {
                                    title: "Error",
                                    body: "Command execution failed"
                                })
                            }, { quoted: ms });
                        } catch (sendErr) {
                            console.error("Error sending error message:", sendErr);
                        }
                    }
                }
            }
        });

        Gifted.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "connecting") {
                console.log("ᴄᴏɴɴᴇᴄᴛɪɴɢ ɢɪꜰᴛᴇᴅ-ᴍᴅ...");
                reconnectAttempts = 0;
            }

            if (connection === "open") {
                console.log("✅ ʙᴏᴛ ɪꜱ ᴏɴʟɪɴᴇ");
                reconnectAttempts = 0;
                
                setTimeout(async () => {
                    try {
                        const totalCommands = commands.filter((command) => command.pattern).length;
                        console.log('💜 ᴄᴏɴɴᴇᴄᴛᴇᴅ ᴛᴏ ᴡʜᴀᴛꜱᴀᴘᴘ');
                            
                        if (startMess === 'true') {
                            const md = botMode === 'public' ? "public" : "private";
                            const connectionMsg = `
*${botName} 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃*

𝐏𝐫𝐞𝐟𝐢𝐱       : *[ ${botPrefix} ]*
𝐏𝐥𝐮𝐠𝐢𝐧𝐬      : *${totalCommands.toString()}*
𝐌𝐨𝐝𝐞        : *${md}*
𝐎𝐰𝐧𝐞𝐫       : *${ownerNumber}*
𝐓𝐮𝐭𝐨𝐫𝐢𝐚𝐥𝐬     : *youtube.com/@giftedtechnexus*
𝐔𝐩𝐝𝐚𝐭𝐞𝐬      : *https://whatsapp.com/channel/0029Vb3hlgX5kg7G0nFggl0Y*

> *${botCaption}*`;

                            await Gifted.sendMessage(
                                Gifted.user.id,
                                {
                                    text: connectionMsg,
                                    ...createContext(botName, {
                                        title: "BOT INTEGRATED",
                                        body: "Status: Ready for Use"
                                    })
                                },
                                {
                                    disappearingMessagesInChat: true,
                                    ephemeralExpiration: 600,
                                }
                            );
                        }
                    } catch (err) {
                        console.error("Post-connection setup error:", err);
                    }
                }, 5000);
            }

            if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                
                console.log(`Connection closed due to: ${reason}`);
                
                if (reason === DisconnectReason.badSession) {
                    console.log("Bad session file, delete it and scan again");
                    try {
                        await fs.remove(__dirname + "/gift/session");
                    } catch (e) {
                        console.error("Failed to remove session:", e);
                    }
                    process.exit(1);
                } else if (reason === DisconnectReason.connectionClosed) {
                    console.log("Connection closed, reconnecting...");
                    setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log("Connection lost from server, reconnecting...");
                    setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
                } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log("Connection replaced, another new session opened");
                    process.exit(1);
                } else if (reason === DisconnectReason.loggedOut) {
                    console.log("Device logged out, delete session and scan again");
                    try {
                        await fs.remove(__dirname + "/gift/session");
                    } catch (e) {
                        console.error("Failed to remove session:", e);
                    }
                    process.exit(1);
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log("Restart required, restarting...");
                    setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
                } else if (reason === DisconnectReason.timedOut) {
                    console.log("Connection timed out, reconnecting...");
                    setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY * 2);
                } else {
                    console.log(`Unknown disconnect reason: ${reason}, attempting reconnection...`);
                    setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
                }
            }
        });

        const cleanup = () => {
            if (store) {
                store.destroy();
            }
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

    } catch (error) {
        console.error('Socket initialization error:', error);
        setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
    }
}

async function reconnectWithRetry() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached. Exiting...');
        process.exit(1);
    }

    reconnectAttempts++;
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 300000);
    
    console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
    
    setTimeout(async () => {
        try {
            await startGifted();
        } catch (error) {
            console.error('Reconnection failed:', error);
            reconnectWithRetry();
        }
    }, delay);
}

setTimeout(() => {
    startGifted().catch(err => {
        console.error("Initialization error:", err);
        reconnectWithRetry();
    });
}, 5000);
