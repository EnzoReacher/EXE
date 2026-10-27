"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { accountInitials } from "@/lib/supabase/account-profile";
import { usePlanSummary } from "./use-plan-summary";
import { useWorkspaceDiscardGuard } from "./workspace-session";
import AuthPanel from "./auth-panel";
import WorkbenchIcon from "./workbench-icon";
import { useWorkspaceSettings, type SettingsSection } from "./workspace-settings-context";

export default function AccountMenu({ owner, name, email, expired, onDestination, accountPage = false, onOpenChange, essentialOnly = false }: { owner: string; name: string; email?: string; expired: boolean; onDestination: () => void; accountPage?: boolean; onOpenChange?: (open: boolean) => void; essentialOnly?: boolean }) {
  const plan = usePlanSummary(); const beforeSignOut = useWorkspaceDiscardGuard();
  const settings = useWorkspaceSettings();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null);
  const actualName = !expired && name.trim().toLowerCase() !== email?.trim().toLowerCase() ? name.trim() : "";
  const label = expired ? "Account" : actualName || email || "Your account";
  const confirmedPlan = !expired && plan.data ? plan.data.plan.plan : null;
  const planLabel = expired ? "Session ended" : essentialOnly ? "Your account" : plan.pending ? "Checking plan…" : confirmedPlan ? `${confirmedPlan} plan${plan.error ? " · Last checked" : ""}` : "Plan unavailable";
  const fullIdentity = [actualName, !expired && email, planLabel].filter(Boolean).join(", ");
  const focusLast = useRef(false);
  function items() { return Array.from(panel.current?.querySelectorAll<HTMLElement>("[data-account-item]:not(:disabled)") || []); }
  const position = useCallback(() => {
    const element = panel.current, button = trigger.current; if (!element || !button) return;
    const sidebar = root.current?.closest(".op-sidebar");
    const viewport = window.visualViewport, height = viewport?.height || innerHeight, width = viewport?.width || innerWidth, top = viewport?.offsetTop || 0, left = viewport?.offsetLeft || 0;
    const bounds = sidebar?.getBoundingClientRect() || { left, right: left + width };
    const panelLeft = Math.max(left + 12, bounds.left + 12), panelRight = Math.min(left + width - 12, bounds.right - 12);
    const anchor = button.getBoundingClientRect();
    const bottom = Math.min(anchor.top - 8, top + height - 12);
    const brandBottom = sidebar?.querySelector(".op-brand-row")?.getBoundingClientRect().bottom || top;
    const preferredTop = Math.max(top + 12, brandBottom + 8);
    // On very short viewports prioritize a usable scroller over avoiding the logo.
    const panelTop = bottom - preferredTop >= 120 ? preferredTop : top + 12;
    element.style.width = `${Math.max(0, panelRight - panelLeft)}px`;
    element.style.maxHeight = `${Math.max(0, bottom - panelTop)}px`;
    element.style.left = `${panelLeft}px`;
    element.style.top = `${Math.max(panelTop, bottom - element.getBoundingClientRect().height)}px`;
  }, []);
  const close = useCallback((restore = true) => { const inside = panel.current?.contains(document.activeElement); panel.current?.hidePopover?.(); setOpen(false); onOpenChange?.(false); if (restore || inside) trigger.current?.focus({ preventScroll: true }); }, [onOpenChange]);
  function show(last = false) {
    focusLast.current = last; onOpenChange?.(true); setOpen(true);
  }
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    // Parent temporary expansion commits first, so no panel is painted over the rail.
    panel.current.showPopover?.(); position();
    const rows = items(); (focusLast.current ? rows.at(-1) : rows[0])?.focus({ preventScroll: true });
  }, [open, position]);
  function selected() { close(false); onDestination(); }
  function openSection(event: React.MouseEvent, section: SettingsSection) { if (essentialOnly || !settings || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); close(); onDestination(); settings(section); }
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia?.("(max-width: 760px)"); const breakpoint = () => close(false); media?.addEventListener("change", breakpoint);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(false); };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (panel.current) observer?.observe(panel.current); if (trigger.current) observer?.observe(trigger.current); const sidebar = root.current?.closest(".op-sidebar"); if (sidebar) observer?.observe(sidebar);
    document.addEventListener("pointerdown", outside, true); window.addEventListener("resize", position); window.addEventListener("scroll", position, true); window.visualViewport?.addEventListener("resize", position);
    sidebar?.addEventListener("transitionend", position);
    const ended = () => close(false); window.addEventListener("ownpath:session-ended", ended);
    return () => { sidebar?.removeEventListener("transitionend", position); window.removeEventListener("ownpath:session-ended", ended); media?.removeEventListener("change", breakpoint); observer?.disconnect(); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); window.visualViewport?.removeEventListener("resize", position); };
  }, [open, close, position]);
  const href = (anchor: string) => `${accountPage ? "" : "/app/account"}#${anchor}`;
  return <div className="op-account-entry" ref={root} onBlurCapture={event => { if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close(false); }} onKeyDown={event => {
    if (!open) { if (event.target === trigger.current && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); show(event.key === "ArrowUp"); } return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); const rows = items(), index = rows.indexOf(document.activeElement as HTMLElement); const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length; rows[next]?.focus(); }
  }}>
    <button type="button" className="op-account-trigger" ref={trigger} data-tooltip="Account" aria-haspopup="dialog" aria-expanded={open} aria-controls="workspace-account-menu" aria-label={`Account menu for ${fullIdentity || label}`} onClick={() => open ? close() : show()}>
      <span className="op-account-avatar" aria-hidden="true">{accountInitials(actualName, expired ? undefined : email)}</span>
      <span className="op-account-label"><strong>{label}</strong><small>{planLabel}</small></span><span aria-hidden="true" className="op-account-indicator">{open ? "⌄" : "⌃"}</span>
    </button>
    <section ref={panel} hidden={!open} popover="auto" id="workspace-account-menu" className="op-account-popover" role="dialog" aria-label="Account management" onToggle={event => { if (event.target === event.currentTarget && (event.nativeEvent as ToggleEvent).newState === "closed") close(false); }}>
      <div className="op-account-destinations">
        <Link className="op-account-identity" data-account-item aria-label={`Profile for ${fullIdentity}`} href={href("personal-details-heading")} onClick={event => openSection(event, "profile")} onNavigate={selected}><span className="op-account-avatar" aria-hidden="true">{accountInitials(actualName, expired ? undefined : email)}</span><span><strong>{actualName || planLabel}</strong>{!expired && email && <small>{email}</small>}{actualName && <small>{planLabel}</small>}</span></Link>
        {!essentialOnly && confirmedPlan && <a data-account-item href="/pricing" target="_blank" rel="noopener noreferrer" onClick={selected}><WorkbenchIcon name="arrow" />{confirmedPlan === "Pro" ? "Manage plan" : "Upgrade to Pro"}<span aria-hidden="true">↗</span></a>}
        <Link data-account-item href={href("personal-details-heading")} onClick={event => openSection(event, "profile")} onNavigate={selected}><WorkbenchIcon name="account" />Profile</Link>
        {!essentialOnly && <><Link data-account-item href={href("usage-heading")} onClick={event => openSection(event, "usage")} onNavigate={selected}><WorkbenchIcon name="scan" />Usage</Link>
        <Link data-account-item href={href("plan-billing-heading")} onClick={event => openSection(event, "billing")} onNavigate={selected}><WorkbenchIcon name="document" />Plan & billing</Link></>}
        <Link data-account-item href={href("account-security-heading")} onClick={event => openSection(event, "security")} onNavigate={selected}><WorkbenchIcon name="account" />Security</Link>
      </div>
      <hr /><AuthPanel mode="account" accountView="menu" initialUser={{ id: owner, email: expired ? undefined : email }} beforeSignOut={beforeSignOut || undefined} />
    </section>
  </div>;
}
