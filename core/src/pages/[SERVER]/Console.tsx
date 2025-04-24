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

  const wsRef = useRef<WebSocket | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

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

    // Close any existing WebSocket connection before creating a new one
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
            setLiveStats({
              cpuPercent: message.data.cpu_percent || 0,
              memory: message.data.memory || { used: 0, limit: 0, percent: 0 },
              network: message.data.network
                ? {
                    rxBytes: message.data.network.rx_bytes,
                    txBytes: message.data.network.tx_bytes,
                  }
                : { rxBytes: 0, txBytes: 0 },
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

      // Log successful send
      setMessages((prev) => [
        ...prev,
        "\x1b[32m$ \x1b[0m" + command + "\x1b[0m",
      ]);
      setCommand("");
    } catch (error) {
      // Log any errors
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

  if (error) {
    throw new Error(error);
  }

  if (!server) {
    navigate("/unauthorized");
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
    <div className="bg-[#0E0E0F] min-h-screen p-6">
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
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-400 bg-[#1E1E20] border border-[#232325] rounded-md"
                >
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate max-w-md">{error}</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Indicators */}
              <div className="text-gray-400 px-4 py-1.5 rounded-md bg-[#0E0E0F] border border-[#1E1E20] flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="w-1 h-4 bg-[#313135] rounded mr-2"></div>
                  <div className="text-xs">
                    <span className="block text-gray-400">IP</span>
                    <span className="block text-white font-medium">{ip}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-4 bg-gray-600 rounded mr-2"></div>
                  <div className="text-xs">
                    <span className="block text-gray-400">CPU</span>
                    <span className="block text-white font-medium">
                      {liveStats.cpuPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-4 bg-gray-600 rounded mr-2"></div>
                  <div className="text-xs">
                    <span className="block text-gray-400">RAM</span>
                    <span className="block text-white font-medium">
                      {formatBytes(liveStats.memory.used)} /{" "}
                      {formatBytes(liveStats.memory.limit)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-4 bg-gray-600 rounded mr-2"></div>
                  <div className="text-xs">
                    <span className="block text-gray-400">STORAGE</span>
                    <span className="block text-white font-medium">
                      {formatBytes((server?.diskMiB || 0) * 1024 * 1024)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-4 bg-gray-600 rounded mr-2"></div>
                  <div className="text-xs">
                    <span className="block text-gray-400">NETWORK</span>
                    <span className="block text-white font-medium">
                      {formatBytes(liveStats.network.rxBytes)} /{" "}
                      {formatBytes(liveStats.network.txBytes)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePowerAction("start")}
                  disabled={powerLoading || isServerActive}
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label="Start Server"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePowerAction("restart")}
                  disabled={powerLoading || !isServerActive}
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label="Restart Server"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePowerAction("stop")}
                  disabled={powerLoading || !isServerActive}
                  aria-label="Stop Server"
                  className={`rounded-md flex items-center justify-center w-9 h-9 bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Console output */}
        <div className="flex-1 flex flex-col bg-[#0E0E0F] border border-[#1E1E20] rounded-lg overflow-hidden">
          <div
            ref={consoleRef}
            className="min-h-screen flex-1 p-4 font-mono text-xs text-white bg-[#0E0E0F] overflow-auto"
            style={{
              height: "100%",
              maxHeight: "425px",
              minHeight: "425px",
              backgroundImage:
                "radial-gradient(circle at 15px 15px, rgba(49, 49, 53, 0.3) 2px, transparent 0), radial-gradient(circle at 15px 15px, rgba(49, 49, 53, 0.3) 2px, transparent 0)",
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
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label="Start Server"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePowerAction("restart")}
                    disabled={powerLoading || !isServerActive}
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label="Restart Server"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePowerAction("stop")}
                    disabled={powerLoading || !isServerActive}
                    aria-label="Stop Server"
                    className={`flex items-center justify-center w-9 h-9 rounded-md bg-[#0E0E0F] hover:bg-[#1E1E20] text-white border border-[#1E1E20] focus:ring-[#232325] ${!isServerActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
          <div className="border-t border-[#1E1E20] p-3 bg-[#0E0E0F]">
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
                className="flex-1 rounded-l-md px-3 py-2 bg-[#0E0E0F] text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#232325] border-y border-l border-[#1E1E20]"
              />
              <button
                type="submit"
                disabled={!connected || !isServerActive || !command.trim()}
                className="px-3 py-2 rounded-r-md bg-[#1E1E20] text-white border border-[#1E1E20] hover:bg-[#232325] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
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
