import type {
  AuditLog,
  Competitor,
  Race,
  RaceResult,
  Registration,
  Team,
} from "./types";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();

export const mockCompetitors: Competitor[] = [
  { id: 1, name: "Borin Ironsole", nickname: "The Anvil", type: "DWARF", age: 84, weight: 96, height: 132, country: "Karak Highlands", status: "ACTIVE", teamId: 1 },
  { id: 2, name: "Dagna Stonestride", nickname: "Quickpick", type: "DWARF", age: 61, weight: 78, height: 128, country: "Karak Highlands", status: "ACTIVE", teamId: 1 },
  { id: 3, name: "Zahra al-Rimal", nickname: "Sandstorm", type: "CAMEL", age: 9, weight: 540, height: 198, country: "Al-Qufra", status: "ACTIVE", teamId: 2 },
  { id: 4, name: "Habibi Longstride", nickname: "Dune Rocket", type: "CAMEL", age: 7, weight: 505, height: 205, country: "Al-Qufra", status: "INJURED", teamId: 2 },
  { id: 5, name: "Marek Halfhand", nickname: "Middleman", type: "MEDIUM", age: 34, weight: 82, height: 174, country: "Vestermark", status: "ACTIVE", teamId: 3 },
  { id: 6, name: "Ilsa Fenwick", nickname: "Featherfoot", type: "MEDIUM", age: 28, weight: 64, height: 168, country: "Vestermark", status: "ACTIVE", teamId: 3 },
  { id: 7, name: "Grum Barrelrun", nickname: "Barrels", type: "DWARF", age: 97, weight: 104, height: 136, country: "Deepforge", status: "SUSPENDED", teamId: null },
  { id: 8, name: "Nefer Swiftshade", nickname: "Mirage", type: "CAMEL", age: 12, weight: 560, height: 201, country: "Sirocco Flats", status: "RETIRED", teamId: null },
  { id: 9, name: "Oda Thornrider", nickname: "Bramble", type: "OTHER", age: 41, weight: 71, height: 181, country: "Greenhollow", status: "ACTIVE", teamId: null },
  { id: 10, name: "Tovi Emberbeard", nickname: "Sparks", type: "DWARF", age: 73, weight: 88, height: 130, country: "Deepforge", status: "ACTIVE", teamId: 1 },
];

export const mockTeams: Team[] = [
  { id: 1, name: "Ironsole Hammers", coach: "Vera Coalfist", strategy: "Low centre of gravity, explosive first 200m then hold the inside lane.", memberIds: [1, 2, 10] },
  { id: 2, name: "Dune Runners", coach: "Faris al-Rimal", strategy: "Conserve stride length early, unleash the long gallop on the final third.", memberIds: [3, 4] },
  { id: 3, name: "Vestermark Middlers", coach: "Petra Lund", strategy: "Even pacing and clean cornering — win on consistency, not bursts.", memberIds: [5, 6] },
];

export const mockRaces: Race[] = [
  { id: 1, name: "Grand Desert Sprint", description: "The season opener across the open flats of Al-Qufra.", scheduledAt: iso(6), startLocation: "Al-Qufra Oasis", finishLocation: "Broken Obelisk", distanceMeters: 1200, maxParticipants: 12, registrationDeadline: iso(3), status: "OPEN_FOR_REGISTRATION", type: "MIXED" },
  { id: 2, name: "Deepforge Tunnel Dash", description: "Short, brutal and underground. Dwarf favourites only need apply.", scheduledAt: iso(13), startLocation: "Deepforge Gate", finishLocation: "Anvil Hall", distanceMeters: 600, maxParticipants: 8, registrationDeadline: iso(9), status: "DRAFT", type: "INDIVIDUAL" },
  { id: 3, name: "Twin Dunes Team Relay", description: "Four-legged and two-legged squads trade the lead across the dunes.", scheduledAt: iso(-4), startLocation: "Twin Dunes North", finishLocation: "Twin Dunes South", distanceMeters: 2400, maxParticipants: 10, registrationDeadline: iso(-9), status: "COMPLETED", type: "TEAM" },
  { id: 4, name: "Sirocco Endurance Trial", description: "The longest race on the calendar, run into a headwind.", scheduledAt: iso(1), startLocation: "Sirocco Flats", finishLocation: "Windward Post", distanceMeters: 5000, maxParticipants: 14, registrationDeadline: iso(-1), status: "CLOSED_FOR_REGISTRATION", type: "MIXED" },
  { id: 5, name: "Greenhollow Invitational", description: "Cancelled after the bramble hedges reclaimed the track.", scheduledAt: iso(20), startLocation: "Greenhollow Green", finishLocation: "Old Mill", distanceMeters: 1800, maxParticipants: 10, registrationDeadline: iso(15), status: "CANCELLED", type: "INDIVIDUAL" },
];

