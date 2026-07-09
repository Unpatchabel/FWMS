"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AccountForm } from "./account-form";

export function QuickAddAccount() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Account
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add account">
        <AccountForm onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
