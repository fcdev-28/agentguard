import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <span className={styles.title}>AgentGuard</span>
        <span className={styles.subtitle}>
          Inicia sesión para continuar.
        </span>
      </div>
      <LoginForm />
    </div>
  );
}
