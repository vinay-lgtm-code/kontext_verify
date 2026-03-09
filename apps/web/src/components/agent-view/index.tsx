"use client";

import { useState } from "react";
import { TabBar } from "./tab-bar";
import { TabOverview } from "./tab-overview";
import { TabSdk } from "./tab-sdk";
import { TabLifecycle } from "./tab-lifecycle";
import { TabSandbox } from "./tab-sandbox";
import { TabCli } from "./tab-cli";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "sdk", label: "SDK" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "sandbox", label: "Sandbox" },
  { id: "cli", label: "CLI" },
];

export function AgentView() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="border border-[var(--term-surface-2)] bg-[var(--term-surface)]">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="p-4 sm:p-6 min-h-[500px]"
      >
        {activeTab === "overview" && <TabOverview />}
        {activeTab === "sdk" && <TabSdk />}
        {activeTab === "lifecycle" && <TabLifecycle />}
        {activeTab === "sandbox" && <TabSandbox />}
        {activeTab === "cli" && <TabCli />}
      </div>
    </div>
  );
}
