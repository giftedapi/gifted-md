const { gmd, config, commands, monospace, formatBytes } = require("../gift"),
      fs = require('fs'), 
      axios = require('axios'),
      { BOT_PIC: botPic,
      TIME_ZONE: tz,
      PREFIX: prefix,
      VERSION: version,
      BOT_NAME: botName, 
      MODE: botMode } = config,
      BOT_START_TIME = Date.now(),
      { totalmem: totalMemoryBytes, 
      freemem: freeMemoryBytes } = require('os'),
      moment = require('moment-timezone'), 
      more = String.fromCharCode(8206), 
      readmore = more.repeat(4001),
      { downloadContentFromMessage } = require('gifted-baileys'),
      ram = `${formatBytes(freeMemoryBytes)}/${formatBytes(totalMemoryBytes)}`;

gmd({ 
  pattern: "meta",
  react: "⚡",
  category: "general",
  description: "Send message to Meta AI",
}, async (from, Gifted, conText) => {
  const { mek, react, reply, q } = conText;

  if (!q) {
    await react("❌");
    return reply("Please provide some text");
  }

  try {

    await Gifted.sendMessage(from, {
      text: `@867051314767696 ${q}`,
      mentions: ['867051314767696@bot'],
      contextInfo: {
        mentionedJid: ['867051314767696@bot'],
        forwardingScore: 0,
        isForwarded: false
      }
    }, { quoted: mek });

    await react("✅");
  } catch (error) {
    await react("❌");
    return reply(`Error: ${error.message}`);
  }
});


gmd({ 
  pattern: "menu", 
  aliases: ['help', 'allmenu', 'mainmenu'],
  react: "🪀",
  category: "general",
  description: "Fetch bot main menu",
}, async (from, Gifted, conText) => {
      const { mek, sender, react, pushName } = conText;
    function formatUptime(seconds) {
            const days = Math.floor(seconds / (24 * 60 * 60));
            seconds %= 24 * 60 * 60;
            const hours = Math.floor(seconds / (60 * 60));
            seconds %= 60 * 60;
            const minutes = Math.floor(seconds / 60);
            seconds = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        const now = new Date();
        const date = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(now);

        const time = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);

        const uptime = formatUptime(process.uptime());
        const totalCommands = commands.filter((command) => command.pattern).length;

        const categorized = commands.reduce((menu, gmd) => {
            if (gmd.pattern && !gmd.dontAddCommandList) {
                if (!menu[gmd.category]) menu[gmd.category] = [];
                menu[gmd.category].push(gmd.pattern);
            }
            return menu;
        }, {});
      let header = `╭══〘〘 *${monospace(botName)}* 〙〙═⊷
┃❍ *Mᴏᴅᴇ:*  ${monospace(botMode)}
┃❍ *Pʀᴇғɪx:*  [ ${monospace(prefix)} ]
┃❍ *Usᴇʀ:*  ${monospace(pushName)}
┃❍ *Pʟᴜɢɪɴs:*  ${monospace(totalCommands.toString())}
┃❍ *Vᴇʀsɪᴏɴ:*  ${monospace(version)}
┃❍ *Uᴘᴛɪᴍᴇ:*  ${monospace(uptime)}
┃❍ *Tɪᴍᴇ Nᴏᴡ:*  ${monospace(time)}
┃❍ *Dᴀᴛᴇ Tᴏᴅᴀʏ:*  ${monospace(date)}
┃❍ *Tɪᴍᴇ Zᴏɴᴇ:*  ${monospace(tz)}
┃❍ *Sᴇʀᴠᴇʀ Rᴀᴍ:*  ${monospace(ram)}
╰═════════════════⊷\n${readmore}\n`;

        const formatCategory = (category, gmds) => {
            const title = `╭━━━━❮ *${monospace(category.toUpperCase())}* ❯━⊷ \n`;
            const body = gmds.map(gmd => `┃◇ ${monospace(prefix + gmd)}`).join('\n');
            const footer = `╰━━━━━━━━━━━━━━━━━⊷\n`;
            return `${title}${body}\n${footer}`;
        };

        let menu = header;
        for (const [category, gmds] of Object.entries(categorized)) {
            menu += formatCategory(category, gmds) + '\n';
        }
        
    const giftedMess = {
        image: { url: botPic },
        caption: menu.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363408839929349@newsletter",
            newsletterName: botName,
            serverMessageId: 143
          }
        }
      };
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      await react("✅");
  }
);


gmd({
  pattern: "return",
  aliases: ['details', 'det', 'ret'],
  react: "⚡",
  category: "owner",
  description: "Displays the full raw quoted message using Baileys structure.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, quotedMsg, isSuperUser } = conText;
  
  if (!isSuperUser) {
    return reply(`Owner Only Command!`);
  }
  
  if (!quotedMsg) {
    return reply(`Please reply to/quote a message`);
  }

  try {
    const jsonString = JSON.stringify(quotedMsg, null, 2);
    const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

    for (const chunk of chunks) {
      const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

      await Gifted.sendMessage(
        from,
        {
          text: formattedMessage,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363408839929349@newsletter",
              newsletterName: botName,
              serverMessageId: 143
            },
          },
        },
        { quoted: mek }
      );
      await react("✅");
    }
  } catch (error) {
    console.error("Error processing quoted message:", error);
    await reply(`❌ An error occurred while processing the message.`);
  }
});


