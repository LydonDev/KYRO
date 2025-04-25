import React, { useRef, useEffect, useState } from "react";
import {
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { PlusIcon } from "lucide-react";

// Standardized Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  const closeWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        event.target instanceof Node &&
        !modalRef.current.contains(event.target)
      ) {
        closeWithAnimation();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeWithAnimation();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 transition-all duration-200 ease-in-out ${isClosing ? "opacity-0" : "opacity-100"}`}
    >
      <div
        ref={modalRef}
        className={`bg-[#0E0E0F] border border-[#1E1E20] rounded-md w-full ${maxWidth} transition-all duration-200 ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        <div className="flex justify-between items-center px-6 mt-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight text-[#FFFFFF]">{title}</h3>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// Alert Component
interface AlertProps {
  type: "error" | "success" | "warning";
  message: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onDismiss }) => {
  const bgColor =
    type === "error"
      ? "bg-[#EF4444]/10"
      : type === "success"
        ? "bg-[#10B981]/10"
        : "bg-[#F59E0B]/10";
  const textColor =
    type === "error"
      ? "text-[#EF4444]"
      : type === "success"
        ? "text-[#10B981]"
        : "text-[#F59E0B]";
  const borderColor =
    type === "error"
      ? "border-[#EF4444]/20"
      : type === "success"
        ? "border-[#10B981]/20"
        : "border-[#F59E0B]/20";

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-md flex items-start justify-between mb-4`}
    >
      <div className="flex items-start p-3">
        {type === "error" || type === "warning" ? (
          <ExclamationTriangleIcon
            className={`w-4 h-4 ${textColor} mr-2 mt-0.5`}
          />
        ) : (
          <CheckIcon className={`w-4 h-4 ${textColor} mr-2 mt-0.5`} />
        )}
        <p className={`text-xs ${textColor}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-2 ${textColor} cursor-pointer rounded-md`}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Button Components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline" | "link";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  icon,
  isLoading = false,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    xs: "text-xs px-2 py-1",
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-3 py-2",
    lg: "text-sm px-4 py-2",
  };

  const variantClasses = {
    primary:
      "bg-[#1E1E20] hover:bg-[#232325] text-[#FFFFFF] border border-[#232325] focus:ring-[#232325]",
    secondary:
      "bg-[#141415] hover:bg-[#1E1E20] text-[#9CA3AF] border border-[#1E1E20] focus:ring-[#1E1E20]",
    danger:
      "bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/20 focus:ring-[#EF4444]/20",
    success:
      "bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/20 focus:ring-[#10B981]/20",
    outline:
      "bg-transparent hover:bg-[#232325] text-[#FFFFFF] border border-[#1E1E20] focus:ring-[#1E1E20]",
    link: "bg-transparent text-[#9CA3AF] hover:text-[#FFFFFF] border-0",
  };

  return (
    <button
      className={`font-medium rounded-md focus:outline-none focus:ring-1 transition-all duration-150 cursor-pointer ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className="flex items-center justify-center">
        {isLoading ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-md animate-spin mr-1.5" />
        ) : icon ? (
          <span className="mr-1.5">{icon}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
};

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  isSubmitting: boolean;
  variant?: "danger" | "primary";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  onConfirm,
  isSubmitting,
  variant = "primary",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mb-6">
        <p className="text-sm text-gray-400">{message}</p>
      </div>
      <div className="flex justify-end space-x-3">
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "secondary"}
          onClick={onConfirm}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

// Form Dialog Component
interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  isSubmitting?: boolean;
  error?: string | null;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Save",
  isSubmitting = false,
  error,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {error && (
        <div className="mb-6">
          <Alert type="error" message={error} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit && onSubmit(e);
        }}
      >
        <div className="space-y-4 mb-6">{children}</div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            variant="secondary"
            icon={<PlusIcon className="w-4 h-4" />}
          >
            {submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Dropdown component
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      event.target instanceof Node &&
      !dropdownRef.current.contains(event.target)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute z-10 mt-2 w-48 rounded-md bg-[#0E0E0F] border border-[#1E1E20] ring-1 ring-black ring-opacity-5 focus:outline-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<{
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className = "", children }) => {
  return (
    <button
      className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 hover:text-white transition-colors duration-150 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
        >
          {label}
          {props.required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full pl-3 pr-3 py-1 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200 ${
                      error ? "border-[#EF4444]" : ""
                    } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
};

// Textarea component
interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
        >
          {label}
          {props.required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`w-full pl-3 pr-3 py-1 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200 ${
                      error ? "border-[#EF4444]" : ""
                    } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
};

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = "",
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-xs font-medium text-[#9CA3AF] mb-1.5"
        >
          {label}
          {props.required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full pl-3 pr-3 py-1 rounded-md bg-[#0E0E0F] border border-[#1E1E20]
                    text-sm text-[#FFFFFF]
                    focus:outline-none focus:ring-1 focus:ring-[#232325] focus:border-[#232325]
                    transition-colors duration-200 ${
                      error ? "border-[#EF4444]" : ""
                    } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#9CA3AF]">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
};

// Badge component
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  children,
  className = "",
}) => {
  const variantClasses = {
    default: "bg-[#1E1E20] text-[#FFFFFF] border-[#232325]",
    success: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
    warning: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    danger: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
    info: "bg-[#0E0E0F] text-[#9CA3AF] border-[#1E1E20]",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
