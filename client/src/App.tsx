import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Logger from "@/pages/Logger";
import History from "@/pages/History";
import RoundDetail from "@/pages/RoundDetail";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/log" component={Logger} />
      <Route path="/history" component={History} />
      <Route path="/round/:id" component={RoundDetail} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppShell>
            <AppRouter />
          </AppShell>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
