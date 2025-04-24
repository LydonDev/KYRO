import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PlusIcon,
  UserIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/solid";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Badge, Button } from "@/components/UI";
import { Card } from "@/components/ui/card";
import { EllipsisVerticalIcon, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../[AUTH]/SignIn";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

type View = "list" | "create" | "view" | "edit";

interface FormData {
  username: string;
  password: string;
  permissions: string[];
}

// Alert component for displaying error/success messages
interface AlertProps {
  type: "error" | "success" | "warning";
  message: string;
  onDismiss?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onDismiss }) => {
  const bgColor =
    type === "error"
      ? "bg-red-50"
      : type === "success"
        ? "bg-green-50"
        : "bg-yellow-50";
  const textColor =
    type === "error"
      ? "text-red-600"
      : type === "success"
        ? "text-green-600"
        : "text-yellow-600";
  const borderColor =
    type === "error"
      ? "border-red-100"
      : type === "success"
        ? "border-green-100"
        : "border-yellow-100";

        
  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-md flex items-start justify-between`}
    >
      <div className="flex items-start p-2">
        {type === "error" || type === "warning" ? (
          <ExclamationTriangleIcon
            className={`w-3 h-3 ${textColor} mr-2 mt-0.5`}
          />
        ) : null}
        <p className={`text-xs ${textColor}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`ml-2 mr-2 p-1 ${textColor} hover:bg-opacity-10 cursor-pointer rounded-full`}
        >
          ×
        </button>
      )}
    </div>
  );
};

