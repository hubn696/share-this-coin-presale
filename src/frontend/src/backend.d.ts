import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PresaleConfig {
    presaleEndTimestamp: bigint;
    walletAddress: string;
    softCapSol: number;
    tokenName: string;
}
export interface backendInterface {
    getConfig(): Promise<PresaleConfig>;
    getPresaleEndTimestamp(): Promise<bigint>;
    getSoftCapSol(): Promise<number>;
    getTokenName(): Promise<string>;
    getWalletAddress(): Promise<string>;
    setConfig(walletAddress: string, presaleEndTimestamp: bigint, softCapSol: number, tokenName: string): Promise<void>;
}
