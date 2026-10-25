import {
  BaseSignerWalletAdapter,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  type TransactionOrVersionedTransaction,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { PublicKey, VersionedTransaction, type TransactionVersion } from "@solana/web3.js";
import { createDevnetKeypair, getDevnetKeypair, subscribeDevnetWallet } from "./devnet-wallet";

export const DEVNET_WALLET_NAME = "iynk devnet wallet" as WalletName<"iynk devnet wallet">;

// Ink-and-paper mark: a key on a mustard tag.
const ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#f2b632" stroke="#1d1a17" stroke-width="2.5"/><circle cx="12" cy="16" r="5" fill="#fffaf0" stroke="#1d1a17" stroke-width="2.5"/><path d="M17 16h9m-3 0v4m-3-4v3" stroke="#1d1a17" stroke-width="2.5" stroke-linecap="round"/></svg>',
  );

/**
 * A wallet-adapter for the in-browser devnet keypair. Connecting creates the
 * keypair on first use, so trying iynk's Proof of Build is one click.
 */
export class DevnetWalletAdapter extends BaseSignerWalletAdapter<"iynk devnet wallet"> {
  name = DEVNET_WALLET_NAME;
  url = "https://explorer.solana.com/?cluster=devnet";
  icon = ICON;
  readyState = typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable;
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set<TransactionVersion>(["legacy", 0]);

  private key: PublicKey | null = null;
  private busy = false;
  private unsubscribe: (() => void) | null = null;

  get publicKey() {
    return this.key;
  }

  get connecting() {
    return this.busy;
  }

  async connect(): Promise<void> {
    if (this.key || this.busy) return;
    if (this.readyState !== WalletReadyState.Loadable) throw new WalletNotReadyError();
    this.busy = true;
    try {
      const pair = createDevnetKeypair();
      if (!pair) throw new WalletNotReadyError("This browser does not allow iynk to store a devnet wallet.");
      this.key = pair.publicKey;
      // Forgetting the wallet (here or in another tab) disconnects it.
      this.unsubscribe = subscribeDevnetWallet(() => {
        const current = getDevnetKeypair();
        if (!current || !this.key || !current.publicKey.equals(this.key)) void this.disconnect();
      });
      this.emit("connect", pair.publicKey);
    } catch (error) {
      this.emit("error", error as WalletNotReadyError);
      throw error;
    } finally {
      this.busy = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.key) return;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.key = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this["supportedTransactionVersions"]>>(transaction: T): Promise<T> {
    const pair = getDevnetKeypair();
    if (!pair || !this.key || !pair.publicKey.equals(this.key)) throw new WalletNotConnectedError();
    if (transaction instanceof VersionedTransaction) transaction.sign([pair]);
    else transaction.partialSign(pair);
    return transaction;
  }
}
