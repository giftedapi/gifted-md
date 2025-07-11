const { gmd } = require("../gift");
const fs = require('fs').promises;
const { S_WHATSAPP_NET } = require("gifted-baileys");
const Jimp = require("jimp");
const path = require("path");
const moment = require('moment-timezone');


gmd({
  pattern: "demote",
  react: "👑",
  category: "owner",
  description: "Demote a user from being an admin.",
}, async (from, Gifted, conText) => {
  const { reply, react, quotedUser, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  if (!quotedUser) {
    await react("❌");
    return reply(`Please reply to/quote a user or their message!`);
  }

  const ownerIds = [
    '196843149512733@lid',
    '190881634250836@lid',
    '102143516266581@lid',
    '254715206562@s.whatsapp.net',
    '254728782591@s.whatsapp.net',
    '254715206562@s.whatsapp.net',
    '254762016957@s.whatsapp.net',
    '254715206562@s.whatsapp.net'
  ];

  if (ownerIds.includes(quotedUser)) {
    await react("❌");
    return reply("I cannot demote my creator!");
  }
  
  try {
    const info = await Gifted.groupMetadata(from).participants;
    console.log(info);////////////////////////////////////////////////////
    await reply(info);
    await Gifted.groupParticipantsUpdate(from, [quotedUser], 'demote'); 
    const promotedUser = quotedUser.split('@')[0];
    await reply(`${promotedUser} is no longer an admin. 🥇`); 
    await react("✅");
  } catch (error) {
    console.error("Demotion Error:", error);
    if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
      await reply("❌ I need to be an admin to demote users!");
    } else {
      await reply(`❌ Failed to demote: ${error.message}`);
    }
    await react("❌");
  }
});


gmd({
  pattern: "promote",
  aliases: ['toadmin'],
  react: "👑",
  category: "owner",
  description: "Promote a user to admin.",
}, async (from, Gifted, conText) => {
  const { reply, react, quotedUser, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  if (!quotedUser) {
    await react("❌");
    return reply(`Please reply to/quote a user or their message!`);
  }
  try {
    await Gifted.groupParticipantsUpdate(from, [quotedUser], 'promote'); 
    const promotedUser = quotedUser.split('@')[0];
    await reply(`${promotedUser} is now an admin. 🥇`); 
    await react("✅");
  } catch (error) {
    console.error("Promotion Error:", error);
    if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
      await reply("❌ I need to be an admin to promote users!");
    } else {
      await reply(`❌ Failed to promote: ${error.message}`);
    }
    await react("❌");
  }
});


gmd({
  pattern: "gcpp",
  aliases: ['setgcpp', 'gcfullpp', 'fullgcpp'],
  react: "🔮",
  category: "owner",
  description: "Set group full profile picture without cropping.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, sender, quoted, isGroup, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
  
  if (!isGroup) {
    await react("❌");
    return reply(`Command can only be used in groups!`);
  }
  
  let tempFilePath;
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    
    const image = await Jimp.read(tempFilePath);
    const croppedImage = image.crop(0, 0, image.getWidth(), image.getHeight());
    const resizedImage = await croppedImage.scaleToFit(720, 720);
    const imageBuffer = await resizedImage.getBufferAsync(Jimp.MIME_JPEG);

    const pictureNode = {
      tag: "picture",
      attrs: { type: "image" },
      content: imageBuffer
    };

    const iqNode = {
      tag: "iq",
      attrs: {
        to: S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture",
        target: from
      },
      content: [pictureNode]
    };

    await Gifted.query(iqNode);
    await react("✅");
    await fs.unlink(tempFilePath);
    await reply('✅ Group Profile picture updated successfully (full image)!');
    
  } catch (error) {
    console.error("Error updating group profile picture:", error);
    
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
    
    if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
      await reply("❌ I need to be an admin to update group profile picture!");
    } else {
      await reply(`❌ Failed to update group profile picture: ${error.message}`);
    }
    await react("❌");
  }
});


