import { CONFIG, STORAGE } from "../../utils/globals";
import { TextChannel } from "discord.js";
import { TwitchEvents } from "../../interfaces/twitch/events";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";
import { checkPerms } from "../../utils/functions/checkPerms";
import ms from "ms";

export const event: TwitchEvents = {
    name: "message",
    run: async (client, channel: string, user: string, message: string, msg: TwitchPrivateMessage) => {
        if (user === CONFIG.botUsername.toLowerCase()) return;

        if (STORAGE.usersBlacklist.includes(user)) return;

        if (client.isLive) {
            if (CONFIG.chatChannelID !== undefined) {
                const sendChannel = client.discord.channels.cache.get(CONFIG.chatChannelID) as TextChannel;
                sendChannel.send(`**${msg.userInfo.displayName}**:  ${message}`).catch(console.error);
            }
        } else if (CONFIG.offlineChannelID !== undefined) {
            const offlineChannel = client.discord.channels.cache.get(CONFIG.offlineChannelID) as TextChannel;
            offlineChannel.send(`**${msg.userInfo.displayName}**:  ${message}`).catch(console.error);

        }

        if (!message.startsWith(CONFIG.prefix)) return;

        const args = message
            .slice(CONFIG.prefix.length)
            .trim()
            .split(/ +/g);

        const cmd = args.shift()?.toLowerCase();

        if (cmd === undefined) return;
        const command = client.twitchCommands.get(cmd) ?? client.twitchAliases.get(cmd);
        if (command !== undefined) {

            if (command.cooldown !== undefined) {
                const cooldown = client.twitchCooldowns.get(`${command.name}/${msg.userInfo.userId}`);
                if (cooldown) {
                    const timePassed = Date.now() - cooldown.timeSet;
                    const timeLeft = command.cooldown * 1000 - timePassed;

                    let response = `${command.cooldownResponse ?? `Hey you're going too fast, please wait another ${ms(timeLeft)}`}`;

                    if (response.includes("{time}")) {
                        const replace = new RegExp("{time}", "g");
                        response = response.replace(replace, ms(timeLeft));
                    }

                    return client.say(msg.params.target,
                        `@${user} ${response}`);
                }
                client.twitchCooldowns.set(`${command.name}/${msg.userInfo.userId}`, {
                    command: command.name,
                    cooldownTime: command.cooldown,
                    timeSet: Date.now(),
                    userID: msg.userInfo.userId
                });

                setTimeout(() => {
                    client.twitchCooldowns.delete(`${command.name}/${msg.userInfo.userId}`);
                }, command.cooldown * 1000);

            }

            if (command.modOnly !== undefined && command.modOnly) {
                if (!checkPerms(msg)) return client.say(msg.params.target, `@${user} Sorry that command can only be used by Mods and above!`);
            }

            command.run(client, msg, args);
        }

    }
};