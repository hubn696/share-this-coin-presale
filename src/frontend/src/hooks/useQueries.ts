import { useQuery } from "@tanstack/react-query";
import type { PresaleConfig } from "../backend.d";
import { useActor } from "./useActor";

export function usePresaleConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<PresaleConfig>({
    queryKey: ["presaleConfig"],
    queryFn: async () => {
      if (!actor) {
        return {
          presaleEndTimestamp: BigInt("1746021600000000000"),
          walletAddress: "HS8vLZMv2XmHzBydZwF9GFErMqjVZFUMeWmmUyYuu2w6",
          softCapSol: 20,
          tokenName: "THIS",
        };
      }
      try {
        return await actor.getConfig();
      } catch {
        return {
          presaleEndTimestamp: BigInt("1746021600000000000"),
          walletAddress: "HS8vLZMv2XmHzBydZwF9GFErMqjVZFUMeWmmUyYuu2w6",
          softCapSol: 20,
          tokenName: "THIS",
        };
      }
    },
    enabled: !isFetching,
  });
}
