import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { ServerIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, Button } from "../../components/UI";

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

export default function Home() {
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("servers");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (error) {
    throw new Error(error);
  }

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
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
                  No servers found
                </h2>
                <p className="text-[#9CA3AF] text-center max-w-md mb-6">
                  You don't have any active servers yet. To create a new server, please contact your administrator.
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
              Server Overview
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
    </div>
  );
}
