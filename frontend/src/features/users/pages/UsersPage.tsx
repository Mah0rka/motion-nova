import { useEffect, useMemo, useState } from "react";

import type { CurrentUser, Subscription } from "../../../shared/api";
import {
  Badge,
  Button,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  PageHeader,
  Pagination,
  Select,
  Table
} from "../../../shared/ui";
import { filterBySearch } from "../../../shared/lib/search";
import { useAuthStore } from "../../auth/model/store";
import { useBranchStore } from "../../branches/model/store";
import { useUsersPageData } from "../hooks/useUsersPageData";
import {
  buildIssuePayload,
  buildSubscriptionUpdatePayload,
  editFormFromUser,
  emptyCreateForm,
  emptyEditForm,
  emptySubscriptionForm,
  getAccessLabel,
  getUserSearchValue,
  roles,
  subscriptionFormFromSubscription,
  type ParticipantSection
} from "../lib/userForms";
import { userColumns } from "../lib/userColumns";
import { CreateUserModal } from "../ui/CreateUserModal";
import { ParticipantProfileModal } from "../ui/ParticipantProfileModal";
import { IssueSubscriptionModal } from "../ui/IssueSubscriptionModal";
import { EditSubscriptionModal } from "../ui/EditSubscriptionModal";
import { SubscriptionsHistoryModal } from "../ui/SubscriptionsHistoryModal";
import { PaymentsHistoryModal } from "../ui/PaymentsHistoryModal";
import { DeleteUserConfirmation } from "../ui/DeleteUserConfirmation";

const USERS_PAGE_SIZE = 10;

type UserRoleFilter = (typeof roles)[number] | "ALL";

function mutationError(mutation: { isError: boolean; error: unknown }, fallback: string): string | null {
  if (!mutation.isError) return null;
  return mutation.error instanceof Error ? mutation.error.message : fallback;
}

