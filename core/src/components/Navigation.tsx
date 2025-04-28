import { Link, useLocation } from "react-router-dom";
import {
  ServerIcon,
  UsersIcon,
  CubeIcon,
  CommandLineIcon,
  FolderIcon,
  ArchiveBoxIcon,
  HomeModernIcon,
  ArrowsPointingOutIcon,
  GlobeAmericasIcon,
  CogIcon,
  PuzzlePieceIcon,
  ArrowLeftOnRectangleIcon,
  SparklesIcon,
  CreditCardIcon,
  TicketIcon,
  CircleStackIcon as DatabaseIcon,
  UserCircleIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../pages/[AUTH]/SignIn";
import { useEffect, useRef, useState } from "react";
import { WrenchIcon } from "lucide-react";
import { APP_NAME, APP_LOGO } from "../config";

/**
 * Navbar component (placeholder for future implementation)
 */
function Navbar() {
  return null;
}

/**
 * Navigation item component for sidebar links
 */
interface NavItemProps {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}

const NavItem = ({ to, icon: Icon, label, isActive }: NavItemProps) => {
  return (
    <Link
      to={to}
      className={`flex items-center h-8 ml-2 text-sm font-medium rounded-sm transition active:scale-95 duration-200 ${isActive
        ? "shadow-sm px-2 bg-stone-800 border border-stone-700 text-white rounded-sm"
        : "border border-transparent shadow-transparent px-2 hover:text-white text-[#9CA3AF] rounded-sm"
        }`}
    >
      <Icon
        strokeWidth={2}
        className={`mr-2 h-4 w-4 ${isActive ? "text-white" : "text-[#9CA3AF]"}`}
      />
      {label}
    </Link>
  );
};

/**
 * User avatar component that displays the first letter of username
 */
interface UserAvatarProps {
  username: string;
}

const UserAvatar = ({ username }: UserAvatarProps) => {
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="h-9 w-9 rounded-md flex items-center justify-center border border-stone-900">
      <span className="text-base font-bold text-white select-none drop-shadow-md">
        {initial}
      </span>
    </div>
  );
};

/**
 * Section header component for sidebar categories
 */
interface SectionHeaderProps {
  label: string;
}

const SectionHeader = ({ label }: SectionHeaderProps) => {
  return (
    <div className="px-4 pt-5 pb-1">
      <h3 className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#9CA3AF]">
        {label}
      </h3>
    </div>
  );
};

/**
 * Sidebar component for application navigation
 */
