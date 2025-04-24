import { Link, useLocation } from "react-router-dom";
import {
  ServerIcon,
  UsersIcon,
  CubeIcon,
  CommandLineIcon,
  FolderIcon,
  ServerStackIcon,
  ArchiveBoxIcon,
  HomeModernIcon,
  ArrowsPointingOutIcon,
  GlobeAmericasIcon,
  UserIcon,
  CogIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../pages/[AUTH]/SignIn";

const appName = import.meta.env.VITE_APP_NAME ?? "Kyro";

function Navbar() {
  return null;
}

// Navigation Item component for consistent styling
const NavItem = ({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) => {
  return (
    <Link
      to={to}
      className={`flex items-center h-8 ml-2 text-sm rounded-lg font-medium transition active:scale-95 duration-200 ${
        isActive
          ? "shadow-sm px-2 bg-[#1E1E20] border border-[#232325] text-white"
          : "border border-transparent shadow-transparent px-2 hover:text-white text-[#9CA3AF]"
      }`}
    >
      <Icon
        strokeWidth="2"
        className={`mr-2 h-4 w-4 ${isActive ? "text-white" : "text-[#9CA3AF]"}`}
      />
      {label}
    </Link>
  );
};

// Section Header component
const SectionHeader = ({ label }: { label: string }) => {
  return (
    <div className="px-4 pt-5 pb-1">
      <h3 className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#9CA3AF]">
        {label}
      </h3>
    </div>
  );
};

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  // Check if we're on a server-specific page
  const isServerPage =
    location.pathname.startsWith("/servers/") &&
    location.pathname.split("/").length > 3;
  const isAdminPage = location.pathname.startsWith("/admin");

  // Get server ID from path if on a server page
  const serverId = isServerPage ? location.pathname.split("/")[2] : null;

  // Check if user has admin permissions
  // @ts-ignore
  const hasAdminPermission = user?.permissions?.includes("admin") || false;

  return (
    <div className="fixed inset-y-0 left-0 w-56 bg-[#0E0E0F] flex flex-col border-r border-[#1E1E20]">
      <div className="h-14 flex items-center p-1 border-b border-[#1E1E20]">
        <Link
          to="/servers"
          className="h-12 flex items-center w-full px-4 hover:bg-[#232325] rounded-lg active:scale-95 transition"
        >
          <span className="text-base font-semibold text-white">
            {appName}
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="p-1 mt-2 pr-3 space-y-0.5">
          <NavItem
            to="/servers"
            icon={ServerStackIcon}
            label="Servers"
            isActive={location.pathname === "/servers"}
          />

          <NavItem
            to="/projects"
            icon={FolderIcon}
            label="Projects"
            isActive={location.pathname === "/projects"}
          />

          <NavItem
            to="/profille"
            icon={UserIcon}
            label="Profile"
            isActive={location.pathname === "/profille"}
          />

          {/* Server Section - Only show when on a server page */}
          {isServerPage && (
            <>
              <SectionHeader label="Server" />

              <NavItem
                to={`/servers/${serverId}/console`}
                icon={CommandLineIcon}
                label="Console"
                isActive={location.pathname.endsWith("/console")}
              />

              <NavItem
                to={`/servers/${serverId}/files`}
                icon={FolderIcon}
                label="Files"
                isActive={location.pathname.endsWith("/files")}
              />

<NavItem
                to={`/servers/${serverId}/plugins`}
                icon={PuzzlePieceIcon}
                label="Plugins"
                isActive={location.pathname.endsWith("/plugins")}
              />


                            <NavItem
                to={`/servers/${serverId}/settings`}
                icon={CogIcon}
                label="Settings"
                isActive={location.pathname.endsWith("/settings")}
              />
            </>
          )}

          {hasAdminPermission && (
            <>
              <SectionHeader label="Admin" />

              <NavItem
                to="/admin"
                icon={HomeModernIcon}
                label="Overview"
                isActive={location.pathname === "/admin"}
              />
              {isAdminPage && (
                <>
                  <NavItem
                    to="/admin/servers"
                    icon={ServerIcon}
                    label="Servers"
                    isActive={location.pathname === "/admin/servers"}
                  />

                  <NavItem
                    to="/admin/regions"
                    icon={GlobeAmericasIcon}
                    label="Regions"
                    isActive={location.pathname === "/admin/regions"}
                  />

                  <NavItem
                    to="/admin/nodes"
                    icon={CubeIcon}
                    label="Nodes"
                    isActive={location.pathname === "/admin/nodes"}
                  />

                  <NavItem
                    to="/admin/users"
                    icon={UsersIcon}
                    label="Users"
                    isActive={location.pathname === "/admin/users"}
                  />

                  <NavItem
                    to="/admin/units"
                    icon={ArchiveBoxIcon}
                    label="Units"
                    isActive={location.pathname === "/admin/units"}
                  />

                  <NavItem
                    to="/admin/cargo"
                    icon={ArrowsPointingOutIcon}
                    label="Cargo"
                    isActive={location.pathname === "/admin/cargo"}
                  />
                </>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Logout at bottom */}
      <div className="p-6">
        <Link
          to="https://github.com/lydonwastaken"
          className="inline-flex text-xs items-center text-[#9CA3AF] transition hover:text-white border-b border-[#1E1E20] pb-1"
        >
          Powered by {appName}
          <svg
            className="ml-1 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// Re-export both components for convenience
export { Navbar, Sidebar };