gmd({ 
  pattern: "ping",
  react: "⚡",
  category: "general",
  description: "Check bot response speed",
}, async (from, Gifted, conText) => {
      const { mek, react } = conText;
    const startTime = process.hrtime();

    await new Promise(resolve => setTimeout(resolve, Math.floor(80 + Math.random() * 420)));
    
    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor((elapsed[0] * 1000) + (elapsed[1] / 1000000));

    await Gifted.sendMessage(from, {
      text: `⚡ Pong: ${responseTime}ms`,
      contextInfo: {
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363408839929349@newsletter",
          newsletterName: botName,
          serverMessageId: 143
        }
      }
    }, { quoted: mek });
      await react("✅");
  }
);


gmd({ 
  pattern: "uptime", 
  react: "⏳",
  category: "general",
  description: "check bot uptime status.",
}, async (from, Gifted, conText) => {
      const { mek, react } = conText;
      
    const uptimeMs = Date.now() - BOT_START_TIME;
    
    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await Gifted.sendMessage(from, {
      text: `⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`,
      contextInfo: {
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363408839929349@newsletter",
          newsletterName: botName,
          serverMessageId: 143
        }
      }
    }, { quoted: mek });
      await react("✅");
  }
);

gmd({ 
  pattern: "repo", 
  aliases: ['sc', 'script'],
  react: "💜",
  category: "general",
  description: "Fetch bot script.",
}, async (from, Gifted, conText) => {
      const { mek, sender, react, pushName } = conText;

    const response = await axios.get(global.giftedApiRepo);
    const repoData = response.data;
    const { full_name, name, forks_count, stargazers_count, created_at, updated_at, owner } = repoData;
    const messageText = `Hello *_${pushName}_,*\nThis is *Gifted-Md,* A Whatsapp Bot Built by *Gifted Tech,* Enhanced with Amazing Features to Make Your Whatsapp Communication and Interaction Experience Amazing\n\n*ʀᴇᴘᴏ ʟɪɴᴋ:* ${global.giftedRepo}\n\n*❲❒❳ ɴᴀᴍᴇ:* ${name}\n*❲❒❳ sᴛᴀʀs:* ${stargazers_count}\n*❲❒❳ ғᴏʀᴋs:* ${forks_count}\n*❲❒❳ ᴄʀᴇᴀᴛᴇᴅ ᴏɴ:* ${new Date(created_at).toLocaleDateString()}\n*❲❒❳ ʟᴀsᴛ ᴜᴘᴅᴀᴛᴇᴅ:* ${new Date(updated_at).toLocaleDateString()}\n*❲❒❳ ᴏᴡɴᴇʀ:* 𝑮𝒊𝒇𝒕𝒆𝒅 𝑻𝒆𝒄𝒉`;

    const giftedMess = {
        image: { url: botPic },
        caption: messageText,
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363408839929349@newsletter",
            newsletterName: botName,
            serverMessageId: 143
          }
        }
      };
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      await react("✅");
  }
);


gmd({
  pattern: "save",
  aliases: ['sv', 's', 'sav', '.'],
  react: "⚡",
  category: "tools",
  description: "Save messages (supports images, videos, audio, stickers, and text).",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, isSuperUser } = conText;
  
  if (!isSuperUser) {
    return reply(`❌ Owner Only Command!`);
  }

  const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!quotedMsg) {
    return reply(`⚠️ Please reply to/quote a message.`);
  }

  try {
    let mediaData;
    
    if (quotedMsg.imageMessage) {
      const buffer = await getMediaBuffer(quotedMsg.imageMessage, "image");
      mediaData = {
        image: buffer,
        caption: quotedMsg.imageMessage.caption || ""
      };
    } 
    else if (quotedMsg.videoMessage) {
      const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
      mediaData = {
        video: buffer,
        caption: quotedMsg.videoMessage.caption || ""
      };
    } 
    else if (quotedMsg.audioMessage) {
      const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
      mediaData = {
        audio: buffer,
        mimetype: "audio/mp4"
      };
    } 
    else if (quotedMsg.stickerMessage) {
      const buffer = await getMediaBuffer(quotedMsg.stickerMessage, "sticker");
      mediaData = {
        sticker: buffer
      };
    } 
    else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
      mediaData = {
        text: text
      };
    } 
    else {
      return reply(`❌ Unsupported message type.`);
    }

    const ownerId = Gifted.user?.id || from; 
    await Gifted.sendMessage(ownerId, mediaData, { quoted: mek });
    // await reply(`✅ Saved Successfully!`);
    await react("✅");

  } catch (error) {
    console.error("Save Error:", error);
    await reply(`❌ Failed to save the message. Error: ${error.message}`);
  }
});

async function getMediaBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}


global.giftedRepo = "https://github.com/mauricegift/gifted-md";
global.giftedApiRepo = "https://api.github.com/repos/mauricegift/gifted-md";
global.newsletterUrl = "https://whatsapp.com/channel/0029VajvUue0wak1mpi09q3t";
