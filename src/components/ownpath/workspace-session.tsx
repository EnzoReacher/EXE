"use client";
import { createContext, useContext } from "react";
import type { Snapshot } from "@/lib/scan-rewrite/saved";

export type SavedEntry = { initial: Snapshot; savedId: string; savedRevision: number };
// Memory-only handoff. The authenticated shell owns its lifetime and clears it on auth changes.
export const WorkspaceSession = createContext<((entry: SavedEntry) => Promise<void>) | null>(null);
export const useWorkspaceSession = () => useContext(WorkspaceSession);
export const WorkspaceDiscardGuard = createContext<(() => boolean) | null>(null);
export const useWorkspaceDiscardGuard = () => useContext(WorkspaceDiscardGuard);
export const WorkspaceProfileGuard = createContext<((guard: (() => boolean) | null, key?: object | string) => void) | null>(null);
export const useWorkspaceProfileGuard = () => useContext(WorkspaceProfileGuard);
