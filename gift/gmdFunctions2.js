const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const config = require("../config");
const { createContext } = require("./gmdHelpers");
const logger = require("gifted-baileys/lib/Utils/logger").default.child({});
const { isJidGroup, downloadMediaMessage } = require("gifted-baileys");

const {
    CHATBOT: chatBot,
    ANTICALL: antiCall,
    ANTICALL_MSG: antiCallMsg,
    PRESENCE: botPresence,
    GC_PRESENCE: groupPresence,
    MODE: botMode, 
    FOOTER: botFooter,
    BOT_NAME: botName,
    BOT_PIC: botPic, 
    TIME_ZONE: tZ,
    ANTIDELETE: antiDelete,
} = config;


const formatTime = (timestamp) => {
    const timeZone = tZ || 'Africa/Nairobi'; 
    const date = new Date(timestamp);
    const options = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true, timeZone };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

const formatDate = (timestamp) => {
    const timeZone = tZ || 'Africa/Nairobi';
    const date = new Date(timestamp);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone };
    return new Intl.DateTimeFormat('en-GB', options).format(date); 
};

const isMediaMessage = message => {
    const typeOfMessage = getContentType(message);
    const mediaTypes = [
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage'
    ];
    return mediaTypes.includes(typeOfMessage);
};


const isAnyLink = (message) => {
            const linkPattern = /https?:\/\/[^\s]+/;
            return linkPattern.test(message);
        };

const GiftedAntiLink = async (Gifted, message, antiLink) => {
    try {
        if (!message?.message || message.key.fromMe) return;
        const from = message.key.remoteJid; 
        const sender = message.key.participant || message.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        if (!isGroup || antiLink === 'false') return;

        const groupMetadata = await Gifted.groupMetadata(from);
        const groupAdmins = groupMetadata.participants
            .filter((member) => member.admin)
            .map((admin) => admin.id);

        if (groupAdmins.includes(sender)) return;

        const messageType = Object.keys(message.message)[0];
        const body = messageType === 'conversation'
            ? message.message.conversation
            : message.message[messageType]?.text || '';

        if (!body || !isAnyLink(body)) return;

        await Gifted.sendMessage(from, { delete: message.key });

        if (antiLink === 'kick') {
            await Gifted.groupParticipantsUpdate(from, [sender], 'remove');
            await Gifted.sendMessage(
                from,
                {
                    text: `⚠️ ${botName || 'Gifted Md'} anti-link active!\nUser @${sender.split('@')[0]} has been kicked for sharing a link.`,
                    mentions: [sender],
                }
            );
        } else if (antiLink === 'delete') {
            await Gifted.sendMessage(
                from,
                {
                    text: `⚠️ ${process.env.BOT_NAME || 'Gifted Md'} anti-link active!\nLinks are not allowed here @${sender.split('@')[0]}!`,
                    mentions: [sender],
                }
            );
        } else if (antiLink === 'warn') {
            await Gifted.sendMessage(
                from,
                {
                    text: `⚠️ Warning @${sender.split('@')[0]}!\nLinks are not allowed in this group!`,
                    mentions: [sender],
                }
            );
        }
    } catch (err) {
        console.error('Anti-link error:', err);
    }
};


