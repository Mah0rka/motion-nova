import { NavLink } from "react-router-dom";

import { cx } from "../../../shared/lib/cx";
import type { NavigationItem } from "../navigation.config";

type TopNavigationProps = {
  items: NavigationItem[];
  mobile?: boolean;
  onNavigate?: () => void;
};

export function TopNavigation({ items, mobile = false, onNavigate }: TopNavigationProps) {
  return (
    <nav
      className={cx("crm-topnav", mobile && "crm-topnav-mobile")}
      aria-label="Навігація кабінету"
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          className={({ isActive }) => cx("crm-nav-link", isActive && "active")}
          onClick={onNavigate}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
