import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

interface SidebarContextType {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  expanded: true,
  setExpanded: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpandedState] = useState(() => {
    const saved = localStorage.getItem("sidebar-expanded");
    return saved ? saved === "true" : true;
  });

  const setExpanded = (value: boolean) => {
    setExpandedState(value);
    localStorage.setItem("sidebar-expanded", value.toString());
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("sidebar-expanded");
      if (saved) {
        setExpandedState(saved === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
