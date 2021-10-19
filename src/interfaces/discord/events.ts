import { ClientEvents } from "discord.js";
import ExtendedClient from "../../client/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Run = (client: ExtendedClient, ...args: any[]) => void;

export interface DiscordEvents {
    name: keyof ClientEvents;
    run: Run;
}
