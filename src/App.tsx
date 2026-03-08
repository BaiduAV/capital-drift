import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "@/context/GameContext";
import AppLayout from "@/components/game/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Market from "@/pages/Market";
import Portfolio from "@/pages/Portfolio";
import Trade from "@/pages/Trade";
import History from "@/pages/History";
import Achievements from "@/pages/Achievements";
import Welcome from "@/pages/Welcome";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GameProvider>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/market" element={<Market />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/history" element={<History />} />
              <Route path="/achievements" element={<Achievements />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