function getTimeBlock() {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 11) return "morning";
            if (hour >= 11 && hour < 16) return "afternoon";
            if (hour >= 16 && hour < 21) return "evening";
            if (hour >= 21 || hour < 2) return "night";
            return "latenight";
        }

        const quotes = {
            morning: [ "☀️ ʀɪsᴇ ᴀɴᴅ sʜɪɴᴇ. ɢʀᴇᴀᴛ ᴛʜɪɴɢs ɴᴇᴠᴇʀ ᴄᴀᴍᴇ ғʀᴏᴍ ᴄᴏᴍғᴏʀᴛ ᴢᴏɴᴇs.", "🌅 ᴇᴀᴄʜ �ᴍᴏʀɴɪɴɢ ᴡᴇ ᴀʀᴇ ʙᴏʀɴ ᴀɢᴀɪɴ. ᴡʜᴀᴛ ᴡᴇ ᴅᴏ ᴛᴏᴅᴀʏ ɪs ᴡʜᴀᴛ ᴍᴀᴛᴛᴇʀs �ᴍᴏsᴛ.", "⚡ sᴛᴀʀᴛ ʏᴏᴜʀ ᴅᴀʏ ᴡɪᴛʜ ᴅᴇᴛᴇʀᴍɪɴᴀᴛɪᴏɴ, ᴇɴᴅ ɪᴛ ᴡɪᴛʜ sᴀᴛɪsғᴀᴄᴛɪᴏɴ.", "🌞 ᴛʜᴇ sᴜɴ ɪs ᴜᴘ, ᴛʜᴇ ᴅᴀʏ ɪs ʏᴏᴜʀs.", "📖 ᴇᴠᴇʀʏ ᴍᴏʀɴɪɴɢ ɪs ᴀ ɴᴇᴡ ᴘᴀɢᴇ ᴏғ ʏᴏᴜʀ sᴛᴏʀʏ. ᴍᴀᴋᴇ ɪᴛ ᴄᴏᴜɴᴛ." ], 
            afternoon: [ "⏳ ᴋᴇᴇᴘ ɢᴏɪɴɢ. ʏᴏᴜ'ʀᴇ ʜᴀʟғᴡᴀʏ ᴛᴏ ɢʀᴇᴀᴛɴᴇss.", "🔄 sᴛᴀʏ ғᴏᴄᴜsᴇᴅ. ᴛʜᴇ ɢʀɪɴᴅ ᴅᴏᴇsɴ'ᴛ sᴛᴏᴘ ᴀᴛ ɴᴏᴏɴ.", "🏗️ sᴜᴄᴄᴇss ɪs ʙᴜɪʟᴛ ɪɴ ᴛʜᴇ ʜᴏᴜʀs ɴᴏʙᴏᴅʏ ᴛᴀʟᴋs ᴀʙᴏᴜᴛ.", "🔥 ᴘᴜsʜ ᴛʜʀᴏᴜɢʜ. ᴄʜᴀᴍᴘɪᴏɴs ᴀʀᴇ ᴍᴀᴅᴇ ɪɴ ᴛʜᴇ ᴍɪᴅᴅʟᴇ ᴏғ ᴛʜᴇ ᴅᴀʏ.", "⏰ ᴅᴏɴ'ᴛ ᴡᴀᴛᴄʜ ᴛʜᴇ ᴄʟᴏᴄᴋ, ᴅᴏ ᴡʜᴀᴛ ɪᴛ ᴅᴏᴇs—ᴋᴇᴇᴘ ɢᴏɪɴɢ." ],
            evening: [ "🛌 ʀᴇsᴛ ɪs ᴘᴀʀᴛ ᴏғ ᴛʜᴇ ᴘʀᴏᴄᴇss. ʀᴇᴄʜᴀʀɢᴇ ᴡɪsᴇʟʏ.", "🌇 ᴇᴠᴇɴɪɴɢ ʙʀɪɴɢꜱ ꜱɪʟᴇɴᴄᴇ ᴛʜᴀᴛ ꜱᴘᴇᴀᴋꜱ ʟᴏᴜᴅᴇʀ ᴛʜᴀɴ ᴅᴀʏʟɪɢʜᴛ.", "✨ ʏᴏᴜ ᴅɪᴅ ᴡᴇʟʟ ᴛᴏᴅᴀʏ. ᴘʀᴇᴘᴀʀᴇ ғᴏʀ ᴀɴ ᴇᴠᴇɴ ʙᴇᴛᴛᴇʀ �ᴛᴏᴍᴏʀʀᴏᴡ.", "🌙 ʟᴇᴛ ᴛʜᴇ ɴɪɢʜᴛ sᴇᴛᴛʟᴇ ɪɴ, ʙᴜᴛ ᴋᴇᴇᴘ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴡɪᴅᴇ ᴀᴡᴀᴋᴇ.", "🧠 ɢʀᴏᴡᴛʜ ᴅᴏᴇsɴ'ᴛ ᴇɴᴅ ᴀᴛ sᴜɴsᴇᴛ. ɪᴛ sʟᴇᴇᴘs ᴡɪᴛʜ ʏᴏᴜ." ],
            night: [ "🌌 ᴛʜᴇ ɴɪɢʜᴛ ɪs sɪʟᴇɴᴛ, ʙᴜᴛ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴀʀᴇ ʟᴏᴜᴅ.", "⭐ sᴛᴀʀs sʜɪɴᴇ ʙʀɪɢʜᴛᴇsᴛ ɪɴ ᴛʜᴇ ᴅᴀʀᴋ. sᴏ ᴄᴀɴ ʏᴏᴜ.", "🧘‍♂️ ʟᴇᴛ ɢᴏ ᴏғ ᴛʜᴇ ɴᴏɪsᴇ. ᴇᴍʙʀᴀᴄᴇ ᴛʜᴇ ᴘᴇᴀᴄᴇ.", "✅ ʏᴏᴜ ᴍᴀᴅᴇ ɪᴛ ᴛʜʀᴏᴜɢʜ ᴛʜᴇ ᴅᴀʏ. ɴᴏᴡ ᴅʀᴇᴀᴍ ʙɪɢ.", "🌠 ᴍɪᴅɴɪɢʜᴛ ᴛʜᴏᴜɢʜᴛs ᴀʀᴇ ᴛʜᴇ ʙʟᴜᴇᴘʀɪɴᴛ ᴏғ ᴛᴏᴍᴏʀʀᴏᴡ's ɢʀᴇᴀᴛɴᴇss." ],
            latenight: [ "🕶️ ᴡʜɪʟᴇ ᴛʜᴇ ᴡᴏʀʟᴅ sʟᴇᴇᴘs, ᴛʜᴇ ᴍɪɴᴅs ᴏғ ʟᴇɢᴇɴᴅs ᴡᴀɴᴅᴇʀ.", "⏱️ ʟᴀᴛᴇ ɴɪɢʜᴛs ᴛᴇᴀᴄʜ ᴛʜᴇ ᴅᴇᴇᴘᴇsᴛ ʟᴇssᴏɴs.", "🔕 sɪʟᴇɴᴄᴇ ɪsɴ'ᴛ ᴇᴍᴘᴛʏ—ɪᴛ's ғᴜʟʟ ᴏғ ᴀɴsᴡᴇʀs.", "✨ ᴄʀᴇᴀᴛɪᴠɪᴛʏ ᴡʜɪsᴘᴇʀs ᴡʜᴇɴ �ᴛʜᴇ ᴡᴏʀʟᴅ ɪs ǫᴜɪᴇᴛ.", "🌌 ʀᴇsᴛ ᴏʀ ʀᴇғʟᴇᴄᴛ, ʙᴜᴛ ɴᴇᴠᴇʀ ᴡᴀsᴛᴇ ᴛʜᴇ ɴɪɢʜᴛ." ] 
        };

        function getCurrentDateTime() {
            return new Intl.DateTimeFormat("en", {
                year: "numeric",
                month: "long",
                day: "2-digit"
            }).format(new Date());
        }

