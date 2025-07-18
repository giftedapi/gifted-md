const { createContext } = require('../gmdHelpers');

module.exports = {
    setup: async (Gifted, { config, logger }) => {
        if (!Gifted || !config) return;

        const botJid = `${Gifted.user?.id.split('@')[0]}@s.whatsapp.net`;
        const welcomeImage = 'https://gifted.my.id';
        const infoLink = 'https://giftedtech.web.id';

        // Cache for group names to reduce API calls
        const groupCache = new Map();
        setInterval(() => groupCache.clear(), 3600000); // 1 hour cache

        Gifted.ev.on('group-participants.update', async (update) => {
            try {
                const { id, participants, action } = update;

                // Get or fetch group metadata
                let groupName = groupCache.get(id);
                if (!groupName) {
                    const metadata = await Gifted.groupMetadata(id);
                    groupName = metadata.subject || "the group";
                    groupCache.set(id, groupName);
                }

                // Prepare common context
                const contextOptions = {
                    title: "GIFTED-MD",
                    body: `${action === 'add' ? 'Welcome' : 'Goodbye'} Message`,
                    thumbnail: welcomeImage
                };

                for (const participant of participants) {
                    if (participant === botJid) continue;

                    // Welcome new members
                    if (action === 'add' && config.WELCOME_MESSAGE === 'true') {
                        await Gifted.sendMessage(id, {
                            image: { url: welcomeImage },
                            caption: `🎉 Welcome to ${groupName}, @${participant.split('@')[0]}\n\n` +
                                     `📌 Enjoy your stay in our community\n\n` +
                                     `🔗 Business: ${businessLink}\n` +
                                     `ℹ️ Info: ${infoLink}`,
                            mentions: [participant],
                            ...createContext(participant, contextOptions)
                        });
                    }
                    // Goodbye message
                    else if (action === 'remove' && config.GOODBYE_MESSAGE === 'true') {
                        await Gifted.sendMessage(id, {
                            text: `👋 @${participant.split('@')[0]} has left the group\n\n` +
                                  `🔗 ${businessLink}\n` +
                                  `ℹ️ ${infoLink}`,
                            mentions: [participant],
                            ...createContext(participant, {
                                ...contextOptions,
                                thumbnail: 'https://files.giftedtech.web.id/file/gifted-md.jpg'
                            })
                        });
                    }
                }
            } catch (err) {
                logger.error('Greeting system error:', err);
            }
        });
    }
};
