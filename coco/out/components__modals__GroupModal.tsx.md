# components/modals/GroupModal.tsx
lines:180 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useGroupModal } from '@/hooks/modals/use-group-modal';
import { Shield, Users, UserPlus, Plus, Loader2 } from 'lucide-react';
import { GroupList } from './group/GroupList';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onSelectGroup?: (groupId: string) => void;
}

export default function GroupModal({
  isOpen,
  onClose,
  walletAddress,
  onSelectGroup,
}: GroupModalProps) {
  const {
    tab,
    selectTab,
    groups,
    loading,
    message,
    groupName,
    setGroupName,
    groupDesc,
    setGroupDesc,
    joinId,
    setJoinId,
    handleCreate,
    handleJoin,
    handleLeave,
    handleSelectGroup: selectGroupHandler,
  } = useGroupModal({ isOpen, onClose, walletAddress, onSelectGroup });

