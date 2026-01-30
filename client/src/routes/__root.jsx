import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 antialiased">
      <Outlet />
    </div>
  );
}
