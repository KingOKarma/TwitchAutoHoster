import ExtendedClient from "../../client/client";
import { HelixUser } from "@twurple/api/lib";

/**
 * Used to get a User instance using a username
 * @param {string} user The user's Username
 * @param {ExtendedClient} client the Client instance
*  @returns HelixUser
 */
export async function getUser(user: string | null | undefined, client: ExtendedClient): Promise<HelixUser | null> {
    if (typeof user !== "string") return null;
    if (!(client instanceof ExtendedClient)) return null;

    user = user.startsWith("@") ? user.slice(1) : user;

    try {
        return await client.apiClient.users.getUserByName(user);
    } catch (e) {
        return null;
    }
}