import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ServerIcon,
  UserIcon,
  FolderIcon,
  MagnifyingGlassIcon as SearchIcon,
  CommandLineIcon,
  CogIcon,
  PuzzlePieceIcon,
  UsersIcon,
  ArchiveBoxIcon,
  CircleStackIcon,
  HomeModernIcon,
  GlobeAmericasIcon,
  CubeIcon,
  ArrowsPointingOutIcon,
  WrenchIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../pages/[AUTH]/SignIn";

const ServerSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [servers, setServers] = useState<any[]>([]);
  const [filteredServers, setFilteredServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Check if we're on a server-specific page
  const isServerPage =
    location.pathname.startsWith("/servers/") &&
    location.pathname.split("/").length > 3;

  // Get server ID from path if on a server page
  const serverId = isServerPage ? location.pathname.split("/")[2] : null;

  // Check if user has admin permissions
  const hasAdminPermission =
    Array.isArray(user?.permissions) && user.permissions.includes("admin");

  // Common application routes with Heroicons
  const routes = [
    {
      id: "servers",
      name: "Servers",
      path: "/servers",
      icon: <ServerIcon className="h-4 w-4" />,
    },
    {
      id: "profile",
      name: "Profile",
      path: "/profile",
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      id: "projects",
      name: "Projects",
      path: "/projects",
      icon: <FolderIcon className="h-4 w-4" />,
    },
  ];

  // Admin routes - only show if user has admin permission
  const adminRoutes = hasAdminPermission
    ? [
        {
          id: "admin",
          name: "Admin Overview",
          path: "/admin",
          icon: <HomeModernIcon className="h-4 w-4" />,
        },
        {
          id: "admin-servers",
          name: "Admin Servers",
          path: "/admin/servers",
          icon: <ServerIcon className="h-4 w-4" />,
        },
        {
          id: "admin-regions",
          name: "Admin Regions",
          path: "/admin/regions",
          icon: <GlobeAmericasIcon className="h-4 w-4" />,
        },
        {
          id: "admin-nodes",
          name: "Admin Nodes",
          path: "/admin/nodes",
          icon: <CubeIcon className="h-4 w-4" />,
        },
        {
          id: "admin-users",
          name: "Admin Users",
          path: "/admin/users",
          icon: <UsersIcon className="h-4 w-4" />,
        },
        {
          id: "admin-units",
          name: "Admin Units",
          path: "/admin/units",
          icon: <ArchiveBoxIcon className="h-4 w-4" />,
        },
        {
          id: "admin-cargo",
          name: "Admin Cargo",
          path: "/admin/cargo",
          icon: <ArrowsPointingOutIcon className="h-4 w-4" />,
        },
      ]
    : [];

  // Server-specific routes - only show if on a server page
  const serverRoutes = serverId
    ? [
        {
          id: "server-console",
          name: "Console",
          path: `/servers/${serverId}/console`,
          icon: <CommandLineIcon className="h-4 w-4" />,
        },
        {
          id: "server-files",
          name: "Files",
          path: `/servers/${serverId}/files`,
          icon: <FolderIcon className="h-4 w-4" />,
        },
        {
          id: "server-settings",
          name: "Settings",
          path: `/servers/${serverId}/settings`,
          icon: <CogIcon className="h-4 w-4" />,
        },
        {
          id: "server-mods",
          name: "Mods",
          path: `/servers/${serverId}/mods`,
          icon: <WrenchIcon className="h-4 w-4" />,
        },
        {
          id: "server-plugins",
          name: "Plugins",
          path: `/servers/${serverId}/plugins`,
          icon: <PuzzlePieceIcon className="h-4 w-4" />,
        },
        {
          id: "server-players",
          name: "Players",
          path: `/servers/${serverId}/players`,
          icon: <UsersIcon className="h-4 w-4" />,
        },
        {
          id: "server-backups",
          name: "Backups",
          path: `/servers/${serverId}/backups`,
          icon: <ArchiveBoxIcon className="h-4 w-4" />,
        },
        {
          id: "server-databases",
          name: "Databases",
          path: `/servers/${serverId}/databases`,
          icon: <CircleStackIcon className="h-4 w-4" />,
        },
      ]
    : [];

  // Register keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsDropdownOpen((prev) => !prev);

        // If opening the dropdown, focus the search input
        if (!isDropdownOpen) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 10);
        }
      }

      // Close on escape key
      if (event.key === "Escape" && isDropdownOpen) {
        setIsDropdownOpen(false);
      }

      // Navigate to first result on Enter key
      if (event.key === "Enter" && isDropdownOpen) {
        navigateToFirstResult();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      fetchServers();
      // Focus the input when dropdown opens
      inputRef.current?.focus();
    }
  }, [isDropdownOpen]);

  // Filter servers based on search query
  useEffect(() => {
    if (!servers.length) return;

    if (searchQuery.trim() === "") {
      setFilteredServers(servers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = servers.filter((server) =>
      server.name.toLowerCase().includes(query),
    );

    setFilteredServers(filtered);
  }, [searchQuery, servers]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/servers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch servers");
      }

      const data = await response.json();
      setServers(data);
      setFilteredServers(data);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleServerClick = (serverId: string) => {
    navigate(`/servers/${serverId}/console`);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const navigateToFirstResult = () => {
    if (filteredRoutes.length > 0) {
      handleNavigate(filteredRoutes[0].path);
    } else if (filteredServerRoutes.length > 0) {
      handleNavigate(filteredServerRoutes[0].path);
    } else if (filteredAdminRoutes.length > 0) {
      handleNavigate(filteredAdminRoutes[0].path);
    } else if (filteredServers.length > 0) {
      handleServerClick(filteredServers[0].id);
    }
  };

  // Filter routes based on search query
  const filteredRoutes =
    searchQuery.trim() === ""
      ? routes
      : routes.filter((route) =>
          route.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  // Filter server routes based on search query
  const filteredServerRoutes =
    searchQuery.trim() === ""
      ? serverRoutes
      : serverRoutes.filter((route) =>
          route.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  // Filter admin routes based on search query
  const filteredAdminRoutes =
    searchQuery.trim() === ""
      ? adminRoutes
      : adminRoutes.filter((route) =>
          route.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  // Constants for scrolling behavior
  const MAX_ITEMS_WITHOUT_SCROLL = 5;
  const ITEM_HEIGHT = 32; // Further reduced height
  const SERVER_ITEM_HEIGHT = 40; // Height for server items which have more content

  // Helper function to calculate max height based on number of items
  const getMaxHeight = (itemsLength: number, isServer = false) => {
    if (itemsLength <= MAX_ITEMS_WITHOUT_SCROLL) return "auto";

    const height = isServer
      ? SERVER_ITEM_HEIGHT * MAX_ITEMS_WITHOUT_SCROLL
      : ITEM_HEIGHT * MAX_ITEMS_WITHOUT_SCROLL;

    return `${height}px`;
  };

  return (
    <>
      <div className="flex items-center relative">
        <div
          ref={searchBarRef}
          className="relative flex items-center w-72"
          onClick={() => {
            if (!isDropdownOpen) {
              setIsDropdownOpen(true);
            }
          }}
        >
          <SearchIcon className="absolute left-3 h-4 w-4 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search                                                 (⌘K)"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-gray-100 border border-gray-200
                    text-sm text-gray-700
                    focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300
                    transition-colors duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigateToFirstResult();
              }
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 text-gray-500 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery("");
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-2 w-72 bg-white rounded-md border border-gray-200 z-50 animate-slide-down origin-top overflow-hidden"
            style={{
              transformOrigin: "top",
              animation: "slideDown 0.15s ease-out forwards",
              maxHeight: "calc(100vh - 120px)", // Limit overall dropdown height
            }}
          >
            {/* Server-specific Routes Section - only show if on a server page */}
            {filteredServerRoutes.length > 0 && (
              <>
                <div className="py-1.5 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Current Server
                  </h3>
                </div>
                <div
                  className="overflow-y-auto"
                  style={{
                    maxHeight: getMaxHeight(filteredServerRoutes.length),
                  }}
                >
                  {filteredServerRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="px-4 py-1.5 flex items-center space-x-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                      onClick={() => handleNavigate(route.path)}
                    >
                      <div className="text-gray-500 flex-shrink-0">
                        {route.icon}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {route.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Navigation Routes Section */}
            {filteredRoutes.length > 0 && (
              <>
                <div className="py-1.5 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Navigation
                  </h3>
                </div>
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: getMaxHeight(filteredRoutes.length) }}
                >
                  {filteredRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="px-4 py-1.5 flex items-center space-x-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                      onClick={() => handleNavigate(route.path)}
                    >
                      <div className="text-gray-500 flex-shrink-0">
                        {route.icon}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {route.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Admin Routes Section - only show if user has admin permissions */}
            {filteredAdminRoutes.length > 0 && (
              <>
                <div className="py-1.5 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Admin
                  </h3>
                </div>
                <div
                  className="overflow-y-auto"
                  style={{
                    maxHeight: getMaxHeight(filteredAdminRoutes.length),
                  }}
                >
                  {filteredAdminRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="px-4 py-1.5 flex items-center space-x-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                      onClick={() => handleNavigate(route.path)}
                    >
                      <div className="text-gray-500 flex-shrink-0">
                        {route.icon}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {route.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Servers Section */}
            {filteredServers.length > 0 && (
              <>
                <div className="py-1.5 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    Servers
                  </h3>
                </div>
                <div
                  className="overflow-y-auto"
                  style={{
                    maxHeight: getMaxHeight(filteredServers.length, true),
                  }}
                >
                  {loading ? (
                    <div className="p-3 text-center text-gray-500">
                      Loading servers...
                    </div>
                  ) : (
                    filteredServers.map((server) => (
                      <div
                        key={server.id}
                        className="px-4 py-2 flex items-center justify-between hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                        onClick={() => handleServerClick(server.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0 h-6 w-6 rounded-md bg-gray-200 flex items-center justify-center border border-gray-300">
                            <ServerIcon className="h-3.5 w-3.5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              {server.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {server.address || "localhost"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {server.status === "running" ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* No Results State */}
            {searchQuery &&
              filteredServers.length === 0 &&
              filteredRoutes.length === 0 &&
              filteredServerRoutes.length === 0 &&
              filteredAdminRoutes.length === 0 && (
                <div className="p-3 text-center">
                  <div className="text-sm text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </>
  );
};

export default ServerSwitcher;
