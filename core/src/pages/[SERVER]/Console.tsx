import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SendIcon,
  Play,
  Square,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import AnsiParser from "../../components/AnsiParser";
import { motion } from "framer-motion";
import { CommandLineIcon } from "@heroicons/react/24/solid";
import { Badge } from "@/components/UI";
import { Card, CardContent } from "@/components/ui/card";
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
  memory_limit: number;
  cpu_limit: number;
  startup_command: string;
  allocation: string;
}

interface ServerDetails {
  id: string;
  internalId: string;
  name: string;
  memoryMiB: number;
  diskMiB: number;
  cpuPercent: number;
  state: string;
  createdAt: string;
  validationToken: string;
  node: Node;
  status: ServerStatus;
}

interface ConsoleMessage {
  event: string;
  data: {
    message?: string;
    status?: string;
    state?: string;
    logs?: string[];
    action?: string;
    cpu_percent?: number;
    memory?: {
      used: number;
      limit: number;
      percent: number;
    };
    network?: {
      rx_bytes: number;
      tx_bytes: number;
    };
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
          {dataType === "cpu" ? "CPU Usage" :
            dataType === "memory" ? "Memory Usage" :
              dataType === "network" ? "Network I/O" : "Usage"}
        </div>
        <div className="flex items-center">
          <div
            className={`h-2 w-2 rounded-full mr-2 ${dataType === "cpu" ? "bg-blue-500" :
              dataType === "memory" ? "bg-green-500" :
                dataType === "network" ? "bg-purple-500" : "bg-gray-500"
              }`}
          />
          <span className="text-white">
            {dataType === "network"
              ? formatBytes(payload[0].value) + "/s"
              : `${payload[0].value.toFixed(1)}%`}
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

const ServerConsolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [connected, setConnected] = useState(false);
  const [powerLoading, setPowerLoading] = useState(false);
  const [liveStats, setLiveStats] = useState<{
    cpuPercent: number;
    memory: { used: number; limit: number; percent: number };
    network: { rxBytes: number; txBytes: number };
  }>({
    cpuPercent: 0,
    memory: { used: 0, limit: 0, percent: 0 },
    network: { rxBytes: 0, txBytes: 0 },
  });

  // Stats history for charts
  const [statsHistory, setStatsHistory] = useState<{
    cpu: Array<{ time: number; value: number }>;
    memory: Array<{ time: number; value: number }>;
    network: Array<{ time: number; value: number }>;
  }>({
    cpu: Array(24).fill(0).map((_, i) => ({ time: Date.now() - (23 - i) * 5000, value: 0 })),
    memory: Array(24).fill(0).map((_, i) => ({ time: Date.now() - (23 - i) * 5000, value: 0 })),
    network: Array(24).fill(0).map((_, i) => ({ time: Date.now() - (23 - i) * 5000, value: 0 })),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const prevNetworkRxRef = useRef<number>(0);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/servers/${id}?include[node]=true&include[status]=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) throw new Error("Failed to fetch server");
        const data = await response.json();

        if (!data.node?.fqdn || !data.node?.port) {
          throw new Error("Server node information is missing");
        }

        setServer(data);
        initWebSocket(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchServer();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  const initWebSocket = (serverData: ServerDetails) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://${serverData.node.fqdn}:${serverData.node.port}?server=${serverData.internalId}&token=${serverData.validationToken}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const message: ConsoleMessage = JSON.parse(event.data);

      switch (message.event) {
        case "console_output":
          if (typeof message.data.message === "string") {
            // @ts-ignore
            setMessages((prev) => [...prev, message.data.message]);
          }
          break;

        case "auth_success":
          if (message.data.logs) {
            setMessages(message.data.logs.map((log) => log));
          }
          break;

        case "stats":
          if (message.data.cpu_percent !== undefined) {
            const newStats = {
              cpuPercent: message.data.cpu_percent || 0,
              memory: message.data.memory || { used: 0, limit: 0, percent: 0 },
              network: message.data.network
                ? {
                  rxBytes: message.data.network.rx_bytes,
                  txBytes: message.data.network.tx_bytes,
                }
                : { rxBytes: 0, txBytes: 0 },
            };

            setLiveStats(newStats);

            // Calculate network rate (bytes/s) by comparing with previous value
            const currentRxBytes = newStats.network.rxBytes;
            const networkRate = prevNetworkRxRef.current > 0
              ? Math.max(0, currentRxBytes - prevNetworkRxRef.current)
              : 0;
            prevNetworkRxRef.current = currentRxBytes;

            // Update stats history for charts
            const now = Date.now();
            setStatsHistory(prev => {
              // Update CPU history
              const newCpuHistory = [...prev.cpu];
              newCpuHistory.push({ time: now, value: newStats.cpuPercent });
              if (newCpuHistory.length > 24) newCpuHistory.shift();

              // Update Memory history
              const newMemoryHistory = [...prev.memory];
              newMemoryHistory.push({ time: now, value: newStats.memory.percent });
              if (newMemoryHistory.length > 24) newMemoryHistory.shift();

              // Update Network history
              const newNetworkHistory = [...prev.network];
              newNetworkHistory.push({ time: now, value: networkRate });
              if (newNetworkHistory.length > 24) newNetworkHistory.shift();

              return {
                cpu: newCpuHistory,
                memory: newMemoryHistory,
                network: newNetworkHistory
              };
            });
          }

          if (message.data.state) {
            setServer((prev) =>
              prev
                ? { ...prev, state: message.data.state || prev.state }
                : null,
            );
          }
          break;

        case "power_status":
          if (message.data.status !== undefined) {
            // @ts-ignore
            setMessages((prev) => [...prev, message.data.status.toString()]);
          }
          setPowerLoading(false);
          break;

        case "error":
          const errorMsg = message.data.message || "An unknown error occurred";
          setError(errorMsg);
          setMessages((prev) => [...prev, `Error: ${errorMsg}`]);
          setPowerLoading(false);
          break;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          initWebSocket(serverData);
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("We're having trouble connecting to your server...");
    };
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !wsRef.current) {
      return;
    }

    if (!isServerActive) {
      setMessages((prev) => [
        ...prev,
        "\x1b[33m[System] Cannot send command - server is not running\x1b[0m",
      ]);
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          event: "send_command",
          data: command,
        }),
      );