const GiftedAutoBio = async (Gifted) => {
                try {
                    const block = getTimeBlock();
                    const timeDate = getCurrentDateTime();
                    const timeQuotes = quotes[block];
                    const quote = timeQuotes[Math.floor(Math.random() * timeQuotes.length)];

                    const bioText = `ɢɪꜰᴛᴇᴅ-ᴍᴅ ᴏɴʟɪɴᴇ ||\n\n📅 ${timeDate}\n\n➤ ${quote}`;

                    await Gifted.updateProfileStatus(bioText);
                } catch (error) {
                }
            };


const availableApis = [
    "https://bk9.fun/ai/google-thinking?q=",
    "https://bk9.fun/ai/llama?q=",
    "https://bk9.fun/ai/Aoyo?q="
];

function getRandomApi() {
    return availableApis[Math.floor(Math.random() * availableApis.length)];
}

function processForTTS(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\[\]\(\)\{\}]/g, ' ')
              .replace(/\s+/g, ' ')
              .substring(0, 190);
}

const identityPatterns = [
                /who\s*(made|created|built)\s*you/i,
                /who\s*is\s*your\s*(creator|developer|maker|owner|father|parent)/i,
                /what('?s| is)\s*your\s*name\??/i,
                /who\s*are\s*you\??/i,
                /who\s*a?you\??/i,
                /who\s*au\??/i,
                /what('?s| is)\s*ur\s*name\??/i,
                /wat('?s| is)\s*(ur|your)\s*name\??/i,
                /wats?\s*(ur|your)\s*name\??/i,
                /wot('?s| is)\s*(ur|your)\s*name\??/i,
                /hoo\s*r\s*u\??/i,
                /who\s*u\??/i,
                /whos\s*u\??/i,
                /whos?\s*this\??/i,
                /you\s*called\s*gifted/i,
                /are\s*you\s*gifted/i,
                /are\s*u\s*gifted/i,
                /u\s*gifted\??/i,
                /who\s*is\s*your\s*boss\??/i,
                /who\s*ur\s*boss\??/i,
                /who\s*your\s*boss\??/i,
                /whoa\s*created\s*you\??/i,
                /who\s*made\s*u\??/i,
                /who\s*create\s*u\??/i,
                /who\s*built\s*u\??/i,
                /who\s*ur\s*owner\??/i,
                /who\s*is\s*u\??/i,
                /what\s*are\s*you\??/i,
                /what\s*r\s*u\??/i,
                /wat\s*r\s*u\??/i
            ];

function isIdentityQuestion(query) {
    return identityPatterns.some(pattern => 
        typeof query === 'string' && pattern.test(query)
    );
}

async function getAIResponse(query) {
    if (isIdentityQuestion(query)) {
        return 'I am GIFTED MD, created by Gifted Tech! 🚀';
    }
    
    try {
        const apiUrl = getRandomApi();
        const response = await fetch(apiUrl + encodeURIComponent(query));
        
        try {
            const data = await response.json();
            let aiResponse = data.BK9 || data.result || data.response || data.message || 
                           (data.data && (data.data.text || data.data.message)) || 
                           JSON.stringify(data);
            
            if (typeof aiResponse === 'object') {
                aiResponse = JSON.stringify(aiResponse);
            }

            return aiResponse;
        } catch (jsonError) {
            const textResponse = await response.text();
            return textResponse;
        }
    } catch (error) {
        console.error("API Error:", error);
        return "Sorry, I couldn't get a response right now";
    }
}

function GiftedChatBot(Gifted, chatBot, chatBotMode, createContext, createContext2, googleTTS) {
    if (chatBot === 'true' || chatBot === 'audio') {
        Gifted.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg?.message || msg.key.fromMe) return;
                
                const jid = msg.key.remoteJid;
                const isGroup = jid.endsWith('@g.us');
                
                if (chatBotMode === 'groups' && !isGroup) return;
                if (chatBotMode === 'inbox' && isGroup) return;
                
                let text = '';
                
                if (msg.message.conversation) {
                    text = msg.message.conversation;
                } else if (msg.message.extendedTextMessage?.text) {
                    text = msg.message.extendedTextMessage.text;
                } else if (msg.message.imageMessage?.caption) {
                    text = msg.message.imageMessage.caption;
                }

                if (!text || typeof text !== 'string') return;

                const aiResponse = await getAIResponse(text);

                if (chatBot === "true") {
                    await Gifted.sendMessage(jid, { 
                        text: String(aiResponse),
                        ...createContext(jid, {
                            title: "ɢɪꜰᴛᴇᴅ-ᴍᴅ ᴄʜᴀᴛʙᴏᴛ",
                            body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɢɪꜰᴛᴇᴅ ᴛᴇᴄʜ"
                        })
                    }, { quoted: msg });
                }

                if (chatBot === 'audio') {
                    const ttsText = processForTTS(String(aiResponse));
                    if (ttsText) {
                        const audioUrl = googleTTS.getAudioUrl(ttsText, {
                            lang: "en",
                            slow: false,
                            host: "https://translate.google.com",
                        });

                        await Gifted.sendMessage(jid, {
                            audio: { url: audioUrl },
                            mimetype: "audio/mpeg",
                            ptt: true,
                            ...createContext2(jid, {
                                title: "ɢɪꜰᴛᴇᴅ-ᴍᴅ ᴀᴜᴅɪᴏ-ᴄʜᴀᴛʙᴏᴛ",
                                body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɢɪꜰᴛᴇᴅ ᴛᴇᴄʜ"
                            })
                        }, { quoted: msg });
                    }
                }
            } catch (error) {
                console.error("Message processing error:", error);
            }
        });
    }
}


