import { dump, load } from "js-yaml";
import { STORAGE } from "./globals";
import fs from "fs";

export interface TwitchChannel {
    channel: string;
    minCheck: number;
}

/**
 * This represents the storage.yml
 * @class Storage
 * @property {string[]} canHost
 * @property {TwitchChannel[]} channels
 * @property {string} currentlyHosted
 * @property {string[]} fallBackList
 * @property {string[]} usersBlacklist


 */
export default class Storage {
    private static readonly _configLocation = "./storage.yml";

    public canHost: string[];

    public channels: TwitchChannel[];

    public currentlyHosted: string;

    public fallBackList: string[];

    public usersBlacklist: string[];


    private constructor() {
        this.channels = [{ channel: "", minCheck: 0 }];
        this.canHost = [""];
        this.currentlyHosted = "";
        this.fallBackList = [""];
        this.usersBlacklist = [""];
    }

    /**
       *  Call getConfig instead of constructor
       */
    public static getConfig(): Storage {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!fs.existsSync(Storage._configLocation)) {
            throw new Error("Please create a storage.yml");
        }
        const fileContents = fs.readFileSync(
            Storage._configLocation,
            "utf-8"
        );
        const casted = load(fileContents) as Storage;

        return casted;
    }

    /**
   *  Safe the config to the storage.yml default location
   */
    public static saveConfig(): void {
        fs.writeFileSync(Storage._configLocation, dump(STORAGE));
    }
}