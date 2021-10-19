import { dump, load } from "js-yaml";
import { TOKEN } from "./globals";
import fs from "fs";

export interface TokenData {
    accessToken: string;
    expiresIn: number | null;
    obtainmentTimestamp: number;
    refreshToken: string | null;

}

/**
 * This represents the token.yml
 * @class Token
 * @property {TokenData} tokenData

 */
export default class Token {
    private static readonly _configLocation = "./token.yml";

    public tokenData: TokenData;


    private constructor() {
        this.tokenData = { accessToken: "", expiresIn: 0, obtainmentTimestamp: 0, refreshToken: "" };

    }

    /**
       *  Call getConfig instead of constructor
       */
    public static getConfig(): Token {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!fs.existsSync(Token._configLocation)) {
            throw new Error("Please create a token.yml");
        }
        const fileContents = fs.readFileSync(
            Token._configLocation,
            "utf-8"
        );
        const casted = load(fileContents) as Token;

        return casted;
    }

    /**
   *  Safe the token to the congfig.yml default location
   */
    public static saveConfig(): void {
        fs.writeFileSync(Token._configLocation, dump(TOKEN));
    }
}