const presenceTimers = new Map();

const GiftedPresence = async (Gifted, jid) => {
    try {
        const isGroup = jid.endsWith('@g.us');
        const duration = 5 * 60 * 1000; // minutes duration

        if (presenceTimers.has(jid)) {
            clearTimeout(presenceTimers.get(jid));
            presenceTimers.delete(jid);
        }

        const presenceType = isGroup ? groupPresence : botPresence;
        if (!presenceType) return;

        const presence = presenceType.toLowerCase();
        let whatsappPresence;

        switch(presence) {
            case 'online':
                whatsappPresence = "available";
                break;
            case 'typing':
                whatsappPresence = "composing";
                break;
            case 'recording':
                whatsappPresence = "recording";
                break;
            case 'offline':
                whatsappPresence = "unavailable";
                break;
            default:
                logger.warn(`Invalid ${isGroup ? 'group' : ''}presence: ${presenceType}`);
                return;
        }

        await Gifted.sendPresenceUpdate(whatsappPresence, jid);
        logger.debug(`${isGroup ? 'Group' : 'Chat'} presence activated: ${presence} for ${jid}`);
        presenceTimers.set(jid, setTimeout(() => {
            presenceTimers.delete(jid);
            logger.debug(`${isGroup ? 'Group' : 'Chat'} presence duration ended for ${jid}`);
        }, duration));

    } catch (e) {
        logger.error('Presence update failed:', e.message);
    }
};