export function UsersPage() {
  const authUser = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isReady);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const manageableRoles = authUser?.role === "OWNER" ? roles : (["CLIENT", "TRAINER"] as typeof roles);
  const canDeleteUsers = authUser?.role === "OWNER";

  const [filterRole, setFilterRole] = useState<UserRoleFilter>("ALL");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CurrentUser | null>(null);
  const [participantSection, setParticipantSection] = useState<ParticipantSection | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [confirmationUser, setConfirmationUser] = useState<CurrentUser | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [editForm, setEditForm] = useState(emptyEditForm());
  const [issueForm, setIssueForm] = useState(emptySubscriptionForm());
  const [subscriptionEditForm, setSubscriptionEditForm] = useState(emptySubscriptionForm());

  const {
    usersPageQuery,
    subscriptionsQuery,
    paymentsQuery,
    createMutation,
    updateMutation,
    issueMutation,
    updateSubscriptionMutation,
    deleteUserMutation,
    activePlans,
    subscriptionsByUser
  } = useUsersPageData({
    filterRole,
    currentPage,
    pageSize: USERS_PAGE_SIZE,
    selectedUserId: selectedUser?.id ?? null,
    selectedBranchId,
    enabled: Boolean(isAuthReady && authUser)
  });

  const filteredUsers = useMemo(
    () => filterBySearch(usersPageQuery.data?.items ?? [], userSearchTerm, getUserSearchValue),
    [userSearchTerm, usersPageQuery.data]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole]);

  useEffect(() => {
    if (!authUser) {
      setSelectedUser(null);
      setParticipantSection(null);
      setEditingSubscriptionId(null);
      setConfirmationUser(null);
      setConfirmationInput("");
    }
  }, [authUser]);

  function openCreateUser() {
    setCreateForm(emptyCreateForm());
    setIsCreateOpen(true);
  }

  function closeCreateUser() {
    setIsCreateOpen(false);
    setCreateForm(emptyCreateForm());
  }

  function submitCreateUser() {
    createMutation.mutate(createForm, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setCreateForm(emptyCreateForm());
      }
    });
  }

  function selectUser(user: CurrentUser) {
    setSelectedUser(user);
    setParticipantSection(null);
    setEditForm(editFormFromUser(user));
    setEditingSubscriptionId(null);
    setIssueForm(emptySubscriptionForm());
    setSubscriptionEditForm(emptySubscriptionForm());
  }

  function closeParticipantModal() {
    setSelectedUser(null);
    setParticipantSection(null);
    setEditingSubscriptionId(null);
  }

  function saveProfile() {
    if (!selectedUser) return;
    updateMutation.mutate(
      {
        userId: selectedUser.id,
        payload: {
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          role: editForm.role
        }
      },
      {
        onSuccess: (user) => {
          setSelectedUser(user);
          setEditForm(editFormFromUser(user));
          setParticipantSection(null);
        }
      }
    );
  }

  function submitIssue() {
    if (!selectedUser) return;
    issueMutation.mutate(buildIssuePayload(issueForm, selectedUser.id), {
      onSuccess: () => {
        setIssueForm(emptySubscriptionForm());
        setParticipantSection(null);
      }
    });
  }

  function startEditingSubscription(subscription: Subscription) {
    setEditingSubscriptionId(subscription.id);
    setSubscriptionEditForm(subscriptionFormFromSubscription(subscription));
  }

  function closeSubscriptionEditor() {
    setEditingSubscriptionId(null);
    setSubscriptionEditForm(emptySubscriptionForm());
  }

  function submitSubscriptionEdit() {
    if (!editingSubscriptionId) return;
    updateSubscriptionMutation.mutate(
      { subscriptionId: editingSubscriptionId, payload: buildSubscriptionUpdatePayload(subscriptionEditForm) },
      {
        onSuccess: () => {
          setEditingSubscriptionId(null);
          setSubscriptionEditForm(emptySubscriptionForm());
        }
      }
    );
  }

  function openDeleteConfirmation() {
    if (!selectedUser) return;
    setConfirmationInput("");
    setConfirmationUser(selectedUser);
  }

  function closeConfirmation() {
    setConfirmationUser(null);
    setConfirmationInput("");
  }

  function confirmDeleteUser() {
    if (!confirmationUser) return;
    deleteUserMutation.mutate(confirmationUser.id, {
      onSuccess: () => {
        if (selectedUser?.id === confirmationUser.id) {
          setSelectedUser(null);
        }
        closeConfirmation();
      }
    });
  }

  return (
    <section className="panel-stack">
      <PageHeader title="Учасники клубу" />

      <ManagementToolbar
        search={
          <FormField label="Пошук">
            <Input
              aria-label="Пошук"
              value={userSearchTerm}
              onChange={(event) => setUserSearchTerm(event.target.value)}
              placeholder="Ім'я, прізвище або телефон"
            />
          </FormField>
        }
        filters={
          <FormField label="Фільтр списку">
            <Select
              aria-label="Фільтр списку"
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value as UserRoleFilter)}
            >
              <option value="ALL">Усі учасники</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {getAccessLabel(role)}
                </option>
              ))}
            </Select>
          </FormField>
        }
        summary={
          <Badge>
            {filteredUsers.length} із {usersPageQuery.data?.total ?? 0} записів
          </Badge>
        }
        actions={<Button onClick={openCreateUser}>Новий користувач</Button>}
      />

      <ManagementTableCard>
        {usersPageQuery.isLoading ? <p className="muted">Завантаження користувачів...</p> : null}
        {usersPageQuery.isError ? (
          <p className="error-banner">
            {usersPageQuery.error instanceof Error ? usersPageQuery.error.message : "Помилка"}
          </p>
        ) : null}

        <Table
          caption="Список користувачів"
          columns={userColumns(subscriptionsByUser, selectUser)}
          rows={filteredUsers}
          getRowKey={(user) => user.id}
          emptyTitle="Користувачів не знайдено"
          emptyDescription="Змініть пошук або фільтр списку."
        />

        <Pagination
          page={usersPageQuery.data?.page ?? currentPage}
          totalPages={usersPageQuery.data?.total_pages ?? 1}
          onPageChange={setCurrentPage}
        />
      </ManagementTableCard>

      <CreateUserModal
        open={isCreateOpen}
        form={createForm}
        manageableRoles={manageableRoles}
        onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
        onClose={closeCreateUser}
        onSubmit={submitCreateUser}
        pending={createMutation.isPending}
        error={mutationError(createMutation, "Помилка створення користувача")}
      />

      <ParticipantProfileModal
        open={Boolean(selectedUser) && participantSection === null}
        user={selectedUser}
        form={editForm}
        manageableRoles={manageableRoles}
        onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
        onClose={closeParticipantModal}
        onSave={saveProfile}
        savePending={updateMutation.isPending}
        saveError={mutationError(updateMutation, "Помилка оновлення учасника")}
        onOpenSection={setParticipantSection}
        canDelete={canDeleteUsers}
        isSelf={selectedUser?.id === authUser?.id}
        deletePending={deleteUserMutation.isPending}
        onDelete={openDeleteConfirmation}
      />

      <IssueSubscriptionModal
        open={Boolean(selectedUser) && participantSection === "issue"}
        form={issueForm}
        activePlans={activePlans}
        onChange={(patch) => setIssueForm((current) => ({ ...current, ...patch }))}
        onClose={() => setParticipantSection(null)}
        onSubmit={submitIssue}
        pending={issueMutation.isPending}
        error={mutationError(issueMutation, "Помилка видачі абонемента")}
      />

      <SubscriptionsHistoryModal
        open={Boolean(selectedUser) && participantSection === "subscriptions"}
        subscriptions={subscriptionsQuery.data ?? []}
        isLoading={subscriptionsQuery.isLoading}
        errorMessage={
          subscriptionsQuery.isError
            ? subscriptionsQuery.error instanceof Error
              ? subscriptionsQuery.error.message
              : "Помилка"
            : null
        }
        onClose={() => setParticipantSection(null)}
        onEditSubscription={startEditingSubscription}
      />

      <EditSubscriptionModal
        open={Boolean(selectedUser) && participantSection === "subscriptions" && editingSubscriptionId !== null}
        form={subscriptionEditForm}
        activePlans={activePlans}
        onChange={(patch) => setSubscriptionEditForm((current) => ({ ...current, ...patch }))}
        onClose={closeSubscriptionEditor}
        onSubmit={submitSubscriptionEdit}
        pending={updateSubscriptionMutation.isPending}
        error={mutationError(updateSubscriptionMutation, "Помилка оновлення абонемента")}
      />

      <PaymentsHistoryModal
        open={Boolean(selectedUser) && participantSection === "payments"}
        payments={paymentsQuery.data ?? []}
        isLoading={paymentsQuery.isLoading}
        errorMessage={
          paymentsQuery.isError
            ? paymentsQuery.error instanceof Error
              ? paymentsQuery.error.message
              : "Помилка"
            : null
        }
        onClose={() => setParticipantSection(null)}
      />

      <DeleteUserConfirmation
        user={confirmationUser}
        value={confirmationInput}
        onChange={setConfirmationInput}
        onConfirm={confirmDeleteUser}
        onClose={closeConfirmation}
        pending={deleteUserMutation.isPending}
      />
    </section>
  );
}
