"use client";

import toast from "react-hot-toast";

export function toastSuccess(message: string) {
  toast.success(message, {
    style: {
      background: "#22C55E",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    },
  });
}

export function toastError(message: string) {
  toast.error(message, {
    style: {
      background: "#EF4444",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    },
  });
}

export function toastLoading(message: string) {
  return toast.loading(message, {
    style: {
      background: "#475569",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    },
  });
}

export function toastDismiss() {
  toast.dismiss();
}