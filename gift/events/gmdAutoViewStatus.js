const { createContext } = require('../gmdHelpers');

module.exports = {
    setup: async (Gifted, { config, logger }) => {
        if (!Gifted || !config) return;

        const botJid = `${Gifted.user?.id.split('@')[0]}@s.whatsapp.net`;
        const businessLink = 'https://gifted.my.id';
        const infoLink = 'https://giftedtech.web.id';

        // ==================== AUTO READ ====================
        if (config.AUTO_READ_MESSAGES === "true") {
            logger.info("[Read] Auto-read enabled for chats");
            
            Gifted.ev.on("messages.upsert", async (m) => {
                try {
                    const unread = m.messages.filter(
                        msg => !msg.key.fromMe && msg.key.remoteJid !== "status@broadcast"
                    );
                    if (unread.length > 0) {
                        await Gifted.readMessages(unread.map(msg => msg.key));
                    }
                } catch (err) {
                    logger.error("[Read] Error:", err);
                }
            });
        }

        // ==================== STATUS READ ====================
        if (config.AUTO_READ_STATUS === "true") {
            logger.info("[Status] Auto-read enabled for status updates");
            
            Gifted.ev.on("messages.upsert", async (m) => {
                try {
                    const statusUpdates = m.messages.filter(
                        msg => msg.key?.remoteJid === "status@broadcast" && 
                              !msg.key.participant?.includes(Gifted.user.id.split(':')[0])
                    );
                    if (statusUpdates.length > 0) {
                        await Gifted.readMessages(statusUpdates.map(msg => msg.key));
                    }
                } catch (err) {
                    logger.error("[Status] Read error:", err);
                }
            });
        }

        // ==================== STATUS REPLY ====================
        if (config.AUTO_REPLY_STATUS === "true") {
            logger.info("[Status] Auto-reply enabled for status views");
            
            const lastNotified = new Map();
            
            Gifted.ev.on("messages.upsert", async (m) => {
                try {
                    const statusUpdates = m.messages.filter(
                        msg => msg.key?.remoteJid === "status@broadcast" && 
                              !msg.key.participant?.includes(Gifted.user.id.split(':')[0])
                    );
                    
                    if (statusUpdates.length > 0) {
                        const statusSender = statusUpdates[0].key.participant;
                        
                        if (!statusSender || statusSender.includes(Gifted.user.id.split(':')[0])) return;
                        
                        const now = Date.now();
                        const lastNotification = lastNotified.get(statusSender) || 0;
                        
                        if (now - lastNotification > 300000) {
                            lastNotified.set(statusSender, now);
                            
                            await Gifted.sendMessage(statusSender, {
                                text: `${config.REPLY_STATUS_TEXT || "*ʏᴏᴜʀ sᴛᴀᴛᴜs ᴠɪᴇᴡᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ✅*"}`,
                                contextInfo: {
                                    forwardingScore: 5,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: "120363408839929349@newsletter",
                                        newsletterName: "GIFTED TECH",
                                        serverMessageId: Math.floor(100000 + Math.random() * 900000),
                                    },
                                }
                            });
                        }
                    }
                } catch (err) {
                    logger.error("[Status] Reply error:", err);
                }
            });
        }

        // ==================== AUTO REACT TO MESSAGES ====================
        if (config.AUTO_REACT === "true") {
            logger.info("[React] Auto-react to messages enabled");
            
            const emojiMap = {
                "hello": ["👋", "🙂", "😊"],
                "hi": ["👋", "😄", "🤗"],
                "good morning": ["🌞", "☀️", "🌻"],
                "good night": ["🌙", "🌠", "💤"],
                "thanks": ["🙏", "❤️", "😊"],
                "welcome": ["😊", "🤗", "👌"],
                "congrats": ["🎉", "👏", "🥳"],
                "sorry": ["😔", "🙏", "🥺"]
            };
                       
            const fallbackEmojis = [
                "👍", "👌", "💯", "✨", "🌟", "🏆", "🎯", "✅",
                "🙏", "❤️", "💖", "💝", "💐", "🌹",
                "😊", "🙂", "👋", "🤝", "🫱🏻‍🫲🏽",
                "🎉", "🎊", "🥂", "🍾", "🎈", "🎁",
                "🌞", "☀️", "🌙", "⭐", "🌈", "☕",
                "🌍", "✈️", "🗺️", "🌻", "🌸", "🌊",
                "📚", "🎨", "📝", "🔍", "💡", "⚙️",
                "📌", "📍", "🕰️", "⏳", "📊", "📈"
            ];

            Gifted.ev.on("messages.upsert", async (m) => {
                try {
                    const { messages } = m;

                    for (const message of messages) {
                        if (!message.key || message.key.fromMe || 
                            message.key.remoteJid === "status@broadcast") continue;

                        const msgText = (
                            message.message?.conversation || 
                            message.message?.extendedTextMessage?.text || ""
                        ).toLowerCase();

                        let emoji;
                        for (const [keyword, emojis] of Object.entries(emojiMap)) {
                            if (msgText.includes(keyword)) {
                                emoji = emojis[Math.floor(Math.random() * emojis.length)];
                                break;
                            }
                        }

                        emoji = emoji || fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];

                        await Gifted.sendMessage(message.key.remoteJid, {
                            react: {
                                text: emoji,
                                key: message.key
                            }
                        });

                        logger.info(`[React] Sent ${emoji} to ${message.key.remoteJid}`);
                    }
                } catch (err) {
                    logger.error("[React] Error:", err);
                }
            });
        }
    }
};
