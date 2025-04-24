import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, ReactNode } from "react";
import { Sidebar } from "./components/Navigation";
import LoadingSpinner from "./components/LoadingSpinner";
import { AuthProvider, ProtectedRoute, AuthPage } from "./pages/[AUTH]/SignIn";
import { SystemProvider } from "./contexts/SystemContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { usePageTitle } from "./hooks/usePageTitle";

const Servers = lazy(() => import("./pages/[MAIN]/Servers"));
const Projects = lazy(() => import("./pages/[MAIN]/Projects"));
const NotFound = lazy(() => import("./pages/[ERRORS]/NotFound"));
const AdminPage = lazy(() => import("./pages/[ADMIN]/AdminPage"));
const RegisterPage = lazy(() => import("./pages/[AUTH]/SignUp"));
const VerifyEmail = lazy(() => import("./pages/[AUTH]/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/[AUTH]/ForgotPassword"));
const Profile = lazy(() => import("./pages/[MAIN]/Profile"));

// Admin endpoints
const AdminNodes = lazy(() => import("./pages/[ADMIN]/Nodes"));
const AdminServers = lazy(() => import("./pages/[ADMIN]/Servers"));
const AdminUnits = lazy(() => import("./pages/[ADMIN]/Units"));
const AdminUsers = lazy(() => import("./pages/[ADMIN]/Users"));
const AdminCargo = lazy(() => import("./pages/[ADMIN]/Cargo"));
const AdminRegions = lazy(() => import("./pages/[ADMIN]/Regions"));

// Servers
const ServerConsole = lazy(() => import("./pages/[SERVER]/Console"));
const ServerFiles = lazy(() => import("./pages/[SERVER]/Files"));
const ServerSettings = lazy(() => import("./pages/[SERVER]/Settings"));
const ServerDatabases = lazy(() => import("./pages/[SERVER]/Databases"));
const ServerBackups = lazy(() => import("./pages/[SERVER]/Backups"));
const ServerMods = lazy(() => import("./pages/[SERVER]/Mods"));
const ServerPlayers = lazy(() => import("./pages/[SERVER]/Players"));
const ServerPlugins = lazy(() => import("./pages/[SERVER]/Plugins"));

{
  /*
  
  Kyro 1.0 (Revenant)
  2025 (c) Lydon and contributors

*/
}

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const noSidebarRoutes = [
    "/login",
    "/register",
    "/404",
    "/verify-email",
    "/forgot-password",
  ];
  const shouldHaveSidebar = !noSidebarRoutes.includes(location.pathname);

  return (
    <div>
      {shouldHaveSidebar && (
        <>
          <Sidebar />
        </>
      )}
      <div
        className={`
          ${shouldHaveSidebar ? "pl-56" : ""} 
          min-h-screen transition-all duration-200 ease-in-out
        `}
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  usePageTitle();

  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.98,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AuthProvider>
      <SystemProvider>
        <ProjectProvider>
          <Layout>
            <Suspense fallback={<LoadingSpinner />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full"
                >
                  <Routes location={location}>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                    <Route
                      path="/servers"
                      element={
                        <ProtectedRoute>
                          <Servers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/projects"
                      element={
                        <ProtectedRoute>
                          <Projects />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <AdminPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/" element={<Navigate to="/servers" />} />
                    <Route
                      path="/dashboard"
                      element={<Navigate to="/servers" />}
                    />
                    <Route path="*" element={<NotFound />} />

                    <Route
                      path="/admin/nodes"
                      element={
                        <ProtectedRoute>
                          <AdminNodes />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/servers"
                      element={
                        <ProtectedRoute>
                          <AdminServers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/units"
                      element={
                        <ProtectedRoute>
                          <AdminUnits />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute>
                          <AdminUsers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/cargo"
                      element={
                        <ProtectedRoute>
                          <AdminCargo />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/regions"
                      element={
                        <ProtectedRoute>
                          <AdminRegions />
                        </ProtectedRoute>
                      }
                    />

                    {/* Server routes */}
                    <Route
                      path="/servers/:id/console"
                      element={
                        <ProtectedRoute>
                          <ServerConsole />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/files"
                      element={
                        <ProtectedRoute>
                          <ServerFiles />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/mods"
                      element={
                        <ProtectedRoute>
                          <ServerMods />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/plugins"
                      element={
                        <ProtectedRoute>
                          <ServerPlugins />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/players"
                      element={
                        <ProtectedRoute>
                          <ServerPlayers />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/databases"
                      element={
                        <ProtectedRoute>
                          <ServerDatabases />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/backups"
                      element={
                        <ProtectedRoute>
                          <ServerBackups />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servers/:id/settings"
                      element={
                        <ProtectedRoute>
                          <ServerSettings />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </Layout>
        </ProjectProvider>
      </SystemProvider>
    </AuthProvider>
  );
}

export default App;
