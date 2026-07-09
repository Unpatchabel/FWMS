"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LoanForm } from "./loan-form";

export function QuickAddLoan() {
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
        Add Loan
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add loan">
        <LoanForm onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