const GiftedAnticall = async (json, Gifted) => {
   for (const id of json) {
      if (id.status === 'offer') {
         if (antiCall === "true" || antiCall === "decline") {
            let msg = await Gifted.sendMessage(id.from, {
               text: `${antiCallMsg}`,
               mentions: [id.from],
            });
            await Gifted.rejectCall(id.id, id.from);
         } else if (antiCall === "block") {
            let msg = await Gifted.sendMessage(id.from, {
               text: `${antiCallMsg}\nYou are Being Blocked due to Calling While Anticall Action Is *"Block"*!`,
               mentions: [id.from],
            });
            await Gifted.rejectCall(id.id, id.from); 
            await Gifted.updateBlockStatus(id.from, "block");
         }
      }
   }
};


const processMediaMessage = async (deletedMessage) => {
    let mediaType, mediaInfo;
    
    const mediaTypes = {
        imageMessage: 'image',
        videoMessage: 'video',
        audioMessage: 'audio',
        stickerMessage: 'sticker',
        documentMessage: 'document'
    };

    for (const [key, type] of Object.entries(mediaTypes)) {
        if (deletedMessage.message?.[key]) {
            mediaType = type;
            mediaInfo = deletedMessage.message[key];
            break;
        }
    }

    if (!mediaType || !mediaInfo) return null;

    try {
        const mediaStream = await downloadMediaMessage(deletedMessage, { logger });
        
        const extensions = {
            image: 'jpg',
            video: 'mp4',
            audio: mediaInfo.mimetype?.includes('mpeg') ? 'mp3' : 'ogg',
            sticker: 'webp',
            document: mediaInfo.fileName?.split('.').pop() || 'bin'
        };
        
        const tempPath = path.join(__dirname, `./temp/temp_${Date.now()}.${extensions[mediaType]}`);
        await fs.ensureDir(path.dirname(tempPath));
        await pipeline(mediaStream, fs.createWriteStream(tempPath));
        
        return {
            path: tempPath,
            type: mediaType,
            caption: mediaInfo.caption || '',
            mimetype: mediaInfo.mimetype,
            fileName: mediaInfo.fileName || `${mediaType}_${Date.now()}.${extensions[mediaType]}`,
            ptt: mediaInfo.ptt
        };
    } catch (error) {
        logger.error(`Media processing failed:`, error);
        return null;
    }
};

