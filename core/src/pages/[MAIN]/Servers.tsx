import { Link } from "react-router-dom";
import { ChevronRightIcon, FolderIcon } from "@heroicons/react/24/solid";
import { ServerIcon, PlusIcon, BoltIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useProjects } from "../../contexts/ProjectContext";
import { Alert, Button, FormDialog } from "../../components/UI";

interface Node {
  id: string;
  fqdn: string;
  port: number;
  isOnline: boolean;
}

interface ServerStatus {
  state: string;
  status: any;
}

interface Server {
  id: string;
  name: string;
  internalId: string;
  state: string;
  cpuPercent: number;
  memoryMiB: number;
  projectId: string;
  node: Node;
  status: ServerStatus;
  userId: string;
}

// Server Move Project Dialog
interface ServerMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server | null;
  onMove: (projectId: string) => Promise<void>;
  projects: any[];
  currentProjectId: string | null;
  isSubmitting: boolean;
  error: string | null;
}

const ServerMoveDialog: React.FC<ServerMoveDialogProps> = ({
  isOpen,
  onClose,
  server,
  onMove,
  projects,
  currentProjectId,
  isSubmitting,
  error,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (isOpen && projects.length > 0) {
      // Default to the first project that's not the current one
      const otherProject = projects.find((p) => p.id !== currentProjectId);
      if (otherProject) {
        setSelectedProjectId(otherProject.id);
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [isOpen, projects, currentProjectId]);

  if (!isOpen || !server) return null;

  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Move Server to Project"
      error={error}
      submitText={isSubmitting ? "Moving..." : "Move Server"}
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        onMove(selectedProjectId);
      }}
    >
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-4">
          Move <span className="font-medium text-gray-300">{server.name}</span>{" "}
          to another project
        </p>

        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#111111] border border-[#333333] rounded-md text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#444444]"
          >
            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
                disabled={project.id === server.projectId}
              >
                {project.name}{" "}
                {project.id === server.projectId ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </FormDialog>
  );
};

