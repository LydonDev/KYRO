import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BaseModal, InputModal, FormModal } from "@/components/ui/modal";
import Editor from "@monaco-editor/react";
import {
  ChevronRightIcon,
  ExclamationCircleIcon,
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FolderPlusIcon,
  ArrowLeftIcon,
  ArchiveBoxIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  ArchiveBoxIcon as PackageIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PhotoIcon,
  MusicalNoteIcon,
  FilmIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Button } from "../../components/UI";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
}

interface ServerDetails {
  id: string;
  internalId: string;
  validationToken: string;
  name: string;
  status?: string;
  state?: string;
  node: Node;
}

interface FileEntry {
  name: string;
  mode: string;
  size: number;
  isFile: boolean;
  isSymlink: boolean;
  modifiedAt: number;
  createdAt: number;
  mime: string;
  hidden?: boolean;
  readonly?: boolean;
  noDelete?: boolean;
  isCargoFile?: boolean;
  customProperties?: Record<string, any>;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface Modal {
  type:
    | "new-folder"
    | "new-file"
    | "file-editor"
    | "compress"
    | "rename"
    | "move"
    | "chmod";
  data?: any;
  loading?: boolean;
}

interface FileTypeInfo {
  icon: React.ElementType;
  canEdit: boolean;
  editor?: "monaco";
  viewable: boolean;
}

const formatBytes = (bytes: number | undefined, decimals = 2): string => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatDate = (date: number): string => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
};

