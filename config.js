const fs = require('fs-extra');
if (fs.existsSync('.env'))
  require('dotenv').config({ path: __dirname + '/.env' });
const path = require("path");

module.exports = { 
    SESSION_ID: process.env.SESSION_ID || '',
    PREFIX: process.env.PREFIX || ".",
    OWNER_NAME: process.env.OWNER_NAME || "𝐆𝐈𝐅𝐓𝐄𝐃 𝐓𝐄𝐂𝐇",
    OWNER_NUMBER : process.env.OWNER_NUMBER || "254715206562",              
    BOT_NAME : process.env.BOT_NAME || '𝐆𝐈𝐅𝐓𝐄𝐃 𝐌𝐃',
    FOOTER : process.env.FOOTER || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɢɪғᴛᴇᴅ ᴛᴇᴄʜ',
    CAPTION : process.env.CAPTION || '©𝟐𝟎𝟐𝟒 𝐆𝐈𝐅𝐓𝐄𝐃 𝐌𝐃 𝐕𝟓',
    VERSION: process.env.VERSION || '5.0.0',
    BOT_PIC : process.env.BOT_PIC || 'https://files.giftedtech.web.id/file/gifted-md.jpg',            
    MODE: process.env.MODE || "private",
    PM_PERMIT: process.env.PM_PERMIT || 'false',
    WARN_COUNT : process.env.WARN_COUNT || '3' ,
    TIME_ZONE: process.env.TIME_ZONE || "Africa/Nairobi",
    PRESENCE : process.env.PRESENCE || 'online', // recording/typing/online/offline
    GC_PRESENCE : process.env.GC_PRESENCE || 'online', // recording/typing/online/offline
    CHATBOT : process.env.CHATBOT || 'false', // can be true/audio/false   
    CHATBOT_MODE : process.env.CHATBOT_MODE || 'inbox', // can be inbox/groups/allchats
    STARTING_MESSAGE : process.env.STARTING_MESSAGE || "true",
    ANTIDELETE : process.env.ANTIDELETE || 'indm', // inchat/indm/false
    GOODBYE_MESSAGE : process.env.GOODBYE_MESSAGE || 'false',
    ANTICALL : process.env.ANTICALL || 'false', // (decline/true)/block/false
    ANTICALL_MSG: process.env.ANTICALL_MSG || "*_📞 Auto Call Reject Mode Active. 📵 No Calls Allowed!_*",
    WELCOME_MESSAGE : process.env.WELCOME_MESSAGE || 'false',
    ANTILINK : process.env.ANTILINK || 'false', // or delete or kick or true
    AUTO_LIKE_STATUS : process.env.AUTO_LIKE_STATUS || 'true',
    AUTO_READ_STATUS : process.env.AUTO_READ_STATUS || 'true',
    STATUS_LIKE_EMOJIS : process.env.STATUS_LIKE_EMOJIS || "💛,❤️,💜,🤍,💙",
    AUTO_REPLY_STATUS: process.env.AUTO_REPLY_STATUS || "false",   
    STATUS_REPLY_TEXT: process.env.STATUS_REPLY_TEXT || "*ʏᴏᴜʀ sᴛᴀᴛᴜs ᴠɪᴇᴡᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ✅*",             
    AUTO_REACT : process.env.AUTO_REACT || 'false',
    AUTO_REPLY : process.env.AUTO_REPLY || 'false',
    AUTO_READ_MESSAGES : process.env.AUTO_READ_MESSAGES || 'false',
    AUTO_BIO : process.env.AUTO_BIO || 'false',
    PACK_NAME: process.env.PACK_NAME || '𝐆𝐈𝐅𝐓𝐄𝐃 𝐌𝐃',
    PACK_AUTHOR: process.env.PACK_AUTHOR || '𝐆𝐈𝐅𝐓𝐄𝐃 𝐓𝐄𝐂𝐇'
};

let fileName = require.resolve(__filename);
fs.watchFile(fileName, () => {
    fs.unwatchFile(fileName);
    console.log(`Writing File: ${__filename}`);
    delete require.cache[fileName];
    require(fileName);
});
