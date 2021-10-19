/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/member-ordering */
interface ChattersObject {
    _links: {};
    broadcaster: string[];
    vips: string[];
    moderators: string[];
    staff: string[];
    admins: string[];
    global_mods: string[];
    viewers: string[];
}

export interface Chatters {
    chatter_count: number;
    chatters: ChattersObject;

}