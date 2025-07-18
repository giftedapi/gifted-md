global.newsletterName = "GIFTED TECH";
global.newsletterJid = "120363408839929349@newsletter";
global.botPic = "https://files.giftedtech.web.id/file/gifted-md.jpg";
global.newsletterUrl = "https://whatsapp.com/channel/0029Vb3hlgX5kg7G0nFggl0Y";

const createContext = (userJid, options = {}) => ({
    contextInfo: {
        mentionedJid: [userJid],
        forwardingScore: 5,
        isForwarded: true,
        businessMessageForwardInfo: {
            businessOwnerJid: global.newsletterJid, 
        },
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid,
            newsletterName: options.newsletterName || global.newsletterName,
            serverMessageId: Math.floor(100000 + Math.random() * 900000)
        },
        externalAdReply: {
            title: options.title || global.newsletterName,
            body: options.body || "Powered by GiftedTech",
            thumbnailUrl: options.thumbnail || global.botPic,
            mediaType: 1,
            mediaUrl: options.mediaUrl || undefined,
            sourceUrl: options.sourceUrl || global.newsletterUrl, 
            showAdAttribution: true,
            renderLargerThumbnail: false 
        }
    }
});


const thumbnails = [
"https://files.giftedtech.web.id/file/gifted-md.jpg",
"https://files.giftedtech.web.id/image/mygifted.png"
  ];
const DEFAULT_THUMBNAIL = thumbnails[Math.floor(Math.random() * thumbnails.length)];
const createContext2 = (userJid, options = {}) => ({
    contextInfo: {
        mentionedJid: [userJid],
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid,
            newsletterName: global.newsletterName,
            serverMessageId: Math.floor(100000 + Math.random() * 900000)
        },
        externalAdReply: {
            title: options.title || global.newsletterName,
            body: options.body || "Powered by Gifted Tech",
            thumbnailUrl: options.thumbnail || global.botPic,
            mediaType: 1,
            showAdAttribution: true,
            renderLargerThumbnail: true 
        }
    }
});


module.exports = {
    createContext,
    createContext2
};
