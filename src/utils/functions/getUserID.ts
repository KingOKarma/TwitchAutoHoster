import ExtendedClient from "../../client/client";
import { HelixUser } from "@twurple/api/lib";

/**
 * Used to get a User instance using a username
 * @param {string} user The user's Username
 * @param {ExtendedClient} client the Client instance
*  @returns HelixUser
 */
export async function getUserID(user: string | null, client: ExtendedClient): Promise<HelixUser | null> {
    if (typeof user !== "string") return null;

    try {
        return await client.apiClient.users.getUserById(user);
    } catch (e) {
        return null;
    }
}