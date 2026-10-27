"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
type Question = { title: string; description: string; action: string; acknowledgement?: string };

/** Native modal supplies background inertness and keyboard containment. Cancel is safest. */
export function useConfirmation() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null); const cancel = useRef<HTMLButtonElement>(null);
  const pending = useRef<{ resolve: (answer: boolean) => void; trigger: HTMLElement | null } | null>(null);
  const id = useId();
  const confirm = useCallback((value: Question) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>(resolve => {
      pending.current = { resolve, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null };
      setAcknowledged(false);
      setQuestion(value);
    });
  }, []);
  function settle(answer: boolean) {
    if (!pending.current || (answer && question?.acknowledgement && !acknowledged)) return;
    const current = pending.current; pending.current = null;
    dialog.current?.close(); setQuestion(null);
    if (current?.trigger?.isConnected) current.trigger.focus({ preventScroll: true });
    current?.resolve(answer);
  }
  useEffect(() => {
    if (question) { dialog.current?.showModal(); cancel.current?.focus(); }
  }, [question]);
  useEffect(() => () => { pending.current?.resolve(false); pending.current = null; }, []);
  return { confirm, dismiss: () => settle(false), dialog: <dialog ref={dialog} className="op-confirm-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const buttons = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"); const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); settle(false); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) settle(false);
  }}>
    <h2 id={`${id}-title`}>{question?.title}</h2><p id={`${id}-description`}>{question?.description}</p>
    {question?.acknowledgement && <label className="op-confirm-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />{question.acknowledgement}</label>}
    <div className="op-confirm-actions"><button ref={cancel} type="button" onClick={() => settle(false)}>Cancel</button><button type="button" className="op-confirm-primary" disabled={!!question?.acknowledgement && !acknowledged} onClick={() => settle(true)}>{question?.action}</button></div>
  </dialog> };
}
