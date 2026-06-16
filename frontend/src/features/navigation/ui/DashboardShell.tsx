import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getBranches, queryKeys } from "../../../shared/api";
import { Button, BrandSignature, Select } from "../../../shared/ui";
import { fullName } from "../../../shared/lib/format";
import { useAuthStore, userHasRole } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import { findDashboardRoute, navigationItems } from "../navigation.config";
import { TopNavigation } from "./TopNavigation";

const NETWORK_WIDE_VALUE = "__NETWORK_WIDE__";

export function DashboardShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeRoute = findDashboardRoute(location.pathname);
  const isWideWorkspace = Boolean(activeRoute?.wideWorkspace);

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches.accessible(false),
    queryFn: () => getBranches(false),
    enabled: Boolean(user)
  });

  useEffect(() => {
    const branches = branchesQuery.data;
    if (!user || !branches) return;

    const selected = branches.find((branch) => branch.id === selectedBranchId);
    if (selected) {
      return;
    }

    if (user.role === "OWNER") {
      if (selectedBranchId !== null) {
        setSelectedBranch(null);
      }
      return;
    }

    const fallback = branches[0];
    const fallbackId = fallback?.id ?? null;
    if (selectedBranchId !== fallbackId) {
      setSelectedBranch(fallbackId);
    }
  }, [branchesQuery.data, selectedBranchId, setSelectedBranch, user]);

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => userHasRole(user, item.roles)),
    [user]
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  function handleBranchChange(value: string) {
    if (value === NETWORK_WIDE_VALUE) {
      setSelectedBranch(null);
      return;
    }
    setSelectedBranch(value);
  }

  return (
    <div className="crm-frame">
      <div className={isWideWorkspace ? "app-shell app-shell-wide" : "app-shell"}>
        <header className="crm-topbar">
          <div className="crm-topbar-inner">
            <BrandSignature />
            <TopNavigation items={visibleItems} />
            <div className="crm-top-actions">
            <Select
              className="topbar-branch-select"
              aria-label="Активна філія"
              value={selectedBranchId ?? NETWORK_WIDE_VALUE}
              onChange={(event) => handleBranchChange(event.target.value)}
            >
              {user?.role === "OWNER" ? <option value={NETWORK_WIDE_VALUE}>Усі зали</option> : null}
              {branchesQuery.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </Select>
            <Link className="crm-user-chip" to="/dashboard/profile" aria-label="Відкрити профіль">
              <span className="crm-user-copy">
                <b>{fullName(user)}</b>
                <small>{user?.role}</small>
              </span>
            </Link>
            <Button
              className="crm-icon-button crm-menu-button"
              variant="ghost"
              size="sm"
              aria-label="Відкрити меню"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {isMobileMenuOpen ? (
            <motion.div
              className="crm-mobile-overlay"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.aside
                className="crm-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Навігація кабінету"
                initial={{ y: -18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -18, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="crm-mobile-menu-head">
                  <BrandSignature />
                  <Button className="crm-icon-button" variant="ghost" size="sm" aria-label="Закрити меню" onClick={() => setIsMobileMenuOpen(false)}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <TopNavigation items={visibleItems} mobile onNavigate={() => setIsMobileMenuOpen(false)} />
                <Link
                  className="crm-user-chip crm-mobile-user"
                  to="/dashboard/profile"
                  aria-label="Відкрити профіль"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="crm-user-copy">
                    <b>{fullName(user)}</b>
                    <small>{user?.role}</small>
                  </span>
                </Link>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <main className="shell-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className={isWideWorkspace ? "content-area content-area-wide" : "content-area"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
