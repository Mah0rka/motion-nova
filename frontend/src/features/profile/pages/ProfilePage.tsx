import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import { logout, updateMyProfile } from "../../../shared/api";
import { getFieldErrors } from "../../../shared/lib/forms";
import { Button, PageHeader } from "../../../shared/ui";

const profileSchema = z.object({
  first_name: z.string().min(2, "Мінімум 2 символи"),
  last_name: z.string().min(2, "Мінімум 2 символи"),
  phone: z.string()
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearBranchSelection = useBranchStore((state) => state.clearBranchSelection);
  const [formValues, setFormValues] = useState<ProfileForm>({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormValues({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? ""
    });
  }, [user]);

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = profileSchema.safeParse(formValues);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    mutation.mutate(parsed.data);
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    clearBranchSelection();
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="profile-page-wrap">
    <section className="panel-stack profile-panel">
      <PageHeader title="Профіль" />

      <form
        className="form-grid surface-card"
        onSubmit={handleSubmit}
      >
        <label>
          Електронна адреса
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
          />
          <span />
        </label>
        <label>
          Ім'я
          <input
            type="text"
            value={formValues.first_name}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, first_name: event.target.value }))
            }
          />
          <span>{fieldErrors.first_name}</span>
        </label>
        <label>
          Прізвище
          <input
            type="text"
            value={formValues.last_name}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, last_name: event.target.value }))
            }
          />
          <span>{fieldErrors.last_name}</span>
        </label>
        <label>
          Телефон
          <input
            type="text"
            value={formValues.phone}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, phone: event.target.value }))
            }
          />
          <span>{fieldErrors.phone}</span>
        </label>
        <button className="secondary-button" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Збереження..." : "Зберегти профіль"}
        </button>
        <Button variant="secondary" fullWidth onClick={handleLogout}>
          <LogOut aria-hidden="true" /> Вийти
        </Button>
        {mutation.isError ? (
          <p className="error-banner">{mutation.error instanceof Error ? mutation.error.message : "Помилка"}</p>
        ) : null}
      </form>
    </section>
    </div>
  );
}
