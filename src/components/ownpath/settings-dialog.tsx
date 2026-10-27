"use client";
import { useEffect, useRef, useState } from "react";
import AccountProfile from "./account-profile";
import BillingPanel from "./billing-panel";
import UsagePanel from "./usage-panel";
import { useConfirmation } from "./confirmation-dialog";
import { useModalScroll } from "./modal-scroll";
import type { SettingsSection } from "./workspace-settings-context";
const sections: [SettingsSection, string][] = [["profile", "Profile"], ["usage", "Usage"], ["billing", "Plan & billing"], ["security", "Security"]];
export default function SettingsDialog({ section, onSection, onClose, owner, name, email }: { section: SettingsSection; onSection: (value: SettingsSection) => void; onClose: () => void; owner: string; name: string; email?: string }) {
  const dialog = useRef<HTMLDialogElement>(null); const [dirty, setDirty] = useState(false); const confirmation = useConfirmation();
  const [pending, setPending] = useState(false);
  useModalScroll(true);
  useEffect(() => {
    const element = dialog.current; const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (trigger?.isConnected && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true }); };
  }, []);
  async function close() {
    if (pending) return;
    if (dirty && !await confirmation.confirm({ title: "Discard settings changes?", description: "Your unsaved account changes will be lost. Your CV workspace stays unchanged. Cancel to keep editing.", action: "Discard settings changes" })) return;
    onClose();
  }
  return <dialog ref={dialog} className="op-settings-dialog" aria-labelledby="settings-title" onKeyDown={event => {
    if (event.key !== "Tab" || (event.target as Element).closest("dialog") !== event.currentTarget) return;
    const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length > 0 && !node.closest("[hidden],[inert]"));
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); void close(); }}>
    {confirmation.dialog}
    <header className="op-settings-header"><h2 id="settings-title">Settings</h2><button type="button" disabled={pending} aria-label="Close settings" onClick={() => void close()}>×</button></header>
    {pending && <p role="status" className="op-settings-pending">Saving account changes; wait for confirmation before closing.</p>}
    <div className="op-settings-layout"><nav aria-label="Settings sections">{sections.map(([id, title]) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => onSection(id)}>{title}</button>)}</nav>
      <div className="op-settings-content">
        <div hidden={section !== "profile" && section !== "security"}><AccountProfile idPrefix="settings-" initialUser={{ id: owner, email, user_metadata: { display_name: name } }} section={section === "security" ? "security" : "profile"} onUnsavedChange={setDirty} onPendingChange={setPending} /></div>
        <div hidden={section !== "usage"}><UsagePanel idPrefix="settings-" /></div>
        <div hidden={section !== "billing"}><BillingPanel idPrefix="settings-" /></div>
      </div>
    </div>
  </dialog>;
}
