import { CONFIG, STORAGE } from "../../utils/globals";
import { Chatters } from "../../interfaces";
import ExtendedClient from "../../client/client";
import Storage from "../../utils/storage";
import { TextChannel } from "discord.js";
import { twitterPost } from "../../utils/functions/twitterPost";

export function twitchReady(client: ExtendedClient): void {

    // 18 checks every 3 hours
    // This interval default runs every 10 minuites, and does a check to see if users are in chat or not
    setInterval(async () => {

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
            if (foundChannel.minCheck < 18) return;

            STORAGE.canHost.push(chatter);
            const hostedChannel = STORAGE.channels.findIndex((ch) => ch.channel === chatter);
            STORAGE.channels.splice(hostedChannel, 1);
            Storage.saveConfig();

        });
        // 10 mins
    }, 600000);

    async function backupHost(): Promise<void> {
        const channel = STORAGE.fallBackList[Math.floor(Math.random() * STORAGE.fallBackList.length)];
        if (channel === STORAGE.currentlyHosted) return;
        const stream = await client.apiClient.streams.getStreamByUserName(channel);
        if (stream === null) return backupHost();
        console.log("Fallback List");
        console.log(STORAGE.fallBackList);
        console.log(channel);

        if (CONFIG.changeHostChannelID !== undefined) {
            const sendChannel = client.discord.channels.cache.get(CONFIG.changeHostChannelID) as TextChannel;
            sendChannel.send(`Changed host to <https://twitch.tv/${stream.userName}>`).catch(console.error);
        }
        console.log(`Changed host to ${stream.userDisplayName} from fallbacklist`);
        STORAGE.currentlyHosted = channel.toLowerCase();
        twitterPost(channel);

        Storage.saveConfig();
        return client.host(CONFIG.botUsername, channel.toLowerCase()).catch(console.error);

    }

    setInterval(async () => {
        console.log("New Host time:");
        console.log(STORAGE.canHost.length === 0);

        if (STORAGE.canHost.length === 0) return backupHost();
        console.log(STORAGE.canHost);

        const channel = STORAGE.canHost[Math.floor(Math.random() * STORAGE.canHost.length)];
        if (channel === STORAGE.currentlyHosted) return backupHost();
        const user = await client.apiClient.streams.getStreamByUserName(channel);
        if (user === null) return backupHost();

        STORAGE.currentlyHosted = channel.toLowerCase();
        const hostedChannel = STORAGE.canHost.indexOf(channel);
        STORAGE.canHost.splice(hostedChannel, 1);

        if (CONFIG.changeHostChannelID !== undefined) {
            const sendChannel = client.discord.channels.cache.get(CONFIG.changeHostChannelID) as TextChannel;
            sendChannel.send(`Changed host to <https://twitch.tv/${user.userName}>`).catch(console.error);
        }
        console.log(`Changed host to ${user.userDisplayName}`);
        twitterPost(channel);

        Storage.saveConfig();
        return client.host(CONFIG.botUsername, channel.toLowerCase()).catch(console.error);
    }, 600000);

    setInterval(async () => {
        const stream = await client.apiClient.streams.getStreamByUserName(CONFIG.twitchUsername);

        client.isLive = stream !== null ? true : false;
        // Console.log(`${CONFIG.twitchUsername} is currently ${stream !== null ? "Live" : "Not Live"}`);

    }, 15000);

}