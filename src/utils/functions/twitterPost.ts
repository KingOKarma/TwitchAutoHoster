/* eslint-disable @typescript-eslint/naming-convention */
import { CONFIG } from "../globals";
import { OAuth } from "oauth";

const twitter_application_consumer_key = CONFIG.twitter.consumerKey; // API Key
const twitter_application_secret = CONFIG.twitter.consumerSecret; // API Secret
const twitter_user_access_token = CONFIG.twitter.userAccessToken; // Access Token
const twitter_user_secret = CONFIG.twitter.userSecret; // Access Token Secret

const oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    twitter_application_consumer_key,
    twitter_application_secret,
    "1.0A",
    null,
    "HMAC-SHA1"
);


export function twitterPost(user: string): void {
    if (!CONFIG.twitter.postToTwitter) return;

    const status = `${user} Has been switched to the new host, check them out at https://twitch.tv/${user.toLowerCase()} \n `
        + "#Livestream #TwitchStreamer #StreamerCommunity"; // This is the tweet (ie status)

    const postBody = {
        status
    };

    // Console.log('Ready to Tweet article:\n\t', postBody.status);
    oauth.post("https://api.twitter.com/1.1/statuses/update.json",
        twitter_user_access_token, // Oauth_token (user access token)
        twitter_user_secret, // Oauth_secret (user secret)
        postBody, // Post body
        "", // Post content type ?
        (err) => {

            console.log(err);
        });
}