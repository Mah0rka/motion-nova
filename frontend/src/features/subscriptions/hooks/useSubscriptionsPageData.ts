import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMembershipPlan,
  deleteMembershipPlan,
  freezeSubscription,
  unfreezeSubscription,
  getSubscriptionPlans,
  getSubscriptions,
  purchaseSubscription,
  queryKeys,
  updateMembershipPlan,
  type MembershipPlan
} from "../../../shared/api";

type UseSubscriptionsPageDataOptions = {
  isClient: boolean;
};

export function useSubscriptionsPageData({ isClient }: UseSubscriptionsPageDataOptions) {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: queryKeys.subscriptions.plans(),
    queryFn: getSubscriptionPlans
  });

  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.subscriptions.mine(),
    queryFn: getSubscriptions,
    enabled: isClient
  });

  const purchaseMutation = useMutation({
    mutationFn: purchaseSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.bookings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.subscriptions() });
    }
  });

  const freezeMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => freezeSubscription(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine() });
    }
  });

  const unfreezeMutation = useMutation({
    mutationFn: (id: string) => unfreezeSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine() });
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: createMembershipPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.plans() });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<Omit<MembershipPlan, "id" | "created_at" | "updated_at">>;
    }) => updateMembershipPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.plans() });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: deleteMembershipPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.plans() });
    }
  });

  return {
    plansQuery,
    subscriptionsQuery,
    purchaseMutation,
    freezeMutation,
    unfreezeMutation,
    createPlanMutation,
    updatePlanMutation,
    deletePlanMutation
  };
}
