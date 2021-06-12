/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
import { CONFIG, STORAGE, commandList } from "../utils/globals";
import { Client, MessageEmbed, TextChannel } from "discord.js";
import { ApiClient } from "twitch";
import { ChatClient } from "twitch-chat-client";
import { CronJob } from "cron";
import OAuth from "oauth";
import { StaticAuthProvider } from "twitch-auth";
import Storage from "./storage";
import { TwitchPrivateMessage } from "twitch-chat-client/lib/StandardCommands/TwitchPrivateMessage";
import fetch from "node-fetch";

const twitter_application_consumer_key = CONFIG.twitter.consumerKey; // API Key
const twitter_application_secret = CONFIG.twitter.consumerSecret; // API Secret
const twitter_user_access_token = CONFIG.twitter.userAccessToken; // Access Token
const twitter_user_secret = CONFIG.twitter.userSecret; // Access Token Secret

const oauth = new OAuth.OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    twitter_application_consumer_key,
    twitter_application_secret,
    "1.0A",
    null,
    "HMAC-SHA1"
);

interface Chatters {
    _links: {};
    // eslint-disable-next-line @typescript-eslint/naming-convention
    chatter_count: 0;
    chatters: {
        admins: [];
        broadcaster: [""];
        // eslint-disable-next-line @typescript-eslint/naming-convention
        global_mods: [];
        staff: [];
        viewers: [""];
        vips: [];
    };
}
// Config consts
const { clientID } = CONFIG;
const { botAccessToken } = CONFIG;

// Auth Consts
const authChatProvider = new StaticAuthProvider(clientID, botAccessToken);

const apiClient = new ApiClient({ authProvider: authChatProvider });

const bot = new Client();

const { prefix } = CONFIG;


function twitterPost(user: string): void {
    if (!CONFIG.twitter.postToTwitter) return;

    const status = `${user} Has been switched to the new host, check them out at https://twitch.tv/${user.toLowerCase()} \n `
        + "#StreamerCommunity #StyxCommunity #EverStreamGuild"; // This is the tweet (ie status)

    const postBody = {
        status
    };

    // Console.log('Ready to Tweet article:\n\t', postBody.status);
    oauth.post("https://api.twitter.com/1.1/statuses/update.json",
        twitter_user_access_token, // Oauth_token (user access token)
        twitter_user_secret, // Oauth_secret (user secret)
        postBody, // Post body
        "", // Post content type ?
        (err) => {
            if (err) {
                console.log(err);
            } else {
                // Console.log(data);
            }
        });
}