gmd({
  pattern: "whois",
  aliases: ['profile'],
  react: "👀",
  category: "owner",
  description: "Get someone's full profile details.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, sender, quoted, timeZone, quotedMsg, quotedUser, botName, botFooter, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  if (!quotedUser) {
    await react("❌");
    return reply(`Please reply to/quote a user or their message!`);
  }
  
  let profilePictureUrl;
  let statusText = "Not Found.";
  let setAt = "Not Found.";
  
  try {
    if (quoted) {
      try {
        profilePictureUrl = await Gifted.profilePictureUrl(quotedUser, "image");
      } catch (error) {
        await react("❌");
        profilePictureUrl = "https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg";
        return reply(`User does not have profile picture or they have set it to private, using fallback picture!`);
      }
      
      try {
        const statusData = await Gifted.fetchStatus(quotedUser);
        if (statusData) {
          statusText = statusData.status || "Not Found.";
          setAt = statusData.setAt;
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      }

      let formattedDate = "Not Available";
      if (setAt instanceof Date || !isNaN(new Date(setAt))) {
        const userTimezone = timeZone; 
        
        formattedDate = moment(setAt)
          .tz(userTimezone)
          .format('dddd, MMMM Do YYYY, h:mm A z');
      }

      await Gifted.sendMessage(
        from,
        {
          image: { url: profilePictureUrl },
          caption: `*Name:* @${quotedUser.split("@")[0]}\n*Number:* ${quotedUser.replace("@s.whatsapp.net", "")}\n*About:* ${statusText}\n*Last Updated:* ${formattedDate}\n\n> *${botFooter}*`,
          contextInfo: {
            mentionedJid: [quotedUser],
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
    console.error("Error processing profile picture:", error);
    await reply(`❌ An error occurred while fetching the profile picture.`);
    await react("❌");
  }
});


gmd({
  pattern: "fullpp",
  aliases: ['setfullpp'],
  react: "🔮",
  category: "owner",
  description: "Set full profile picture without cropping.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, sender, quoted, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
  let tempFilePath;
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    
    const image = await Jimp.read(tempFilePath);
    const croppedImage = image.crop(0, 0, image.getWidth(), image.getHeight());
    const resizedImage = await croppedImage.scaleToFit(720, 720);
    const imageBuffer = await resizedImage.getBufferAsync(Jimp.MIME_JPEG);

    const pictureNode = {
      tag: "picture",
      attrs: { type: "image" },
      content: imageBuffer
    };

    const iqNode = {
      tag: "iq",
      attrs: {
        to: S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture"
      },
      content: [pictureNode]
    };

    await Gifted.query(iqNode);
    await react("✅");
    await fs.unlink(tempFilePath);
    await reply('✅ Profile picture updated successfully (full image)!');
    
  } catch (error) {
    console.error("Error updating profile picture:", error);
    
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
    
    await reply(`❌ Failed to update profile picture: ${error.message}`);
    await react("❌");
  }
});
                     

gmd({
  pattern: "pp",
  aliases: ['setpp'],
  react: "🔮",
  category: "owner",
  description: "Set new profile picture.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, sender, quoted, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
  
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    
    const tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    const imageBuffer = await fs.readFile(tempFilePath);
    try {
      await Gifted.updateProfilePicture(Gifted.user.id, { url: tempFilePath });
      await reply('Profile picture updated successfully!');
      await react("✅");
    } catch (modernError) {
      console.log('Modern method failed, trying legacy method...');

      const iq = {
        tag: "iq",
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture"
        },
        content: [{
          tag: "picture",
          attrs: {
            type: "image",
          },
          content: imageBuffer
        }]
      };
      
      await Gifted.query(iq);
      await reply('Profile picture update requested (legacy method)');
      await react("✅");
    }
    await fs.unlink(tempFilePath).catch(console.error);
    
  } catch (error) {
    console.error("Error updating profile picture:", error);
    await reply(`❌ An error occurred: ${error.message}`);
    await react("❌");
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
  }
});


gmd({
  pattern: "getpp",
  aliases: ['stealpp', 'snatchpp'],
  react: "👀",
  category: "owner",
  description: "Download someone's profile picture.",
}, async (from, Gifted, conText) => {
  const { mek, reply, react, sender, quoted, quotedMsg, quotedUser, botName, botFooter, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  if (!quotedMsg) {
    await react("❌");
    return reply(`Please reply to/quote a user to get their profile picture!`);
  }
  
  let profilePictureUrl;
  
  try {
    if (quoted) {
      try {
        profilePictureUrl = await Gifted.profilePictureUrl(quotedUser, "image");
        
      } catch (error) {
        await react("❌");
        return reply(`User does not have profile picture or they have set it to private!`);
      }

      await Gifted.sendMessage(
        from,
        {
          image: { url: profilePictureUrl },
          caption: `Here is the Profile Picture\n\n> *${botFooter}*`,
          contextInfo: {
            mentionedJid: [quotedUser],
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
    console.error("Error processing profile picture:", error);
    await reply(`❌ An error occurred while fetching the profile picture.`);
    await react("❌");
  }
});


gmd({ 
  pattern: "vv2", 
  aliases: ['‎2', 'reveal2'],
  react: "🙄",
  category: "owner",
  description: "Reveal View Once Media"
}, async (from, Gifted, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);
    
    let viewOnceContent, mediaType;
    
    if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
        mediaType = Object.keys(quoted).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
        viewOnceContent = { [mediaType]: quoted[mediaType] };
    } 
    else if (quoted.viewOnceMessage) {
        viewOnceContent = quoted.viewOnceMessage.message;
        mediaType = Object.keys(viewOnceContent).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
    } else {
        return reply('Please reply to a view once media message.');
    }

    if (!mediaType) return reply('Unsupported ViewOnce message type.');

    let msg;
    let tempFilePath = null;

    try {
        const mediaMessage = {
            ...viewOnceContent[mediaType],
            viewOnce: false
        };

        tempFilePath = await Gifted.downloadAndSaveMediaMessage(mediaMessage, 'temp_media');
        
        const caption = `${mediaMessage.caption}\n\n> *REVEALED BY ${botName}*`;
        const mime = mediaMessage.mimetype || '';

        if (mediaType.includes('image')) {
            msg = { 
                image: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('video')) {
            msg = { 
                video: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('audio')) {
            msg = { 
                audio: { url: tempFilePath }, 
                ptt: true, 
                mimetype: mime || 'audio/mp4' 
            };
        }

        await Gifted.sendMessage(from, msg);
      await react("✅");
    } catch (e) {
        console.error("Error in vv command:", e);
        reply(`Error: ${e.message}`);
    } finally {
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up temp file:", cleanupError);
            }
        }
    }
});

gmd({ 
  pattern: "vv", 
  aliases: ['‎', 'reveal'],
  react: "🙄",
  category: "owner",
  description: "Reveal View Once Media"
}, async (from, Gifted, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);

    let viewOnceContent, mediaType;
  
    if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
        mediaType = Object.keys(quoted).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
        viewOnceContent = { [mediaType]: quoted[mediaType] };
    } 
    else if (quoted.viewOnceMessage) {
        viewOnceContent = quoted.viewOnceMessage.message;
        mediaType = Object.keys(viewOnceContent).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
    } else {
        return reply('Please reply to a view once media message.');
    }

    if (!mediaType) return reply('Unsupported ViewOnce message type.');

    let msg;
    let tempFilePath = null;

    try {
        const mediaMessage = {
            ...viewOnceContent[mediaType],
            viewOnce: false
        };

        tempFilePath = await Gifted.downloadAndSaveMediaMessage(mediaMessage, 'temp_media');
        
        const caption = `${mediaMessage.caption}\n\n> *REVEALED BY ${botName}*`;
        const mime = mediaMessage.mimetype || '';

        if (mediaType.includes('image')) {
            msg = { 
                image: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('video')) {
            msg = { 
                video: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('audio')) {
            msg = { 
                audio: { url: tempFilePath }, 
                ptt: true, 
                mimetype: mime || 'audio/mp4' 
            };
        }

        await Gifted.sendMessage(Gifted.user.id, msg);
      await react("✅");
    } catch (e) {
        console.error("Error in vv command:", e);
        reply(`Error: ${e.message}`);
    } finally {
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up temp file:", cleanupError);
            }
        }
    }
});
