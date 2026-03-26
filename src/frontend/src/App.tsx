import { Toaster } from "@/components/ui/sonner";
import {
  ArrowDownCircle,
  Copy,
  ExternalLink,
  Flame,
  List,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { usePresaleConfig } from "./hooks/useQueries";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solana: any;
  }
}

const FALLBACK_ADDRESS = "HS8vLZMv2XmHzBydZwF9GFErMqjVZFUMeWmmUyYuu2w6";
const FALLBACK_SOFT_CAP = 20;
const FALLBACK_END = new Date("2026-04-30T15:00:00Z").getTime();

const TOKENOMICS = [
  { name: "Liquidity (51%)", value: 51, color: "#facc15" },
  { name: "Community & Rewards", value: 20, color: "#ec4899" },
  { name: "Marketing & Airdrops", value: 15, color: "#22d3ee" },
  { name: "Team (Locked)", value: 9, color: "#eab308" },
  { name: "Development", value: 5, color: "#a855f7" },
];

function getTimeAgo(blockTime: number): string {
  const diff = Math.floor((Date.now() - blockTime * 1000) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Transaction {
  time: string;
  sender: string;
  fullSender: string;
  amount: number;
  amountStr: string;
  signature: string;
  blockTime: number;
}

function useCountdown(endMs: number) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const tick = () => {
      const dist = endMs - Date.now();
      if (dist <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        return;
      }
      setTimeLeft({
        days: Math.floor(dist / 86400000),
        hours: Math.floor((dist % 86400000) / 3600000),
        minutes: Math.floor((dist % 3600000) / 60000),
        seconds: Math.floor((dist % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);

  return timeLeft;
}

export default function App() {
  const { data: config } = usePresaleConfig();

  const presaleAddress = config?.walletAddress ?? FALLBACK_ADDRESS;
  const softCap = config?.softCapSol ?? FALLBACK_SOFT_CAP;
  const endMs = config?.presaleEndTimestamp
    ? Number(config.presaleEndTimestamp / 1_000_000n)
    : FALLBACK_END;

  const countdown = useCountdown(endMs);

  const [solRaised, setSolRaised] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<"all" | "incoming" | "large">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [minAmount, setMinAmount] = useState(0);

  const fetchSOLRaised = useCallback(async () => {
    try {
      const res = await fetch("https://api.mainnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [presaleAddress, { commitment: "finalized" }],
        }),
      });
      const data = await res.json();
      if (data.result?.value !== undefined) {
        setSolRaised(data.result.value / 1e9);
      }
    } catch {}
  }, [presaleAddress]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const sigRes = await fetch("https://api.mainnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [presaleAddress, { limit: 15, commitment: "finalized" }],
        }),
      });
      const sigData = await sigRes.json();
      const signatures: any[] = sigData.result ?? [];

      const results = await Promise.all(
        signatures.map(async (sigInfo: any) => {
          const txRes = await fetch("https://api.mainnet.solana.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [
                sigInfo.signature,
                {
                  encoding: "jsonParsed",
                  commitment: "finalized",
                  maxSupportedTransactionVersion: 0,
                },
              ],
            }),
          });
          const txData = await txRes.json();
          return { sigInfo, tx: txData.result };
        }),
      );

      const txs: Transaction[] = [];
      for (const { sigInfo, tx } of results as any[]) {
        if (!tx?.meta) continue;
        const keys = tx.transaction.message.accountKeys;
        const index = keys.findIndex((k: any) => k.pubkey === presaleAddress);
        if (index === -1) continue;
        const received =
          tx.meta.postBalances[index] - tx.meta.preBalances[index];
        if (received <= 0) continue;
        const amount = received / 1e9;
        const sender = keys[0] ? `${keys[0].pubkey.slice(0, 8)}...` : "Unknown";
        txs.push({
          time: getTimeAgo(sigInfo.blockTime),
          sender,
          fullSender: keys[0]?.pubkey ?? "",
          amount,
          amountStr: amount.toFixed(3),
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime,
        });
      }
      setTransactions(txs);
    } catch {}
    setTxLoading(false);
  }, [presaleAddress]);

  useEffect(() => {
    fetchSOLRaised();
    fetchTransactions();
    const t1 = setInterval(fetchSOLRaised, 15000);
    const t2 = setInterval(fetchTransactions, 25000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [fetchSOLRaised, fetchTransactions]);

  const copyAddress = () => {
    navigator.clipboard.writeText(presaleAddress);
    toast.success("Address copied to clipboard!");
  };

  const connectWallet = async () => {
    if (window.solana?.isPhantom) {
      try {
        const resp = await window.solana.connect();
        const pk: string = resp.publicKey.toString();
        setConnectedWallet(pk);
        toast.success(`Connected: ${pk.slice(0, 6)}...${pk.slice(-4)}`);
      } catch {
        toast.error("Failed to connect wallet.");
      }
    } else {
      toast.error("Please install Phantom wallet!");
    }
  };

  const buyTokens = () => {
    if (!connectedWallet) {
      toast.error("Please connect your Phantom wallet first!");
      return;
    }
    toast.success("Send SOL (1\u201310 SOL) to the presale address above.");
  };

  const filteredTxs = transactions
    .filter((tx) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.sender.toLowerCase().includes(q) ||
        tx.fullSender.toLowerCase().includes(q) ||
        tx.signature.toLowerCase().includes(q);
      const matchMin = tx.amount >= minAmount;
      const matchType = filterType === "large" ? tx.amount > 2 : true;
      return matchSearch && matchMin && matchType;
    })
    .sort((a, b) => {
      if (sortOrder === "oldest") return a.blockTime - b.blockTime;
      if (sortOrder === "highest") return b.amount - a.amount;
      if (sortOrder === "lowest") return a.amount - b.amount;
      return b.blockTime - a.blockTime;
    });

  const progressPct = Math.min(((solRaised ?? 0) / softCap) * 100, 100);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-[1280px] mx-auto px-5 py-5">
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-yellow-400 text-black py-10 rounded-3xl border-b-8 border-black mb-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 rounded-full border-8 border-black overflow-hidden shadow-xl bg-yellow-300">
              <img
                src="/assets/uploads/img_2774-019d2be4-50f6-73bb-a907-f7111276efc1-1.jpeg"
                alt="Share This Coin logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-pixel text-2xl md:text-4xl mt-2 tracking-wide text-center leading-relaxed">
              SHARE THIS COIN
            </h1>
            <p className="text-lg md:text-xl max-w-md text-center font-semibold">
              Empowering people to easily share value, rewards &amp;
              opportunities
            </p>
            <div
              data-ocid="presale.live_badge"
              className="inline-block bg-red-600 text-white text-lg font-bold px-10 py-3 rounded-full animate-pulse"
            >
              &#x1F525; PRESALE IS LIVE &#x1F525;
            </div>
          </div>
        </motion.header>

        {/* SOL RAISED */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border-4 border-yellow-400 rounded-3xl p-8 mb-8 max-w-md mx-auto pulse-glow"
          data-ocid="presale.raised_card"
        >
          <p className="text-yellow-400 font-bold text-lg mb-2">
            SOL RAISED SO FAR
          </p>
          <div className="text-5xl md:text-6xl font-bold text-yellow-400 my-3 font-mono">
            {solRaised !== null ? `${solRaised.toFixed(2)} SOL` : "\u2014 SOL"}
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #facc15, #ec4899)",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Soft Cap: {softCap} SOL &bull; Auto-updates every 15s
          </p>
        </motion.div>

        {/* COUNTDOWN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card border-4 border-yellow-400 rounded-3xl p-8 mb-8"
          data-ocid="presale.countdown_panel"
        >
          <p className="text-yellow-400 font-bold mb-6 text-lg">
            PRESALE ENDS IN
          </p>
          {countdown.expired ? (
            <p className="text-red-500 text-3xl font-bold font-mono">
              PRESALE ENDED
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-4 text-center font-mono">
              {(
                [
                  { label: "DAYS", val: countdown.days },
                  { label: "HRS", val: countdown.hours },
                  { label: "MIN", val: countdown.minutes },
                  { label: "SEC", val: countdown.seconds },
                ] as const
              ).map(({ label, val }) => (
                <div key={label}>
                  <span className="block text-yellow-400 text-4xl md:text-5xl font-bold">
                    {pad(val)}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* JOIN PRESALE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card border-4 border-yellow-400 rounded-3xl p-8 md:p-10 mb-10"
          data-ocid="presale.join_panel"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-6">
            &#x1F680; JOIN THE PRESALE
          </h2>
          <p className="font-semibold mb-3 text-foreground">Presale Address</p>
          <div className="bg-muted p-5 rounded-2xl font-mono text-sm break-all mb-4 text-foreground border border-border">
            {presaleAddress}
          </div>
          <button
            type="button"
            data-ocid="presale.copy_button"
            onClick={copyAddress}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-4 rounded-2xl transition-all"
          >
            <Copy size={18} /> Copy Address
          </button>

          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              type="button"
              data-ocid="presale.connect_button"
              onClick={connectWallet}
              className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-md"
            >
              <Wallet size={20} /> Connect Phantom
            </button>
            <button
              type="button"
              data-ocid="presale.buy_button"
              onClick={buyTokens}
              className="flex items-center gap-2 bg-black border-4 border-yellow-400 text-yellow-400 font-bold px-10 py-4 rounded-2xl hover:bg-zinc-900 transition-all"
            >
              &#x1F4B0; BUY TOKENS NOW
            </button>
          </div>

          <AnimatePresence>
            {connectedWallet && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 text-sm text-yellow-400"
                data-ocid="presale.wallet_status"
              >
                &#x2705; Connected:{" "}
                <span className="font-mono">
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RECENT TRANSACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card border-4 border-yellow-400 rounded-3xl p-8 mb-10"
          data-ocid="presale.transactions_panel"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 text-center mb-8">
            Recent Transactions
          </h2>

          <div className="bg-muted rounded-3xl p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-wrap">
              <div className="flex gap-2 overflow-x-auto filter-scroll pb-1 md:pb-0">
                {[
                  {
                    id: "all" as const,
                    label: "All",
                    icon: <List size={14} />,
                  },
                  {
                    id: "incoming" as const,
                    label: "Incoming",
                    icon: <ArrowDownCircle size={14} />,
                  },
                  {
                    id: "large" as const,
                    label: "Large (>2 SOL)",
                    icon: <Flame size={14} />,
                  },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    data-ocid={`presale.filter_${id}_button`}
                    onClick={() => setFilterType(id)}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl whitespace-nowrap text-sm font-semibold transition-all ${
                      filterType === id
                        ? "bg-yellow-400 text-black"
                        : "bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <input
                  data-ocid="presale.search_input"
                  type="text"
                  placeholder="Search sender or tx..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-secondary border border-yellow-400/50 focus:border-yellow-400 rounded-2xl py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-400"
                />
              </div>

              <select
                data-ocid="presale.sort_select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-secondary border border-yellow-400/50 rounded-2xl py-3 px-4 text-foreground text-sm focus:outline-none focus:border-yellow-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>

              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  Min:
                </span>
                <span className="text-yellow-400 font-bold w-10">
                  {minAmount.toFixed(1)}
                </span>
                <input
                  data-ocid="presale.min_amount_slider"
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={minAmount}
                  onChange={(e) =>
                    setMinAmount(Number.parseFloat(e.target.value))
                  }
                  className="accent-yellow-400 w-28"
                />
              </div>

              <button
                type="button"
                data-ocid="presale.clear_filter_button"
                onClick={() => {
                  setSearch("");
                  setMinAmount(0);
                  setSortOrder("newest");
                  setFilterType("all");
                }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          {txLoading ? (
            <p
              data-ocid="presale.tx_loading_state"
              className="text-center text-muted-foreground py-8"
            >
              Loading recent buys...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[600px]"
                data-ocid="presale.transactions_table"
              >
                <thead>
                  <tr className="border-b border-border">
                    {["Time", "From", "Amount", "Signature"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-4 px-4 text-yellow-400 font-semibold text-sm"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-12 text-muted-foreground"
                        data-ocid="presale.tx_empty_state"
                      >
                        No transactions match your filters
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((tx, i) => (
                      <tr
                        key={tx.signature}
                        data-ocid={`presale.tx.item.${i + 1}`}
                        className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-4 px-4 text-muted-foreground">
                          {tx.time}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs">
                          {tx.sender}
                        </td>
                        <td className="py-4 px-4 text-emerald-400 font-bold">
                          +{tx.amountStr} SOL
                        </td>
                        <td className="py-4 px-4">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:underline flex items-center gap-1 text-xs"
                          >
                            View Tx <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* TOKENOMICS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card border-4 border-yellow-400 rounded-3xl p-8 md:p-10 max-w-2xl mx-auto mb-10"
          data-ocid="presale.tokenomics_panel"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-8 text-center">
            Tokenomics
          </h2>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={TOKENOMICS}
                cx="50%"
                cy="50%"
                outerRadius={130}
                dataKey="value"
                strokeWidth={4}
                stroke="#0d0d0d"
              >
                {TOKENOMICS.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}%`, ""]}
                contentStyle={{
                  background: "#1c1c1c",
                  border: "1px solid #facc15",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#fff", fontSize: "14px" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* WIN BANNER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div
            className="rounded-3xl p-8 text-black font-bold text-lg md:text-xl text-center"
            style={{ background: "linear-gradient(135deg, #facc15, #ec4899)" }}
            data-ocid="presale.win_banner"
          >
            &#x1F389; BUY &amp; WIN: One lucky buyer wins{" "}
            <span className="text-2xl">5 SOL</span> worth of tokens by Sunday!
            <br />
            <span className="text-sm font-normal mt-2 block">
              Buy &amp; sell as much as you want &mdash; selling doesn&apos;t
              disqualify you!
            </span>
          </div>
        </motion.div>

        {/* FOOTER */}
        <footer
          className="text-center py-12 text-muted-foreground"
          data-ocid="presale.footer"
        >
          <p className="mb-4">
            Thank you for being part of{" "}
            <span className="text-yellow-400 font-semibold">This Coin</span>{" "}
            community!
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-lg mb-6">
            {["@leobrainn", "@Mikanoval", "@The_Wheeler_Dealer"].map(
              (handle) => (
                <a
                  key={handle}
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition-colors font-medium"
                  data-ocid={`presale.social_${handle.replace("@", "").toLowerCase()}_link`}
                >
                  {handle}
                </a>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Not financial advice &bull; DYOR &bull; SPL Token on Solana
          </p>
          <p className="text-xs" style={{ color: "oklch(0.55 0 0 / 0.6)" }}>
            &copy; {new Date().getFullYear()}. Built with &hearts; using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-400 transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
