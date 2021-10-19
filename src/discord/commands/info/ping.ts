import { DiscordCommands } from "../../../interfaces";

export const command: DiscordCommands = {
    // Note aliases are optional
    aliases: ["p"],
    cooldown: 3,
    cooldownResponse: "Woah there buckaroo slow down, you have to wait another {time}",
    description: "Used for testing the ping!!",
    example: ["!ping"],
    group: "other",
    name: "ping",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async (client, msg, _args) => {
        // Run your code here
        return msg.reply("Pinging...").then(async (m) => {
            await m.edit(`**🏓Latency** is ${m.createdTimestamp - msg.createdTimestamp}ms.`
                + `\n**API Latency** is ${Math.round(client.discord.ws.ping)}ms`);
        });
    }
};