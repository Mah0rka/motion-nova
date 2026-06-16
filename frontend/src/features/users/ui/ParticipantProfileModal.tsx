import { Button, FormField, Input, Modal, Select } from "../../../shared/ui";
import type { CurrentUser, UserRole } from "../../../shared/api";
import { formatDateTime, fullName } from "../../../shared/lib/format";
import { getAccessLabel, type EditUserForm, type ParticipantSection } from "../lib/userForms";

type ParticipantProfileModalProps = {
  open: boolean;
  user: CurrentUser | null;
  form: EditUserForm;
  manageableRoles: UserRole[];
  onChange: (patch: Partial<EditUserForm>) => void;
  onClose: () => void;
  onSave: () => void;
  savePending: boolean;
  saveError: string | null;
  onOpenSection: (section: ParticipantSection) => void;
  canDelete: boolean;
  isSelf: boolean;
  deletePending: boolean;
  onDelete: () => void;
};

export function ParticipantProfileModal({
  open,
  user,
  form,
  manageableRoles,
  onChange,
  onClose,
  onSave,
  savePending,
  saveError,
  onOpenSection,
  canDelete,
  isSelf,
  deletePending,
  onDelete
}: ParticipantProfileModalProps) {
  return (
    <Modal
      open={open}
      title={user ? fullName(user) : ""}
      size="md"
      onClose={onClose}
      footer={
        <Button variant="secondary" disabled={savePending} onClick={onSave}>
          {savePending ? "Оновлення..." : "Зберегти зміни"}
        </Button>
      }
    >
      {user ? (
        <>
          <div className="subscription-editor-grid">
            <FormField label="Ім'я">
              <Input value={form.first_name} onChange={(event) => onChange({ first_name: event.target.value })} />
            </FormField>
            <FormField label="Прізвище">
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
            <FormField label="Email">
              <Input value={user.email} readOnly disabled />
            </FormField>
            <FormField label="Створено">
              <Input value={formatDateTime(user.created_at)} readOnly disabled />
            </FormField>
          </div>

          {saveError ? <p className="error-banner">{saveError}</p> : null}

          <div className="participant-actions">
            <Button variant="secondary" onClick={() => onOpenSection("issue")}>Видати абонемент</Button>
            <Button variant="secondary" onClick={() => onOpenSection("subscriptions")}>Історія абонементів</Button>
            <Button variant="secondary" onClick={() => onOpenSection("payments")}>Історія оплат</Button>
            {canDelete ? (
              <Button variant="danger" disabled={isSelf || deletePending} onClick={onDelete}>
                {isSelf ? "Не можна видалити свій акаунт" : "Видалити акаунт"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
