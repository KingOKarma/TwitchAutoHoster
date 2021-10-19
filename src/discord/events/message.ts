import { CONFIG } from "../../utils/globals";
import { DiscordEvents } from "../../interfaces";
import ExtendedClient from "../../client/client";
import { Message } from "discord.js";
import ms from "ms";

export const event: DiscordEvents = {
    name: "messageCreate",
    run: (client: ExtendedClient, msg: Message) => {
        if (msg.author.bot || !msg.guild || !msg.content.startsWith(CONFIG.prefix)) return;

        const args = msg.content
            .slice(CONFIG.prefix.length)
            .trim()
            .split(/ +/g);

        const cmd = args.shift()?.toLowerCase();

        if (cmd === undefined) return;
        const command = client.discordCommands.get(cmd) ?? client.discordAliases.get(cmd);
        if (command !== undefined) {

            if (command.cooldown !== undefined) {
                const cooldown = client.twitchCooldowns.get(`${command.name}/${msg.author.id}`);
                if (cooldown) {
                    const timePassed = Date.now() - cooldown.timeSet;
                    const timeLeft = command.cooldown * 1000 - timePassed;

                    let response = `${command.cooldownResponse ?? `Hey you're going too fast, please wait another ${ms(timeLeft)}`}`;

                    if (response.includes("{time}")) {
                        const replace = new RegExp("{time}", "g");
                        response = response.replace(replace, ms(timeLeft));
                    }

                    return msg.reply(response);
                }
                client.discordCooldowns.set(`${command.name}/${msg.author.id}`, {
                    command: command.name,
                    cooldownTime: command.cooldown,
                    timeSet: Date.now(),
                    userID: msg.author.id
                });

                setTimeout(() => {
                    client.discordCooldowns.delete(`${command.name}/${msg.author.id}`);
                }, command.cooldown * 1000);

            }

            if (msg.member === null) return;

            if (command.modOnly !== undefined && command.modOnly) {

                if (!msg.member.permissions.has("MANAGE_GUILD")) return msg.reply("This command only be used by users with Manage Server permission!");
            }

            command.run(client, msg, args);

        }
    }
};