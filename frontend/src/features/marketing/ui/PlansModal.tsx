import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getPublicMembershipPlans, queryKeys } from "../../../shared/api";

type PlansModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PlansModal({ open, onClose }: PlansModalProps) {
  const plansQuery = useQuery({
    queryKey: queryKeys.public.membershipPlans(),
    queryFn: getPublicMembershipPlans,
    enabled: open
  });

  const plans = [...(plansQuery.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (!open) {
    return null;
  }

  return (
    <div className="mn-plans-overlay" onClick={onClose}>
      <aside
        className="mn-plans-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Абонементи"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mn-plans-body">
              {plansQuery.isLoading ? <p className="mn-plans-note">Завантаження...</p> : null}

              {plansQuery.isError ? (
                <p className="mn-plans-note mn-plans-note-error">
                  {plansQuery.error instanceof Error ? plansQuery.error.message : "Не вдалося завантажити абонементи"}
                </p>
              ) : null}

              {plansQuery.isSuccess && plans.length === 0 ? (
                <p className="mn-plans-note">Наразі немає доступних абонементів.</p>
              ) : null}

              {plans.length > 0 ? (
                <div className="mn-plans-grid">
                  {plans.map((plan) => (
                    <article className="mn-plan-card" key={plan.id}>
                      <h3>{plan.title}</h3>
                      {plan.description ? <p className="mn-plan-desc">{plan.description}</p> : null}
                      <p className="mn-plan-price">
                        <span>{plan.price}</span> {plan.currency}
                      </p>
                      <Link className="mn-primary-action" to="/login">
                        Оформити <ArrowUpRight size={16} />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : null}
        </div>
      </aside>
    </div>
  );
}
