import { CONFIG, STORAGE } from "../../utils/globals";
import { Chatters } from "../../interfaces";
import ExtendedClient from "../../client/client";
import Storage from "../../utils/storage";
import { TextChannel } from "discord.js";
import fetch from "node-fetch";
import { twitterPost } from "../../utils/functions/twitterPost";

export function twitchReady(client: ExtendedClient): void {

    // 18 checks every 3 hours
    // This interval default runs every 10 minuites, and does a check to see if users are in chat or not
    setInterval(async () => {
        const allChatters: string[] = [];

        try {
            const res = await fetch(
                `https://tmi.twitch.tv/group/user/${CONFIG.twitchUsername.toLowerCase()}/chatters`
            );
            const data = (await res.json()) as Chatters;

            allChatters.push(...data.chatters.admins);
            allChatters.push(...data.chatters.broadcaster);
            allChatters.push(...data.chatters.global_mods);
            allChatters.push(...data.chatters.moderators);
            allChatters.push(...data.chatters.staff);
            allChatters.push(...data.chatters.viewers);
            allChatters.push(...data.chatters.vips);
        } catch (err) {
            console.error(`Failed to get Chatters array due to:\n${err}`);
        }

        console.log(`${new Date().toTimeString()} Chatters currently in chat: \n${allChatters.join(", ")}`);

        allChatters.forEach((chatter) => {
            if (chatter === CONFIG.botUsername) return;
            if (STORAGE.usersBlacklist.includes(chatter)) return;

            const foundChannel = STORAGE.channels.find((channel) => channel.channel === chatter);
            const canhostCheck = STORAGE.canHost.find((channel) => channel === chatter);
            if (canhostCheck !== undefined) return;

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
        // 10 mins 600000
    }, 600000);

    async function backupHost(): Promise<void> {
        const channel = STORAGE.fallBackList[Math.floor(Math.random() * STORAGE.fallBackList.length)];
        if (channel === STORAGE.currentlyHosted) return;
        const stream = await client.apiClient.streams.getStreamByUserName(channel);
        if (stream === null) {
            console.log("No on fallback is streaming, retrying...");
            void backupHost();
            return;
        }
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
        return client.say(CONFIG.botUsername, `/host ${channel.toLowerCase()}`).catch(console.error);

    }

    setInterval(async () => {
        console.log("New Host time:");
        console.log(STORAGE.canHost.length === 0);

        if (STORAGE.canHost.length === 0) {
            void backupHost();
            return;
        }
        console.log(STORAGE.canHost);

        const channel = STORAGE.canHost[Math.floor(Math.random() * STORAGE.canHost.length)];
        if (channel === CONFIG.botUsername) {
            void backupHost();
            return;
        }

        if (channel === STORAGE.currentlyHosted) {
            void backupHost();
            return;
        }
        const user = await client.apiClient.streams.getStreamByUserName(channel);
        if (user === null) {
            void backupHost();
            return;
        }

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
        return client.say(CONFIG.botUsername, `/host ${channel.toLowerCase()}`).catch(console.error);
        // 30 mins 1800000
    }, 1800000);

    setInterval(async () => {
        const stream = await client.apiClient.streams.getStreamByUserName(CONFIG.twitchUsername);

        client.isLive = stream !== null ? true : false;
        // Console.log(`${CONFIG.twitchUsername} is currently ${stream !== null ? "Live" : "Not Live"}`);

    }, 15000);

}