const GiftedAntiDelete = async (Gifted, deletedMsg, key, deleter, botOwnerJid) => {
    const context = createContext(deleter, {
        title: "Anti-Delete",
        body: botName,
        thumbnail: botPic
    });
    
    const currentTime = formatTime(Date.now());
    const currentDate = formatDate(Date.now());

    const displayDeleter = deleter.endsWith('@s.whatsapp.net') ? 
    (key.pushName || `@${deleter.split('@')[0]}`) : 
    deleter;

    let chatInfo;
    if (isJidGroup(key.remoteJid)) {
        try {
            chatInfo = `💬 Group Chat: ${(await Gifted.groupMetadata(key.remoteJid)).subject}`;
        } catch (error) {
            logger.error('Failed to fetch group metadata:', error);
            chatInfo = `💬 Group Chat`;
        }
    } else {
        chatInfo = `💬 Dm Chat: ${key.pushName || `@${deleter.split('@')[0]}`}`;
    }

    try {
        const promises = [];
        
        if (antiDelete === 'inchat') {
            promises.push((async () => {
                try {
                    const baseAlert = `*𝙶𝙸𝙵𝚃𝙴𝙳-𝙼𝙳 𝙰𝙽𝚃𝙸𝙳𝙴𝙻𝙴𝚃𝙴*\n\n` +
                                    `❌ *Deleted By*: ${displayDeleter}\n` +
                                    `*Time:* ${currentTime}\n` + 
                                    `*Date:* ${currentDate}\n` +
                                    `${chatInfo}\n\n> *${botFooter}*`;  // Using the formatted chatInfo here

                    if (deletedMsg.message?.conversation || deletedMsg.message?.extendedTextMessage?.text) {
                        const text = deletedMsg.message.conversation || 
                                    deletedMsg.message.extendedTextMessage.text;
                        
                        await Gifted.sendMessage(key.remoteJid, {
                            text: `${baseAlert}\n\n📝 *Content:* ${text}`,
                            mentions: [deleter],
                            ...context
                        });
                    } else {
                        const media = await processMediaMessage(deletedMsg);
                        if (media) {
                            await Gifted.sendMessage(key.remoteJid, {
                                [media.type]: { url: media.path },
                                caption: media.caption ? 
                                    `${baseAlert}\n\n📌 *Caption:* ${media.caption}` : 
                                    baseAlert,
                                mentions: [deleter],
                                ...context,
                                ...(media.type === 'document' ? {
                                    mimetype: media.mimetype,
                                    fileName: media.fileName
                                } : {}),
                                ...(media.type === 'audio' ? {
                                    ptt: media.ptt,
                                    mimetype: media.mimetype
                                } : {})
                            });

                            setTimeout(() => {
                                fs.unlink(media.path).catch(err => 
                                    logger.error('Media cleanup failed:', err)
                                );
                            }, 30000);
                        }
                    }
                } catch (error) {
                    logger.error('Failed to process in-chat ANTIDELETE:', error);
                }
            })());
        }

        if (antiDelete === 'indm') {
            promises.push((async () => {
                try {
                    const ownerContext = `👤 Deleted By: ${displayDeleter}\n${chatInfo}`;

                    if (deletedMsg.message?.conversation || deletedMsg.message?.extendedTextMessage?.text) {
                        const text = deletedMsg.message.conversation || 
                                    deletedMsg.message.extendedTextMessage.text;
                        
                        await Gifted.sendMessage(botOwnerJid, { 
                            text: `📩 *𝙶𝙸𝙵𝚃𝙴𝙳-𝙼𝙳 𝙰𝙽𝚃𝙸𝙳𝙴𝙻𝙴𝚃𝙴*\n\n*Time:* ${currentTime}\n*Date:* ${currentDate}\n\n*Deleted Msg:*\n${text}\n\n${ownerContext}\n\n> *${botFooter}*`,
                            ...context
                        });
                    } else {
                        const media = await processMediaMessage(deletedMsg);
                        if (media) {
                            await Gifted.sendMessage(botOwnerJid, {
                                [media.type]: { url: media.path },
                                caption: media.caption ? 
                                    `📩 *𝙶𝙸𝙵𝚃𝙴𝙳-𝙼𝙳 𝙰𝙽𝚃𝙸𝙳𝙴𝙻𝙴𝚃𝙴*\n\n*Time:* ${currentTime}\n*Date:* ${currentDate}\n\n*Caption:*\n${media.caption}\n\n${ownerContext}\n\n> *${botFooter}*` : 
                                    `📩 *𝙶𝙸𝙵𝚃𝙴𝙳-𝙼𝙳 𝙰𝙽𝚃𝙸𝙳𝙴𝙻𝙴𝚃𝙴*\n\n*Time:* ${currentTime}\n*Date:* ${currentDate}\n\n${ownerContext}\n\n> *${botFooter}*`,
                                ...context,
                                ...(media.type === 'document' ? {
                                    mimetype: media.mimetype,
                                    fileName: media.fileName
                                } : {}),
                                ...(media.type === 'audio' ? {
                                    ptt: media.ptt,
                                    mimetype: media.mimetype
                                } : {})
                            });

                            setTimeout(() => {
                                fs.unlink(media.path).catch(err => 
                                    logger.error('Media cleanup failed:', err)
                                );
                            }, 30000);
                        }
                    }
                } catch (error) {
                    logger.error('Failed to forward ANTIDELETE to owner:', error);
                    await Gifted.sendMessage(botOwnerJid, {
                        text: `⚠️ Failed to forward deleted message from ${displayDeleter}\n\nError: ${error.message}`,
                        ...context
                    });
                }
            })());
        }

        await Promise.all(promises);
    } catch (error) {
        logger.error('Anti-delete handling failed:', error);
    }
};

module.exports = { logger, GiftedAntiLink, GiftedListeners, GiftedAutoBio, GiftedChatBot, GiftedAntiDelete, GiftedAnticall, GiftedPresence };
