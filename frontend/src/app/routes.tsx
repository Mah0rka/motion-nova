import { createBrowserRouter, Navigate } from "react-router-dom";

import {
  AuthBootstrap,
  LogoutHandler,
  ProtectedLayout,
  PublicOnlyLayout,
  RoleBoundary
} from "../features/auth";
import { getDashboardRoute } from "../features/navigation/navigation.config";


async function loadHomePage() {
  const module = await import("../features/marketing/pages/HomePage");
  return { Component: module.HomePage };
}

async function loadLoginPage() {
  const module = await import("../features/auth/pages/LoginPage");
  return { Component: module.LoginPage };
}

async function loadProfilePage() {
  const module = await import("../features/profile/pages/ProfilePage");
  return { Component: module.ProfilePage };
}

async function loadSchedulePage() {
  const module = await import("../features/schedules/pages/SchedulePage");
  return { Component: module.SchedulePage };
}

async function loadBookingsPage() {
  const module = await import("../features/bookings/pages/BookingsPage");
  return { Component: module.BookingsPage };
}

async function loadSubscriptionsPage() {
  const module = await import("../features/subscriptions/pages/SubscriptionsPage");
  return { Component: module.SubscriptionsPage };
}

async function loadPaymentsPage() {
  const module = await import("../features/payments/pages/PaymentsPage");
  return { Component: module.PaymentsPage };
}

async function loadMyClassesPage() {
  const module = await import("../features/classes/pages/MyClassesPage");
  return { Component: module.MyClassesPage };
}

async function loadBranchesPage() {
  const module = await import("../features/branches/pages/BranchesPage");
  return { Component: module.BranchesPage };
}

async function loadReportsPage() {
  const module = await import("../features/reports/pages/ReportsPage");
  return { Component: module.ReportsPage };
}

async function loadUsersPage() {
  const module = await import("../features/users/pages/UsersPage");
  return { Component: module.UsersPage };
}

async function loadCheckInPage() {
  const module = await import("../features/visits/pages/CheckInPage");
  return { Component: module.CheckInPage };
}

async function loadVisitsPage() {
  const module = await import("../features/visits/pages/VisitsPage");
  return { Component: module.VisitsPage };
}

async function loadExpensesPage() {
  const module = await import("../features/expenses/pages/ExpensesPage");
  return { Component: module.ExpensesPage };
}

async function loadAiAgentPage() {
  const module = await import("../features/ai/pages/AiAgentPage");
  return { Component: module.AiAgentPage };
}

const profileRoute = getDashboardRoute("profile");
const scheduleRoute = getDashboardRoute("schedule");
const bookingsRoute = getDashboardRoute("bookings");
const subscriptionsRoute = getDashboardRoute("subscriptions");
const paymentsRoute = getDashboardRoute("payments");
const myClassesRoute = getDashboardRoute("myClasses");
const reportsRoute = getDashboardRoute("reports");
const usersRoute = getDashboardRoute("users");
const branchesRoute = getDashboardRoute("branches");
const checkInRoute = getDashboardRoute("checkIn");
const visitsRoute = getDashboardRoute("visits");
const expensesRoute = getDashboardRoute("expenses");
const aiRoute = getDashboardRoute("ai");

export const appRouter = createBrowserRouter([
  {
    element: <AuthBootstrap />,
    children: [
      {
        path: "/",
        lazy: loadHomePage
      },
      {
        element: <PublicOnlyLayout />,
        children: [
          {
            path: "/login",
            lazy: loadLoginPage
          }
        ]
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: "/dashboard",
            element: <Navigate to={scheduleRoute.path} replace />
          },
          {
            path: profileRoute.path,
            lazy: loadProfilePage
          },
          {
            path: scheduleRoute.path,
            lazy: loadSchedulePage
          },
          {
            element: <RoleBoundary roles={bookingsRoute.roles} />,
            children: [
              {
                path: bookingsRoute.path,
                lazy: loadBookingsPage
              }
            ]
          },
          {
            element: <RoleBoundary roles={subscriptionsRoute.roles} />,
            children: [
              {
                path: subscriptionsRoute.path,
                lazy: loadSubscriptionsPage
              },
              {
                path: paymentsRoute.path,
                lazy: loadPaymentsPage
              }
            ]
          },
          {
            element: <RoleBoundary roles={myClassesRoute.roles} />,
            children: [
              {
                path: myClassesRoute.path,
                lazy: loadMyClassesPage
              }
            ]
          },
          {
            element: <RoleBoundary roles={reportsRoute.roles} />,
            children: [
              {
                path: reportsRoute.path,
                lazy: loadReportsPage
              },
              {
                path: usersRoute.path,
                lazy: loadUsersPage
              },
              {
                path: checkInRoute.path,
                lazy: loadCheckInPage
              },
              {
                path: visitsRoute.path,
                lazy: loadVisitsPage
              },
              {
                path: expensesRoute.path,
                lazy: loadExpensesPage
              }
            ]
          },
          {
            element: <RoleBoundary roles={branchesRoute.roles} />,
            children: [
              {
                path: branchesRoute.path,
                lazy: loadBranchesPage
              }
            ]
          },
          {
            element: <RoleBoundary roles={aiRoute.roles} />,
            children: [
              {
                path: aiRoute.path,
                lazy: loadAiAgentPage
              }
            ]
          },
          {
            path: "/logout",
            element: <LogoutHandler />
          }
        ]
      }
    ]
  }
]);
