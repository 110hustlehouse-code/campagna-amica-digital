import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts
        .filter((t) => t.open !== false)
        .map(function ({ id, title, description, action, duration, open, onOpenChange, ...props }) {
          return (
            <Toast key={id} duration={duration} {...props}>
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
              {action}
              <ToastClose onClick={() => dismiss(id)} />
            </Toast>
          );
        })}
      <ToastViewport />
    </ToastProvider>
  );
}
