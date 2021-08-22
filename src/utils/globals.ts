import Config from "./config";
import Storage from "./storage";
import Token from "./token";

export const TOKEN = Token.getConfig();

export const CONFIG = Config.getConfig();

export const STORAGE = Storage.getConfig();

export const commandList = [
    // System CMDs
    { aliases: ["pong"], group: "System", name: "ping" },

    // Help CMDs
    { aliases: ["command", "commands"], group: "System", name: "help" },

    { aliases: ["chatters"], group: "System", name: "getchatters" }


];

