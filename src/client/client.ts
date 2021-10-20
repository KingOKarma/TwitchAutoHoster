import { CONFIG, TOKEN } from "../utils/globals";
import { DiscordCommands, DiscordCooldowns, DiscordEvents, TwitchCommands, TwitchCooldowns, TwitchEvents } from "../interfaces";
import { ApiClient } from "@twurple/api";
import { ChatClient } from "@twurple/chat";
import { Client } from "discord.js";
import { RefreshingAuthProvider } from "@twurple/auth";
import Token from "../utils/token";
import { eventBinder } from "../utils/eventBinder";
import express from "express";
import fs from "fs";
import ms from "ms";
import path from "path";
import { twitchReady } from "../twitch/events/ready";

// Config consts
const { clientId } = CONFIG;
const { clientSecret } = CONFIG;

// Auth Consts
export const authProvider = new RefreshingAuthProvider(
    {
        clientId,
        clientSecret,
        onRefresh: (newTokenData): void => {
            TOKEN.tokenData = newTokenData;
            Token.saveConfig();
        }
    },
    TOKEN.tokenData
);

class ExtendedClient extends ChatClient {
    public apiClient = new ApiClient({ authProvider });
    public clientEvent = eventBinder(this);
    public discord: Client = new Client(
        { intents: ["GUILD_MESSAGES", "GUILDS", "GUILD_MESSAGE_TYPING", "GUILD_MEMBERS", "DIRECT_MESSAGES"] });
    public discordAliases: Map<string, DiscordCommands> = new Map();
    public discordCommands: Map<string, DiscordCommands> = new Map();
    public discordCooldowns: Map<string, DiscordCooldowns> = new Map();
    public discordEvents: Map<string, DiscordEvents> = new Map();
    public isLive: boolean = false;
    public prefix: string = CONFIG.prefix;
    public twitchAliases: Map<string, TwitchCommands> = new Map();
    public twitchCommands: Map<string, TwitchCommands> = new Map();
    public twitchCooldowns: Map<string, TwitchCooldowns> = new Map();
    public twitchEvents: Map<string, TwitchEvents> = new Map();

    public async initChatClient(): Promise<void> {


        await this.discord.login(CONFIG.discordBotToken).then(() => {
            console.log(`Sucessfully Logged into the Discord client as ${this.discord.user?.tag}!`);
        }).catch(console.error);

        await this.connect().then(() => {
            console.log(`Sucessfully connected to Twitch client as ${CONFIG.botUsername}`);
        }).catch(console.error);

        if (CONFIG.usingExpress) {
            const app = express();
            const port = 3000;

            app.get("/", (req, res) => res.send(
                `${this.discord.user?.tag} has been online for ${ms(this.discord.uptime ?? 0)}<br>`
                + `<br>${this.currentNick} ${this.isConnected ? "Is connected" : "Is not connected"}`));
            app.listen(port, () => void console.log(`Twitch AutoHoster is listening at http://localhost:${port}`));
        }


        /* DISCORD Commands */
        const discCommandsPath = path.join(__dirname, "..", "discord", "commands");
        fs.readdirSync(discCommandsPath).forEach(async (dir) => {
            const cmds = fs.readdirSync(`${discCommandsPath}/${dir}`).filter((file) => file.endsWith(".js"));

            for (const file of cmds) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { command } = await import(`${discCommandsPath}/${dir}/${file}`);
                this.discordCommands.set(command.name, command);

                if (command?.aliases !== undefined) {
                    command.aliases.forEach((alias: string) => {
                        this.discordAliases.set(alias, command);
                    });
                }

            }
        });

        /* DISCORD Events */
        const discEventPath = path.join(__dirname, "..", "discord", "events");
        fs.readdirSync(discEventPath).forEach(async (file) => {
            const { event } = await import(`${discEventPath}/${file}`);
            if (event === undefined) return;
            console.log(event);
            this.discordEvents.set(event.name, event);
            this.discord.on(event.name, event.run.bind(null, this));
        });


        /* TWITCH Commands */
        const twitchCommandPath = path.join(__dirname, "..", "twitch", "commands");
        console.log(twitchCommandPath);
        fs.readdirSync(twitchCommandPath).forEach(async (dir) => {
            const cmds = fs.readdirSync(`${twitchCommandPath}/${dir}`).filter((file) => file.endsWith(".js"));

            for (const file of cmds) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { command } = await import(`${twitchCommandPath}/${dir}/${file}`);
                this.twitchCommands.set(command.name, command);

                if (command?.aliases !== undefined) {
                    command.aliases.forEach((alias: string) => {
                        this.twitchAliases.set(alias, command);
                    });
                }
            }
        });


        /* TWITCH Events */
        const twitchEventPath = path.join(__dirname, "..", "twitch", "events");
        fs.readdirSync(twitchEventPath).forEach(async (file) => {
            const { event } = await import(`${twitchEventPath}/${file}`);
            if (event === undefined) return;
            console.log(event);
            this.twitchEvents.set(event.name, event);
            this.clientEvent.on(event.name, event.run.bind(null, this));
        });

        twitchReady(this);
    }
}

export default ExtendedClient;
