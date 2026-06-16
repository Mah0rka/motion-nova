import { Button, FormField, Input, Modal, Select } from "../../../shared/ui";
import type { UserRole } from "../../../shared/api";
import { getAccessLabel, type CreateUserForm } from "../lib/userForms";

type CreateUserModalProps = {
  open: boolean;
  form: CreateUserForm;
  manageableRoles: UserRole[];
  onChange: (patch: Partial<CreateUserForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
};

export function CreateUserModal({
  open,
  form,
  manageableRoles,
  onChange,
  onClose,
  onSubmit,
  pending,
  error
}: CreateUserModalProps) {
  return (
    <Modal
      open={open}
      title="Створити користувача"
      description="Новий акаунт створюється тільки коли це справді потрібно менеджеру."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button
            variant="secondary"
            disabled={!form.email || !form.first_name || !form.last_name || pending}
            onClick={onSubmit}
          >
            {pending ? "Створення..." : "Створити користувача"}
          </Button>
        </>
      }
    >
      <div className="subscription-editor-grid">
        <FormField label="Email" required>
          <Input value={form.email} onChange={(event) => onChange({ email: event.target.value })} />
        </FormField>
        <FormField label="Пароль">
          <Input value={form.password} onChange={(event) => onChange({ password: event.target.value })} />
        </FormField>
        <FormField label="Ім'я" required>
          <Input value={form.first_name} onChange={(event) => onChange({ first_name: event.target.value })} />
        </FormField>
        <FormField label="Прізвище" required>
          <Input value={form.last_name} onChange={(event) => onChange({ last_name: event.target.value })} />
        </FormField>
        <FormField label="Телефон">
          <Input value={form.phone} onChange={(event) => onChange({ phone: event.target.value })} />
        </FormField>
        <FormField label="Доступ">
          <Select value={form.role} onChange={(event) => onChange({ role: event.target.value as UserRole })}>
            {manageableRoles.map((role) => (
              <option key={role} value={role}>
                {getAccessLabel(role)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
    </Modal>
  );
}
