"use client";

import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Suspense, useState } from "react";
import { Button, Callout, Dialog, Icon, SegmentedControl } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { sendTip, tipMemo } from "@/lib/solana/actions";
import { LAMPORTS_PER_SOL, explorerUrl, isAddress } from "@/lib/solana/config";
import { SolanaProvider } from "@/lib/solana/provider";
import { SolanaText, useSolanaT } from "./SolanaText";
import { WalletBar, bumpBalances } from "./WalletBar";
import { formatSol, walletErrorText } from "./shared";

const AMOUNTS = ["0.001", "0.005", "0.01"] as const;
type Amount = (typeof AMOUNTS)[number];

export type TipButtonProps = {
  /** The helper's wallet address; null when they have not connected one. */
  to: string | null;
  /** Their display name (H11: self-chosen, at most 24 characters). */
  name: string;
  /** The room id (H7), written into the memo. */
  roomId: string;
  /** Called with the signature once the tip is confirmed, so the room can show it. */
  onTipped?: (tip: { signature: string; lamports: number; to: string }) => void;
};

type Sending = { status: "idle" } | { status: "busy" } | { status: "sent"; signature: string } | { status: "error"; message: string };

function TipDialog({ to, name, roomId, onTipped, open, onClose }: TipButtonProps & { to: string; open: boolean; onClose: () => void }) {
  const t = useSolanaT();
  const locale = useLocale();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState<Amount>("0.005");
  const [sending, setSending] = useState<Sending>({ status: "idle" });
  const self = wallet.publicKey?.toBase58() === to;

  async function send() {
    const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
    setSending({ status: "busy" });
    try {
      const signature = await sendTip(connection, wallet, { to: new PublicKey(to), lamports, roomId });
      setSending({ status: "sent", signature });
      bumpBalances();
      onTipped?.({ signature, lamports, to });
    } catch (error) {
      setSending({ status: "error", message: walletErrorText(t, error) });
    }
  }

  const close = () => {
    if (sending.status !== "busy") setSending({ status: "idle" });
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={t("tip.title", { name })} description={t("tip.description", { memo: tipMemo(roomId) })} closeLabel={t("close")} size="sm">
      <div className="grid gap-4">
        <WalletBar compact />
        <SegmentedControl
          label={t("tip.amountLabel")}
          options={AMOUNTS.map((value) => ({ value, label: t("sol", { amount: formatSol(Math.round(Number(value) * LAMPORTS_PER_SOL), locale) }) }))}
          value={amount}
          onChange={setAmount}
        />
        {self ? <p className="text-sm text-muted">{t("tip.self")}</p> : null}
        {sending.status === "sent" ? (
          <Callout tone="success" live>
            <p>{t("tip.sent", { name })}</p>
            <a href={explorerUrl("tx", sending.signature)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 font-ui text-sm font-bold">
              {t("panel.viewTx")}
              <Icon name="external" size={16} />
            </a>
          </Callout>
        ) : (
          <Button variant="primary" onClick={send} disabled={!wallet.publicKey || self || sending.status === "busy"} aria-busy={sending.status === "busy"}>
            {sending.status === "busy" ? t("tip.sending") : t("tip.send")}
          </Button>
        )}
        {sending.status === "error" ? (
          <Callout tone="danger" live>
            {sending.message}
          </Callout>
        ) : null}
      </div>
    </Dialog>
  );
}

function Tip(props: TipButtonProps) {
  const t = useSolanaT();
  const [open, setOpen] = useState(false);
  const to = props.to && isAddress(props.to) ? props.to : null;
  if (!to) {
    return <span className="font-ui text-xs text-muted">{t("tip.noAddress", { name: props.name })}</span>;
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {t("tip.button", { name: props.name })}
      </Button>
      <TipDialog {...props} to={to} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A devnet SOL tip for a helper in a room: a transfer plus the memo iynk:tip:<roomId> (H6). */
export function TipButton(props: TipButtonProps) {
  return (
    <SolanaProvider>
      <Suspense fallback={null}>
        <SolanaText>
          <Tip {...props} />
        </SolanaText>
      </Suspense>
    </SolanaProvider>
  );
}
