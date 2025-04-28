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
  WrenchIcon as Hammer,
  UserCircleIcon as UserCircleIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../pages/[AUTH]/SignIn";
import { useEffect, useRef, useState } from "react";
import { WrenchIcon } from "lucide-react";
import { APP_NAME, APP_LOGO } from "../config";

function Navbar() {
  return null;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center h-8 ml-2 text-sm font-medium rounded-sm transition active:scale-95 duration-200 ${isActive
        ? "shadow-sm px-2 bg-stone-800 border border-stone-700 text-white rounded-sm "
        : "border border-transparent shadow-transparent px-2 hover:text-white text-[#9CA3AF] rounded-sm"
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

const UserAvatar: React.FC<{ username: string }> = ({ username }) => {
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="h-9 w-9 rounded-md flex items-center justify-center border border-stone-900">
      <span className="text-base font-bold text-white select-none drop-shadow-md">
        {initial}
      </span>
    </div>
  );
};

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownAlignLeft, setDropdownAlignLeft] = useState(false);
  const [dropdownShiftUp, setDropdownShiftUp] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.replace("/login");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isServerPage =
    location.pathname.startsWith("/servers/") &&
    location.pathname.split("/").length > 3;
  const isAdminPage = location.pathname.startsWith("/admin");

  const serverId = isServerPage ? location.pathname.split("/")[2] : null;

  // @ts-ignore
  const hasAdminPermission = user?.permissions?.includes("admin") || false;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 xl:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Backdrop overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-56 flex flex-col bg-stone-950 transform transition-transform duration-300 ease-in-out z-40 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
          }`}
      >
        <div className="h-14 flex items-center p-1">
          <Link
            to="/servers"
            className="h-12 flex items-center w-full px-4 active:scale-95 transition"
            onClick={closeMobileMenu}
          >
            <img src={APP_LOGO} alt="Logo" className="w-4 h-4 invert" />
            <span className="text-base font-semibold text-white ml-2 uppercase text-sm">
              {APP_NAME}
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-1 mt-2 pr-3 space-y-0.5">
            <NavItem
              to="/servers"
              icon={SparklesIcon}
              label="Overview"
              isActive={location.pathname === "/servers"}
              onClick={closeMobileMenu}
            />

            <NavItem
              to="/profile"
              icon={UserCircleIcon}
              label="Profile"
              isActive={location.pathname === "/profile"}
              onClick={closeMobileMenu}
            />

            <>
              <SectionHeader label="Support" />
              <NavItem
                to="/comingsoon"
                icon={TicketIcon}
                label="Tickets"
                isActive={location.pathname === "/comingsoon"}
                onClick={closeMobileMenu}
              />
              <NavItem
                to="/comingsoon"
                icon={BookOpenIcon}
                label="Documentation"
                isActive={location.pathname === "/comingsoon"}
                onClick={closeMobileMenu}
              />
            </>

            <>
              <SectionHeader label="Billing" />
              <NavItem
                to="/comingsoon"
                icon={WrenchIcon}
                label="Services"
                isActive={location.pathname === "/comingsoon"}
                onClick={closeMobileMenu}
              />
              <NavItem
                to="/comingsoon"
                icon={CreditCardIcon}
                label="Billing"
                isActive={location.pathname === "/comingsoon"}
                onClick={closeMobileMenu}
              />
            </>

            {isServerPage && (
              <>
                <SectionHeader label="Server" />

                <NavItem
                  to={`/servers/${serverId}/console`}
                  icon={CommandLineIcon}
                  label="Console"
                  isActive={location.pathname.endsWith("/console")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/files`}
                  icon={FolderIcon}
                  label="Files"
                  isActive={location.pathname.endsWith("/files")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/plugins`}
                  icon={PuzzlePieceIcon}
                  label="Plugins"
                  isActive={location.pathname.endsWith("/plugins")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/mods`}
                  icon={Hammer}
                  label="Mods"
                  isActive={location.pathname.endsWith("/mods")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/players`}
                  icon={UsersIcon}
                  label="Players"
                  isActive={location.pathname.endsWith("/players")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/backups`}
                  icon={ArchiveBoxIcon}
                  label="Backups"
                  isActive={location.pathname.endsWith("/backups")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/databases`}
                  icon={DatabaseIcon}
                  label="Databases"
                  isActive={location.pathname.endsWith("/databases")}
                  onClick={closeMobileMenu}
                />

                <NavItem
                  to={`/servers/${serverId}/settings`}
                  icon={CogIcon}
                  label="Settings"
                  isActive={location.pathname.endsWith("/settings")}
                  onClick={closeMobileMenu}
                />
              </>
            )}

            {hasAdminPermission && (
              <>
                <SectionHeader label="Admin" />
                <NavItem
                  to="/admin"
                  icon={ServerIcon}
                  label="Admin"
                  isActive={location.pathname === "/admin"}
                  onClick={closeMobileMenu}
                />
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-stone-900">
          <div
            ref={buttonRef}
            className="flex items-center justify-between cursor-pointer"
            onClick={toggleDropdown}
          >
            <div className="flex items-center space-x-3">
              <UserAvatar username={user?.username || "User"} />
              <div>
                <p className="text-sm font-medium text-white">
                  {user?.username || "User"}
                </p>
                <p className="text-xs text-gray-400">View Profile</p>
              </div>
            </div>
          </div>

          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className={`absolute bottom-16 ${dropdownAlignLeft ? "right-0" : "left-0"
                } ${dropdownShiftUp ? "bottom-16" : "top-16"
                } w-48 rounded-md shadow-lg bg-stone-900 ring-1 ring-black ring-opacity-5 focus:outline-none`}
            >
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-stone-800 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { Navbar, Sidebar };
