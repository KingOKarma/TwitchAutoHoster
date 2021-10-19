import { TwitchCommands } from "../../../interfaces";
import { arrayPage } from "../../../utils/functions/arrayPage";
import { checkPerms } from "../../../utils/functions/checkPerms";

export const command: TwitchCommands = {
    // Note aliases are optional
    aliases: ["commands"],
    description: "Get a list of commands!",
    example: ["!help 2", "!help"],
    group: "info",
    name: "help",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async (client, msg, args) => {

        const user = msg.userInfo.displayName;
        let page = Number(args[0] ?? "1");
        if (isNaN(page)) page = 1;
        if (page <= 0) page = 1;

        const fullCommands = [...client.twitchCommands.values()];

        let finalPage = 1;
        let notMax = false;
        while (!notMax) {
            const cmds = arrayPage([...client.twitchCommands.values()], 5, finalPage);
            if (cmds.length !== 0) {
                finalPage++;
            } else {
                notMax = true;
            }
        }
        finalPage -= 1;

        if (finalPage < page) page = finalPage;

        let commands = arrayPage(fullCommands, 5, page);

        commands = commands.filter((c) => {

            if (!checkPerms(msg) && (c.modOnly ?? false)) {
                return false;
            }
            return true;
        });


        const finalList = commands.map((c) => c.name);

        return client.say(msg.params.target, `@${user} Page: ${page}, Commands: ${finalList.join(", ")}`);
    }
};
