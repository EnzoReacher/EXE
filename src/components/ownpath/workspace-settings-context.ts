"use client";
import { createContext, useContext } from "react";
export type SettingsSection = "profile" | "usage" | "billing" | "security";
export const WorkspaceSettings = createContext<((section: SettingsSection) => void) | null>(null);
export const useWorkspaceSettings = () => useContext(WorkspaceSettings);
