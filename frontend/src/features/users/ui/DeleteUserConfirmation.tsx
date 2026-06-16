import type { CurrentUser } from "../../../shared/api";
import { fullName } from "../../../shared/lib/format";

type DeleteUserConfirmationProps = {
  user: CurrentUser | null;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
};

export function DeleteUserConfirmation({
  user,
  value,
  onChange,
  onConfirm,
  onClose,
  pending
}: DeleteUserConfirmationProps) {
  if (!user) {
    return null;
  }

  const expectedValue = user.email;
  const matches = value.trim() === expectedValue;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="participant-modal-toolbar">
          <div>
            <p className="eyebrow">Підтвердження</p>
            <h3 id="confirmation-modal-title">Видалення акаунта</h3>
          </div>
          <button className="ghost-link" type="button" onClick={onClose}>
            Закрити
          </button>
        </div>

        <p className="muted">
          Щоб видалити акаунт {fullName(user)}, введіть email {expectedValue}.
        </p>

        <label>
          Email для підтвердження
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={expectedValue}
          />
        </label>

        <div className="confirm-modal-actions">
          <button className="ghost-link" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button
            className="danger-link"
            type="button"
            disabled={!matches || pending}
            onClick={onConfirm}
          >
            {pending ? "Виконуємо..." : "Видалити акаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}
