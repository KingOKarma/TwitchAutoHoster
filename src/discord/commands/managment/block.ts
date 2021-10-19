import { DiscordCommands } from "../../../interfaces";
import { MessageEmbed } from "discord.js";
import { STORAGE } from "../../../utils/globals";
import Storage from "../../../utils/storage";
import { arrayPage } from "../../../utils/functions/arrayPage";
import { getUser } from "../../../utils/functions/getUser";

export const command: DiscordCommands = {
    // Note aliases are optional
    aliases: ["b", "blocks", "ignore"],
    description: "Used to add, remove or list users in the block list",
    example: ["!block list", "!block add user", "!block remove user"],
    group: "managment",
    modOnly: true,
    name: "block",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async (client, msg, args) => {

        const { prefix } = client;

        const [subCommand, channel] = args;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        switch (subCommand === undefined ? "none" : subCommand.toLowerCase()) {
            case "add": {

                // Checks if the role they want to add is already added
                if (STORAGE.usersBlacklist.includes(channel.toLowerCase())) {
                    return msg.reply(`\`${channel}\` is already on the Hosts List! ❌`);
                }

                const user = await getUser(channel, client);

                if (user === null) return msg.reply("That user doesn't exist on twitch! Did you type in the name correctly?");

                // Otherwise finally add it to the list
                STORAGE.usersBlacklist.push(channel.toLowerCase());
                Storage.saveConfig();

                return msg.reply(
                    `I have added the channel \`${channel}\` to the Blocked list! ✅`
                );
            }

            case "remove": {

                // Checks if the role they want to add is already added
                if (!STORAGE.usersBlacklist.includes(channel.toLowerCase())) {
                    return msg.reply(`\`${channel}\` is not on the Blocked List! ❌`);
                }

                // Checks the location in the array for the role
                const roleIndex = STORAGE.usersBlacklist.indexOf(channel.toLowerCase());

                // Removes the role from the array with the index number
                STORAGE.usersBlacklist.splice(roleIndex, 1);
                Storage.saveConfig();

                return msg.reply(
                    `I have removed the channel \`${channel} \` from the Blocked List ✅`);
            }

            case "list": {
                if (!STORAGE.usersBlacklist.length) {
                    return msg.reply(
                        `The Blocked List is currently emtpy! use \`${prefix}block add <channel>\` `
                        + "to add a channel to the Blocked List!"
                    );
                }

                let page = Number(args[1] ?? "1");
                if (isNaN(page)) page = 1;
                if (page <= 0) page = 1;

                const pagedList = arrayPage(STORAGE.usersBlacklist, 10, Number(page));

                let finalPage = 1;
                let notMax = false;
                while (!notMax) {
                    const cmds = arrayPage(STORAGE.usersBlacklist, 10, Number(finalPage));
                    if (cmds.length !== 0) {
                        finalPage++;
                    } else {
                        notMax = true;
                    }
                }
                finalPage -= 1;

                if (page > finalPage) page = finalPage;

                if (pagedList.length === 0) return msg.reply("That page is empty!\n You can add more users via "
                    + `\`${prefix}block add <channel>\``);

                const roleList = pagedList.map((list) => `> ○ ${list}`);
                const embed = new MessageEmbed()
                    .setAuthor(
                        msg.author.tag,
                        msg.author.displayAvatarURL({ dynamic: true })
                    )
                    .setTitle("Blocked Users list")
                    .setTimestamp()
                    .setDescription(roleList.join("\n"))
                    .setFooter(`Page ${page}/${finalPage}`);


                try {
                    return msg.reply({ embeds: [embed] });
                } catch (_) {
                    const roles = roleList.join("");
                    return msg.reply(`> listed channels:\n> ${roles}`);
                }
            }

            default: {
                return msg.reply(
                    "> Please specify either `add`, `remove` or `list` when using this command, \n**Example usage:** "
                    + `\`${prefix}block add kingokarmatv\``);
            }
        }

    }
};