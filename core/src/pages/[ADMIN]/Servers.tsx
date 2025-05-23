import React, { useState, useEffect } from "react";
import {
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { Badge, Button } from "@/components/UI";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FormModal } from "@/components/ui/modal";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../[AUTH]/SignIn";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/config";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
  isOnline: boolean;
  lastChecked: Date;
  createdAt: Date;
  updatedAt: Date;
  allocations?: Allocation[];
  region?: Region;
  regionId?: string | null;
}

interface Unit {
  id: string;
  name: string;
  shortName: string;
  description: string;
  dockerImage: string;
  defaultStartupCommand: string;
  configFiles: Record<string, string>;
  environmentVariables: Record<string, string>;
  installScript: string[];
  startup: {
    command: string;
    parameters: string[];
  };
  recommendedRequirements?: {
    memoryMiB: number;
    diskMiB: number;
    cpuPercent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  username: string;
  permissions: string[];
}

interface Allocation {
  id: string;
  nodeId: string;
  port: number;
  bindAddress: string;
  alias?: string;
  notes?: string;
  assigned: boolean;
  serverId?: string;
}

interface Server {
  id: string;
  name: string;
  internalId: string;
  nodeId: string;
  unitId: string;
  userId: string;
  allocationId: string;
  memoryMiB: number;
  diskMiB: number;
  cpuPercent: number;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  node?: Node;
  unit?: Unit;
  user?: User;
  status?: any;
}

interface Region {
  id: string;
  name: string;
  identifier: string;
  countryId?: string | null;
  fallbackRegionId?: string | null;
  fallbackRegion?: Region | null;
  serverLimit?: number | null;
  nodes: Node[];
  stats?: {
    serverCount: number;
    nodeCount: number;
    onlineNodeCount: number;
    atCapacity: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CreateFormData {
  name: string;
  nodeId?: string;
  regionId?: string;
  unitId: string;
  userId: string;
  allocationId?: string;
  memoryMiB: number;
  diskMiB: number;
  cpuPercent: number;
}

interface EditFormData {
  name?: string;
  unitId?: string;
  memoryMiB?: number;
  diskMiB?: number;
  cpuPercent?: number;
}

type View = "list" | "create" | "view" | "edit";

const AdminServersPage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.permissions.includes("admin")) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  const [deploymentTab, setDeploymentTab] = useState<"nodes" | "regions">(
    "nodes",
  );
  const [loadingRegions, setLoadingRegions] = useState(false);

  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    name: "",
    nodeId: "",
    unitId: "",
    userId: "",
    allocationId: "",
    memoryMiB: 1024,
    diskMiB: 10240,
    cpuPercent: 100,
  });

  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    unitId: "",
    memoryMiB: 0,
    diskMiB: 0,
    cpuPercent: 0,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userSearch] = useState("");
  const [unitSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (view === "create") {
      fetchRegions();
    }
  }, [view]);

  useEffect(() => {
    const filtered = users.filter((user) =>
      user.username.toLowerCase().includes(userSearch.toLowerCase()),
    );
    setFilteredUsers(filtered);
  }, [userSearch, users]);

  useEffect(() => {
    const filtered = units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
        unit.shortName.toLowerCase().includes(unitSearch.toLowerCase()),
    );
    setFilteredUnits(filtered);
  }, [unitSearch, units]);

  const fetchRegions = async () => {
    setLoadingRegions(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/regions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch regions");
      }

      const data = await response.json();
      setAvailableRegions(data);
    } catch (err) {
      console.error("Failed to fetch regions:", err);
      setDeploymentTab("nodes");
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [serversRes, nodesRes, unitsRes, usersRes, regionsRes] =
        await Promise.all([
          fetch(
            "/api/servers?include[node]=true&include[unit]=true&include[user]=true",
            { headers },
          ),
          fetch("/api/nodes", { headers }),
          fetch("/api/units", { headers }),
          fetch("/api/users", { headers }),
          fetch("/api/regions", { headers }),
        ]);

      if (!serversRes.ok) throw new Error("Failed to fetch servers");
      if (!nodesRes.ok) throw new Error("Failed to fetch nodes");
      if (!unitsRes.ok) throw new Error("Failed to fetch units");
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      // Don't throw on regions error, as it's optional

      const [serversData, nodesData, unitsData, usersData] = await Promise.all([
        serversRes.json(),
        nodesRes.json(),
        unitsRes.json(),
        usersRes.json(),
      ]);

      let regionsData = [];
      if (regionsRes.ok) {
        regionsData = await regionsRes.json();
        setAvailableRegions(regionsData);
      }

      setServers(serversData);
      setNodes(nodesData);
      setUnits(unitsData);
      setUsers(usersData);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const payload = { ...createFormData };
      const isRegionBased = !!payload.regionId;

      if (isRegionBased) {
        delete payload.nodeId;
        delete payload.allocationId;
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create server");
      }

      await fetchData();
      setView("list");
      setCreateFormData({
        name: "",
        nodeId: "",
        unitId: "",
        userId: "",
        allocationId: "",
        memoryMiB: 1024,
        diskMiB: 10240,
        cpuPercent: 100,
        regionId: "",
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create server",
      );
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer) return;
    setFormError(null);
    setUpdating(true);

    try {
      const changesOnly: EditFormData = {};

      if (editFormData.name !== selectedServer.name) {
        changesOnly.name = editFormData.name;
      }

      if (editFormData.unitId !== selectedServer.unitId) {
        changesOnly.unitId = editFormData.unitId;
      }

      if (editFormData.memoryMiB !== selectedServer.memoryMiB) {
        changesOnly.memoryMiB = editFormData.memoryMiB;
      }

      if (editFormData.diskMiB !== selectedServer.diskMiB) {
        changesOnly.diskMiB = editFormData.diskMiB;
      }

      if (editFormData.cpuPercent !== selectedServer.cpuPercent) {
        changesOnly.cpuPercent = editFormData.cpuPercent;
      }

      if (Object.keys(changesOnly).length === 0) {
        setView("view");
        setUpdating(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/servers/${selectedServer.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changesOnly),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update server");
      }

      await fetchData();

      const refreshedServer = servers.find((s) => s.id === selectedServer.id);
      if (refreshedServer) {
        setSelectedServer(refreshedServer);
      }

      setView("view");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update server",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (serverId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/servers/${serverId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete server");
      }

      await fetchData();
      if (selectedServer?.id === serverId) {
        setView("list");
        setSelectedServer(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete server");
    }
  };

  // Helper to update form data for create
  const updateFormData = (updates: Partial<CreateFormData>) => {
    setCreateFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const renderCreateForm = () => {
    return (
      <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
        {formError && (
          <div className="bg-red-50 border border-red-100 rounded-md p-3">
            <p className="text-xs text-red-600">{formError}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#FFFFFF]">
            Name
          </label>
          <input
            type="text"
            value={createFormData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-[#FFFFFF]
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
            placeholder="my-server"
            required
          />
        </div>

        {/* Deployment Method Tabs */}
        <div className="mb-2">
          <div className="flex pr-3 space-x-2">
            <Button
              type="button"
              onClick={() => setDeploymentTab("nodes")}
              variant={deploymentTab === "nodes" ? "primary" : "secondary"}
              className={
                deploymentTab === "nodes" ? "font-bold" : "font-normal"
              }
            >
              Specific Node
            </Button>
            <Button
              type="button"
              onClick={() => setDeploymentTab("regions")}
              variant={deploymentTab === "regions" ? "primary" : "secondary"}
              className={
                deploymentTab === "regions" ? "font-bold" : "font-normal"
              }
            >
              Region (Load Balanced)
            </Button>
          </div>
        </div>

        {deploymentTab === "nodes" ? (
          // Node selection section
          <>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#FFFFFF]">
                Node
              </label>
              <select
                value={createFormData.nodeId || ""}
                onChange={(e) =>
                  updateFormData({
                    nodeId: e.target.value,
                    // Clear regionId when selecting a node
                    regionId: "",
                    // Clear allocation when changing node
                    allocationId: "",
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-[#FFFFFF]
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
                required={deploymentTab === "nodes"}
              >
                <option value="">Select a node</option>
                {nodes.map((node) => (
                  <option
                    key={node.id}
                    value={node.id}
                    disabled={!node.isOnline}
                  >
                    {node.name} ({node.fqdn}) {!node.isOnline && "- Offline"}
                  </option>
                ))}
              </select>
            </div>

            {createFormData.nodeId && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#FFFFFF]">
                  Port Allocation
                </label>
                <select
                  value={createFormData.allocationId || ""}
                  onChange={(e) =>
                    updateFormData({ allocationId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-[#FFFFFF]
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
                  required={deploymentTab === "nodes"}
                >
                  <option value="">Select a port allocation</option>
                  {nodes
                    .find((n) => n.id === createFormData.nodeId)
                    ?.allocations?.filter((a) => !a.assigned)
                    .map((allocation) => (
                      <option key={allocation.id} value={allocation.id}>
                        {allocation.bindAddress}:{allocation.port}
                        {allocation.alias && ` (${allocation.alias})`}
                      </option>
                    ))}
                </select>
                {nodes
                  .find((n) => n.id === createFormData.nodeId)
                  ?.allocations?.filter((a) => !a.assigned).length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No available allocations on this node. Please select a
                      different node or create allocations.
                    </p>
                  )}
              </div>
            )}
          </>
        ) : (
          // Region selection section
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              Region
            </label>
            {loadingRegions ? (
              <div className="flex items-center space-x-2 py-2">
                <div className="animate-spin h-4 w-4 border-2 border-stone-900 rounded-full border-t-transparent"></div>
                <span className="text-xs text-[#FFFFFF]">
                  Loading regions...
                </span>
              </div>
            ) : (
              <>
                <select
                  value={createFormData.regionId || ""}
                  onChange={(e) =>
                    updateFormData({
                      regionId: e.target.value,
                      // Clear nodeId and allocationId when selecting a region
                      nodeId: "",
                      allocationId: "",
                    })
                  }
                  className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-[#FFFFFF]
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
                  required={deploymentTab === "regions"}
                >
                  <option value="">Select a region</option>
                  {availableRegions.map((region) => (
                    <option
                      key={region.id}
                      value={region.id}
                      disabled={
                        region.stats?.onlineNodeCount === 0 ||
                        region.stats?.atCapacity
                      }
                    >
                      {region.name}
                      {region.stats?.onlineNodeCount === 0
                        ? " (No online nodes)"
                        : ""}
                      {region.stats?.atCapacity ? " (At capacity)" : ""}
                    </option>
                  ))}
                </select>
                {availableRegions.length === 0 && (
                  <p className="text-xs text-white mt-1">
                    No regions configured. Please create a region first or
                    select a specific node.
                  </p>
                )}
                <p className="text-xs text-gray-300 mt-1">
                  {APP_NAME} will automatically select the best node in this
                  region
                </p>
              </>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#FFFFFF]">
            Unit
          </label>
          <select
            value={createFormData.unitId}
            onChange={(e) => updateFormData({ unitId: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
            required
          >
            <option value="">Select a unit</option>
            {filteredUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.shortName})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#FFFFFF]">
            User
          </label>
          <select
            value={createFormData.userId}
            onChange={(e) => updateFormData({ userId: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
            required
          >
            <option value="">Select a user</option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              Memory (MiB)
            </label>
            <input
              type="number"
              value={createFormData.memoryMiB}
              onChange={(e) =>
                updateFormData({ memoryMiB: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={128}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              Disk (MiB)
            </label>
            <input
              type="number"
              value={createFormData.diskMiB}
              onChange={(e) =>
                updateFormData({ diskMiB: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={1024}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              CPU (%)
            </label>
            <input
              type="number"
              value={createFormData.cpuPercent}
              onChange={(e) =>
                updateFormData({ cpuPercent: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={25}
              max={400}
              required
            />
          </div>
        </div>
      </form>
    );
  };

  const renderEditForm = () => {
    if (!selectedServer) return null;

    return (
      <form onSubmit={handleEdit} className="space-y-4 max-w-lg">
        {formError && (
          <div className="bg-red-50 border border-red-100 rounded-md p-3">
            <p className="text-xs text-red-600">{formError}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white">Name</label>
          <input
            type="text"
            value={editFormData.name}
            onChange={(e) =>
              setEditFormData({ ...editFormData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
            placeholder="my-server"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white">Unit</label>
          <select
            value={editFormData.unitId}
            onChange={(e) =>
              setEditFormData({ ...editFormData, unitId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
            required
          >
            {filteredUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.shortName})
              </option>
            ))}
          </select>

          {editFormData.unitId !== selectedServer.unitId && (
            <p className="mt-2 text-yellow-600 text-xs">
              Warning: Changing the unit will reinstall the server with the new
              image. Your server data will be preserved, but the environment
              will change.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              Memory (MiB)
            </label>
            <input
              type="number"
              value={editFormData.memoryMiB}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  memoryMiB: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={128}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#FFFFFF]">
              Disk (MiB)
            </label>
            <input
              type="number"
              value={editFormData.diskMiB}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  diskMiB: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={1024}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-white">
              CPU (%)
            </label>
            <input
              type="number"
              value={editFormData.cpuPercent}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  cpuPercent: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-md bg-stone-950 border border-stone-900
                                  text-sm text-white
                                  focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                                  transition-colors duration-200"
              min={25}
              max={400}
              required
            />
          </div>
        </div>
      </form>
    );
  };

  const renderServerView = () => {
    if (!selectedServer) return null;

    // Find region information if available
    const region = selectedServer.node?.region;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => {
                setView("list");
                setSelectedServer(null);
              }}
              variant="secondary"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 mr-1.5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-[#FFFFFF]">
                {selectedServer.name}
              </h2>
              <p className="text-xs text-[#FFFFFF]">
                {selectedServer.internalId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                // Initialize the edit form with current server values
                setEditFormData({
                  name: selectedServer.name,
                  unitId: selectedServer.unitId,
                  memoryMiB: selectedServer.memoryMiB,
                  diskMiB: selectedServer.diskMiB,
                  cpuPercent: selectedServer.cpuPercent,
                });
                setFormError(null);
                setIsEditModalOpen(true);
              }}
              variant="secondary"
            >
              <PencilSquareIcon className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(selectedServer.id)}
            >
              <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-900 rounded-lg overflow-hidden">
          <div className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-[#A1A1AA]">Server ID</div>
                <div className="text-sm font-mono mt-1 text-[#FFFFFF]">
                  {selectedServer.id}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A1A1AA]">Name</div>
                <div className="text-sm mt-1 text-[#FFFFFF]">
                  {selectedServer.name}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A1A1AA]">Internal ID</div>
                <div className="text-sm mt-1 text-[#FFFFFF]">
                  {selectedServer.internalId}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A1A1AA]">Current State</div>
                <div className="text-sm mt-1">
                  {selectedServer.state === "running" && (
                    <Badge variant="success">{selectedServer.state}</Badge>
                  )}
                  {selectedServer.state === "stopped" && (
                    <Badge variant="info">{selectedServer.state}</Badge>
                  )}
                  {["creating", "installing", "updating", "deleting"].includes(
                    selectedServer.state,
                  ) && <Badge variant="warning">{selectedServer.state}</Badge>}
                  {["starting", "stopping"].includes(selectedServer.state) && (
                    <Badge variant="warning">{selectedServer.state}</Badge>
                  )}
                  {["install_failed", "update_failed", "errored"].includes(
                    selectedServer.state,
                  ) && <Badge variant="danger">{selectedServer.state}</Badge>}
                  {["installed"].includes(selectedServer.state) && (
                    <Badge variant="info">{selectedServer.state}</Badge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-900">
                <div className="text-xs font-medium text-white mb-3">
                  Resources
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Memory</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.memoryMiB} MiB
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Disk</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.diskMiB} MiB
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">CPU</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.cpuPercent}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-900">
                <div className="text-xs font-medium text-[#FFFFFF] mb-3">
                  Relationships
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Node</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.node?.name} ({selectedServer.node?.fqdn})
                    </div>
                  </div>
                  {/* Show region information if available */}
                  {region && (
                    <div>
                      <div className="text-xs text-[#A1A1AA]">Region</div>
                      <div className="text-sm mt-1 text-[#FFFFFF]">
                        {region.name} ({region.identifier})
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Unit</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.unit?.name} (
                      {selectedServer.unit?.shortName})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">User</div>
                    <div className="text-sm mt-1 text-[#FFFFFF]">
                      {selectedServer.user?.username}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#232325]">
                <div className="text-xs text-[#A1A1AA]">Created At</div>
                <div className="text-sm mt-1 text-[#FFFFFF]">
                  {new Date(selectedServer.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A1A1AA]">Updated At</div>
                <div className="text-sm mt-1 text-[#FFFFFF]">
                  {new Date(selectedServer.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-950">
        <div className="p-6">
          <div className="text-red-600 text-xs">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card min-h-screen bg-stone-950">
      <div>
        <div className="transition-all duration-200 ease-in-out">
          {view === "list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-[#FFFFFF]">
                    Servers
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage all servers running on your nodes.
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant="secondary"
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                  Create Server
                </Button>
              </div>

              <div className="space-y-1.5">
                {servers.map((server) => (
                  <div className="block bg-stone-950 rounded-md border border-stone-900 overflow-hidden cursor-pointer w-full">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-3 flex-grow flex items-center justify-between transition-colors duration-150">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${server.status?.status?.state === "running"
                                ? "bg-[#10B981]"
                                : "bg-[#9CA3AF]"
                                }`}
                            ></div>
                          </div>
                          <div className="min-w-0">
                            <button
                              className="text-xs font-medium text-[#FFFFFF] truncate"
                              key={server.id}
                              onClick={() => {
                                setSelectedServer(server);
                                setEditFormData({
                                  name: server.name,
                                  unitId: server.unitId,
                                  memoryMiB: server.memoryMiB,
                                  diskMiB: server.diskMiB,
                                  cpuPercent: server.cpuPercent,
                                });
                                setFormError(null);
                                setIsEditModalOpen(true);
                              }}
                            >
                              {server.name}
                            </button>
                            <div className="text-[11px] text-[#9CA3AF] flex items-center">
                              <span>{server.status?.status?.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="flex space-x-3">
                            <div className="text-[11px] text-[#9CA3AF]">
                              <span className="font-medium text-[#FFFFFF]">
                                {server.cpuPercent}%
                              </span>{" "}
                              CPU limit
                            </div>
                            <div className="text-[11px] text-[#9CA3AF]">
                              <span className="font-medium text-[#FFFFFF]">
                                {(server.memoryMiB / 1024).toFixed(2)} GiB
                              </span>{" "}
                              Memory limit
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setView("view");
                            }}
                          >
                            <ChevronRightIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {servers.length === 0 && (
                  <div className="text-center py-6 bg-stone-950 rounded-md border border-stone-900">
                    <p className="text-xs text-gray-500">No servers found</p>
                  </div>
                )}
              </div>

              {/* Modal for Create Server */}
              <FormModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                  setIsCreateModalOpen(false);
                  setFormError(null);
                  setCreateFormData({
                    name: "",
                    nodeId: "",
                    unitId: "",
                    userId: "",
                    allocationId: "",
                    memoryMiB: 1024,
                    diskMiB: 10240,
                    cpuPercent: 100,
                    regionId: "",
                  });
                }}
                title="Create Server"
                onSubmit={handleCreate}
                isSubmitting={loading}
                error={formError}
                submitText="Create Server"
                cancelText="Cancel"
              >
                {renderCreateForm()}
              </FormModal>
            </div>
          )}

          {view === "create" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => {
                    setView("list");
                    setSelectedServer(null);
                  }}
                  variant="secondary"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-lg font-semibold text-[#FFFFFF]">
                    Create Server
                  </h1>
                </div>
              </div>
              {renderCreateForm()}
            </div>
          )}

          <FormModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setFormError(null);
            }}
            title={
              selectedServer
                ? `Edit Server: ${selectedServer.name}`
                : "Edit Server"
            }
            onSubmit={handleEdit}
            isSubmitting={updating}
            error={formError}
            submitText={updating ? "Updating..." : "Update Server"}
            cancelText="Cancel"
          >
            {renderEditForm()}
          </FormModal>

          {view === "view" && renderServerView()}
        </div>
      </div>
    </div>
  );
};

export default AdminServersPage;
