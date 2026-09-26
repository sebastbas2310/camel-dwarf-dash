import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, friendlyMessage, unwrapPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { labelize } from "@/lib/types";

export const Route = createFileRoute("/users/")({
  head: () => ({
    meta: [
      { title: "Users — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "Review every account registered on the EIA racing server and edit names, emails and roles.",
      },
      { property: "og:title", content: "Users — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Account administration for the EIA Camel vs. Dwarf racing system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

interface UserRow {
  id: number;
  fullName: string;
  email: string;
  role: string;
  enabled: boolean;
}

const ROLES = ["ADMINISTRATOR", "ORGANIZER", "VIEWER"] as const;

function toRow(row: Record<string, unknown>): UserRow {
  const id = Number(row['id'] ?? row['userId'] ?? 0);
  return {
    id,
    fullName: String(row['fullName'] ?? row['name'] ?? ""),
    email: String(row['email'] ?? row['username'] ?? ""),
    role: String(row['role'] ?? "VIEWER").toUpperCase(),
    enabled: row['enabled'] !== false,
  };
}

function UsersPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.users.list();
      setRows(unwrapPage<Record<string, unknown>>(payload).map(toRow));
      setError(null);
    } catch (err) {
      setRows([]);
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
    );
  }, [rows, query]);

  return (
    <AppShell
      allow={["ADMINISTRATOR", "RACE_ORGANIZER"]}
      title="Users"
      subtitle="Accounts stored on the racing server"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading accounts…" />
        ) : error ? (
          <EmptyState title="We couldn't load the accounts" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No accounts yet"
            description="Accounts appear here as soon as they are created on the racing server."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.fullName || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email || "—"}</TableCell>
                    <TableCell>{labelize(row.role)}</TableCell>
                    <TableCell>
                      <Badge variant={row.enabled ? "outline" : "secondary"}>
                        {row.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </AppShell>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("VIEWER");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email);
    setRole(user.role);
    setEnabled(user.enabled);
  }, [user]);

  async function submit() {
    if (!user) return;
    if (fullName.trim().length < 3) {
      toast.error("Please enter the full name (at least 3 characters).");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      await api.users.update(user.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        enabled,
      });
      toast.success("Account updated.");
      onSaved();
    } catch (err) {
      toast.error(friendlyMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            Changes are saved straight to the racing server.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {labelize(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-enabled">Status</Label>
            <Select
              value={enabled ? "true" : "false"}
              onValueChange={(value) => setEnabled(value === "true")}
            >
              <SelectTrigger id="user-enabled">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
