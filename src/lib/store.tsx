import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  mockAuditLogs,
  mockCompetitors,
  mockRaces,
  mockRegistrations,
  mockResults,
  mockTeams,
} from "./mock-data";
import { useAuth } from "./auth";
import { api } from "./api";
import { fetchRemoteSnapshot } from "./remote";
import type {
  AuditLog,
  Competitor,
  Race,
  RaceResult,
  Registration,
  Team,
} from "./types";

interface StoreState {
  competitors: Competitor[];
  teams: Team[];
  races: Race[];
  registrations: Registration[];
  results: RaceResult[];
  auditLogs: AuditLog[];
}

interface StoreValue extends StoreState {
  loading: boolean;
  /** True when the racing server answered; false means the demo dataset is on screen. */
  live: boolean;
  refresh: () => Promise<void>;
  saveCompetitor: (input: Omit<Competitor, "id"> & { id?: number }) => void;
  deactivateCompetitor: (id: number) => void;
  saveTeam: (input: Omit<Team, "id" | "memberIds"> & { id?: number }) => void;
  addMember: (teamId: number, competitorId: number) => void;
  removeMember: (teamId: number, competitorId: number) => void;
  saveRace: (input: Omit<Race, "id"> & { id?: number }) => void;
  setRaceStatus: (id: number, status: Race["status"]) => void;
  approveRegistration: (id: number) => void;
  rejectRegistration: (id: number, validationNotes: string) => void;
  saveResults: (raceId: number, rows: Omit<RaceResult, "id">[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const nextId = (rows: { id: number }[]) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<StoreState>({
    competitors: mockCompetitors,
    teams: mockTeams,
    races: mockRaces,
    registrations: mockRegistrations,
    results: mockResults,
    auditLogs: mockAuditLogs,
  });

  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await fetchRemoteSnapshot();
    setLive(snapshot.reachable);
    setState((prev) => ({
      ...prev,
      competitors: snapshot.competitors.length ? snapshot.competitors : prev.competitors,
      teams: snapshot.teams.length ? snapshot.teams : prev.teams,
      races: snapshot.races.length ? snapshot.races : prev.races,
      registrations: snapshot.registrations.length ? snapshot.registrations : prev.registrations,
      results: snapshot.results.length ? snapshot.results : prev.results,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);


  const log = useCallback(
    (entry: Omit<AuditLog, "id" | "timestamp" | "username">) =>
      setState((prev) => ({
        ...prev,
        auditLogs: [
          {
            id: nextId(prev.auditLogs),
            timestamp: new Date().toISOString(),
            username: user?.username ?? "system",
            ...entry,
          },
          ...prev.auditLogs,
        ],
      })),
    [user],
  );

  const value = useMemo<StoreValue>(() => {
    /** Best-effort write-through to the racing server; the local update always stands. */
    const persist = (action: () => Promise<unknown>) => {
      if (!live) return;
      void action()
        .then(() => refresh())
        .catch(() => undefined);
    };

    return {
      ...state,
      loading,
      live,
      refresh,
      saveCompetitor: (input) => {
        persist(() =>
          input.id
            ? api.users.update(input.id, { fullName: input.name, role: "VIEWER" })
            : api.users.create({
                fullName: input.name,
                email: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@eia.race`,
                role: "VIEWER",
              }),
        );
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              competitors: prev.competitors.map((c) =>
                c.id === input.id ? ({ ...c, ...input, id: input.id } as Competitor) : c,
              ),
            };
          }
          const id = nextId(prev.competitors);
          return { ...prev, competitors: [...prev.competitors, { ...input, id } as Competitor] };
        });
        log({
          action: input.id ? "UPDATE_COMPETITOR" : "CREATE_COMPETITOR",
          entityType: "Competitor",
          description: `${input.id ? "Updated" : "Created"} competitor ${input.name}`,
          newValue: input.status,
        });
      },
      deactivateCompetitor: (id) => {
        setState((prev) => ({
          ...prev,
          competitors: prev.competitors.map((c) =>
            c.id === id ? { ...c, status: "RETIRED", teamId: null } : c,
          ),
          teams: prev.teams.map((t) => ({
            ...t,
            memberIds: t.memberIds.filter((m) => m !== id),
          })),
        }));
        log({
          action: "DEACTIVATE_COMPETITOR",
          entityType: "Competitor",
          description: `Retired competitor #${id}`,
          newValue: "RETIRED",
        });
      },
      saveTeam: (input) => {
        persist(() => {
          const body = { name: input.name, description: input.strategy, coach: input.coach };
          return input.id ? api.teams.update(input.id, body) : api.teams.create(body);
        });
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              teams: prev.teams.map((t) =>
                t.id === input.id ? { ...t, ...input, id: input.id } : t,
              ),
            };
          }
          const id = nextId(prev.teams);
          return { ...prev, teams: [...prev.teams, { ...input, id, memberIds: [] }] };
        });
        log({
          action: input.id ? "UPDATE_TEAM" : "CREATE_TEAM",
          entityType: "Team",
          description: `${input.id ? "Updated" : "Created"} team ${input.name}`,
          newValue: input.name,
        });
      },
      addMember: (teamId, competitorId) => {
        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId && !t.memberIds.includes(competitorId)
              ? { ...t, memberIds: [...t.memberIds, competitorId] }
              : t,
          ),
          competitors: prev.competitors.map((c) =>
            c.id === competitorId ? { ...c, teamId } : c,
          ),
        }));
        log({
          action: "ADD_TEAM_MEMBER",
          entityType: "Team",
          description: `Added competitor #${competitorId} to team #${teamId}`,
        });
      },
      removeMember: (teamId, competitorId) => {
        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, memberIds: t.memberIds.filter((m) => m !== competitorId) } : t,
          ),
          competitors: prev.competitors.map((c) =>
            c.id === competitorId ? { ...c, teamId: null } : c,
          ),
        }));
        log({
          action: "REMOVE_TEAM_MEMBER",
          entityType: "Team",
          description: `Removed competitor #${competitorId} from team #${teamId}`,
        });
      },
      saveRace: (input) => {
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              races: prev.races.map((r) => (r.id === input.id ? { ...r, ...input, id: input.id } : r)),
            };
          }
          const id = nextId(prev.races);
          return { ...prev, races: [...prev.races, { ...input, id }] };
        });
        log({
          action: input.id ? "UPDATE_RACE" : "CREATE_RACE",
          entityType: "Race",
          description: `${input.id ? "Updated" : "Created"} race ${input.name}`,
          newValue: input.status,
        });
      },
      setRaceStatus: (id, status) => {
        const previous = state.races.find((r) => r.id === id)?.status;
        setState((prev) => ({
          ...prev,
          races: prev.races.map((r) => (r.id === id ? { ...r, status } : r)),
        }));
        log({
          action: "UPDATE_RACE_STATUS",
          entityType: "Race",
          description: `Race #${id} moved to ${status}`,
          ...(previous ? { previousValue: previous } : {}),
          newValue: status,
        });
      },
      approveRegistration: (id) => {
        setState((prev) => ({
          ...prev,
          registrations: prev.registrations.map((r) =>
            r.id === id ? { ...r, status: "APPROVED", validationNotes: undefined } : r,
          ),
        }));
        log({
          action: "APPROVE_REGISTRATION",
          entityType: "Registration",
          description: `Approved registration #${id}`,
          previousValue: "PENDING",
          newValue: "APPROVED",
        });
      },
      rejectRegistration: (id, validationNotes) => {
        setState((prev) => ({
          ...prev,
          registrations: prev.registrations.map((r) =>
            r.id === id ? { ...r, status: "REJECTED", validationNotes } : r,
          ),
        }));
        log({
          action: "REJECT_REGISTRATION",
          entityType: "Registration",
          description: `Rejected registration #${id}: ${validationNotes}`,
          previousValue: "PENDING",
          newValue: "REJECTED",
        });
      },
      saveResults: (raceId, rows) => {
        setState((prev) => {
          const others = prev.results.filter((r) => r.raceId !== raceId);
          let seed = nextId(prev.results);
          const saved = rows.map((row) => ({ ...row, id: seed++ }));
          return {
            ...prev,
            results: [...others, ...saved],
            races: prev.races.map((r) => (r.id === raceId ? { ...r, status: "COMPLETED" } : r)),
          };
        });
        log({
          action: "RECORD_RESULTS",
          entityType: "Race",
          description: `Recorded ${rows.length} result rows for race #${raceId}`,
          newValue: "COMPLETED",
        });
      },
    };
  }, [state, loading, log]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}