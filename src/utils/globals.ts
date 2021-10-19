import Config from "./config";
import Storage from "./storage";
import Token from "./token";

export const TOKEN = Token.getConfig();

export const CONFIG = Config.getConfig();

export const STORAGE = Storage.getConfig();
