"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategoryAction } from "@/actions/categories";

export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * Category dropdown for the transaction form. Only OWNER sees the "+ New
 * category" control is available to the owner. This is
 * a UI convenience only; the server independently rejects a non-OWNER's
 * category-create request, so this gate is not the real security boundary.
 */
export function CategoryPicker({
  type,
  categories,
  value,
  onChange,
  isOwner,
}: {
  type: "INCOME" | "EXPENSE";
  categories: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  isOwner: boolean;
}) {
  const [options, setOptions] = useState(categories);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createCategoryAction({ name, type });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const created: CategoryOption = { id: result.data!.id, name: result.data!.name };
      setOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setNewName("");
      setAdding(false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm text-ink-soft">Category</label>
        {isOwner && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-emerald hover:text-emerald-bright"
          >
            <Plus className="h-3 w-3" />
            New category
          </button>
        )}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder={type === "INCOME" ? "e.g. Dividends" : "e.g. Gym"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
          >
            {saving ? "Adding\u2026" : "Add"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Select value={value} onChange={(e) => onChange(e.target.value)} required>
          <option value="" disabled>
            Select a category
          </option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
