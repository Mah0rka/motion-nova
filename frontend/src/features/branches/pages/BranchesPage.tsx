import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignBranchStaff,
  createBranch,
  getBranches,
  getBranchStaff,
  getUsers,
  queryKeys,
  removeBranchStaff,
  updateBranch,
  type Branch,
  type StaffBranchAssignment
} from "../../../shared/api";
import {
  Badge,
  Button,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useSearchPagination
} from "../../../shared/ui";
import { fullName } from "../../../shared/lib/format";

export function BranchesPage() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [staffUserId, setStaffUserId] = useState("");

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches.accessible(true),
    queryFn: () => getBranches(true)
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => getUsers()
  });
  const staffQuery = useQuery({
    queryKey: queryKeys.branches.staff(selectedBranchId),
    queryFn: () => getBranchStaff(selectedBranchId!),
    enabled: Boolean(selectedBranchId)
  });

  const createMutation = useMutation({
    mutationFn: () => createBranch({ name: name.trim(), address: address.trim() }),
    onSuccess: () => {
      setName("");
      setAddress("");
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.root() });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({
      branchId,
      payload
    }: {
      branchId: string;
      payload: Parameters<typeof updateBranch>[1];
    }) => updateBranch(branchId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.branches.root() })
  });
  const assignMutation = useMutation({
    mutationFn: () => assignBranchStaff(selectedBranchId!, { user_id: staffUserId }),
    onSuccess: () => {
      setStaffUserId("");
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.staff(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.root() });
    }
  });
  const removeMutation = useMutation({
    mutationFn: removeBranchStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.staff(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.root() });
    }
  });

  const assignableUsers = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.role === "ADMIN" || user.role === "TRAINER"),
    [usersQuery.data]
  );
  const selectedBranch = branchesQuery.data?.find((branch) => branch.id === selectedBranchId) ?? null;
  const error = createMutation.error ?? updateMutation.error ?? assignMutation.error ?? removeMutation.error;

  const { filtered: filteredBranches, page, setPage, totalPages, pageItems } = useSearchPagination(
    branchesQuery.data ?? [],
    searchTerm,
    (branch) => `${branch.name} ${branch.address}`
  );

  function openBranch(branch: Branch) {
    setSelectedBranchId(branch.id);
    setEditName(branch.name);
    setEditAddress(branch.address);
  }

  function closeBranchModal() {
    setSelectedBranchId(null);
    setIsStaffOpen(false);
    setStaffUserId("");
  }

  const branchColumns: TableColumn<Branch>[] = [
    {
      key: "name",
      header: "Назва",
      render: (branch) => <strong>{branch.name}</strong>
    },
    {
      key: "address",
      header: "Адреса",
      render: (branch) => branch.address
    },
    {
      key: "timezone",
      header: "Часовий пояс",
      render: (branch) => branch.timezone
    },
    {
      key: "status",
      header: "Статус",
      render: (branch) => (branch.is_active ? "Активна" : "Неактивна")
    },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (branch) => (
        <button
          type="button"
          className="subscription-row-arrow"
          aria-label="Керування філією"
          onClick={() => openBranch(branch)}
        >
          ›
        </button>
      )
    }
  ];

  const staffColumns: TableColumn<StaffBranchAssignment>[] = [
    {
      key: "user",
      header: "Працівник",
      render: (assignment) => (
        <strong>
          {assignment.user ? fullName(assignment.user) : assignment.user_id}
        </strong>
      )
    },
    {
      key: "role",
      header: "Роль",
      render: (assignment) => assignment.user?.role ?? "STAFF"
    },
    {
      key: "actions",
      header: "Дії",
      render: (assignment) => (
        <button className="ghost-link" type="button" onClick={() => removeMutation.mutate(assignment.id)}>
          Прибрати
        </button>
      )
    }
  ];

  return (
    <section className="panel-stack branches-page">
      <PageHeader title="Філії та персонал" />

      {error ? <p className="error-banner">{error instanceof Error ? error.message : "Помилка"}</p> : null}

      <ManagementToolbar
        search={
          <FormField label="Пошук">
            <Input
              aria-label="Пошук"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Назва або адреса"
            />
          </FormField>
        }
        summary={<Badge>{filteredBranches.length} філій</Badge>}
        actions={<Button onClick={() => setIsCreateOpen(true)}>Нова філія</Button>}
      />

      <ManagementTableCard>
        <Table
          caption="Філії клубу"
          columns={branchColumns}
          rows={pageItems}
          getRowKey={(branch) => branch.id}
          emptyTitle="Філій не знайдено"
          emptyDescription="Змініть пошук або додайте філію через кнопку «Нова філія»."
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ManagementTableCard>

      <Modal
        open={isCreateOpen}
        title="Нова філія"
        description="Створіть нову філію клубу."
        size="md"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Скасувати</Button>
            <Button
              variant="secondary"
              disabled={!name.trim() || !address.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Додавання..." : "Додати філію"}
            </Button>
          </>
        }
      >
        <div className="subscription-editor-grid">
          <FormField label="Назва філії">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Полтава — Центр" />
          </FormField>
          <FormField label="Адреса філії">
            <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="вул. Соборності, 1" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={Boolean(selectedBranch)}
        title={selectedBranch ? selectedBranch.name : ""}
        description="Дані філії можна редагувати одразу."
        size="lg"
        onClose={closeBranchModal}
        footer={
          <Button
            variant="secondary"
            disabled={!editName.trim() || !editAddress.trim() || updateMutation.isPending}
            onClick={() =>
              selectedBranch &&
              updateMutation.mutate({
                branchId: selectedBranch.id,
                payload: { name: editName.trim(), address: editAddress.trim() }
              })
            }
          >
            {updateMutation.isPending ? "Збереження..." : "Зберегти зміни"}
          </Button>
        }
      >
        {selectedBranch ? (
          <>
            <div className="subscription-editor-grid">
              <FormField label="Назва">
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </FormField>
              <FormField label="Адреса">
                <Input value={editAddress} onChange={(event) => setEditAddress(event.target.value)} />
              </FormField>
              <FormField label="Часовий пояс">
                <Input value={selectedBranch.timezone} readOnly disabled />
              </FormField>
              <FormField label="Статус">
                <Input value={selectedBranch.is_active ? "Активна" : "Неактивна"} readOnly disabled />
              </FormField>
            </div>

            <div className="participant-actions">
              <Button
                variant={selectedBranch.is_active ? "danger" : "secondary"}
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    branchId: selectedBranch.id,
                    payload: { is_active: !selectedBranch.is_active }
                  })
                }
              >
                {selectedBranch.is_active ? "Деактивувати філію" : "Активувати філію"}
              </Button>
              <Button variant="secondary" onClick={() => setIsStaffOpen(true)}>Працівники</Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={isStaffOpen && Boolean(selectedBranch)}
        title={selectedBranch ? `Персонал — ${selectedBranch.name}` : ""}
        description="Призначені працівники цієї філії."
        size="lg"
        onClose={() => setIsStaffOpen(false)}
      >
        <div className="branches-form-grid">
          <FormField label="Працівник">
            <Select value={staffUserId} onChange={(event) => setStaffUserId(event.target.value)}>
              <option value="">Оберіть працівника</option>
              {assignableUsers.map((user) => <option key={user.id} value={user.id}>{fullName(user)} · {user.role}</option>)}
            </Select>
          </FormField>
          <Button disabled={!staffUserId || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
            {assignMutation.isPending ? "Призначення..." : "Призначити"}
          </Button>
        </div>

        <Table
          caption={selectedBranch ? `Персонал філії ${selectedBranch.name}` : "Персонал філії"}
          columns={staffColumns}
          rows={staffQuery.data ?? []}
          getRowKey={(assignment) => assignment.id}
          emptyTitle="Персонал не призначено"
          emptyDescription="Оберіть працівника вище та натисніть «Призначити»."
        />
      </Modal>
    </section>
  );
}
