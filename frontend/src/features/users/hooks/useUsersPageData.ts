import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUser,
  deleteUser,
  getManagedSubscriptions,
  getPayments,
  getSubscriptionPlans,
  getUsersPage,
  issueClientSubscription,
  queryKeys,
  updateClientSubscription,
  updateUser,
  type Subscription,
  type UserRole
} from "../../../shared/api";
import { getSubscriptionPriority } from "../lib/userForms";

type UseUsersPageDataOptions = {
  filterRole: UserRole | "ALL";
  currentPage: number;
  pageSize: number;
  selectedUserId: string | null;
  selectedBranchId: string | null;
  enabled: boolean;
};

export function useUsersPageData({
  filterRole,
  currentPage,
  pageSize,
  selectedUserId,
  selectedBranchId,
  enabled
}: UseUsersPageDataOptions) {
  const queryClient = useQueryClient();

  const usersPageQuery = useQuery({
    queryKey: queryKeys.users.page(filterRole, currentPage, pageSize),
    queryFn: () =>
      getUsersPage({
        role: filterRole === "ALL" ? undefined : filterRole,
        page: currentPage,
        pageSize
      }),
    enabled
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.subscriptions.plans(),
    queryFn: getSubscriptionPlans,
    enabled
  });

  const allSubscriptionsQuery = useQuery({
    queryKey: queryKeys.subscriptions.managedAll(selectedBranchId),
    queryFn: () => getManagedSubscriptions(),
    enabled
  });

  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.subscriptions.managedByUser(selectedUserId, selectedBranchId),
    queryFn: () => getManagedSubscriptions({ userId: selectedUserId ?? undefined }),
    enabled: Boolean(enabled && selectedUserId)
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.ledger(selectedBranchId, selectedUserId),
    queryFn: () => getPayments({ userId: selectedUserId ?? undefined }),
    enabled: Boolean(enabled && selectedUserId)
  });

  function invalidateUsers() {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.root() });
  }

  function invalidateUserSubscriptions() {
    queryClient.invalidateQueries({
      queryKey: queryKeys.subscriptions.managedByUser(selectedUserId, selectedBranchId)
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.managedAll(selectedBranchId) });
  }

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: invalidateUsers
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof updateUser>[1] }) =>
      updateUser(userId, payload),
    onSuccess: invalidateUsers
  });

  const issueMutation = useMutation({
    mutationFn: issueClientSubscription,
    onSuccess: invalidateUserSubscriptions
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({
      subscriptionId,
      payload
    }: {
      subscriptionId: string;
      payload: Parameters<typeof updateClientSubscription>[1];
    }) => updateClientSubscription(subscriptionId, payload),
    onSuccess: invalidateUserSubscriptions
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidateUsers();
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.managedAll(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.root() });
    }
  });

  const activePlans = useMemo(
    () => (plansQuery.data ?? []).filter((plan) => plan.is_active),
    [plansQuery.data]
  );

  const subscriptionsByUser = useMemo(() => {
    const map = new Map<string, Subscription>();
    for (const subscription of allSubscriptionsQuery.data ?? []) {
      const current = map.get(subscription.user_id);
      if (!current) {
        map.set(subscription.user_id, subscription);
        continue;
      }
      const currentPriority = getSubscriptionPriority(current);
      const nextPriority = getSubscriptionPriority(subscription);
      if (
        nextPriority > currentPriority ||
        (nextPriority === currentPriority &&
          new Date(subscription.updated_at).getTime() > new Date(current.updated_at).getTime())
      ) {
        map.set(subscription.user_id, subscription);
      }
    }
    return map;
  }, [allSubscriptionsQuery.data]);

  return {
    usersPageQuery,
    plansQuery,
    allSubscriptionsQuery,
    subscriptionsQuery,
    paymentsQuery,
    createMutation,
    updateMutation,
    issueMutation,
    updateSubscriptionMutation,
    deleteUserMutation,
    activePlans,
    subscriptionsByUser
  };
}
