import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";

import { AppLayout } from "@/layout/AppLayout";
import { OneDSdeSolvePage } from "@/pages/OneDSdeSolvePage";

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/1d-sde-solve" />,
});

const oneDSdeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/1d-sde-solve",
  component: OneDSdeSolvePage,
});

const routeTree = rootRoute.addChildren([indexRoute, oneDSdeRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
