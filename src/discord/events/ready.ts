import { DiscordEvents } from "../../interfaces";

export const event: DiscordEvents = {
    name: "ready",
    run: async () => {
        console.log("Discord Bot Ready!");

    }
};