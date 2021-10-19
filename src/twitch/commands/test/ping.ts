import { TwitchCommands } from "../../../interfaces";

export const command: TwitchCommands = {
    // Note aliases are optional
    aliases: ["p"],
    description: "Omega Test!",
    example: ["!ping"],
    group: "other",
    name: "ping",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run: async(client, msg, args) => {
        // Run your code here
        return client.say(msg.params.target, "Pong!");
    }
};
