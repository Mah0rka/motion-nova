import { useEffect, useMemo, useState } from "react";

import { type MembershipPlan } from "../../../shared/api";
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
  Table,
  useSearchPagination
} from "../../../shared/ui";
import { useAuthStore } from "../../auth";
import { useSubscriptionsPageData } from "../hooks/useSubscriptionsPageData";
import { getPlanStatus, type PlanStatusKey } from "../lib/subscriptionLabels";
import {
  buildPlanPayload,
  emptyPlanForm,
  planFormFromPlan,
  type PlanFormState
} from "../lib/planForm";
import {
  clientPlanColumns,
  managementPlanColumns,
  ownedSubscriptionColumns
} from "../lib/planColumns";
import { PlanModal } from "../ui/PlanModal";
import { FreezeModal } from "../ui/FreezeModal";

export function SubscriptionsPage() {
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === "CLIENT";
  const isManagement = user?.role === "ADMIN" || user?.role === "OWNER";
  const [freezeTarget, setFreezeTarget] = useState<string | null>(null);
  const [freezeDays, setFreezeDays] = useState(7);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlanForm());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | MembershipPlan["type"]>("");
  const [statusFilter, setStatusFilter] = useState<"" | PlanStatusKey>("");

  const {
    plansQuery,
    subscriptionsQuery,
    purchaseMutation,
    freezeMutation,
    unfreezeMutation,
    createPlanMutation,
    updatePlanMutation,
    deletePlanMutation
  } = useSubscriptionsPageData({ isClient });

  const currentSubscriptions = subscriptionsQuery.data ?? [];
  const blockingSubscription = currentSubscriptions.find(
    (subscription) => subscription.status === "ACTIVE" || subscription.status === "FROZEN"
  );
  const sortedPlans = useMemo(
    () => [...(plansQuery.data ?? [])].sort((left, right) => left.created_at.localeCompare(right.created_at)),
    [plansQuery.data]
  );
  const visiblePlans = useMemo(
    () =>
      sortedPlans.filter((plan) => {
        if (typeFilter && plan.type !== typeFilter) return false;
        if (statusFilter && getPlanStatus(plan).key !== statusFilter) return false;
        return true;
      }),
    [sortedPlans, typeFilter, statusFilter]
  );

  const managePlansPagination = useSearchPagination(
    visiblePlans,
    searchTerm,
    (plan) => `${plan.title} ${plan.description ?? ""}`
  );
  const filteredPlans = managePlansPagination.filtered;

  useEffect(() => {
    if (freezeMutation.isSuccess) setFreezeTarget(null);
  }, [freezeMutation.isSuccess]);

  useEffect(() => {
    if (createPlanMutation.isSuccess) {
      setCreateOpen(false);
      setPlanForm(emptyPlanForm());
    }
  }, [createPlanMutation.isSuccess]);

  useEffect(() => {
    if (updatePlanMutation.isSuccess || deletePlanMutation.isSuccess) {
      setEditingPlanId(null);
      setPlanForm(emptyPlanForm());
    }
  }, [updatePlanMutation.isSuccess, deletePlanMutation.isSuccess]);

  function startEditingPlan(plan: MembershipPlan) {
    setEditingPlanId(plan.id);
    setPlanForm(planFormFromPlan(plan));
  }

  function openCreatePlan() {
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setCreateOpen(true);
  }

  function closePlanModal() {
    setEditingPlanId(null);
    setCreateOpen(false);
    setPlanForm(emptyPlanForm());
  }

  function changePlanForm(patch: Partial<PlanFormState>) {
    setPlanForm((current) => ({ ...current, ...patch }));
  }

  function submitPlan() {
    const payload = buildPlanPayload(planForm);
    if (editingPlanId) {
      updatePlanMutation.mutate({ id: editingPlanId, payload });
    } else {
      createPlanMutation.mutate(payload);
    }
  }

  const planModalOpen = createOpen || Boolean(editingPlanId);
  const planError =
    createPlanMutation.isError || updatePlanMutation.isError || deletePlanMutation.isError
      ? (createPlanMutation.error instanceof Error && createPlanMutation.error.message) ||
        (updatePlanMutation.error instanceof Error && updatePlanMutation.error.message) ||
        (deletePlanMutation.error instanceof Error && deletePlanMutation.error.message) ||
        "Помилка роботи з абонементом"
      : null;

  return (
    <section className="panel-stack subscriptions-page">
      <PageHeader title={isManagement ? "Абонементи клубу" : "Абонементи"} />

      {plansQuery.isLoading ? <p className="muted">Завантаження планів абонементів...</p> : null}
      {plansQuery.isError ? (
        <p className="error-banner">
          {plansQuery.error instanceof Error ? plansQuery.error.message : "Помилка завантаження планів"}
        </p>
      ) : null}

      {isManagement ? (
        <>
          <ManagementToolbar
            search={
              <FormField label="Пошук">
                <Input
                  aria-label="Пошук"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Назва або опис"
                />
              </FormField>
            }
            filters={
              <>
              <FormField label="Тип">
                <Select
                  aria-label="Тип"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "" | MembershipPlan["type"])}
                >
                  <option value="">Усі</option>
                  <option value="MONTHLY">Місячний</option>
                  <option value="YEARLY">Річний</option>
                  <option value="PAY_AS_YOU_GO">Разове відвідування</option>
                </Select>
              </FormField>
              <FormField label="Статус">
                <Select
                  aria-label="Статус"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "" | PlanStatusKey)}
                >
                  <option value="">Усі</option>
                  <option value="active">Активний</option>
                  <option value="hidden">Прихований</option>
                  <option value="nonpublic">Непублічний</option>
                </Select>
              </FormField>
              </>
            }
            summary={<Badge>{filteredPlans.length} абонементів</Badge>}
            actions={<Button onClick={openCreatePlan}>Новий абонемент</Button>}
          />

          <ManagementTableCard>
            <Table
              caption="Каталог абонементів"
              columns={managementPlanColumns(startEditingPlan)}
              rows={managePlansPagination.pageItems}
              getRowKey={(plan) => plan.id}
              emptyTitle="Абонементів не знайдено"
              emptyDescription="Змініть умови пошуку або створіть новий абонемент."
            />
            <Pagination
              page={managePlansPagination.page}
              totalPages={managePlansPagination.totalPages}
              onPageChange={managePlansPagination.setPage}
            />
          </ManagementTableCard>
        </>
      ) : null}

      {isClient ? (
        <>
          <ManagementTableCard title="Доступні абонементи">
            <Table
              caption="Доступні абонементи"
              columns={clientPlanColumns({
                onPurchase: (planId) => purchaseMutation.mutate(planId),
                purchasePending: purchaseMutation.isPending,
                blocked: Boolean(blockingSubscription)
              })}
              rows={sortedPlans}
              getRowKey={(plan) => plan.id}
              emptyTitle="Абонементів поки немає"
              emptyDescription="Зверніться до адміністратора клубу для оформлення доступу."
            />
          </ManagementTableCard>

          {purchaseMutation.isError ? (
            <p className="error-banner">
              {purchaseMutation.error instanceof Error ? purchaseMutation.error.message : "Помилка під час покупки"}
            </p>
          ) : null}

          {subscriptionsQuery.isError ? (
            <p className="error-banner">
              {subscriptionsQuery.error instanceof Error ? subscriptionsQuery.error.message : "Помилка"}
            </p>
          ) : null}

          <ManagementTableCard title="Мої абонементи">
            <Table
              caption="Мої абонементи"
              columns={ownedSubscriptionColumns({
                onFreeze: setFreezeTarget,
                onUnfreeze: (subscriptionId) => unfreezeMutation.mutate(subscriptionId),
                unfreezePending: unfreezeMutation.isPending
              })}
              rows={currentSubscriptions}
              getRowKey={(subscription) => subscription.id}
              emptyTitle="Активних абонементів немає"
              emptyDescription="Оформіть один із доступних планів, щоб відкрити доступ до клубу."
            />
          </ManagementTableCard>
        </>
      ) : null}

      <PlanModal
        open={planModalOpen}
        isEditing={Boolean(editingPlanId)}
        form={planForm}
        onChange={changePlanForm}
        onClose={closePlanModal}
        onSubmit={submitPlan}
        onDelete={() => editingPlanId && deletePlanMutation.mutate(editingPlanId)}
        savePending={createPlanMutation.isPending || updatePlanMutation.isPending}
        deletePending={deletePlanMutation.isPending}
        error={planError}
      />

      <FreezeModal
        open={Boolean(freezeTarget)}
        days={freezeDays}
        onDaysChange={setFreezeDays}
        onClose={() => setFreezeTarget(null)}
        onConfirm={() => freezeTarget && freezeMutation.mutate({ id: freezeTarget, days: freezeDays })}
        pending={freezeMutation.isPending}
        error={freezeMutation.error instanceof Error ? freezeMutation.error.message : null}
      />
    </section>
  );
}
