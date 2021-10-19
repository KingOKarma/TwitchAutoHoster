import { DiscordCommands } from "../../../interfaces";
import { MessageEmbed } from "discord.js";
import { STORAGE } from "../../../utils/globals";
import Storage from "../../../utils/storage";
import { arrayPage } from "../../../utils/functions/arrayPage";
import { getUser } from "../../../utils/functions/getUser";

export const command: DiscordCommands = {
    // Note aliases are optional
    aliases: ["fb"],
    description: "Used to add, remove or list users in the fallback list",
    example: ["!fallback list", "!fallback add user", "!fallback remove user"],
    group: "managment",
    modOnly: true,
    name: "fallback",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async (client, msg, args) => {
        const { prefix } = client;

        const [subCommand, channel] = args;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        switch (subCommand === undefined ? "none" : subCommand.toLowerCase()) {
            case "add": {

                // Checks if the user they want to add is already added
                if (STORAGE.fallBackList.includes(channel.toLowerCase())) {
                    return msg.reply(`\`${channel}\` is already on the Fallback List! ❌`);
                }

                const user = await getUser(channel, client);

                if (user === null) return msg.reply("That user doesn't exist on twitch! Did you type in the name correctly?");
                // Otherwise finally add it to the list
                STORAGE.fallBackList.push(user.name);
                Storage.saveConfig();

                return msg.reply(
                    `I have added the channel \`${channel}\` to the Fallback List! ✅`
                );
            }

            case "remove": {

                // Checks if the role they want to add is already added
                if (!STORAGE.fallBackList.includes(channel.toLowerCase())) {
                    return msg.reply(`\`${channel}\` is not on the Fallback List! ❌`);
                }

                // Checks the location in the array for the role
                const roleIndex = STORAGE.fallBackList.indexOf(channel.toLowerCase());

                // Removes the role from the array with the index number
                STORAGE.fallBackList.splice(roleIndex, 1);
                Storage.saveConfig();

                return msg.reply(
                    `I have removed the channel \`${channel} \` from the list ✅`);
            }

            case "list": {
                if (!STORAGE.fallBackList.length) {
                    return msg.reply(
                        `The Fallback list is currently emtpy! use \`${prefix}fallback add <channel>\` `
                        + "to add a channel to the Fallback List!"
                    );
                }

                let page = Number(args[1] ?? "1");
                if (isNaN(page)) page = 1;
                if (page <= 0) page = 1;

                const pagedList = arrayPage(STORAGE.fallBackList, 10, Number(page));

                let finalPage = 1;
                let notMax = false;
                while (!notMax) {
                    const cmds = arrayPage(STORAGE.fallBackList, 10, Number(finalPage));
                    if (cmds.length !== 0) {
                        finalPage++;
                    } else {
                        notMax = true;
                    }
                }
                finalPage -= 1;

                if (page > finalPage) page = finalPage;

                if (pagedList.length === 0) return msg.reply("That page is empty!\n You can add more users via "
                    + `\`${prefix}fallback add <channel>\``);

                const roleList = pagedList.map((list) => `> ○ ${list}`);
                const embed = new MessageEmbed()
                    .setAuthor(
                        msg.author.tag,
                        msg.author.displayAvatarURL({ dynamic: true })
                    )
                    .setTitle("Fallback list")
                    .setTimestamp()
                    .setDescription(roleList.join("\n"))
                    .setFooter(`Page ${page}/${finalPage}`);

                try {
                    return msg.reply({ "embeds": [embed] } );
                } catch {
                    const roles = roleList.join("");
                    return msg.reply(`> listed channels:\n> ${roles}`);
                }
            }

            default: {
                return msg.reply(
                    "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                    + `\`${prefix}fallback add kingokarmatv\``);
            }
        }


    }
};