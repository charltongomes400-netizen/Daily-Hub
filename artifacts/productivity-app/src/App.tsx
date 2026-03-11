import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Finance from "@/pages/finance";
import Gym from "@/pages/gym";
import Goals from "@/pages/goals";
import Notes from "@/pages/notes";
import Login from "@/pages/login";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/tasks">
        <AuthGuard><Tasks /></AuthGuard>
      </Route>
      <Route path="/finance">
        <AuthGuard><Finance /></AuthGuard>
      </Route>
      <Route path="/gym">
        <AuthGuard><Gym /></AuthGuard>
      </Route>
      <Route path="/goals">
        <AuthGuard><Goals /></AuthGuard>
      </Route>
      <Route path="/notes">
        <AuthGuard><Notes /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