function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownAlignLeft, setDropdownAlignLeft] = useState(false);
  const [dropdownShiftUp, setDropdownShiftUp] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarOpen &&
        !(event.target as Element).closest(".sidebar") &&
        !(event.target as Element).closest(".burger-menu")
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  // Handle dropdown positioning
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && buttonRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // Check right overflow
      if (dropdownRect.right > viewportWidth) {
        setDropdownAlignLeft(true);
      } else {
        setDropdownAlignLeft(false);
      }
      // Check bottom overflow
      if (dropdownRect.bottom > viewportHeight) {
        setDropdownShiftUp(true);
      } else {
        setDropdownShiftUp(false);
      }
    }
  }, [isDropdownOpen]);

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.replace("/login");
  };

  /**
   * Toggle user dropdown menu
   */
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  /**
   * Toggle sidebar visibility on mobile
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Determine current page context
  const isNotServerPage =
    !location.pathname.startsWith("/servers/") ||
    location.pathname.split("/").length <= 3;

  const isServerPage =
    location.pathname.startsWith("/servers/") &&
    location.pathname.split("/").length > 3;

  const isAdminPage = location.pathname.startsWith("/admin");

  const serverId = isServerPage ? location.pathname.split("/")[2] : null;

  const hasAdminPermission = user?.permissions?.includes("admin") || false;

  return (
    <>
      {/* Burger Menu Button */}
      <button
        className="burger-menu fixed top-4 left-4 z-50 p-2 rounded-md bg-stone-800 text-white lg:hidden"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar fixed inset-y-0 left-0 w-56 flex flex-col bg-stone-950 z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="h-14 flex items-center p-1">
          <Link
            to="/servers"
            className="h-12 flex items-center w-full px-4 active:scale-95 transition"
          >
            <img src={APP_LOGO} alt="Logo" className="w-4 h-4 invert" />
            <span className="text-base font-semibold text-white ml-2 uppercase text-sm">
              {APP_NAME}
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-1 mt-2 pr-3 space-y-0.5">
            {/* Back button for server pages */}
            {isServerPage && (
              <Link
                to="/servers"
                className="flex items-center h-8 ml-2 mb-3 text-sm font-medium rounded-sm transition active:scale-95 duration-200 border border-transparent shadow-transparent px-2 hover:text-white text-[#9CA3AF] rounded-sm"
              >
                <ArrowLeftIcon
                  strokeWidth="2"
                  className="mr-2 h-4 w-4 text-[#9CA3AF]"
                />
                Back to Servers
              </Link>
            )}

            {isNotServerPage && (
              <>
                <NavItem
                  to="/servers"
                  icon={SparklesIcon}
                  label="Overview"
                  isActive={location.pathname === "/servers"}
                />

                <NavItem
                  to="/profile"
                  icon={UserCircleIcon}
                  label="Profile"
                  isActive={location.pathname === "/profile"}
                />

                <SectionHeader label="Support" />
                <NavItem
                  to="/comingsoon"
                  icon={TicketIcon}
                  label="Tickets"
                  isActive={location.pathname === "/comingsoon"}
                />
                <NavItem
                  to="/comingsoon"
                  icon={BookOpenIcon}
                  label="Documentation"
                  isActive={location.pathname === "/comingsoon"}
                />

                <SectionHeader label="Billing" />
                <NavItem
                  to="/comingsoon"
                  icon={WrenchIcon}
                  label="Services"
                  isActive={location.pathname === "/comingsoon"}
                />
                <NavItem
                  to="/comingsoon"
                  icon={CreditCardIcon}
                  label="Billing"
                  isActive={location.pathname === "/comingsoon"}
                />
              </>
            )}

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
                  to={`/servers/${serverId}/mods`}
                  icon={WrenchIcon}
                  label="Mods"
                  isActive={location.pathname.endsWith("/mods")}
                />

                <NavItem
                  to={`/servers/${serverId}/players`}
                  icon={UsersIcon}
                  label="Players"
                  isActive={location.pathname.endsWith("/players")}
                />

                <NavItem
                  to={`/servers/${serverId}/backups`}
                  icon={ArchiveBoxIcon}
                  label="Backups"
                  isActive={location.pathname.endsWith("/backups")}
                />

                <NavItem
                  to={`/servers/${serverId}/databases`}
                  icon={DatabaseIcon}
                  label="Databases"
                  isActive={location.pathname.endsWith("/databases")}
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

        <div className="p-1">
          <div className="flex justify-start space-x-2">
            {user && (
              <div className="relative">
                <div
                  ref={buttonRef}
                  className="flex items-center gap-3 cursor-pointer mr-2 py-2 px-1 rounded-xl hover:bg-stone-900 active:scale-95 shadow-sm transition duration-200 ease-in-out backdrop-blur w-44"
                  onClick={toggleDropdown}
                >
                  <UserAvatar username={user.username || "User"} />
                  <div className="flex flex-col">
                    <span className="text-white text-sm">{user.username}</span>
                    <span className="text-gray-400 text-xs">
                      {user.permissions}
                    </span>
                  </div>
                </div>
                <div
                  ref={dropdownRef}
                  className={`absolute ${dropdownAlignLeft ? "left-42" : "right-42"
                    } ${dropdownShiftUp ? "bottom-full mb-1" : "top-full mt-1"
                    } w-48 bg-stone-950 rounded-md shadow-lg border border-stone-900 
                         overflow-hidden max-h-[calc(100vh-80px)] overflow-auto transform transition-all duration-200 ease-in-out origin-top-right z-50 ${isDropdownOpen
                      ? "opacity-100 scale-y-100 translate-y-0"
                      : "opacity-0 scale-y-95 translate-y-1 pointer-events-none"
                    }`}
                >
                  <div className="py-1">
                    <Link to="/profile">
                      <button className="w-full px-4 py-2 text-sm text-gray-400 hover:bg-stone-900 flex items-center">
                        <UserCircleIcon className="mr-2 h-4 w-4 text-gray-500" />
                        Profile
                      </button>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-gray-400 hover:bg-stone-900 flex items-center"
                    >
                      <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4 text-gray-500" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { Navbar, Sidebar };
