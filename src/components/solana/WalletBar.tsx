"use client";

import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Button, Callout, Chip, Dialog, Icon } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { useFeatures } from "@/lib/features";
import { shortAddress } from "@/lib/solana/config";
import { DEVNET_WALLET_NAME } from "@/lib/solana/devnet-adapter";
import { exportDevnetSecret, forgetDevnetKeypair, useDevnetAddress } from "@/lib/solana/devnet-wallet";
import { clearWalletError, useWalletError } from "@/lib/solana/provider";
import { useSolanaT } from "./SolanaText";
import { errorText, formatSol, postJson, walletErrorText } from "./shared";

// Balances change after a faucet drip, a tip or a bounty; anything that sends
// a transaction bumps this so every balance on the page reloads.
let balanceEpoch = 0;
const epochListeners = new Set<() => void>();

export function bumpBalances() {
  balanceEpoch++;
  for (const listener of epochListeners) listener();
}

function subscribeEpoch(listener: () => void) {
  epochListeners.add(listener);
  return () => {
    epochListeners.delete(listener);
  };
}

function useBalance(): number | null | "error" {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const epoch = useSyncExternalStore(subscribeEpoch, () => balanceEpoch, () => 0);
  const [balance, setBalance] = useState<{ key: string; epoch: number; value: number | "error" } | null>(null);
  const key = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!publicKey) return;
    let live = true;
    connection.getBalance(publicKey).then(
      (value) => live && setBalance({ key: publicKey.toBase58(), epoch, value }),
      () => live && setBalance({ key: publicKey.toBase58(), epoch, value: "error" }),
    );
    return () => {
      live = false;
    };
  }, [connection, publicKey, epoch]);

  if (!key || !balance || balance.key !== key) return null;
  return balance.value;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useSolanaT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false))}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
      <span aria-live="polite">{copied ? t("copied") : label}</span>
    </Button>
  );
}

function WalletPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useSolanaT();
  const { wallets, select } = useWallet();
  const browser = wallets.filter(
    (w) => w.adapter.name !== DEVNET_WALLET_NAME && (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
  );
  const pick = (name: WalletName) => {
    clearWalletError();
    select(name);
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={t("wallet.pickerTitle")} description={t("wallet.pickerDescription")} closeLabel={t("close")} size="sm">
      <ul className="grid gap-2">
        <li>
          <button type="button" onClick={() => pick(DEVNET_WALLET_NAME)} className="ink-card flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start">
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border-2 border-line bg-mustard">
              <Icon name="check" size={16} />
            </span>
            <span className="flex-1 font-ui text-sm font-bold">{t("wallet.devnetName")}</span>
            <Chip tone="mustard">{t("wallet.devnetOnly")}</Chip>
          </button>
        </li>
        {browser.map((w) => (
          <li key={w.adapter.name}>
            <button type="button" onClick={() => pick(w.adapter.name)} className="ink-card flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URLs from the extension */}
              <img src={w.adapter.icon} alt="" width={32} height={32} className="size-8 rounded-full" />
              <span className="flex-1 font-ui text-sm font-bold">{w.adapter.name}</span>
              <Chip tone="mint">{t("wallet.detected")}</Chip>
            </button>
          </li>
        ))}
      </ul>
      {browser.length === 0 ? <p className="mt-4 text-sm text-muted">{t("wallet.noBrowserWallets")}</p> : null}
    </Dialog>
  );
}

function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useSolanaT();
  const [shown, setShown] = useState(false);
  const secret = open ? exportDevnetSecret() : null;
  const close = () => {
    setShown(false);
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title={t("wallet.exportTitle")} closeLabel={t("close")} size="sm">
      <Callout tone="warn">{t("wallet.exportWarning")}</Callout>
      <p className="mt-3 text-sm">{t("wallet.exportHow")}</p>
      {secret ? (
        <div className="mt-4 grid gap-2">
          {shown ? (
            <code className="ink-field block break-all p-3 text-xs" translate="no">
              {secret}
            </code>
          ) : (
            <Button variant="secondary" onClick={() => setShown(true)}>
              {t("wallet.exportReveal")}
            </Button>
          )}
          <CopyButton text={secret} label={t("wallet.exportCopy")} />
        </div>
      ) : null}
    </Dialog>
  );
}

function ForgetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useSolanaT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("wallet.forgetTitle")}
      closeLabel={t("close")}
      size="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              forgetDevnetKeypair();
              onClose();
            }}
          >
            {t("wallet.forgetConfirm")}
          </Button>
        </div>
      }
    >
      <p>{t("wallet.forgetBody")}</p>
    </Dialog>
  );
}

function Faucet({ address }: { address: string }) {
  const t = useSolanaT();
  const [state, setState] = useState<{ status: "idle" | "busy" | "done" } | { status: "error"; code: string }>({ status: "idle" });
  const drip = useCallback(async () => {
    setState({ status: "busy" });
    const res = await postJson<{ signature: string }>("/api/solana/faucet", { to: address });
    if (res.ok) {
      setState({ status: "done" });
      bumpBalances();
    } else {
      setState({ status: "error", code: res.code });
    }
  }, [address]);
  return (
    <div className="grid gap-2">
      <Button size="sm" variant="secondary" onClick={drip} disabled={state.status === "busy"} aria-busy={state.status === "busy"}>
        {state.status === "busy" ? t("wallet.faucetBusy") : t("wallet.faucet")}
      </Button>
      <p aria-live="polite" className="text-sm empty:hidden">
        {state.status === "done" ? t("wallet.faucetDone") : state.status === "error" ? errorText(t, state.code) : ""}
      </p>
    </div>
  );
}

/**
 * Connect, show and manage the wallet. `compact` keeps only the essentials
 * (for the tip dialog); the full bar adds balance, faucet, export and forget.
 */
export function WalletBar({ compact = false }: { compact?: boolean }) {
  const t = useSolanaT();
  const locale = useLocale();
  const { publicKey, wallet, connecting, disconnect, select } = useWallet();
  const error = useWalletError();
  const { features } = useFeatures();
  const balance = useBalance();
  const devnetAddress = useDevnetAddress();
  const [dialog, setDialog] = useState<"picker" | "export" | "forget" | null>(null);
  const close = () => setDialog(null);
  const isDevnet = wallet?.adapter.name === DEVNET_WALLET_NAME;
  const address = publicKey?.toBase58() ?? null;

  return (
    <section aria-label={t("wallet.title")} className="grid gap-3">
      {address ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={isDevnet ? "mustard" : "mint"} dot>
              {isDevnet ? t("wallet.devnetName") : wallet?.adapter.name}
            </Chip>
            <Chip tone="ink">{t("devnet")}</Chip>
          </div>
          <p className="flex flex-wrap items-center gap-1 font-ui text-sm">
            <span>{t("wallet.connectedAs", { address: shortAddress(address) })}</span>
            <CopyButton text={address} label={t("copy")} />
          </p>
          {compact ? null : (
            <p className="font-ui text-sm">
              <span className="text-muted">{t("wallet.balance")}: </span>
              <span className="tabular font-bold">
                {balance === null ? t("loading") : balance === "error" ? t("wallet.balanceUnknown") : t("sol", { amount: formatSol(balance, locale) })}
              </span>
            </p>
          )}
          {compact ? null : (
            <div className="flex flex-wrap gap-2">
              {features.solana ? <Faucet address={address} /> : null}
              {isDevnet ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("export")}>
                    {t("wallet.export")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog("forget")}>
                    {t("wallet.forget")}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => void disconnect()}>
                  {t("wallet.disconnect")}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : connecting ? (
        <p aria-live="polite" className="font-ui text-sm">
          {t("wallet.connecting")}
        </p>
      ) : (
        <div className="grid gap-2">
          <Button
            variant="primary"
            onClick={() => {
              clearWalletError();
              select(DEVNET_WALLET_NAME);
            }}
          >
            {devnetAddress ? t("wallet.useExisting", { address: shortAddress(devnetAddress) }) : t("wallet.useDevnet")}
          </Button>
          <p className="text-sm text-muted">{t("wallet.useDevnetHint")}</p>
          <Button variant="secondary" onClick={() => setDialog("picker")}>
            {t("wallet.chooseBrowser")}
          </Button>
        </div>
      )}
      {error ? (
        <Callout tone="danger" live>
          {walletErrorText(t, error)}
        </Callout>
      ) : null}
      <WalletPicker open={dialog === "picker"} onClose={close} />
      <ExportDialog open={dialog === "export"} onClose={close} />
      <ForgetDialog open={dialog === "forget"} onClose={close} />
    </section>
  );
}