const UserContextMenu: React.FC<{
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ position, onClose, onEdit, onDelete }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.permissions.includes("admin")) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        e.target instanceof HTMLElement &&
        !menuRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const adjustPosition = () => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        let x = position.x;
        let y = position.y;

        if (x + rect.width > viewport.width) {
          x = Math.max(0, viewport.width - rect.width - 16); // 16px padding from edge
        }

        if (y + rect.height > viewport.height) {
          y = Math.max(0, viewport.height - rect.height - 16); // 16px padding from edge
        }

        setMenuPosition({ x, y });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    const timer = setTimeout(adjustPosition, 10);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [onClose, position]);

  const actions = [
    { label: 'Edit', icon: PencilIcon, action: onEdit },
    { label: 'Delete', icon: TrashIcon, action: onDelete, destructive: true },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 w-36 bg-[#0E0E0F] border border-[#1E1E20] rounded-lg py-1"
      style={{ top: menuPosition.y, left: menuPosition.x }}
    >
      {actions.map(({ label, icon: Icon, action, destructive }) => (
        <button
          key={label}
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
          className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm ${
            destructive ? 'text-red-500 hover:bg-red-900/20' : 'text-[#9CA3AF] hover:bg-[#1E1E20]'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </motion.div>
  );
};

const AdminUsersPage = () => {
  const [contextMenu, setContextMenu] = useState<{ user: User; position: { x: number; y: number } } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    permissions: ["SERVERS_VIEW", "SERVERS_MANAGE"],
  });
  const [activeTab, setActiveTab] = useState<"overview" | "permissions">(
    "overview",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<
    { id: string; type: "error" | "success" | "warning"; message: string }[]
  >([]);
  const [tableSortField, setTableSortField] = useState<string>("username");
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">(
    "asc",
  );

  console.log(error);

  // Available permissions
  const availablePermissions = [
    {
      id: "ADMIN",
      label: "Administrator",
      description: "Full access to all of {appName} & the admin panel",
    },
    { id: "USER", label: "User", description: "Standard user permissions" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Show alert message
  const showAlert = useCallback(
    (type: "error" | "success" | "warning", message: string) => {
      const id = Date.now().toString();
      setAlerts((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
      }, 5000);

      return id;
    },
    [],
  );

  // Dismiss specific alert
  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const response = await fetch("/api/users", { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }

      const usersData = await response.json();

      // Convert string dates to Date objects
      const formattedUsers = usersData.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }));

      setUsers(formattedUsers);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showAlert("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleUser = async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch user");
      }

      const userData = await response.json();

      // Convert string dates to Date objects
      const formattedUser = {
        ...userData,
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(userData.updatedAt),
      };

      // Update the user in the users list
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? formattedUser : user)),
      );

      // Update selected user if this is the one we're viewing
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(formattedUser);
      }

      setError(null);
      return formattedUser;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showAlert("error", errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.error)
          ? data.error.map((e: any) => e.message).join(", ")
          : data.error || "Failed to create user";

        throw new Error(errorMessage);
      }

      await fetchData();
      setView("list");
      setFormData({
        username: "",
        password: "",
        permissions: ["SERVERS_VIEW", "SERVERS_MANAGE"],
      });
      showAlert("success", `User "${formData.username}" created successfully`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      setFormError(errorMessage);
      showAlert("error", errorMessage);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    try {
      const token = localStorage.getItem("token");
      const payload = { ...formData };

      // If password is empty, remove it from the payload
      if (!payload.password) {
        delete (payload as any).password;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.error)
          ? data.error.map((e: any) => e.message).join(", ")
          : data.error || "Failed to update user";

        throw new Error(errorMessage);
      }

      await fetchData();
      showAlert("success", `User "${formData.username}" updated successfully`);

      // Fetch the updated user and update selected user
      const updatedUser = await fetchSingleUser(selectedUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }

      setView("view");
      setFormData({
        username: "",
        password: "",
        permissions: ["SERVERS_VIEW", "SERVERS_MANAGE"],
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update user";
      setFormError(errorMessage);
      showAlert("error", errorMessage);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      await fetchData();
      if (selectedUser?.id === userId) {
        setView("list");
        setSelectedUser(null);
      }

      showAlert("success", "User deleted successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete user";
      showAlert("error", errorMessage);
    }
  };

  const handleTableSort = (field: string) => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableSortField(field);
      setTableSortDirection("asc");
    }
  };

  const getSortedUsers = () => {
    return [...users].sort((a, b) => {
      let comparison = 0;

      switch (tableSortField) {
        case "username":
          comparison = a.username.localeCompare(b.username);
          break;
        case "permissions":
          comparison = a.permissions.length - b.permissions.length;
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          comparison = 0;
      }

      return tableSortDirection === "asc" ? comparison : -comparison;
    });
  };

  const togglePermission = (permission: string) => {
    setFormData((prevData) => {
      if (prevData.permissions.includes(permission)) {
        return {
          ...prevData,
          permissions: prevData.permissions.filter((p) => p !== permission),
        };
      } else {
        return {
          ...prevData,
          permissions: [...prevData.permissions, permission],
        };
      }
    });
  };

  const renderForm = (type: "create" | "edit") => (
    <form
      onSubmit={type === "create" ? handleCreate : handleEdit}
      className="space-y-4 max-w-lg"
    >
      {formError && (
        <Alert
          type="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400">
          Username
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="mt-1 w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
          placeholder="john.doe"
          required
          maxLength={100}
        />
        <p className="text-xs text-gray-400 mt-1">
          A unique username for this user
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400">
          Password{" "}
          {type === "edit" && (
            <span className="text-gray-400">(leave blank to keep current)</span>
          )}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="mt-1 w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
          placeholder="••••••••"
          required={type === "create"}
        />
        <p className="text-xs text-gray-400 mt-1">
          {type === "create"
            ? "Must be at least 8 characters long"
            : "Enter a new password or leave blank to keep the current one"}
        </p>
      </div>

      <div className="space-y-1">
        <Card className="mt-2 space-y-2 bg-[#0E0E0F] border border-[#1E1E20] p-3">
          {availablePermissions.map((permission) => (
            <div key={permission.id} className="flex items-start space-x-2">
              <input
                type="checkbox"
                id={`permission-${permission.id}`}
                checked={formData.permissions.includes(permission.id)}
                onChange={() => togglePermission(permission.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label
                  htmlFor={`permission-${permission.id}`}
                  className="text-xs font-medium text-gray-400 cursor-pointer"
                >
                  {permission.label}
                </label>
                <p className="text-xs text-gray-400">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex items-center space-x-3">
      <Button
          type="button"
          onClick={() => {
            setView(type === "edit" ? "view" : "list");
            if (type === "create") setSelectedUser(null);
            setFormData({
              username: "",
              password: "",
              permissions: ["SERVERS_VIEW", "SERVERS_MANAGE"],
            });
          }}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          type="submit"
        >
          {type === "create" ? "Create User" : "Update User"}
        </Button>
      </div>
    </form>
  );


  const renderUserView = () => {
    if (!selectedUser) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 ">
          <Button
              onClick={() => {
                setView("list");
                setSelectedUser(null);
              }}
              variant="secondary"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 mr-1.5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-400">
                {selectedUser.username}
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                setFormData({
                  username: selectedUser.username,
                  password: "",
                  permissions: selectedUser.permissions,
                });
                setView("edit");
              }}
              icon={<PencilIcon className="w-3.5 h-3.5 mr-1.5" />}
              variant="secondary"
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDelete(selectedUser.id)}
              icon={<TrashIcon className="w-3.5 h-3.5 mr-1.5" />}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="flex space-x-1">
          <Button
            onClick={() => setActiveTab("overview")}
            variant={activeTab === "overview" ? "primary" : "secondary"}
            className={activeTab === "overview" ? "font-bold" : "font-normal"}
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab("permissions")}
            variant={activeTab === "permissions" ? "primary" : "secondary"}
            className={activeTab === "permissions" ? "font-bold" : "font-normal"}
          >
            Permissions
          </Button>
        </div>

        {activeTab === "overview" ? (
          <Card className="bg-[#0E0E0F] border border-[#1E1E20]">
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white">User ID</div>
                  <div className="text-sm font-mono mt-1 text-gray-400">
                    {selectedUser.id}
                  </div>
                </div>  
                <div>
                  <div className="text-xs text-white">Username</div>
                  <div className="text-sm mt-1 text-gray-400">{selectedUser.username}</div>
                </div>
                <div>
                  <div className="text-xs text-white">Permissions</div>
                  <div className="mt-1">
                    <Badge
                      variant="info"
                      className="text-xs"
                    >
                      {selectedUser.permissions[0]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white">Created At</div>
                  <div className="text-sm mt-1 text-gray-400">
                    {selectedUser.createdAt.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white">Updated At</div>
                  <div className="text-sm mt-1 text-gray-400">
                    {selectedUser.updatedAt.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-[#0E0E0F] border border-[#1E1E20] rounded-md shadow-xs">
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-white">
                    User Permissions
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Permissions determine what actions the user can perform in
                    the system.
                  </p>
                </div>

                <div className="space-y-3">
                  {availablePermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className={`p-3 rounded-md border ${
                        selectedUser.permissions.includes(permission.id)
                          ? "bg-[#1E1E20] border-[#1E1E20]"
                          : "bg-[#0E0E0F] border-[#1E1E20]"
                      }`}
                    >
                      <div className="flex items-start">
                        <div
                          className={`mt-0.5 mr-3 ${
                            selectedUser.permissions.includes(permission.id)
                              ? "text-gray-700"
                              : "text-gray-300"
                          }`}
                        >
                          <ShieldExclamationIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {permission.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {permission.description}
                          </div>
                          <div className="text-xs mt-1">
                            {selectedUser.permissions.includes(
                              permission.id,
                            ) ? (
                              <span className="text-green-600">Granted</span>
                            ) : (
                              <span className="text-gray-400">Not granted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderUserTable = () => {
    const sortedUsers = getSortedUsers();

    return (
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-transparent">
              <th
                className="p-3 text-left text-xs font-medium text-gray-400 tracking-wider cursor-pointer"
                onClick={() => handleTableSort("username")}
              >
                <div className="flex items-center">
                  Username
                </div>
              </th>
              <th
                className="p-3 text-left text-xs font-medium text-gray-400 tracking-wider cursor-pointer"
                onClick={() => handleTableSort("permissions")}
              >
                <div className="flex items-center">
                  Permissions
                </div>
              </th>
              <th
                className="p-3 text-left text-xs font-medium text-gray-400 tracking-wider cursor-pointer"
                onClick={() => handleTableSort("createdAt")}
              >
                <div className="flex items-center">
                  Created
                </div>
              </th>
              <th className="p-3 text-right text-xs font-medium text-gray-400 tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E20] bg-[#0E0E0F]">
            {sortedUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-[#1E1E20] cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setView("view");
                }}
              >
                <td className="p-3 text-xs text-white">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium">{user.username}</span>
                  </div>
                </td>
                <td className="p-3 text-xs">
                  <Badge
                    variant="info"
                    className="text-xs"
                  >
                    {user.permissions[0]}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-gray-400">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                    <div
                      className="flex items-center justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                      
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            user,
                            position: { x: e.clientX, y: e.clientY },
                          });
                        }}
                        className="p-1 text-[#9CA3AF] cursor-pointer hover:text-white"
                      >
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-gray-400 text-xs"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-[#0E0E0F]">
      <div className="p-6">
        {/* Global Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                type={alert.type}
                message={alert.message}
                onDismiss={() => dismissAlert(alert.id)}
              />
            ))}
          </div>
        )}

        <div className="transition-all duration-200 ease-in-out">
          {view === "list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-[#FFFFFF]">Users</h1>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage users and their permissions for accessing the panel.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setView("create")}
                    variant="secondary"
                    icon={<PlusIcon className="w-3.5 h-3.5 mr-1.5" />}
                  >
                    Create User
                  </Button>
                </div>
              </div>

              <div className="bg-[#0E0E0F] border border-[#1E1E20] rounded-md shadow-xs">
                {renderUserTable()}
              </div>
            </div>
          )}

          {view === "create" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setView("list");
                    setSelectedUser(null);
                  }}
                  className="flex items-center text-gray-400 hover:bg-gray-100 p-2 cursor-pointer rounded-md transition hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-[#FFFFFF]">
                    Create User
                  </h1>
                </div>
              </div>
              {renderForm("create")}
            </div>
          )}

          {view === "edit" && renderForm("edit")}

          {view === "view" && renderUserView()}
        </div>
      </div>
      {contextMenu && (
        <UserContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            setSelectedUser(contextMenu.user);
            setFormData({
              username: contextMenu.user.username,
              password: "",
              permissions: contextMenu.user.permissions,
            });
            setView("edit");
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDelete(contextMenu.user.id);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;