export const mockRegistrations: Registration[] = [
  { id: 1, raceId: 1, competitorId: 1, status: "APPROVED", submittedAt: iso(-2) },
  { id: 2, raceId: 1, competitorId: 3, status: "PENDING", submittedAt: iso(-1) },
  { id: 3, raceId: 1, competitorId: 5, status: "PENDING", submittedAt: iso(-1) },
  { id: 4, raceId: 1, competitorId: 7, status: "REJECTED", submittedAt: iso(-2), validationNotes: "Competitor is currently suspended." },
  { id: 5, raceId: 1, competitorId: 9, status: "PENDING", submittedAt: iso(0) },
  { id: 6, raceId: 4, competitorId: 2, status: "APPROVED", submittedAt: iso(-5) },
  { id: 7, raceId: 4, competitorId: 6, status: "PENDING", submittedAt: iso(-3) },
  { id: 8, raceId: 3, competitorId: 1, status: "APPROVED", submittedAt: iso(-12) },
  { id: 9, raceId: 3, competitorId: 3, status: "APPROVED", submittedAt: iso(-12) },
  { id: 10, raceId: 3, competitorId: 5, status: "APPROVED", submittedAt: iso(-11) },
  { id: 11, raceId: 3, competitorId: 6, status: "APPROVED", submittedAt: iso(-11) },
  { id: 12, raceId: 3, competitorId: 10, status: "APPROVED", submittedAt: iso(-10) },
];

export const mockResults: RaceResult[] = [
  { id: 1, raceId: 3, competitorId: 3, position: 1, timeSeconds: 184.2, status: "FINISHED" },
  { id: 2, raceId: 3, competitorId: 1, position: 2, timeSeconds: 191.8, status: "FINISHED" },
  { id: 3, raceId: 3, competitorId: 6, position: 3, timeSeconds: 196.4, status: "FINISHED" },
  { id: 4, raceId: 3, competitorId: 10, position: 4, timeSeconds: 203.1, status: "FINISHED" },
  { id: 5, raceId: 3, competitorId: 5, position: null, timeSeconds: null, status: "DID_NOT_FINISH" },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 1, timestamp: iso(-0.1), username: "organizer", action: "APPROVE_REGISTRATION", entityType: "Registration", description: "Approved Borin Ironsole for Grand Desert Sprint", previousValue: "PENDING", newValue: "APPROVED" },
  { id: 2, timestamp: iso(-0.4), username: "admin", action: "UPDATE_COMPETITOR", entityType: "Competitor", description: "Habibi Longstride flagged as injured", previousValue: "ACTIVE", newValue: "INJURED" },
  { id: 3, timestamp: iso(-1.2), username: "organizer", action: "RECORD_RESULTS", entityType: "Race", description: "Recorded final results for Twin Dunes Team Relay", previousValue: "IN_PROGRESS", newValue: "COMPLETED" },
  { id: 4, timestamp: iso(-2.5), username: "admin", action: "CREATE_TEAM", entityType: "Team", description: "Created team Vestermark Middlers", newValue: "Vestermark Middlers" },
  { id: 5, timestamp: iso(-3.1), username: "organizer", action: "REJECT_REGISTRATION", entityType: "Registration", description: "Rejected Grum Barrelrun for Grand Desert Sprint", previousValue: "PENDING", newValue: "REJECTED" },
  { id: 6, timestamp: iso(-4.6), username: "admin", action: "CANCEL_RACE", entityType: "Race", description: "Cancelled Greenhollow Invitational", previousValue: "DRAFT", newValue: "CANCELLED" },
];