import { Link } from "react-router-dom";
import { ServerIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, Badge, Button } from "../../components/UI";
import {
  Card,
  CardContent,
} from "../../components/ui/card";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
  isOnline: boolean;
  lastChecked: string;
}

interface ServerStatus {
  docker_id: string;
  name: string;
  image: string;
  state: string;
  status: any;
  memory_limit: number;
  cpu_limit: number;
  startup_command: string;
  allocation: string;
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
  validationToken?: string;
}

interface LiveStats {
  cpuPercent: number;
  memory: {
    used: number;
    limit: number;
    percent: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
  };
}

const formatBytes = (bytes: number | undefined, decimals = 2): string => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label, dataType }: { active: boolean; payload: any; label: any; dataType: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-950 border border-stone-900 rounded-md shadow-lg p-3 text-xs">
        <div className="font-medium text-white mb-1">
          {dataType === "cpu" ? "CPU Usage" : "Memory Usage"}
        </div>
        <div className="flex items-center">
          <div
            className={`h-2 w-2 rounded-full mr-2 ${dataType === "cpu" ? "bg-blue-500" : "bg-green-500"}`}
          />
          <span className="text-white">
            {payload[0].value.toFixed(1)}%
          </span>
        </div>
        <div className="text-stone-400 text-[10px] mt-1">
          {new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("servers");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverStats, setServerStats] = useState<Record<string, LiveStats>>({});
  const [statsHistory, setStatsHistory] = useState<Record<string, Array<{ time: number, cpu: number, memory: number }>>>({});
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const wsRefs = useRef<Record<string, WebSocket>>({});

  if (error) {
    throw new Error(error);
  }

  useEffect(() => {
    fetchServers();
    return () => {
      // Clean up WebSocket connections when component unmounts
      Object.values(wsRefs.current).forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    };
  }, []);

  useEffect(() => {
    setFilteredServers(servers);

    // Initialize WebSocket connections for each server
    servers.forEach(server => {
      if (server.node && server.internalId && server.validationToken) {
        initWebSocket(server);
      }
    });
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
      const response = await fetch("/api/servers?include[node]=true&include[status]=true", {
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

  const initWebSocket = (server: Server) => {
    // Skip if already connected
    if (wsRefs.current[server.id] && wsRefs.current[server.id].readyState === WebSocket.OPEN) {
      return;
    }

    // Initialize stats history for this server if it doesn't exist
    if (!statsHistory[server.id]) {
      setStatsHistory(prev => ({
        ...prev,
        [server.id]: Array(24).fill(0).map((_, i) => ({
          time: Date.now() - (23 - i) * 5000, // Create timestamps going back in time
          cpu: 0,
          memory: 0
        }))
      }));
    }

    const wsUrl = `ws://${server.node.fqdn}:${server.node.port}?server=${server.internalId}&token=${server.validationToken}`;

    const ws = new WebSocket(wsUrl);
    wsRefs.current[server.id] = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected for server ${server.id}`);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.event === "stats" && message.data) {
        const { cpu_percent, memory, network } = message.data;

        if (cpu_percent !== undefined) {
          const newStats = {
            cpuPercent: cpu_percent || 0,
            memory: memory || { used: 0, limit: 0, percent: 0 },
            network: network ? {
              rxBytes: network.rx_bytes,
              txBytes: network.tx_bytes,
            } : { rxBytes: 0, txBytes: 0 },
          };

          setServerStats(prev => ({
            ...prev,
            [server.id]: newStats
          }));

          // Update stats history
          setStatsHistory(prev => {
            const history = [...(prev[server.id] || [])];
            history.push({
              time: Date.now(),
              cpu: cpu_percent || 0,
              memory: memory ? memory.percent : 0
            });

            // Keep only the last 24 data points
            if (history.length > 24) {
              history.shift();
            }

            return {
              ...prev,
              [server.id]: history
            };
          });
        }

        if (message.data.state) {
          setServers(prevServers =>
            prevServers.map(s =>
              s.id === server.id ? { ...s, state: message.data.state } : s
            )
          );
        }
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected for server ${server.id}`);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (wsRefs.current[server.id]?.readyState === WebSocket.CLOSED) {
          initWebSocket(server);
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for server ${server.id}:`, error);
    };
  };

  const goToNextServer = () => {
    if (currentServerIndex < filteredServers.length - 1) {
      setCurrentServerIndex(currentServerIndex + 1);
    } else {
      setCurrentServerIndex(0); // Loop back to the first server
    }
  };

  const goToPreviousServer = () => {
    if (currentServerIndex > 0) {
      setCurrentServerIndex(currentServerIndex - 1);
    } else {
      setCurrentServerIndex(filteredServers.length - 1); // Loop to the last server
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
    <div className="card bg-stone-950 min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div>
              <h1 className="text-2xl font-semibold text-[#FFFFFF]">Servers</h1>
              <p className="text-sm text-[#9CA3AF]">Manage your servers</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
          >
            Deploy Server
          </Button>
        </div>

        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

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

        {activeTab === "servers" && (
          <div>
            {filteredServers.length > 0 ? (
              <div className="w-full flex flex-col gap-4">

                {/* Current Server Display */}
                {filteredServers.length > 0 && (
                  (() => {
                    const server = filteredServers[currentServerIndex];
                    const isRunning = server.state?.toLowerCase() === "running";
                    const stats = serverStats[server.id] || {
                      cpuPercent: 0,
                      memory: { used: 0, limit: server.status?.memory_limit || 0, percent: 0 },
                      network: { rxBytes: 0, txBytes: 0 }
                    };
                    const history = statsHistory[server.id] || Array(24).fill(0).map((_, i) => ({
                      time: Date.now() - (23 - i) * 5000,
                      cpu: 0,
                      memory: 0
                    }));

                    return (
                      <div
                        key={server.id}
                        className="bg-stone-950 rounded-lg border border-stone-900 shadow-md overflow-hidden p-6"
                      >
                        <div>
                          <Link
                            to={`/servers/${server.id}/console`}
                            className="block transition-colors duration-150"
                          >
                            {/* Name and Status */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-2xl font-medium text-[#FFFFFF] truncate">
                                {server.name}
                              </div>
                              <Badge
                                variant={
                                  server.state?.toLowerCase() === "running"
                                    ? "success"
                                    : "danger"
                                }
                              >
                                {server.state}
                              </Badge>
                            </div>
                            <div className="text-xs text-[#9CA3AF] mb-2">
                              {(() => {
                                let parsed: { fqdn: string; port: number } | null = null;
                                try {
                                  if (server.status?.allocation) {
                                    parsed = JSON.parse(server.status.allocation);
                                  }
                                } catch (error) { }
                                return server.node && parsed ? `${server.node.fqdn}:${parsed.port}` : "-";
                              })()}
                            </div>
                            <div className="text-xs text-[#9CA3AF] mb-2">
                              #{server.internalId}
                            </div>
                            <div className="text-[11px] text-[#6B7280] mb-2">
                              <span>{server.status?.status?.id}</span>
                            </div>
                          </Link>

                          {/* Resource Usage Charts */}
                          <div className="mt-4 space-y-4">
                            {/* CPU Usage Chart */}
                            <Card className="bg-stone-950 border border-stone-900 overflow-hidden w-full">
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-xs font-medium text-[#9CA3AF]">
                                    CPU Usage
                                  </div>
                                  <div className="text-xs font-medium text-[#3B82F6]">
                                    {isRunning ? `${stats.cpuPercent.toFixed(1)}%` : '-'}
                                  </div>
                                </div>
                                <div className="h-[80px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                      <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        stroke="#4B5563"
                                        tickLine={false}
                                        axisLine={false}
                                        hide
                                      />
                                      <YAxis
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        stroke="#4B5563"
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 100]}
                                        hide
                                      />
                                      <Tooltip
                                        content={<CustomTooltip active={true} payload={[]} label={0} dataType="cpu" />}
                                        cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey="cpu"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#3B82F6', stroke: '#1E40AF' }}
                                        isAnimationActive={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                                {!isRunning && (
                                  <div className="text-center text-xs text-[#9CA3AF] mt-1">
                                    Server offline
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Memory Usage Chart */}
                            <Card className="bg-stone-950 border border-stone-900 overflow-hidden w-full">
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-xs font-medium text-[#9CA3AF]">
                                    Memory Usage
                                  </div>
                                  <div className="text-xs font-medium text-[#10B981]">
                                    {isRunning ? `${formatBytes(stats.memory.used)}` : '-'}
                                  </div>
                                </div>
                                <div className="h-[80px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                      <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        stroke="#4B5563"
                                        tickLine={false}
                                        axisLine={false}
                                        hide
                                      />
                                      <YAxis
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        stroke="#4B5563"
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 100]}
                                        hide
                                      />
                                      <Tooltip
                                        content={<CustomTooltip active={true} payload={[]} label={0} dataType="memory" />}
                                        cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey="memory"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#10B981', stroke: '#065F46' }}
                                        isAnimationActive={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                                {isRunning ? (
                                  <div className="text-center text-xs text-[#9CA3AF] mt-1">
                                    {formatBytes(stats.memory.limit)} limit
                                  </div>
                                ) : (
                                  <div className="text-center text-xs text-[#9CA3AF] mt-1">
                                    Server offline
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                            <div className="flex justify-between items-center mb-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={goToPreviousServer}
                                icon={<ChevronLeftIcon className="h-4 w-4" />}
                                disabled={filteredServers.length <= 1}
                              >
                                Previous
                              </Button>
                              <div className="text-sm text-[#9CA3AF]">
                                Server {currentServerIndex + 1} of {filteredServers.length}
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={goToNextServer}
                                icon={<ChevronRightIcon className="h-4 w-4" />}
                                disabled={filteredServers.length <= 1}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-stone-950 rounded-lg border border-stone-900">
                <div className="w-32 h-32 mb-6">
                  <ServerIcon className="w-full h-full text-[#9CA3AF]" />
                </div>
                <h2 className="text-xl font-semibold text-[#FFFFFF] mb-2">
                  No servers found
                </h2>
                <p className="text-[#9CA3AF] text-center max-w-md mb-6">
                  You don't have any active servers yet. To create a new server,
                  please contact your administrator.
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
          <div className="bg-stone-950 rounded-md border border-stone-900 p-6">
            <h2 className="text-lg font-medium text-[#FFFFFF] mb-4">
              Server Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-900 rounded-md p-4">
                <div className="text-[#9CA3AF] text-sm mb-1">Total Servers</div>
                <div className="text-2xl font-medium text-[#FFFFFF]">
                  {stats.total}
                </div>
              </div>
              <div className="border border-stone-900 rounded-md p-4">
                <div className="text-[#9CA3AF] text-sm mb-1">Online</div>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-[#10B981] mr-2"></div>
                  <div className="text-2xl font-medium text-[#FFFFFF]">
                    {stats.online}
                  </div>
                </div>
              </div>
              <div className="border border-stone-900 rounded-md p-4">
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
