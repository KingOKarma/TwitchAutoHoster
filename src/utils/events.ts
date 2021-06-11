/* eslint-disable @typescript-eslint/naming-convention */
import { CONFIG, STORAGE, commandList } from "../utils/globals";
import { Client, TextChannel } from "discord.js";
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
        broadcaster: [ "" ];
        // eslint-disable-next-line @typescript-eslint/naming-convention
        global_mods: [];
        staff: [];
        viewers: [ "" ];
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

    const status = `${user} Has been switched to the new host, check them out at https://twitch.tv/${user.toLowerCase()}`; // This is the tweet (ie status)

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
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
            if (CONFIG.usersBlacklist.includes(chatter)) return;

            const foundChannel = STORAGE.channels.find((channel) => channel.channel === chatter);
            if (foundChannel === undefined) {
                STORAGE.channels.push({ channel: chatter, minCheck: 0 });
                Storage.saveConfig();
                return;
            }

            foundChannel.minCheck ++;
            Storage.saveConfig();
            if (foundChannel.minCheck < 30) return;

            STORAGE.canHost.push(chatter);
            const hostedChannel = STORAGE.channels.findIndex((ch) => ch.channel === chatter );
            STORAGE.channels.splice(hostedChannel, 1);
            Storage.saveConfig();

        });
    });

    async function backupHost(): Promise<void> {
        const channel = CONFIG.fallBackList[Math.floor(Math.random() * CONFIG.fallBackList.length)];
        if (channel === STORAGE.currentlyHosted) return;
        const user = await apiClient.helix.users.getUserByName(channel);
        console.log(user);
        if (user === null) return;
        const isLive = await user.getStream();

        console.log(CONFIG.fallBackList);
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

        console.log(CONFIG.fallBackList);
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
        if (CONFIG.usersBlacklist.includes(channel)) return;

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
        if (msg.content === "post") {

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
