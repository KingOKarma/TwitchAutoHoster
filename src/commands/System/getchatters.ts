/* eslint-disable @typescript-eslint/no-unused-vars */
import { CONFIG } from "../../utils/globals";
import { ChatClient } from "twitch-chat-client/lib";
import { TwitchPrivateMessage } from "twitch-chat-client/lib/StandardCommands/TwitchPrivateMessage";
import fetch from "node-fetch";


exports.run = async (chatClient: ChatClient,
    channel: string,
    user: string,
    message: string,
    msg: TwitchPrivateMessage,
    args: string[]): Promise<void> => {

    const res = await fetch(
        `https://tmi.twitch.tv/group/user/${CONFIG.twitchUsername}/chatters`
    );

    if (res.status !== 200) {
        throw new Error(`Received a ${res.status} status code`);
    }

    const body = await res.json();

    return chatClient.say(channel, `There are ${body.chatter_count} in chat!`);

};
