import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import Auth from "./pages/Auth";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import MyApplications from "./pages/MyApplications";
import AppMarketplace from "./pages/AppMarketplace";
import Workspace from "./pages/Workspace";
import MyDevices from "./pages/MyDevices";
import Sessions from "./pages/Sessions";
import Downloads from "./pages/Downloads";
import Resources from "./pages/Resources";
import Users from "./pages/Users";
import Organizations from "./pages/Organizations";
import Audit from "./pages/Audit";
import Groups from "./pages/Groups";
import CloudProviders from "./pages/CloudProviders";
import Hypervisors from "./pages/Hypervisors";
import Headscale from "./pages/Headscale";
import Policies from "./pages/Policies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<MainLayout />}>
              {/* Client Portal Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-applications" element={<MyApplications />} />
              <Route path="/app-marketplace" element={<AppMarketplace />} />
              <Route path="/workspace/:resourceId" element={<Workspace />} />
              <Route path="/my-devices" element={<MyDevices />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/audit" element={<Audit />} />
              
              {/* Admin Routes */}
              <Route path="/users" element={<Users />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/cloud-providers" element={<CloudProviders />} />
              <Route path="/hypervisors" element={<Hypervisors />} />
              <Route path="/headscale" element={<Headscale />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/policies" element={<Policies />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;