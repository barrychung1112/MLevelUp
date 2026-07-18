import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider } from "@/auth/auth-provider";
import { MockTrainingRepository } from "@/mocks/training/mock-training-repository";
import { LocalTrainingStorage, type StorageLike } from "@/mocks/training/local-storage";
import { DEFAULT_TIMEZONE, SEED_VERSION } from "@/mocks/training/seed";
import { TrainingProvider } from "@/providers/training-provider";
import DashboardPage from "./dashboard/page";
import OnboardingPage from "./onboarding/page";
import ProfilePage from "./profile/page";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useParams: () => ({}), useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: navigation.push, replace: navigation.replace }) }));

class TestStorage implements StorageLike { private readonly values = new Map<string, string>(); getItem(key: string) { return this.values.get(key) ?? null; } setItem(key: string, value: string) { this.values.set(key, value); } removeItem(key: string) { this.values.delete(key); } }
function createRepository() { let sequence = 0; const now = new Date().toISOString(); return new MockTrainingRepository({ storage: new LocalTrainingStorage(new TestStorage(), SEED_VERSION), clock: { now: () => now }, ids: { next: (prefix) => `${prefix}-route-${++sequence}` } }); }
function renderRoute(ui: React.ReactNode, repository: MockTrainingRepository) { return render(<AuthProvider><TrainingProvider createRepository={() => repository}>{ui}</TrainingProvider></AuthProvider>); }
async function completeOnboarding(repository: MockTrainingRepository) { await repository.acceptChallenge(); return repository.completeOnboarding({ displayName: "Demo Hunter", targetRole: "machine-learning-engineer", timezone: DEFAULT_TIMEZONE }); }

beforeEach(() => { navigation.pathname = "/"; navigation.push.mockReset(); navigation.replace.mockReset(); });

describe("adaptive courage route integration", () => {
  test("accepts the oath and enters the courage challenge", async () => {
    const repository = createRepository(); navigation.pathname = "/onboarding"; renderRoute(<OnboardingPage />, repository);
    fireEvent.click(await screen.findByRole("button", { name: "接受挑戰" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "挑戰者警告" })).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("訓練目標"), { target: { value: "job-ready" } });
    fireEvent.change(screen.getByLabelText("每週可投入分鐘"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "開始第一項挑戰" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/quests\/assignment-/)));
    const state = await repository.getSnapshot();
    expect(state.profile.challengeAcceptedAt).not.toBeNull();
    expect(state.profile.onboardingCompleted).toBe(true);
    expect(Object.values(state.assignments).some((item) => item.questId === "quest-courage-challenge")).toBe(true);
  });

  test("shows recoverable onboarding command errors", async () => {
    const repository = createRepository(); await repository.acceptChallenge(); vi.spyOn(repository, "completeOnboarding").mockRejectedValueOnce(new Error("storage unavailable")); navigation.pathname = "/onboarding"; renderRoute(<OnboardingPage />, repository);
    fireEvent.change(await screen.findByLabelText("訓練目標"), { target: { value: "job-ready" } }); fireEvent.change(screen.getByLabelText("每週可投入分鐘"), { target: { value: "600" } }); fireEvent.click(screen.getByRole("button", { name: "開始第一項挑戰" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("storage unavailable");
  });

  test("redirects completed users away from onboarding", async () => {
    const repository = createRepository(); await completeOnboarding(repository); navigation.pathname = "/onboarding"; renderRoute(<OnboardingPage />, repository);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/dashboard"));
  });

  test("opens the current primary assignment", async () => {
    const repository = createRepository(); const state = await completeOnboarding(repository); const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!; navigation.pathname = "/dashboard"; renderRoute(<DashboardPage />, repository);
    fireEvent.click(await screen.findByRole("button", { name: "開啟主要任務" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(`/quests/${primary.id}`));
    expect((await repository.getSnapshot()).assignments[primary.id].status).toBe("in_progress");
  });

  test("saves adaptive profile preferences and resets progress", async () => {
    const repository = createRepository(); await completeOnboarding(repository); navigation.pathname = "/profile"; renderRoute(<ProfilePage />, repository);
    fireEvent.change(await screen.findByLabelText("訓練目標"), { target: { value: "competition" } }); fireEvent.change(screen.getByLabelText("每週可投入分鐘"), { target: { value: "900" } }); fireEvent.click(screen.getByRole("button", { name: "儲存設定" }));
    await waitFor(async () => expect((await repository.getSnapshot()).profile.weeklyMinutes).toBe(900));
    fireEvent.click(screen.getByRole("button", { name: "重設訓練資料" })); fireEvent.click(await screen.findByRole("button", { name: "確認重設" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/onboarding"));
  });
});
