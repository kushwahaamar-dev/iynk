"use client";

import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useId, useState, type FormEvent } from "react";
import { Button, Callout, Icon } from "@/components/ui";
import { DRONE_IDS } from "@/content/ids";
import { createBounty } from "@/lib/solana/actions";
import { LAMPORTS_PER_SOL, PROGRAM_ID, explorerUrl, isAddress } from "@/lib/solana/config";
import { skillIdFor } from "@/lib/verify/skill";
import { useSolanaT } from "./SolanaText";
import { bumpBalances } from "./WalletBar";
import { walletErrorText } from "./shared";

// Sponsors lock devnet SOL for the skills the server can verify today.
const SKILLS = DRONE_IDS.map((id) => ({ id, skillId: skillIdFor("drone-safety", id) as string }));

const MIN_SOL = 0.001;
const MAX_SOL = 1;

type Sent = { status: "idle" } | { status: "busy" } | { status: "done"; signature: string } | { status: "error"; message: string };

export function BountyForm({ onCreated }: { onCreated?: () => void }) {
  const t = useSolanaT();
  const { connection } = useConnection();
  const wallet = useWallet();
  const ids = useId();
  const [skillId, setSkillId] = useState(SKILLS[0].skillId);
  const [learner, setLearner] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<Sent>({ status: "idle" });

  const sol = Number(amount);
  const amountOk = Number.isFinite(sol) && sol >= MIN_SOL && sol <= MAX_SOL;
  const learnerOk = learner.trim() === "" || isAddress(learner.trim());

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!amountOk || !learnerOk || !PROGRAM_ID || !wallet.publicKey) return;
    setSent({ status: "busy" });
    try {
      const { signature } = await createBounty(connection, wallet, PROGRAM_ID, {
        skillId,
        learner: learner.trim() ? new PublicKey(learner.trim()) : null,
        lamports: BigInt(Math.round(sol * LAMPORTS_PER_SOL)),
      });
      setSent({ status: "done", signature });
      bumpBalances();
      onCreated?.();
    } catch (error) {
      setSent({ status: "error", message: walletErrorText(t, error) });
    }
  }

  if (!wallet.publicKey) return <p className="text-sm text-muted">{t("bounties.needsWallet")}</p>;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-1">
        <label htmlFor={`${ids}-skill`} className="font-ui text-sm font-bold">
          {t("bounties.skill")}
        </label>
        <select id={`${ids}-skill`} className="ink-field" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          {SKILLS.map((s) => (
            <option key={s.skillId} value={s.skillId}>
              {t("bounties.skillOption", { drone: s.id })}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${ids}-learner`} className="font-ui text-sm font-bold">
          {t("bounties.learner")}
        </label>
        <input
          id={`${ids}-learner`}
          className="ink-field"
          value={learner}
          onChange={(e) => setLearner(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={touched && !learnerOk}
          aria-describedby={`${ids}-learner-hint`}
        />
        <p id={`${ids}-learner-hint`} className={`text-xs ${touched && !learnerOk ? "text-bad" : "text-muted"}`}>
          {touched && !learnerOk ? t("bounties.learnerInvalid") : t("bounties.learnerHint")}
        </p>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${ids}-amount`} className="font-ui text-sm font-bold">
          {t("bounties.amount")}
        </label>
        <input
          id={`${ids}-amount`}
          className="ink-field tabular"
          type="number"
          inputMode="decimal"
          min={MIN_SOL}
          max={MAX_SOL}
          step={MIN_SOL}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={touched && !amountOk}
          aria-describedby={`${ids}-amount-hint`}
        />
        <p id={`${ids}-amount-hint`} className={`text-xs ${touched && !amountOk ? "text-bad" : "text-muted"}`}>
          {touched && !amountOk ? t("bounties.amountInvalid") : t("bounties.amountHint")}
        </p>
      </div>
      <Button type="submit" variant="primary" disabled={sent.status === "busy"} aria-busy={sent.status === "busy"}>
        {sent.status === "busy" ? t("bounties.submitting") : t("bounties.submit")}
      </Button>
      {sent.status === "done" ? (
        <Callout tone="success" live>
          <p>{t("bounties.created")}</p>
          <a href={explorerUrl("tx", sent.signature)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 font-ui text-sm font-bold">
            {t("panel.viewTx")}
            <Icon name="external" size={16} />
          </a>
        </Callout>
      ) : null}
      {sent.status === "error" ? (
        <Callout tone="danger" live>
          {sent.message}
        </Callout>
      ) : null}
    </form>
  );
}
