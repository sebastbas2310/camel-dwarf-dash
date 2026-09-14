import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { friendlyMessage } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "Sign in to the EIA Camel vs. Dwarf Racing System to manage races, competitors, teams and results.",
      },
      { property: "og:title", content: "Sign in — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Secure access to the Great EIA Camel vs. Dwarf Racing control room.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Enter both your username and password.");
      return;
    }
    setSubmitting(true);
    try {
      const signedIn = await login(username, password);
      toast.success(`Welcome back, ${signedIn.displayName}`);
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(friendlyMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-track p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-heat font-black">EIA</div>
          <span className="font-display text-lg font-bold">Camel vs. Dwarf Racing</span>
        </div>
        <div>
          <h2 className="max-w-md font-display text-4xl font-black leading-tight">
            Two species. One track. Zero excuses.
          </h2>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/70">
            Schedule heats, vet registrations, log finishing times and crown the champions of the
            Great EIA season.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
          <Trophy className="size-4" /> 10 · 7 · 5 · 3 · 1 points for the top five finishers
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use your race-office credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or email</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  maxLength={80}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  maxLength={128}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to the race office?{" "}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                Create an account
              </Link>
            </p>


            <div className="mt-6 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Demo accounts (used while the API is offline)
              </p>
              <div className="mt-2 grid gap-2">
                {Object.values(DEMO_ACCOUNTS).map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() => {
                      setUsername(account.username);
                      setPassword("password");
                    }}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-left text-xs transition-colors hover:bg-accent/30"
                  >
                    <span className="font-semibold">{account.username}</span>
                    <span className="text-muted-foreground">{account.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}