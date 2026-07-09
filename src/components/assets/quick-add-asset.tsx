"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AssetForm } from "./asset-form";

export function QuickAddAsset() {
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
        Add Asset
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add asset">
        <AssetForm onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
