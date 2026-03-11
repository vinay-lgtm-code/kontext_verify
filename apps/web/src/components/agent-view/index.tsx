"use client";

import { useState } from "react";
import { TabBar } from "./tab-bar";
import { TabAgents } from "./tab-agents";
import { TabSdk } from "./tab-sdk";
import { TabPrompt } from "./tab-prompt";
import { TabSandbox } from "./tab-sandbox";
import { TabCli } from "./tab-cli";

const tabs = [
  { id: "agents", label: "Agents" },
  { id: "cli", label: "CLI" },
  { id: "sdk", label: "SDK" },
  { id: "prompt", label: "Prompt" },
  { id: "sandbox", label: "Sandbox" },
];

export function AgentView() {
  const [activeTab, setActiveTab] = useState("agents");

  return (
    <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)]">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="p-4 sm:p-6 min-h-[500px]"
      >
        {activeTab === "agents" && <TabAgents />}
        {activeTab === "sdk" && <TabSdk />}
        {activeTab === "prompt" && <TabPrompt />}
        {activeTab === "sandbox" && <TabSandbox />}
        {activeTab === "cli" && <TabCli />}
      </div>
    </div>
  );
}
