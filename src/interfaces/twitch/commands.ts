/* eslint-disable @typescript-eslint/member-ordering */
import ExtendedClient from "../../client/client";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";

type Run = (client: ExtendedClient, msg: TwitchPrivateMessage, args: string[]) => void;

export interface TwitchCommands {
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