export default function Home() {
  const { currentProject, projects, moveServerToProject } = useProjects();
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("servers");
  const [isMovingServer, setIsMovingServer] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (error) {
    throw new Error(error);
  }

  useEffect(() => {
    fetchServers();
  }, []);

  // Filter servers by current project
  useEffect(() => {
    // Show all servers regardless of project
    setFilteredServers(servers);
  }, [servers]);

  const stats = {
    total: filteredServers.length,
    online: filteredServers.filter((s) => s.status?.status?.state === "running")
      .length,
    offline: filteredServers.filter(
      (s) => s.status?.status?.state !== "running",
    ).length,
  };

  const handleMoveServer = async (projectId: string) => {
    if (!selectedServer) return;

    try {
      setMoveError(null);
      setIsSubmitting(true);
      await moveServerToProject(selectedServer.id, projectId);

      // Update the local server list
      setServers((prevServers) =>
        prevServers.map((server) =>
          server.id === selectedServer.id ? { ...server, projectId } : server,
        ),
      );

      setIsMovingServer(false);
      setSelectedServer(null);
      setSuccessMessage(`Server moved to project successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to move server:", error);
      setMoveError(
        error instanceof Error ? error.message : "Failed to move server",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" message={`Failed to load servers: ${error}`} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0E0E0F] min-h-screen">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#FFFFFF]">Servers</h1>
            {currentProject && (
              <p className="text-sm text-[#9CA3AF]">
                {currentProject.isDefault
                  ? `Showing all servers in the Default project`
                  : `Showing servers in ${currentProject.name} project`}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
          >
            Deploy Server
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        {/* Tabs */}
        <div className="mb-4 flex space-x-1">
          <Button
            onClick={() => setActiveTab("servers")}
            variant={activeTab === "servers" ? "primary" : "secondary"}
            className={activeTab === "servers" ? "font-bold" : "font-normal"}
          >
            Servers ({filteredServers.length})
          </Button>
          <Button
            onClick={() => setActiveTab("overview")}
            variant={activeTab === "overview" ? "primary" : "secondary"}
            className={activeTab === "overview" ? "font-bold" : "font-normal"}
          >
            Overview
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "servers" && (
          <div>
            {filteredServers.length > 0 ? (
              <div className="space-y-1.5">
                {filteredServers.map((server) => (
                  <div
                    key={server.id}
                    className="block bg-[#0E0E0F] rounded-md border border-[#1E1E20] overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/servers/${server.id}/console`}
                        className="px-3 py-3 flex-grow flex items-center justify-between transition-colors duration-150"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                server.status?.status?.state === "running"
                                  ? "bg-[#10B981]"
                                  : "bg-[#9CA3AF]"
                              }`}
                            ></div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#FFFFFF] truncate">
                              {server.name}
                            </div>
                            <div className="text-[11px] text-[#9CA3AF] flex items-center">
                              <span>{server.status?.status?.id}</span>
                              {server.projectId !== currentProject?.id && (
                                <>
                                  <span className="flex items-center">
                                    <BoltIcon className="w-3 h-3 mr-1" />
                                    {projects.find(
                                      (p) => p.id === server.projectId,
                                    )?.name || "Unknown Project"}
                                  </span>
                                </>
                              )}
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
                          <ChevronRightIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        </div>
                      </Link>

                      {/* Project menu button - only show if not in default project or if there are multiple projects */}
                      {projects.length > 1 && (
                        <button
                          onClick={() => {
                            setSelectedServer(server);
                            setMoveError(null);
                            setIsMovingServer(true);
                          }}
                          className="h-full px-3 border-l border-[#1E1E20] text-[#9CA3AF] cursor-pointer hover:text-[#FFFFFF] transition-colors duration-150"
                          title="Move to different project"
                        >
                          <FolderIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-[#0E0E0F] rounded-lg border border-[#1E1E20]">
                <div className="w-32 h-32 mb-6">
                  <ServerIcon className="w-full h-full text-[#9CA3AF]" />
                </div>
                <h2 className="text-xl font-semibold text-[#FFFFFF] mb-2">
                  {currentProject?.isDefault
                    ? "No servers found"
                    : `No servers in ${currentProject?.name}`}
                </h2>
                <p className="text-[#9CA3AF] text-center max-w-md mb-6">
                  {currentProject?.isDefault
                    ? "You don't have any active servers yet. To create a new server, please contact your administrator."
                    : "There are no servers in this project yet. You can move servers here from other projects."}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<PlusIcon className="h-4 w-4" />}
                >
                  Deploy Server
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="bg-[#0E0E0F] rounded-md border border-[#1E1E20] p-6">
            <h2 className="text-lg font-medium text-[#FFFFFF] mb-4">
              {currentProject
                ? `${currentProject.name} Project Overview`
                : "Server Overview"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-[#1E1E20] rounded-md p-4">
                <div className="text-[#9CA3AF] text-sm mb-1">Total Servers</div>
                <div className="text-2xl font-medium text-[#FFFFFF]">
                  {stats.total}
                </div>
              </div>
              <div className="border border-[#1E1E20] rounded-md p-4">
                <div className="text-[#9CA3AF] text-sm mb-1">Online</div>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-[#10B981] mr-2"></div>
                  <div className="text-2xl font-medium text-[#FFFFFF]">
                    {stats.online}
                  </div>
                </div>
              </div>
              <div className="border border-[#1E1E20] rounded-md p-4">
                <div className="text-[#9CA3AF] text-sm mb-1">Offline</div>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-[#9CA3AF] mr-2"></div>
                  <div className="text-2xl font-medium text-[#FFFFFF]">
                    {stats.offline}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Move Server Dialog */}
      <ServerMoveDialog
        isOpen={isMovingServer}
        onClose={() => {
          setIsMovingServer(false);
          setSelectedServer(null);
          setMoveError(null);
        }}
        server={selectedServer}
        onMove={handleMoveServer}
        projects={projects}
        currentProjectId={currentProject?.id || null}
        isSubmitting={isSubmitting}
        error={moveError}
      />
    </div>
  );
}
