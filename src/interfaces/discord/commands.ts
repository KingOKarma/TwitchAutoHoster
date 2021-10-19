/* eslint-disable @typescript-eslint/member-ordering */
import ExtendedClient from "../../client/client";
import { Message } from "discord.js";

type Run = (client: ExtendedClient, msg: Message, args: string[]) => void;

export interface DiscordCommands {
    aliases?: string[];
    cooldown?: number;
    cooldownResponse?: string;
    modOnly?: boolean;

    name: string;
    description: string;
    example: string[];
    group: string;
    run: Run;

}
