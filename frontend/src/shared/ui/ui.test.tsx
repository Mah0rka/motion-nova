import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  Table
} from ".";

describe("shared UI primitives", () => {
  it("renders buttons, links, badges and cards", () => {
    render(
      <MemoryRouter>
        <Button variant="secondary">Зберегти</Button>
        <ButtonLink to="/dashboard" variant="ghost">Огляд</ButtonLink>
        <Badge tone="success">Активний</Badge>
        <Card variant="muted">Контент</Card>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Зберегти" })).toHaveClass("ui-button-secondary");
    expect(screen.getByRole("link", { name: "Огляд" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Активний")).toHaveClass("ui-badge-success");
    expect(screen.getByText("Контент")).toHaveClass("ui-card-muted");
  });

  it("renders form controls with accessible labels", () => {
    render(
      <>
        <FormField label="Назва" hint="Системне ім'я">
          <Input defaultValue="Basic" />
        </FormField>
        <FormField label="Тип">
          <Select defaultValue="MONTHLY">
            <option value="MONTHLY">Місячний</option>
          </Select>
        </FormField>
      </>
    );

    expect(screen.getByLabelText("Назва")).toHaveValue("Basic");
    expect(screen.getByLabelText("Тип")).toHaveValue("MONTHLY");
    expect(screen.getByText("Системне ім'я")).toBeInTheDocument();
  });

  it("renders page header, stat card and empty state", () => {
    render(
      <>
        <PageHeader eyebrow="Аналітика" title="Зведення" description="Опис" />
        <StatCard label="Виручка" value="₴12 500" note="за місяць" emphasis />
        <EmptyState title="Даних немає" description="Оберіть інший період" />
      </>
    );

    expect(screen.getByRole("heading", { name: "Зведення" })).toBeInTheDocument();
    expect(screen.getByText("₴12 500")).toBeInTheDocument();
    expect(screen.getByText("Даних немає")).toBeInTheDocument();
  });

  it("renders typed table rows", () => {
    render(
      <Table
        caption="Плани"
        columns={[
          { key: "name", header: "Назва", render: (row: { id: string; name: string }) => row.name }
        ]}
        rows={[{ id: "plan-1", name: "Місячний" }]}
        getRowKey={(row) => row.id}
        emptyTitle="Планів немає"
      />
    );

    expect(screen.getByRole("table", { name: "Плани" })).toBeInTheDocument();
    expect(screen.getByText("Місячний")).toBeInTheDocument();
  });

  it("closes modal from its close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal open title="Підтвердження" onClose={onClose}>
        <p>Контент модального вікна</p>
      </Modal>
    );

    expect(screen.getByRole("dialog", { name: "Підтвердження" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрити" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
