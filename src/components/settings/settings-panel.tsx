"use client";

import { useState } from "react";
import type { Tool, ToolStatus, User, UserRole } from "@/domain";
import { UsersSection } from "./users-section";
import { RolesSection } from "./roles-section";
import { ToolsSection } from "./tools-section";
import styles from "./settings.module.css";

type SettingsTab = "users" | "roles" | "tools";

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "users", label: "Usuarios" },
  { id: "roles", label: "Roles" },
  { id: "tools", label: "Herramientas" },
];

/**
 * Panel de Ajustes con tabs (Usuarios · Roles · Herramientas). Los datos
 * parten de la semilla y se editan solo en estado local: es una demo
 * interactiva, no persiste cambios.
 */
export function SettingsPanel({
  users: initialUsers,
  tools: initialTools,
}: {
  users: User[];
  tools: Tool[];
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [tools, setTools] = useState<Tool[]>(initialTools);

  function handleChangeRole(userId: string, role: UserRole) {
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
  }

  function handleChangeToolStatus(toolId: string, status: ToolStatus) {
    setTools((current) =>
      current.map((tool) => (tool.id === toolId ? { ...tool, status } : tool)),
    );
  }

  return (
    <div>
      <p className={styles.previewNotice}>
        Los cambios son de demostración y no se guardan.
      </p>

      <div className={styles.tabs} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${
              activeTab === tab.id ? styles.tabActive : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.section}>
        {activeTab === "users" ? (
          <UsersSection users={users} onChangeRole={handleChangeRole} />
        ) : null}
        {activeTab === "roles" ? <RolesSection /> : null}
        {activeTab === "tools" ? (
          <ToolsSection tools={tools} onChangeStatus={handleChangeToolStatus} />
        ) : null}
      </div>
    </div>
  );
}
