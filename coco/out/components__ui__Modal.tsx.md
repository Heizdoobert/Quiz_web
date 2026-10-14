# components/ui/Modal.tsx
lines:172 exports:ModalProps,default
---
"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Modal as QuickQuizModal, type ModalProps as QuickQuizModalProps } from "@heizdoobert/quickquiz-ui";

export { QuickQuizModal };
export type { QuickQuizModalProps };

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const emptySubscribe = () => () => {};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = "max-w-md",
}: ModalProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
