import type { Metadata } from "next";
import Translator from "./translator";
import "./translator.css";

export const metadata: Metadata = { title: "Experience Translator | OwnPath", description: "Turn one real project into truthful English CV bullets for a Frontend Intern role.", robots: { index: false, follow: false } };
export default function Page() { return <Translator />; }
