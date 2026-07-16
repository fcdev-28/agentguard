"use client";

import { useState, useTransition, type FormEvent } from "react";
import { login } from "@/lib/auth/auth-actions";
import styles from "./login.module.css";

/** Formulario de login: email + contraseña, con estados de carga y error. */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Si las credenciales son válidas, `login` redirige a "/" desde el
      // servidor y esta promesa nunca resuelve con un valor: solo llegamos
      // aquí para pintar el error.
      const result = await login(email, password);
      setError(result.error);
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          className={styles.fieldInput}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu.email@empresa.example"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className={styles.fieldInput}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isPending}
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
