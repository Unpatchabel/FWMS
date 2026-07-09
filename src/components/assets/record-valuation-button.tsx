"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ValuationForm } from "./valuation-form";

export function RecordValuationButton({
  assetId,
  assetName,
}: {
  assetId: string;
  assetName: string;
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
        <TrendingUp className="h-3 w-3" />
        Update value
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a new value">
        <ValuationForm assetId={assetId} assetName={assetName} onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
