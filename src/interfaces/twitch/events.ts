import { ChatClientEvents } from "../../utils/eventBinder";
import ExtendedClient from "../../client/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Run = (client: ExtendedClient, ...args: any[]) => void;

export interface TwitchEvents {
    name: ChatClientEvents;
    run: Run;
}
