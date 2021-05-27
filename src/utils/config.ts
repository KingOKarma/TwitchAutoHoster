import { dump, load } from "js-yaml";
import { CONFIG } from "./globals";
import fs from "fs";

/**
 * This represents the config.yml
 * @class Config
 * @property {string} accessToken
 * @property {string} botAccessToken
 * @property {string} botUserName
 * @property {string} changeHostChannelID
 * @property {string} chatChannelID
 * @property {string} clientID
 * @property {string} discordBotToken
 * @property {string[]} fallBackList
 * @property {string} offlineChannelID
 * @property {string} prefix
 * @property {string} twitchUsername
 * @property {string[]} usersBlacklist
 */
export default class Config {
    private static readonly _configLocation = "./config.yml";

    public readonly accessToken: string;

    public readonly botAccessToken: string;

    public readonly botUserName: string;

    public readonly changeHostChannelID: string;

    public readonly chatChannelID: string;

    public readonly clientID: string;

    public readonly discordBotToken: string;

    public readonly fallBackList: string[];

    public readonly offlineChannelID: string;

    public readonly prefix: string;

    public readonly twitchUsername: string;

    public readonly usersBlacklist: string[];


    private constructor() {
        this.accessToken = "";
        this.botAccessToken = "";
        this.botUserName = "";
        this.changeHostChannelID = "";
        this.chatChannelID = "";
        this.clientID = "";
        this.discordBotToken = "";
        this.fallBackList = [""];
        this.offlineChannelID = "";
        this.prefix = "";
        this.twitchUsername = "";
        this.usersBlacklist = [""];

    }

    /**
       *  Call getConfig instead of constructor
       */
    public static getConfig(): Config {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!fs.existsSync(Config._configLocation)) {
            throw new Error("Please create a config.yml");
        }
        const fileContents = fs.readFileSync(
            Config._configLocation,
            "utf-8"
        );
        const casted = load(fileContents) as Config;

        return casted;
    }

    /**
   *  Safe the config to the congfig.yml default location
   */
    public static saveConfig(): void {
        fs.writeFileSync(Config._configLocation, dump(CONFIG));
    }
}