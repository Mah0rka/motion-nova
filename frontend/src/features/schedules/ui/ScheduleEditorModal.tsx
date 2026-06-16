import type { ScheduleAttendee } from "../../../shared/api";
import { Button, FormField, Input, Modal, Select } from "../../../shared/ui";
import { fullName } from "../../../shared/lib/format";
import {
  formatCalendarDate,
  getScheduleStats,
  type EditorState,
  type ScheduleFormState
} from "../lib/scheduleShared";

type Props = {
  editorState: EditorState;
  trainers: Array<{ id: string; first_name: string; last_name: string }>;
  attendees: ScheduleAttendee[];
  isAttendeesLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAttendees: boolean;
  validationError: string | null;
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
  onFormChange: (update: Partial<ScheduleFormState>) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ScheduleEditorModal({
  editorState,
  trainers,
  attendees,
  isAttendeesLoading,
  canEdit,
  canDelete,
  canViewAttendees,
  validationError,
  createPending,
  updatePending,
  deletePending,
  onFormChange,
  onSave,
  onDelete,
  onClose
}: Props) {
  const schedule = editorState.schedule;
  const stats = schedule ? getScheduleStats(schedule) : null;
  return (
    <Modal
      open
      title={editorState.mode === "create" ? "Створити заняття" : schedule?.title ?? "Заняття"}
      description={schedule ? `${formatCalendarDate(schedule.start_time)} — ${formatCalendarDate(schedule.end_time)}` : undefined}
      onClose={onClose}
    >
      <div className="schedule-editor-layout">
        <div className="schedule-editor-form">
          <FormField label="Назва">
            <Input value={editorState.form.title} onChange={(event) => onFormChange({ title: event.target.value })} disabled={!canEdit} />
          </FormField>
          <FormField label="Тип">
            <Select value={editorState.form.type} onChange={(event) => onFormChange({ type: event.target.value as "GROUP" | "PERSONAL" })} disabled={!canEdit}>
              <option value="GROUP">Групове</option>
              <option value="PERSONAL">Персональне</option>
            </Select>
          </FormField>
          <FormField label="Тренер">
            <Select value={editorState.form.trainerId} onChange={(event) => onFormChange({ trainerId: event.target.value })} disabled={!canEdit}>
              <option value="">Оберіть тренера</option>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{fullName(trainer)}</option>)}
            </Select>
          </FormField>
          <FormField label="Початок">
            <Input type="datetime-local" value={editorState.form.startTime} onChange={(event) => onFormChange({ startTime: event.target.value })} disabled={!canEdit} />
          </FormField>
          <FormField label="Завершення">
            <Input type="datetime-local" value={editorState.form.endTime} onChange={(event) => onFormChange({ endTime: event.target.value })} disabled={!canEdit} />
          </FormField>
          <FormField label="Місткість">
            <Input type="number" min={1} max={100} value={editorState.form.capacity} onChange={(event) => onFormChange({ capacity: Number(event.target.value) })} disabled={!canEdit} />
          </FormField>
          {validationError ? <p className="error-banner">{validationError}</p> : null}
          <div className="actions-row">
            {canDelete ? <Button variant="ghost" onClick={onDelete} disabled={deletePending}>{deletePending ? "Видалення..." : "Видалити"}</Button> : null}
            <Button variant="secondary" onClick={onClose}>Скасувати</Button>
            {canEdit ? <Button onClick={onSave} disabled={Boolean(validationError) || createPending || updatePending}>{createPending || updatePending ? "Збереження..." : "Зберегти"}</Button> : null}
          </div>
        </div>
        {schedule ? (
          <aside className="schedule-editor-sidebar">
            <p className="muted">Записи: <strong>{stats?.confirmedBookings ?? 0}/{schedule.capacity}</strong></p>
            {canViewAttendees ? (
              <div className="stack-table-card">
                <h3>Учасники</h3>
                {isAttendeesLoading ? <p className="muted">Завантаження...</p> : null}
                {!isAttendeesLoading && attendees.length === 0 ? <p className="muted">Поки без записів.</p> : null}
                {attendees.map((attendee) => <p key={attendee.id}>{fullName(attendee.user)}</p>)}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </Modal>
  );
}
