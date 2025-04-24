import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/UI";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="bg-[#0E0E0F] border border-[#1E1E20] text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

interface FormModalProps extends BaseModalProps {
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  error?: string | null;
  submitText?: string;
  cancelText?: string;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isSubmitting = false,
  error = null,
  submitText = "Save",
  cancelText = "Cancel",
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
            <Button
              variant="secondary"
              onClick={onSubmit}
              disabled={isSubmitting}
              icon={<Plus className="w-4 h-4" />}
            >
              {isSubmitting ? "Creating..." : submitText}
            </Button>
        </>
      }
    >
      <form id="modal-form" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {children}
      </form>
    </BaseModal>
  );
};

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (value: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  initialValue?: string;
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  isSubmitting = false,
  error = null,
  placeholder = "",
  submitText = "Save",
  cancelText = "Cancel",
  initialValue = "",
}) => {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      submitText={submitText}
      cancelText={cancelText}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
      />
    </FormModal>
  );
};
