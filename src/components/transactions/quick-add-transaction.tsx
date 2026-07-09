"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, type AccountOption } from "./transaction-form";
import type { CategoryOption } from "./category-picker";

/**
 * "Add Income" / "Add Expense" entry point. Renders a button that opens the
 * shared TransactionForm with `type` pre-set and locked. Used identically on
 * the dashboard (quick actions) and on the Income/Expenses pages, so adding a
 * transaction always behaves the same way no matter where it's triggered.
 */
export function QuickAddTransaction({
  type,
  label,
  accounts,
  categories,
  isOwner,
  variant = "primary",
}: {
  type: "INCOME" | "EXPENSE";
  label: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  isOwner: boolean;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    // Re-fetch server components (dashboard totals, transaction lists, etc.)
    // so the new entry is reflected immediately without a full page reload.
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <TransactionForm
          type={type}
          accounts={accounts}
          categories={categories}
          isOwner={isOwner}
          onSuccess={handleSuccess}
        />
      </Modal>
    </>
  );
}