      setMessages((prev) => [
        ...prev,
        "\x1b[32m$ \x1b[0m" + command + "\x1b[0m",
      ]);
      setCommand("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        `\x1b[31m[System] Failed to send command: ${error}\x1b[0m`,
      ]);
    }
  };

  const handlePowerAction = async (action: "start" | "stop" | "restart") => {
    if (!server || powerLoading || !wsRef.current) return;

    setPowerLoading(true);
    try {
      wsRef.current.send(
        JSON.stringify({
          event: "power_action",
          data: { action },
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} server`,
      );
      setPowerLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Did this because the websocket would cause the error boundary error and just fuck the page so dont touch this
  if (error) {
    setTimeout(() => {
      setError(null);
    }, 2000);
  }

  if (!server) {
    navigate("/unauthorized");
    return null;
  }

  const isServerActive = server?.state?.toLowerCase() === "running";

  let parsed: { fqdn: string; port: number } | null = null;

  try {
    const allocation = server?.status?.allocation;
    if (allocation) {
      parsed = JSON.parse(allocation);
    }
  } catch (error) {
    console.error("Failed to parse allocation:", error);
  }

  const ip = server?.node && parsed ? `${server.node.fqdn}:${parsed.port}` : "";

  return (
    <div className="card bg-stone-950 min-h-screen p-6">
      <div className="flex flex-col h-full max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-400 mb-4">
            <button
              onClick={() => navigate("/servers")}
              className="transition-colors duration-100"
            >
              Servers
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <button
              onClick={() => navigate(`/servers/${id}`)}
              className="transition-colors duration-100"
            >
              {server?.name}
            </button>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-white font-medium">Console</span>
          </div>

          {/* Title and Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white mr-4">Console</h1>
              <span className="text-gray-400 text-sm">{ip}</span>

              <Badge
                variant={
                  server?.state?.toLowerCase() === "running"
                    ? "success"
                    : server?.state?.toLowerCase() === "stopped"
                      ? "danger"
                      : "default"
                }
                className="text-sm ml-3"
              >
                {server?.state}
              </Badge>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-400 bg-stone-950 border border-stone-900 rounded-md"
                >
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate max-w-md">{error}</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePowerAction("start")}
                  disabled={powerLoading || isServerActive}
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label="Start Server"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePowerAction("restart")}
                  disabled={powerLoading || !isServerActive}
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label="Restart Server"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePowerAction("stop")}
                  disabled={powerLoading || !isServerActive}
                  aria-label="Stop Server"
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Usage Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* CPU Usage Chart */}
          <Card className="bg-stone-950 border border-stone-900 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-medium text-[#9CA3AF]">
                  CPU Usage
                </div>
                <div className="text-xs font-medium text-[#3B82F6]">
                  {isServerActive ? `${liveStats.cpuPercent.toFixed(1)}%` : '-'}
                </div>
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statsHistory.cpu}>
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
                      content={<CustomTooltip active={true} payload={[]} label={""} dataType="cpu" />}
                      cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3B82F6', stroke: '#1E40AF' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!isServerActive && (
                <div className="text-center text-xs text-[#9CA3AF] mt-1">
                  Server offline
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory Usage Chart */}
          <Card className="bg-stone-950 border border-stone-900 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-medium text-[#9CA3AF]">
                  Memory Usage
                </div>
                <div className="text-xs font-medium text-[#10B981]">
                  {isServerActive ? `${formatBytes(liveStats.memory.used)}` : '-'}
                </div>
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statsHistory.memory}>
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
                      content={<CustomTooltip active={true} payload={[]} label={""} dataType="memory" />}
                      cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#10B981', stroke: '#065F46' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!isServerActive && (
                <div className="text-center text-xs text-[#9CA3AF] mt-1">
                  Server offline
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network I/O Chart */}
          <Card className="bg-stone-950 border border-stone-900 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-medium text-[#9CA3AF]">
                  Network I/O
                </div>
                <div className="text-xs font-medium text-[#8B5CF6]">
                  {isServerActive ? `${formatBytes(statsHistory.network[statsHistory.network.length - 1]?.value || 0)}/s` : '-'}
                </div>
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statsHistory.network}>
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
                      hide
                    />
                    <Tooltip
                      content={<CustomTooltip active={true} payload={[]} label={""} dataType="network" />}
                      cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#8B5CF6', stroke: '#5B21B6' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!isServerActive && (
                <div className="text-center text-xs text-[#9CA3AF] mt-1">
                  Server offline
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Console output */}
        <div className="flex-1 flex flex-col bg-stone-950 border border-stone-900 rounded-lg overflow-hidden">
          <div
            ref={consoleRef}
            className="min-h-screen flex-1 p-4 font-mono text-xs text-white bg-stone-950 overflow-auto"
            style={{
              height: "80%",
              maxHeight: "425px",
              minHeight: "425px",
              backgroundSize: "30px 30px",
            }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-24">
                <div className="mb-4">
                  <CommandLineIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  No console output yet...
                </h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  Start the server to view console output.
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePowerAction("start")}
                    disabled={powerLoading || isServerActive}
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label="Start Server"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePowerAction("restart")}
                    disabled={powerLoading || !isServerActive}
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label="Restart Server"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePowerAction("stop")}
                    disabled={powerLoading || !isServerActive}
                    aria-label="Stop Server"
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-stone-950 hover:bg-stone-900 text-white border border-stone-900 focus:ring-stone-900 ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index}>
                  <AnsiParser text={msg} />
                </div>
              ))
            )}
          </div>

          {/* Command input */}
          <div className="border-t border-stone-900 p-3 bg-stone-950">
            <form onSubmit={sendCommand} className="flex">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={!connected || !isServerActive}
                placeholder={
                  !connected
                    ? "Disconnected from server..."
                    : !isServerActive
                      ? "Start server to enable console"
                      : "Type command..."
                }
                className="flex-1 rounded-l-md px-3 py-2 bg-stone-950 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-stone-900 border-y border-l border-stone-900"
              />
              <button
                type="submit"
                disabled={!connected || !isServerActive || !command.trim()}
                className="px-3 py-2 rounded-r-md bg-stone-950 text-white border border-stone-900 hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerConsolePage;