const fileTypes: Record<string, FileTypeInfo> = {
  "text/": {
    icon: DocumentTextIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "application/json": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "application/javascript": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "application/x-yaml": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "text/x-java-properties": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "application/x-java-properties": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "text/plain": {
    icon: DocumentTextIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  ".properties": {
    icon: CodeBracketIcon,
    canEdit: true,
    editor: "monaco",
    viewable: true,
  },
  "image/": { icon: PhotoIcon, canEdit: false, viewable: false },
  "image/png": { icon: PhotoIcon, canEdit: false, viewable: false },
  "image/jpeg": { icon: PhotoIcon, canEdit: false, viewable: false },
  "image/gif": { icon: PhotoIcon, canEdit: false, viewable: false },
  "image/webp": { icon: PhotoIcon, canEdit: false, viewable: false },
  "audio/": { icon: MusicalNoteIcon, canEdit: false, viewable: false },
  "video/": { icon: FilmIcon, canEdit: false, viewable: false },
  "application/zip": { icon: PackageIcon, canEdit: false, viewable: false },
  "application/x-tar": { icon: PackageIcon, canEdit: false, viewable: false },
  "application/x-gzip": { icon: PackageIcon, canEdit: false, viewable: false },
  "application/x-rar-compressed": {
    icon: PackageIcon,
    canEdit: false,
    viewable: false,
  },
  default: { icon: DocumentIcon, canEdit: false, viewable: true },
};

const getFileTypeInfo = (mime: string): FileTypeInfo => {
  if (
    mime.endsWith(".properties") ||
    mime === "text/x-java-properties" ||
    mime === "application/x-java-properties"
  ) {
    return fileTypes[".properties"];
  }

  const fileExtension = mime.split(".").pop()?.toLowerCase();
  if (fileExtension === "properties") {
    return fileTypes[".properties"];
  }

  const match = Object.entries(fileTypes).find(([key]) => mime.startsWith(key));
  return match ? match[1] : fileTypes.default;
};

const canExtractFile = (mime: string): boolean => {
  return [
    "application/zip",
    "application/x-tar",
    "application/x-gzip",
    "application/x-rar-compressed",
  ].includes(mime);
};

const MAX_VIEWABLE_FILE_SIZE = 10 * 1024 * 1024;

const Toast: React.FC<{ toast: Toast }> = ({ toast }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg flex items-center space-x-2 
      ${toast.type === "success" ? "bg-[#0E0E0F] text-[#FFFFFF]" : "bg-[#1E1E20] text-[#EF4444] border border-[#1E1E20]"}`}
  >
    {toast.type === "success" ? (
      <CheckIcon className="w-4 h-4" />
    ) : (
      <ExclamationCircleIcon className="w-4 h-4" />
    )}
    <span className="text-sm font-medium">{toast.message}</span>
  </motion.div>
);

const Checkbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  className?: string;
}> = ({ checked, onChange, className = "" }) => (
  <label className={`inline-flex items-center cursor-pointer ${className}`}>
    <div
      className={`bg-[#1E1E20] w-4 h-4 rounded border transition-colors flex items-center justify-center ${
        checked
          ? "bg-[#1E1E20] border-[#1E1E20]"
          : "border-[#1E1E20] bg-[#1E1E20]"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      {checked && <CheckIcon className="w-3 h-3 text-[#FFFFFF]" />}
    </div>
  </label>
);

const ContextMenu: React.FC<{
  file: FileEntry;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: string) => Promise<void>;
}> = ({ file, position, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);
  const fileType = getFileTypeInfo(file.mime);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
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
          x = Math.max(0, viewport.width - rect.width - 16);
        }

        if (y + rect.height > viewport.height) {
          y = Math.max(0, viewport.height - rect.height - 16);
        }

        setMenuPosition({ x, y });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    const timer = setTimeout(adjustPosition, 10);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, [onClose, position]);

  const isViewable =
    fileType.viewable && fileType.canEdit && file.size < MAX_VIEWABLE_FILE_SIZE;
  const isReadOnly = file.readonly === true;
  const isNoDelete = file.noDelete === true;

  const actions = [
    ...(fileType.canEdit && isViewable
      ? [{ label: "Edit/View", icon: PencilSquareIcon, action: "edit" }]
      : []),
    ...(canExtractFile(file.mime)
      ? [{ label: "Extract", icon: PackageIcon, action: "extract" }]
      : []),
    { label: "Download", icon: ArrowDownTrayIcon, action: "download" },
    { label: "Copy", icon: DocumentDuplicateIcon, action: "copy" },
    {
      label: "Rename",
      icon: PencilSquareIcon,
      action: "rename",
      disabled: isReadOnly || isNoDelete,
    },
    {
      label: "Move",
      icon: ArrowsRightLeftIcon,
      action: "move",
      disabled: isReadOnly || isNoDelete,
    },
    {
      label: "Delete",
      icon: TrashIcon,
      action: "delete",
      destructive: true,
      disabled: isNoDelete,
    },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 w-48 bg-[#0E0E0F] border border-[#1E1E20] rounded-lg py-1"
      style={{ top: menuPosition.y, left: menuPosition.x }}
    >
      {actions.map(({ label, icon: Icon, action, disabled }) => (
        <button
          key={action}
          onClick={() => {
            if (!disabled) {
              onAction(action);
            }
          }}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm text-[#9CA3AF] hover:bg-[#1E1E20]
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}}`}
        >
          <Icon className="w-4 h-4 text-[#9CA3AF]" />
          <span>{label}</span>
        </button>
      ))}
    </motion.div>
  );
};

const FileManager: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [server, setServer] = useState<ServerDetails | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<{
    [key: string]: boolean;
  }>({});

  const [modal, setModal] = useState<Modal | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    file: FileEntry;
    position: { x: number; y: number };
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [search, setSearch] = useState("");
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const currentFullPath = useMemo(() => currentPath.join("/"), [currentPath]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetchServerDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/servers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.message || "Failed to fetch server details";
          throw new Error(errorMessage);
        }

        const serverData = await response.json();
        setServer(serverData);
        setError(null);
      } catch (err) {
        console.error("Error fetching server details:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load server details";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchServerDetails();
  }, [id]);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = Math.random().toString(36);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  const fetchFiles = useCallback(async () => {
    if (!server) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/list/${currentFullPath}?showHidden=${showHidden}`,
        { headers: { Authorization: `Bearer ${server?.validationToken}` } },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message || "Failed to fetch directory contents";
        showToast(errorMessage, "error");
        setFiles([]);
      }

      const data = await response.json();
      setFiles(data.contents || []);
    } catch (err) {
      console.error("Error fetching files:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch files";
      setError(errorMessage);
      showToast(errorMessage, "error");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [server, currentFullPath, showHidden, showToast]);

  const getFileContents = useCallback(
    async (file: FileEntry): Promise<string> => {
      if (!server) return "";

      try {
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/contents/${currentFullPath}/${file.name}`,
          { headers: { Authorization: `Bearer ${server?.validationToken}` } },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.message || `Failed to fetch contents of ${file.name}`;
          throw new Error(errorMessage);
        }

        return await response.text();
      } catch (err) {
        console.error("Error fetching file contents:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to load contents of ${file.name}`;
        showToast(errorMessage, "error");
        return "";
      }
    },
    [server, currentFullPath, showToast],
  );

  const searchFiles = useCallback(
    async (query: string) => {
      if (!server || !query) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/search?query=${encodeURIComponent(query)}&path=${encodeURIComponent(currentFullPath)}&showHidden=${showHidden}`,
          { headers: { Authorization: `Bearer ${server?.validationToken}` } },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.message || "Failed to search files";
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setFiles(data.results || []);
      } catch (err) {
        console.error("Error searching files:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search files";
        setError(errorMessage);
        showToast(errorMessage, "error");
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [server, currentFullPath, showHidden, showToast],
  );

  const handleFileAction = useCallback(
    async (action: string, file: FileEntry) => {
      if (!server) return;

      try {
        switch (action) {
          case "edit": {
            const fileType = getFileTypeInfo(file.mime);
            const canEdit =
              fileType.canEdit || file.name.endsWith(".properties");
            if (!canEdit) {
              showToast("This file type cannot be edited", "error");
              break;
            }
            const content = await getFileContents(file);
            setModal({ type: "file-editor", data: { file, content } });
            break;
          }

          case "extract": {
            setOperationLoading((prev) => ({ ...prev, extract: true }));
            const response = await fetch(
              `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/extract/${currentFullPath}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${server?.validationToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ file: file.name }),
              },
            );

            if (!response.ok) throw new Error("Failed to extract archive");
            showToast(`Extracted ${file.name}`);
            await fetchFiles();
            setOperationLoading((prev) => ({ ...prev, extract: false }));
            break;
          }

          case "delete": {
            if (file.noDelete) {
              showToast(`Cannot delete protected file: ${file.name}`, "error");
              break;
            }

            setOperationLoading((prev) => ({ ...prev, delete: true }));
            const response = await fetch(
              `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/delete/${currentFullPath}/${file.name}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${server?.validationToken}` },
              },
            );

            if (!response.ok) throw new Error("Failed to delete file");
            showToast(`Deleted ${file.name}`);
            await fetchFiles();
            setOperationLoading((prev) => ({ ...prev, delete: false }));
            break;
          }

          case "download": {
            const downloadUrl = `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/download/${currentFullPath}/${file.name}`;
            const response = await fetch(downloadUrl, {
              headers: { Authorization: `Bearer ${server?.validationToken}` },
            });

            if (!response.ok) {
              throw new Error("Failed to download file");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            break;
          }

          case "rename": {
            if (file.readonly || file.noDelete) {
              showToast(`Cannot rename protected file: ${file.name}`, "error");
              break;
            }

            setModal({ type: "rename", data: { file } });
            break;
          }

          case "move": {
            if (file.readonly || file.noDelete) {
              showToast(`Cannot move protected file: ${file.name}`, "error");
              break;
            }

            setModal({ type: "move", data: { file } });
            break;
          }

          case "copy": {
            setModal({ type: "move", data: { file, isCopy: true } });
            break;
          }
        }
      } catch (err) {
        showToast(`Failed to ${action} ${file.name}`, "error");
      } finally {
        setContextMenu(null);
      }
    },
    [server, currentFullPath, getFileContents, fetchFiles, showToast],
  );

  const handleCreateFile = useCallback(
    async (name: string) => {
      if (!server) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/write/${currentFullPath}/${name}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${server?.validationToken}`,
              "Content-Type": "application/octet-stream",
            },
            body: "",
          },
        );

        if (!response.ok) throw new Error("Failed to create file");

        showToast(`Created file ${name}`);
        setModal(null);
        await fetchFiles();
      } catch (err) {
        showToast("Failed to create file", "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!server) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/create-directory/${currentFullPath}/${name}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${server?.validationToken}` },
          },
        );

        if (!response.ok) throw new Error("Failed to create folder");

        showToast(`Created folder ${name}`);
        setModal(null);
        await fetchFiles();
      } catch (err) {
        showToast("Failed to create folder", "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleRenameFile = useCallback(
    async (file: FileEntry, newName: string) => {
      if (!server) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const oldPath = `${currentFullPath}/${file.name}`;
        const newPath = `${currentFullPath}/${newName}`;

        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/rename`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${server?.validationToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ from: oldPath, to: newPath }),
          },
        );

        if (!response.ok) throw new Error("Failed to rename file");

        showToast(`Renamed ${file.name} to ${newName}`);
        setModal(null);
        await fetchFiles();
      } catch (err) {
        showToast("Failed to rename file", "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleMoveFile = useCallback(
    async (file: FileEntry, targetPath: string, isCopy: boolean = false) => {
      if (!server) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const fromPath = `${currentFullPath}/${file.name}`;
        const toPath = `${targetPath}/${file.name}`;

        if (isCopy) {
          const response = await fetch(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/copy`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${server?.validationToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ from: fromPath, to: toPath }),
            },
          );

          if (!response.ok) throw new Error("Failed to copy file");
          showToast(`Copied ${file.name} to ${targetPath}`);
        } else {
          const response = await fetch(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/rename`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${server?.validationToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ from: fromPath, to: toPath }),
            },
          );

          if (!response.ok) throw new Error("Failed to move file");
          showToast(`Moved ${file.name} to ${targetPath}`);
        }

        setModal(null);
        await fetchFiles();
      } catch (err) {
        showToast(`Failed to ${isCopy ? "copy" : "move"} file`, "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleChmodFile = useCallback(
    async (file: FileEntry, mode: string) => {
      if (!server) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const filePath = `${currentFullPath}/${file.name}`;

        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/chmod`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${server?.validationToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: filePath, mode }),
          },
        );

        if (!response.ok) throw new Error("Failed to change permissions");

        showToast(`Changed permissions for ${file.name}`);
        setModal(null);
        await fetchFiles();
      } catch (err) {
        showToast("Failed to change permissions", "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleMassDelete = useCallback(async () => {
    if (!server || selectedFiles.size === 0) return;

    if (
      !confirm(`Are you sure you want to delete ${selectedFiles.size} items?`)
    ) {
      return;
    }

    setOperationLoading((prev) => ({ ...prev, massDelete: true }));
    let success = true;
    for (const fileName of selectedFiles) {
      try {
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/delete/${currentFullPath}/${fileName}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${server?.validationToken}` },
          },
        );

        if (!response.ok) {
          success = false;
          showToast(`Failed to delete ${fileName}`, "error");
        }
      } catch (err) {
        success = false;
        showToast(`Failed to delete ${fileName}`, "error");
      }
    }

    if (success) {
      showToast(`Deleted ${selectedFiles.size} items`);
    }
    setSelectedFiles(new Set());
    await fetchFiles();
    setOperationLoading((prev) => ({ ...prev, massDelete: false }));
  }, [server, currentFullPath, selectedFiles, fetchFiles, showToast]);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!server) return;

      const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      for (const upload of newUploads) {
        const formData = new FormData();
        formData.append("files", upload.file);

        try {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === upload.file
                ? { ...u, status: "uploading", progress: 10 }
                : u,
            ),
          );

          const response = await fetch(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/upload/${currentFullPath}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${server?.validationToken}` },
              body: formData,
            },
          );

          if (!response.ok) throw new Error("Upload failed");

          setUploads((prev) =>
            prev.map((u) =>
              u.file === upload.file
                ? { ...u, status: "complete", progress: 100 }
                : u,
            ),
          );
          showToast(`Uploaded ${upload.file.name}`);
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === upload.file
                ? { ...u, status: "error", error: "Upload failed" }
                : u,
            ),
          );
          showToast(`Failed to upload ${upload.file.name}`, "error");
        }
      }

      await fetchFiles();
      setTimeout(() => {
        setUploads((prev) =>
          prev.filter(
            (u) => u.status === "pending" || u.status === "uploading",
          ),
        );
      }, 3000);
    },
    [server, currentFullPath, fetchFiles, showToast],
  );

  const handleCompress = useCallback(
    async (name: string) => {
      if (!server || selectedFiles.size === 0) return;

      try {
        setModal((prev) => (prev ? { ...prev, loading: true } : null));
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/compress`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${server?.validationToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              files: Array.from(selectedFiles).map(
                (f) => `${currentFullPath}/${f}`,
              ),
              destination: `${currentFullPath}/${name}.zip`,
            }),
          },
        );

        if (!response.ok) throw new Error("Failed to create archive");

        showToast("Archive created successfully");
        setModal(null);
        setSelectedFiles(new Set());
        await fetchFiles();
      } catch (err) {
        showToast("Failed to create archive", "error");
        setModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [server, currentFullPath, selectedFiles, fetchFiles, showToast],
  );

  const handleSaveFile = useCallback(
    async (file: FileEntry, content: string): Promise<boolean> => {
      if (!server) return false;

      try {
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/write/${currentFullPath}/${file.name}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${server?.validationToken}`,
              "Content-Type": "application/octet-stream",
            },
            body: content,
          },
        );

        if (!response.ok) throw new Error("Failed to save file");

        showToast("File saved successfully");
        return true;
      } catch (err) {
        showToast("Failed to save file", "error");
        return false;
      }
    },
    [server, currentFullPath, showToast],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter") {
      dragCounterRef.current += 1;
    } else if (e.type === "dragleave") {
      dragCounterRef.current -= 1;
    }

    if (e.type === "dragenter" && dragCounterRef.current === 1) {
      setDropZoneActive(true);
    } else if (e.type === "dragleave" && dragCounterRef.current === 0) {
      setDropZoneActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDropZoneActive(false);

      const { files } = e.dataTransfer;
      if (files?.length) {
        handleUpload(files);
      }
    },
    [handleUpload],
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.name)));
    }
  }, [files, selectedFiles.size]);

  const toggleFileSelection = useCallback((fileName: string) => {
    setSelectedFiles((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(fileName)) {
        newSelected.delete(fileName);
      } else {
        newSelected.add(fileName);
      }
      return newSelected;
    });
  }, []);

  useEffect(() => {
    if (server && currentPath.length >= 0) {
      fetchFiles();
    }
  }, [server, currentPath, fetchFiles]);

  useEffect(() => {
    if (search.trim().length > 2) {
      const debounce = setTimeout(() => {
        searchFiles(search);
      }, 500);
      return () => clearTimeout(debounce);
    } else if (server && search.trim().length === 0 && currentPath.length > 0) {
      fetchFiles();
    }
  }, [search, server, currentPath, searchFiles, fetchFiles]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  const navigateToPath = useCallback((path: string[]) => {
    setCurrentPath(path);
    setSearch("");
  }, []);

  const navigateUp = useCallback(() => {
    if (currentPath.length > 0) {
      navigateToPath(currentPath.slice(0, -1));
    }
  }, [currentPath, navigateToPath]);

  if (!server && loading) {
    return (
      <div className="bg-white flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    throw new Error(error);
  }

  if (!server) {
    navigate("/unauthorized");
  }

  return (
    <div
      className="bg-[#0E0E0F] min-h-screen p-6"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col h-full max-w-[1500px] mx-auto">
        {/* Toast Messages */}
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>

        {/* Drop Zone Overlay */}
        <AnimatePresence>
          {dropZoneActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0E0E0F]/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0E0E0F] border border-[#1E1E20] rounded-xl p-8 text-center"
              >
                <ArrowUpTrayIcon className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#FFFFFF] mb-4">
                  Drop files to upload
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Files will be uploaded to current directory
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Files Action Bar */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0E0E0F] border border-[#1E1E20] rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg"
            >
              <span className="text-sm font-medium text-[#FFFFFF] mr-2">
                {selectedFiles.size}{" "}
                {selectedFiles.size === 1 ? "item" : "items"} selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModal({ type: "compress" })}
                disabled={operationLoading.compress}
                icon={<ArchiveBoxIcon className="w-4 h-4 mr-1.5" />}
              >
                {operationLoading.compress ? "Creating..." : "Create Archive"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleMassDelete}
                disabled={operationLoading.massDelete}
                icon={<TrashIcon className="w-4 h-4 mr-1.5" />}
              >
                {operationLoading.massDelete ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFiles(new Set())}
                icon={<XMarkIcon className="w-4 h-4 mr-1.5" />}
              >
                Clear Selection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-[#9CA3AF] mb-4">
            <button
              onClick={() => navigate("/servers")}
              className="transition-colors duration-100"
            >
              Servers
            </button>
            <ChevronRightIcon className="w-4 h-4 mx-1" />
            <button
              onClick={() => navigate(`/servers/${id}`)}
              className="transition-colors duration-100"
            >
              {server?.name}
            </button>
            <ChevronRightIcon className="w-4 h-4 mx-1" />
            <span className="text-[#FFFFFF] font-medium">Files</span>
          </div>

          {/* Title and Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-[#FFFFFF] mr-4">
                Files
              </h1>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center px-3 py-1.5 text-xs text-[#EF4444] bg-[#1E1E20] border border-[#1E1E20] rounded-md"
                >
                  <ExclamationCircleIcon className="w-3.5 h-3.5 mr-1.5" />
                  {error}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Path Navigation & Actions */}
        <div className="flex items-center justify-between">
          {/* Path */}
          <div className="flex items-center space-x-2">
            <button
              onClick={navigateUp}
              disabled={currentPath.length === 0}
              className={`p-2 text-[#9CA3AF] transition-colors duration-100
                ${
                  currentPath.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:text-[#FFFFFF]"
                }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>

            <Button
              onClick={() => navigateToPath([])}
              variant="secondary"
              size="xs"
            >
              home
            </Button>

            {currentPath.map((segment, index) => (
              <React.Fragment key={index}>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                <Button
                  onClick={() =>
                    navigateToPath(currentPath.slice(0, index + 1))
                  }
                  variant="secondary"
                  size="xs"
                >
                  {segment}
                </Button>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-1 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
              />
              <MagnifyingGlassIcon className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>

            {/* Show Hidden Files */}
            <Button
              variant="secondary"
              size="sm"
              icon={<EyeIcon className="w-4 h-4" />}
              onClick={() => setShowHidden((prev) => !prev)}
            >
              {showHidden ? "Hide Hidden Files" : "Show Hidden Files"}
            </Button>

            {/* New File */}
            <Button
              variant="secondary"
              size="sm"
              icon={<DocumentPlusIcon className="w-4 h-4" />}
              onClick={() => setModal({ type: "new-file" })}
            >
              New File
            </Button>

            {/* New Folder */}
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlusIcon className="w-4 h-4" />}
              onClick={() => setModal({ type: "new-folder" })}
            >
              New Folder
            </Button>

            {/* Upload */}
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpTrayIcon className="w-4 h-4" />}
              onClick={() => uploadInputRef.current?.click()}
            >
              Upload
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleUpload(e.target.files);
                    e.target.value = "";
                  }
                }}
                className="hidden"
              />
            </Button>
          </div>
        </div>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              {uploads.map((upload, index) => (
                <div
                  key={index}
                  className="mt-4 flex items-center justify-between bg-[#0E0E0F]/80 border border-[#1E1E20] px-4 py-2 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="w-4 h-4 text-[#9CA3AF]" />
                    <span className="text-sm text-[#9CA3AF]">
                      {upload.file.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {upload.error ? (
                      <span className="text-xs text-[#EF4444]">
                        {upload.error}
                      </span>
                    ) : upload.status === "complete" ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <CheckIcon className="w-4 h-4 text-[#10B981]" />
                      </motion.div>
                    ) : (
                      <div className="w-32 h-1 bg-[#1E1E20] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#FFFFFF]"
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File List */}
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <LoadingSpinner />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0E0E0F]/80 border border-[#1E1E20] rounded-xl overflow-hidden mt-6"
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <Checkbox
                      checked={
                        selectedFiles.size === sortedFiles.length &&
                        sortedFiles.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E20]">
                {sortedFiles.map((file) => {
                  const fileType = getFileTypeInfo(file.mime);
                  const FileIcon = file.isFile ? fileType.icon : FolderIcon;
                  const isViewable =
                    fileType.canEdit ||
                    (!fileType.canEdit && file.size < MAX_VIEWABLE_FILE_SIZE);

                  return (
                    <motion.tr
                      key={file.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`${isViewable || !file.isFile ? "cursor-pointer" : ""} 
                      hover:bg-[#232325] transition-colors duration-100 ${file.hidden ? "bg-[#0E0E0F]" : ""}`}
                      onClick={() => {
                        if (isViewable && file.isFile) {
                          handleFileAction("edit", file);
                        } else if (!file.isFile) {
                          setCurrentPath([...currentPath, file.name]);
                        }
                      }}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedFiles.has(file.name)}
                          onChange={() => toggleFileSelection(file.name)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <FileIcon
                            className={`w-4 h-4 ${
                              !file.isFile
                                ? "text-[#8146ab]"
                                : file.mime.startsWith("image/")
                                  ? "text-[#F59E0B]"
                                  : file.mime.startsWith("text/") ||
                                      file.mime.includes("javascript") ||
                                      file.mime.includes("json")
                                    ? "text-[#10B981]"
                                    : file.mime.includes("pdf")
                                      ? "text-[#EF4444]"
                                      : file.mime.startsWith("audio/")
                                        ? "text-[#F59E0B]"
                                        : file.mime.startsWith("video/")
                                          ? "text-[#EF4444]"
                                          : file.mime.includes("zip") ||
                                              file.mime.includes("tar") ||
                                              file.mime.includes("compress")
                                            ? "text-[#F59E0B]"
                                            : "text-[#9CA3AF]"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm text-[#FFFFFF]">
                              {file.name}
                              {file.hidden && (
                                <span className="ml-2 text-xs text-[#9CA3AF]">
                                  (hidden)
                                </span>
                              )}
                            </span>
                            {(file.readonly || file.noDelete) && (
                              <span className="text-xs text-[#9CA3AF]">
                                {file.readonly && "Read-only"}
                                {file.readonly && file.noDelete && " • "}
                                {file.noDelete && "Protected"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                        {formatBytes(file.size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                        {formatDate(file.modifiedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                        {file.mode}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({
                              file,
                              position: { x: e.clientX, y: e.clientY },
                            });
                          }}
                          className="p-1 text-[#9CA3AF] cursor-pointer"
                        >
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}

                {sortedFiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-[#9CA3AF]">
                        <FolderIcon className="w-8 h-8 mb-2 text-[#9CA3AF]" />
                        <p className="text-sm">
                          {search ? (
                            <>
                              No files matching "
                              <span className="font-medium">{search}</span>"
                            </>
                          ) : (
                            "This folder is empty"
                          )}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Modals */}
        {modal && modal.type === "file-editor" && (
          <BaseModal
            isOpen={true}
            onClose={() => setModal(null)}
            title={modal.data.file.name}
            footer={
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                {!modal.data.file.readonly && (
                  <Button
                    onClick={async () => {
                      setModal((prev) =>
                        prev ? { ...prev, loading: true } : null,
                      );
                      const success = await handleSaveFile(
                        modal.data.file,
                        modal.data.content,
                      );
                      if (success) {
                        setModal(null);
                      } else {
                        setModal((prev) =>
                          prev ? { ...prev, loading: false } : null,
                        );
                      }
                    }}
                    disabled={modal.data.file.readonly || modal.loading}
                    isLoading={modal.loading}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            }
          >
            <div className="flex flex-col h-[calc(95vh-8rem)]">
              {modal.data.file.readonly && (
                <span className="text-xs text-[#EF4444] mb-2">
                  Read-only file
                </span>
              )}
              <div className="flex-1 overflow-hidden rounded-md border border-[#1E1E20]">
                <Editor
                  value={modal.data.content}
                  language={
                    modal.data.file.name.endsWith(".properties")
                      ? "properties"
                      : modal.data.file.mime.split("/")[1] || "plaintext"
                  }
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 20 },
                    readOnly: modal.data.file.readonly === true,
                  }}
                  onChange={(content) => {
                    setModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            data: { ...prev.data, content },
                          }
                        : null,
                    );
                  }}
                />
              </div>
            </div>
          </BaseModal>
        )}

        {modal && modal.type === "new-file" && (
          <InputModal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Create New File"
            onSubmit={handleCreateFile}
            isSubmitting={modal.loading}
            placeholder="File name"
            submitText={modal.loading ? "Creating..." : "Create"}
          />
        )}

        {modal && modal.type === "new-folder" && (
          <InputModal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Create New Folder"
            onSubmit={handleCreateFolder}
            isSubmitting={modal.loading}
            placeholder="Folder name"
            submitText={modal.loading ? "Creating..." : "Create"}
          />
        )}
        {modal && modal.type === "rename" && (
          <InputModal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Rename File"
            onSubmit={(name: string) => handleRenameFile(modal.data.file, name)}
            isSubmitting={modal.loading}
            placeholder="File name"
            initialValue={modal.data.file.name}
            submitText={modal.loading ? "Renaming..." : "Rename"}
          />
        )}

        {modal && modal.type === "move" && (
          <FormModal
            isOpen={true}
            onClose={() => setModal(null)}
            title={`${modal.data.isCopy ? "Copy" : "Move"} ${modal.data.file.name}`}
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              handleMoveFile(
                modal.data.file,
                formData.get("path") as string,
                modal.data.isCopy,
              );
            }}
            isSubmitting={modal.loading}
            submitText={
              modal.loading
                ? modal.data.isCopy
                  ? "Copying..."
                  : "Moving..."
                : modal.data.isCopy
                  ? "Copy"
                  : "Move"
            }
          >
            <input
              type="text"
              name="path"
              defaultValue={
                currentPath.length > 0 ? currentPath.join("/") : "/"
              }
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
            />
          </FormModal>
        )}

        {modal && modal.type === "chmod" && (
          <FormModal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Change Permissions"
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              handleChmodFile(modal.data.file, formData.get("mode") as string);
            }}
            isSubmitting={modal.loading}
            submitText={modal.loading ? "Changing..." : "Change"}
          >
            <label className="block text-sm font-medium text-[#9CA3AF] mb-1">
              Permission Mode (Octal)
            </label>
            <input
              type="text"
              name="mode"
              defaultValue={modal.data.file.mode}
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
            />
            <div className="text-xs text-[#9CA3AF] mt-1">
              Examples: 644 (rw-r--r--), 755 (rwxr-xr-x), 777 (rwxrwxrwx)
            </div>
          </FormModal>
        )}

        {modal && modal.type === "compress" && (
          <FormModal
            isOpen={true}
            onClose={() => setModal(null)}
            title="Create Archive"
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              handleCompress(formData.get("name") as string);
            }}
            isSubmitting={modal.loading}
            submitText={modal.loading ? "Creating..." : "Create Archive"}
          >
            <input
              type="text"
              name="name"
              placeholder="Archive name (without .zip)"
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200"
            />
            <div className="mt-2 text-xs text-[#9CA3AF]">
              Selected items: {Array.from(selectedFiles).join(", ")}
            </div>
          </FormModal>
        )}

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <ContextMenu
              file={contextMenu.file}
              position={contextMenu.position}
              onClose={() => setContextMenu(null)}
              onAction={(action) => handleFileAction(action, contextMenu.file)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FileManager;
