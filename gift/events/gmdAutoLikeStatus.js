module.exports = {
    setup: async (Gifted, { config, logger }) => {
        if (!Gifted || !config || config.AUTO_LIKE_STATUS !== "true") return;

        Gifted.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            
            const reactionEmojis = (config.STATUS_LIKE_EMOJIS || "💛,❤️,💜,🤍,💙").split(",").map(e => e.trim());

            for (const message of messages) {
                if (message.key && message.key.remoteJid === "status@broadcast") {
                    const botJid = Gifted.user?.id ? `${Gifted.user.id.split(':')[0]}@s.whatsapp.net` : null;
                    if (!botJid) continue;

                    try {
                        const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];

                        await Gifted.sendMessage(message.key.remoteJid, {
                            react: {
                                key: message.key,
                                text: randomEmoji,
                            },
                        }, {
                            statusJidList: [message.key.participant, botJid],
                        });

                    } catch (error) {
                        logger.error(`Status reaction failed: ${error.message}`);
                    }
                }
            }
        });
    }
};
