import { requireUser, isOwner } from "@/lib/auth";
import { listFamilyMembers } from "@/services/family.service";
import { FamilyManager } from "@/components/family/family-manager";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const user = await requireUser();
  const people = await listFamilyMembers(user.householdId);
  const members = user.role === "VIEWER" ? people.filter((person) => person.id === user.id) : people;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Family &amp; access</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone signs in separately to view the same household records. Owners manage access;
          members can update finances; viewers can only read them.
        </p>
      </div>
      <FamilyManager
        members={members.map((person) => ({
          id: person.id,
          name: person.name,
          email: isOwner(user) || person.id === user.id ? person.email : undefined,
          role: person.role,
          isActive: person.isActive,
        }))}
        currentUserId={user.id}
        canManage={isOwner(user)}
      />
    </div>
  );
}
