"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PaymentForm } from "./payment-form";
import type { AccountOption } from "@/components/transactions/transaction-form";

export function RecordPaymentButton({
  loanId,
  loanName,
  accounts,
}: {
  loanId: string;
  loanName: string;
  accounts: AccountOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="text-xs px-2.5 py-1">
        <Coins className="h-3 w-3" />
        Record payment
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a payment">
        <PaymentForm loanId={loanId} loanName={loanName} accounts={accounts} onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
