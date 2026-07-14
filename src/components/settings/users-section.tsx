import type { User, UserRole, UserStatus } from "@/domain";
import { userRoleLabel, userStatusLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { getUsers } from "@/lib/users";
import styles from "./settings.module.css";

/** Clase de color por estado de usuario. */
const statusClass: Record<UserStatus, string> = {
  active: styles.statusActive,
  invited: styles.statusInvited,
  disabled: styles.statusDisabled,
};

/** Listado de usuarios con cambio de rol (estado local, no persistido). */
export function UsersSection({
  users,
  onChangeRole,
}: {
  users: User[];
  onChangeRole: (userId: string, role: UserRole) => void;
}) {
  const sorted = getUsers(users);

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No hay usuarios en la organización."
        hint="Invita a alguien para que pueda acceder a AgentGuard."
      />
    );
  }

  return (
    <div className={styles.list}>
      {sorted.map((user) => (
        <div key={user.id} className={styles.row}>
          <div className={styles.identity}>
            <span className={styles.name}>{user.name}</span>
            <span className={styles.meta}>{user.email}</span>
          </div>
          <span className={`${styles.statusBadge} ${statusClass[user.status]}`}>
            {userStatusLabel[user.status]}
          </span>
          <select
            className={styles.select}
            value={user.role}
            aria-label={`Rol de ${user.name}`}
            onChange={(event) =>
              onChangeRole(user.id, event.target.value as UserRole)
            }
          >
            {Object.entries(userRoleLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