export async function intiChatClient(): Promise<void> {

    const channels = [CONFIG.twitchUsername];

    const chatClient = new ChatClient(authChatProvider, { botLevel: "known", channels });


    // Listen to more events...
    await chatClient.connect().then(void console.log("Twitch: Successfully connected bot client!"));

    // 30 checks every 5 hours
    const viewerCheck = new CronJob("0 */10 * * * *", async () => {
        const res = await fetch(
            `https://tmi.twitch.tv/group/user/${CONFIG.twitchUsername}/chatters`
        );

        if (res.status !== 200) {
            throw new Error(`Received a ${res.status} status code`);
        }


        const body: Chatters = await res.json();
        const allChatters = body.chatters.viewers;
        allChatters.concat(body.chatters.staff);
        allChatters.concat(body.chatters.global_mods);
        allChatters.concat(body.chatters.admins);
        allChatters.concat(body.chatters.vips);
        console.log(`${new Date().toTimeString()} Chatters currently in chat: \n${allChatters.join(", ")}`);

        allChatters.forEach((chatter) => {
            if (STORAGE.usersBlacklist.includes(chatter)) return;

            const foundChannel = STORAGE.channels.find((channel) => channel.channel === chatter);
            if (foundChannel === undefined) {
                STORAGE.channels.push({ channel: chatter, minCheck: 0 });
                Storage.saveConfig();
                return;
            }

            foundChannel.minCheck++;
            Storage.saveConfig();
            if (foundChannel.minCheck < 30) return;

            STORAGE.canHost.push(chatter);
            const hostedChannel = STORAGE.channels.findIndex((ch) => ch.channel === chatter);
            STORAGE.channels.splice(hostedChannel, 1);
            Storage.saveConfig();

        });
    });

    async function backupHost(): Promise<void> {
        const channel = STORAGE.fallBackList[Math.floor(Math.random() * STORAGE.fallBackList.length)];
        if (channel === STORAGE.currentlyHosted) return;
        const user = await apiClient.helix.users.getUserByName(channel);
        console.log(user);
        if (user === null) return;
        const isLive = await user.getStream();

        console.log(STORAGE.fallBackList);
        console.log(channel);
        console.log(`is live?: ${isLive}`);

        if (isLive === null) return;
        if (CONFIG.changeHostChannelID !== undefined) {
            const sendChannel = bot.channels.cache.get(CONFIG.changeHostChannelID) as TextChannel;
            sendChannel.send(`Changed host to ${user.displayName}`).catch(console.error);
        }
        console.log(`Changed host to ${user.displayName} from fallbacklist`);
        STORAGE.currentlyHosted = channel.toLowerCase();
        twitterPost(channel);

        Storage.saveConfig();
        return chatClient.host(CONFIG.botUserName, channel.toLowerCase()).catch(console.error);

    }


    const newHost = new CronJob("0 */30 * * * *", async () => {
        console.log("New Host time:");
        console.log(STORAGE.canHost.length === 0);

        if (STORAGE.canHost.length === 0) {
            return backupHost();


        }
        console.log(STORAGE.canHost);

        const channel = STORAGE.canHost[Math.floor(Math.random() * STORAGE.canHost.length)];
        if (channel === STORAGE.currentlyHosted) return;
        const user = await apiClient.helix.users.getUserByName(channel);
        if (user === null) return;
        const isLive = await user.getStream();

        console.log(STORAGE.fallBackList);
        console.log(channel);
        console.log(`is live?: ${isLive}`);

        if (isLive === null) return backupHost();

        STORAGE.currentlyHosted = channel.toLowerCase();
        const hostedChannel = STORAGE.canHost.indexOf(channel);
        STORAGE.canHost.splice(hostedChannel, 1);
        if (CONFIG.changeHostChannelID !== undefined) {
            const sendChannel = bot.channels.cache.get(CONFIG.changeHostChannelID) as TextChannel;
            sendChannel.send(`Changed host to ${user.displayName}`).catch(console.error);
        }
        console.log(`Changed host to ${user.displayName}`);
        twitterPost(channel);

        Storage.saveConfig();
        return chatClient.host(CONFIG.botUserName, channel.toLowerCase()).catch(console.error);
    });

    viewerCheck.start();
    newHost.start();


    chatClient.onMessageFailed(async (channel: string, reason: string) => {
        console.log(`Cannot send message in ${channel} because of \n\n ${reason}`);
    });

    chatClient.onMessageRatelimit(async (channel: string, message: string) => {
        console.log(`Cannot send message in ${channel} because of it was rate limited \n msg: ${message}`);
    });

    chatClient.onMessage(async (channel: string, user: string, message: string, msg: TwitchPrivateMessage) => {

        const isLive = await apiClient.helix.streams.getStreamByUserName(channel.slice(1));
        if (STORAGE.usersBlacklist.includes(channel)) return;

        if (isLive !== null) {
            if (CONFIG.chatChannelID !== undefined) {
                const sendChannel = bot.channels.cache.get(CONFIG.chatChannelID) as TextChannel;
                sendChannel.send(`**${msg.userInfo.displayName}**:  ${message}`).catch(console.error);
            }
        } else if (CONFIG.offlineChannelID !== undefined) {
            const offlineChannel = bot.channels.cache.get(CONFIG.offlineChannelID) as TextChannel;
            offlineChannel.send(`**${msg.userInfo.displayName}**:  ${message}`).catch(console.error);

        }


        const args = message.slice(prefix.length).trim().split(/ +/g);

        const cmd = args.shift()?.toLowerCase();

        if (cmd === undefined) {
            return;
        }

        const cmdIndex = commandList.findIndex((n) => {

            return n.name === cmd || n.aliases.includes(cmd);

        });

        if (cmdIndex === -1) {
            return;
        }

        const foundcmd = commandList[cmdIndex];

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const commandFile = require(`../commands/${foundcmd.group}/${foundcmd.name}.js`);
            commandFile.run(chatClient, channel, user, message, msg, args);

        } catch (err) {

        }

    });

    if (CONFIG.discordBotToken !== undefined) {

        bot.on("ready", () => {
            console.log(`Discord: ${bot.user?.tag} is online!`);
        });

        bot.login(CONFIG.discordBotToken).catch(console.error);

    }

    bot.on("message", (msg) => {

        const args = msg.content.slice(prefix.length).trim().split(/ +/g);

        const cmd = args.shift()?.toLowerCase();

        if (cmd === undefined) return;


        if (cmd === "fallback") {
            if (!(msg.member?.hasPermission("MANAGE_GUILD") ?? false)) {
                return msg.reply("Please make sure you have the permission Manage_Server to use any of my commands!");
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (args[0] === undefined) {
                return msg.reply(
                    "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                    + `\`${prefix}fallback add king_o_karma\``);
            }
            switch (args[0].toLowerCase()) {
                case "add": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (STORAGE.fallBackList.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is already on the list! ❌`);
                    }

                    // Otherwise finally add it to the list
                    STORAGE.fallBackList.push(channel.toLowerCase());
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have added the channel \`${channel}\` to the list! ✅`
                    );
                }

                case "remove": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (!STORAGE.fallBackList.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is not on the list! ❌`);
                    }

                    // Checks the location in the array for the role
                    const roleIndex = STORAGE.fallBackList.indexOf(channel.toLowerCase());

                    // Removes the role from the array with the index number
                    STORAGE.fallBackList.splice(roleIndex, 1);
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have removed the channel \`${channel} \` from the list ✅`);
                }

                case "list": {
                    if (!STORAGE.fallBackList.length) {
                        return msg.channel.send(
                            `The list is currently emtpy! use ${prefix}fallback addd <channel> `
                            + "to add a channel to the list!"
                        );
                    }
                    function paginate(array: string[], pageSize: number, pageNumber: number): string[] {
                        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
                    }
                    // eslint-disable-next-line prefer-destructuring
                    let page = args[1];
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (args[1] === undefined) page = "1";

                    const pagedList = paginate(STORAGE.fallBackList, 10, Number(page));

                    if (pagedList.length === 0) return msg.reply("That page is empty!\n You can add more users via "
                        + `\`${prefix}fallback add <channelName>\``);

                    const roleList = pagedList.map((list) => `> ○ ${list}\n`);
                    const embed = new MessageEmbed()
                        .setAuthor(
                            msg.author.tag,
                            msg.author.displayAvatarURL({ dynamic: true })
                        )
                        .setTitle("Fallback list")
                        .setTimestamp()
                        .setDescription(roleList.join(""))
                        .setFooter(`Page ${page}`);

                    try {
                        return msg.channel.send(embed);
                    } catch (_) {
                        const roles = roleList.join("");
                        return msg.channel.send(`> listed channels:\n> ${roles}`);
                    }
                }

                default: {
                    return msg.reply(
                        "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                        + `\`${prefix}fallback add king_o_karma\``);
                }
            }
        }

        if (cmd === "host") {

            if (!(msg.member?.hasPermission("MANAGE_GUILD") ?? false)) {
                return msg.reply("Please make sure you have the permission Manage_Server to use any of my commands!");
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (args[0] === undefined) {
                return msg.reply(
                    "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                    + `\`${prefix}host add king_o_karma\``);
            }
            switch (args[0].toLowerCase()) {
                case "add": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (STORAGE.canHost.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is already on the list! ❌`);
                    }

                    // Otherwise finally add it to the list
                    STORAGE.canHost.push(channel.toLowerCase());
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have added the channel \`${channel}\` to the list! ✅`
                    );
                }

                case "remove": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (!STORAGE.canHost.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is not on the list! ❌`);
                    }

                    // Checks the location in the array for the role
                    const roleIndex = STORAGE.canHost.indexOf(channel.toLowerCase());

                    // Removes the role from the array with the index number
                    STORAGE.canHost.splice(roleIndex, 1);
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have removed the channel \`${channel} \` from the list ✅`);
                }

                case "list": {
                    if (!STORAGE.canHost.length) {
                        return msg.channel.send(
                            `The list is currently emtpy! use ${prefix}host addd <channel> `
                            + "to add a channel to the list!"
                        );
                    }
                    function paginate(array: string[], pageSize: number, pageNumber: number): string[] {
                        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
                    }
                    // eslint-disable-next-line prefer-destructuring
                    let page = args[1];
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (args[1] === undefined) page = "1";

                    const pagedList = paginate(STORAGE.canHost, 10, Number(page));

                    if (pagedList.length === 0) return msg.reply("That page is empty!\n You can add more users via "
                        + `\`${prefix}host add <channelName>\``);

                    const roleList = pagedList.map((list) => `> ○ ${list}\n`);
                    const embed = new MessageEmbed()
                        .setAuthor(
                            msg.author.tag,
                            msg.author.displayAvatarURL({ dynamic: true })
                        )
                        .setTitle("To Host list")
                        .setTimestamp()
                        .setDescription(roleList.join(""))
                        .setFooter(`Page ${page}`);


                    try {
                        return msg.channel.send(embed);
                    } catch (_) {
                        const roles = roleList.join("");
                        return msg.channel.send(`> listed channels:\n> ${roles}`);
                    }
                }

                default: {
                    return msg.reply(
                        "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                        + `\`${prefix}host add king_o_karma\``);
                }
            }
        }

        if (cmd === "block") {

            if (!(msg.member?.hasPermission("MANAGE_GUILD") ?? false)) {
                return msg.reply("Please make sure you have the permission Manage_Server to use any of my commands!");
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (args[0] === undefined) {
                return msg.reply(
                    "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                    + `\`${prefix}block add king_o_karma\``);
            }
            switch (args[0].toLowerCase()) {
                case "add": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (STORAGE.usersBlacklist.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is already on the list! ❌`);
                    }

                    // Otherwise finally add it to the list
                    STORAGE.usersBlacklist.push(channel.toLowerCase());
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have added the channel \`${channel}\` to the list! ✅`
                    );
                }

                case "remove": {
                    // eslint-disable-next-line prefer-destructuring
                    const channel = args[1];

                    // Checks if the role they want to add is already added
                    if (!STORAGE.usersBlacklist.includes(channel.toLowerCase())) {
                        return msg.channel.send(`\`${channel}\` is not on the list! ❌`);
                    }

                    // Checks the location in the array for the role
                    const roleIndex = STORAGE.usersBlacklist.indexOf(channel.toLowerCase());

                    // Removes the role from the array with the index number
                    STORAGE.usersBlacklist.splice(roleIndex, 1);
                    Storage.saveConfig();

                    return msg.channel.send(
                        `I have removed the channel \`${channel} \` from the list ✅`);
                }

                case "list": {
                    if (!STORAGE.usersBlacklist.length) {
                        return msg.channel.send(
                            `The list is currently emtpy! use ${prefix}block addd <channel> `
                            + "to add a channel to the list!"
                        );
                    }
                    function paginate(array: string[], pageSize: number, pageNumber: number): string[] {
                        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
                    }
                    // eslint-disable-next-line prefer-destructuring
                    let page = args[1];
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (args[1] === undefined) page = "1";

                    const pagedList = paginate(STORAGE.usersBlacklist, 10, Number(page));

                    if (pagedList.length === 0) return msg.reply("That page is empty!\n You can add more users via "
                        + `\`${prefix}block add <channelName>\``);

                    const roleList = pagedList.map((list) => `> ○ ${list}\n`);
                    const embed = new MessageEmbed()
                        .setAuthor(
                            msg.author.tag,
                            msg.author.displayAvatarURL({ dynamic: true })
                        )
                        .setTitle("Blocked users list")
                        .setTimestamp()
                        .setDescription(roleList.join(""))
                        .setFooter(`Page ${page}`);


                    try {
                        return msg.channel.send(embed);
                    } catch (_) {
                        const roles = roleList.join("");
                        return msg.channel.send(`> listed channels:\n> ${roles}`);
                    }
                }

                default: {
                    return msg.reply(
                        "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                        + `\`${prefix}block add king_o_karma\``);
                }
            }
        }

    });


}

/**
 * Checks if user has perms to use bot commands
   * @param {TwitchPrivateMessage} msg Message instance
 */
export function checkPerms(msg: TwitchPrivateMessage): boolean {
    let hasperms = false;

    if (msg.userInfo.isBroadcaster) {
        hasperms = true;
    }

    if (msg.userInfo.isMod) {
        hasperms = true;
    }

    return hasperms;

}
