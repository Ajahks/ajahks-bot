import {
    DMChannel,
    NewsChannel,
    PartialDMChannel,
    PrivateThreadChannel,
    PublicThreadChannel,
    StageChannel,
    TextChannel, VoiceChannel
} from "discord.js";

export type AnyChannel =
    | DMChannel
    | PartialDMChannel
    | NewsChannel
    | StageChannel
    | TextChannel
    | PublicThreadChannel<boolean>
    | PrivateThreadChannel
    | VoiceChannel;
