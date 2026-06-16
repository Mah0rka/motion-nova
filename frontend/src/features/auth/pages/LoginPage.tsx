import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login, register } from "../../../shared/api";
import { getFieldErrors } from "../../../shared/lib/forms";
import { MotionNovaLogo } from "../../marketing/ui/MotionNovaLogo";
import { Button, FormField, Input } from "../../../shared/ui";
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues
} from "../lib/validation";
import { useAuthStore } from "../model/store";

type AuthMode = "login" | "register";

type FieldConfig<T extends Record<string, string>> = {
  name: keyof T;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  className?: string;
};

const loginFields: FieldConfig<LoginFormValues>[] = [
  { name: "email", label: "Email", type: "email", autoComplete: "username" },
  { name: "password", label: "Пароль", type: "password", autoComplete: "current-password" }
];

const registerFields: FieldConfig<RegisterFormValues>[] = [
  { name: "first_name", label: "Ім'я", type: "text", autoComplete: "given-name" },
  { name: "last_name", label: "Прізвище", type: "text", autoComplete: "family-name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", className: "auth-field-wide" },
  { name: "password", label: "Пароль", type: "password", autoComplete: "new-password", className: "auth-field-wide" }
];

type AuthFieldsProps<T extends Record<string, string>> = {
  fields: FieldConfig<T>[];
  values: T;
  errors: Record<string, string>;
  onChange: (name: keyof T, value: string) => void;
};

function AuthFields<T extends Record<string, string>>({ fields, values, errors, onChange }: AuthFieldsProps<T>) {
  return fields.map((field) => (
    <FormField
      key={String(field.name)}
      className={field.className}
      label={field.label}
      error={errors[String(field.name)]}
    >
      <Input
        type={field.type}
        autoComplete={field.autoComplete}
        invalid={Boolean(errors[String(field.name)])}
        value={values[field.name]}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </FormField>
  ));
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginValues, setLoginValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [registerValues, setRegisterValues] = useState<RegisterFormValues>({
    first_name: "",
    last_name: "",
    email: "",
    password: ""
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const isLogin = mode === "login";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse(loginValues);
    if (!parsed.success) {
      setLoginErrors(getFieldErrors(parsed.error));
      return;
    }
    setLoginErrors({});
    setIsSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      setUser(user);
      navigate("/dashboard");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Помилка авторизації");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse(registerValues);
    if (!parsed.success) {
      setRegisterErrors(getFieldErrors(parsed.error));
      return;
    }
    setRegisterErrors({});
    setIsSubmitting(true);
    try {
      const user = await register(parsed.data);
      setUser(user);
      navigate("/dashboard");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Помилка реєстрації");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <img className="auth-hero-image" src="/motion-nova/frame-01-alt.png" alt="" />
      <section className="auth-hero" aria-label="Motion Nova">
        <div className="auth-hero-content">
          <MotionNovaLogo />
          <h1>Рух починається з порядку.</h1>
          <Link className="auth-site-link" to="/">Повернутися на сайт</Link>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-head">
          <h2 id="auth-title">{isLogin ? "Вхід" : "Реєстрація"}</h2>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {isLogin ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <AuthFields
              fields={loginFields}
              values={loginValues}
              errors={loginErrors}
              onChange={(name, value) => setLoginValues((current) => ({ ...current, [name]: value }))}
            />
            <Button type="submit" disabled={isSubmitting} fullWidth>{isSubmitting ? "Входимо..." : "Увійти"}</Button>
            <button className="auth-mode-link" type="button" onClick={() => switchMode("register")}>Реєстрація</button>
          </form>
        ) : (
          <form className="auth-form auth-form-grid" onSubmit={handleRegister}>
            <AuthFields
              fields={registerFields}
              values={registerValues}
              errors={registerErrors}
              onChange={(name, value) => setRegisterValues((current) => ({ ...current, [name]: value }))}
            />
            <Button className="auth-field-wide" type="submit" disabled={isSubmitting} fullWidth>
              {isSubmitting ? "Створюємо..." : "Створити акаунт"}
            </Button>
            <button className="auth-mode-link auth-field-wide" type="button" onClick={() => switchMode("login")}>Вхід</button>
          </form>
        )}
      </section>
    </main>
  );
}
