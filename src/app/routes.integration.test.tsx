import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MockTrainingRepository } from "@/mocks/training/mock-training-repository";
import { LocalTrainingStorage, type StorageLike } from "@/mocks/training/local-storage";
import { DEFAULT_TIMEZONE, SEED_VERSION } from "@/mocks/training/seed";
import { TrainingProvider, useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "./_components/training-page-shell";
import ArchivePage from "./archive/page";
import DashboardPage from "./dashboard/page";
import OnboardingPage from "./onboarding/page";
import PortfolioPage from "./portfolio/page";
import ProfilePage from "./profile/page";
import QuestAssignmentPage from "./quests/[assignmentId]/page";
import ResourcesPage from "./resources/page";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  assignmentId: "",
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useParams: () => ({ assignmentId: navigation.assignmentId }),
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

class TestStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function createRepository() {
  let sequence = 0;
  const now = new Date().toISOString();
  return new MockTrainingRepository({
    storage: new LocalTrainingStorage(new TestStorage(), SEED_VERSION),
    clock: { now: () => now },
    ids: { next: (prefix) => `${prefix}-route-${++sequence}` },
  });
}

function renderRoute(ui: React.ReactNode, repository: MockTrainingRepository) {
  return render(
    <TrainingProvider createRepository={() => repository}>{ui}</TrainingProvider>,
  );
}

function CommandStatusHarness() {
  const training = useTraining();
  return (
    <TrainingPageShell>
      <button
        type="button"
        onClick={() => {
          void training.updateProfile({ weeklyMinutes: 720 }).catch(() => undefined);
        }}
      >
        儲存測試設定
      </button>
      {training.commandSuccess ? <output>{training.commandSuccess}</output> : null}
    </TrainingPageShell>
  );
}

async function completeOnboarding(repository: MockTrainingRepository) {
  return repository.completeOnboarding({
    displayName: "Demo Hunter",
    goal: "job-ready",
    contract: "standard",
    weeklyMinutes: 600,
    timezone: DEFAULT_TIMEZONE,
  });
}

async function completePrimaryQuest(repository: MockTrainingRepository) {
  const state = await completeOnboarding(repository);
  const primary = Object.values(state.assignments).find(
    (assignment) => assignment.slot === "primary",
  );
  if (!primary) throw new Error("missing primary assignment");
  await repository.startQuest(primary.id);
  await repository.submitQuest({
    idempotencyKey: "route-filter-artifact",
    assignmentId: primary.id,
    evidence: [
      {
        id: "route-filter-evidence",
        requirementId: "commit",
        type: "githubCommit",
        url: "https://github.com/example/project/commit/abc123",
      },
    ],
    selfReflection:
      "This reflection records the validation split, baseline result, error analysis, and the next experiment in enough detail.",
  });
}

beforeEach(() => {
  navigation.pathname = "/";
  navigation.assignmentId = "";
  navigation.search = "";
  navigation.push.mockReset();
  navigation.replace.mockReset();
});

describe("Phase 1 route integration", () => {
  test("persists onboarding and enters the command center", async () => {
    const repository = createRepository();
    navigation.pathname = "/onboarding";
    renderRoute(<OnboardingPage />, repository);

    fireEvent.change(await screen.findByLabelText("訓練目標"), { target: { value: "job-ready" } });
    fireEvent.click(screen.getByLabelText("普通人模式"));
    fireEvent.change(screen.getByLabelText("每週投入分鐘數"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "建立訓練契約" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/dashboard"));
    expect(navigation.push).not.toHaveBeenCalled();
    expect((await repository.getSnapshot()).profile.onboardingCompleted).toBe(true);
  });

  test("redirects completed users away from onboarding without rendering its form", async () => {
    const repository = createRepository();
    await completeOnboarding(repository);
    navigation.pathname = "/onboarding";
    renderRoute(<OnboardingPage />, repository);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("button", { name: "建立訓練契約" })).not.toBeInTheDocument();
  });

  test("redirects incomplete users away from training routes without rendering quest data", async () => {
    const repository = createRepository();
    navigation.pathname = "/dashboard";
    renderRoute(<DashboardPage />, repository);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/onboarding"));
    expect(screen.queryByRole("heading", { name: "今日訓練指揮中心" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ship a reproducible baseline")).not.toBeInTheDocument();
  });

  test("shows provider errors without leaving an unhandled onboarding rejection", async () => {
    const repository = createRepository();
    vi.spyOn(repository, "completeOnboarding").mockRejectedValueOnce(new Error("storage unavailable"));
    navigation.pathname = "/onboarding";
    renderRoute(<OnboardingPage />, repository);

    fireEvent.change(await screen.findByLabelText("訓練目標"), { target: { value: "job-ready" } });
    fireEvent.click(screen.getByLabelText("普通人模式"));
    fireEvent.change(screen.getByLabelText("每週投入分鐘數"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "建立訓練契約" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("storage unavailable");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test("opens the primary assignment by assignment id", async () => {
    const repository = createRepository();
    const state = await completeOnboarding(repository);
    const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!;
    navigation.pathname = "/dashboard";
    renderRoute(<DashboardPage />, repository);

    fireEvent.click(await screen.findByRole("button", { name: "開始主要任務" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(`/quests/${primary.id}`));
    const started = (await repository.getSnapshot()).assignments[primary.id];
    expect(started.status).toBe("in_progress");
    expect(started.startedAt).toBeDefined();
  });

  test("requires an explicit start on an assigned quest detail before showing submission", async () => {
    const repository = createRepository();
    const state = await completeOnboarding(repository);
    const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!;
    navigation.pathname = `/quests/${primary.id}`;
    navigation.assignmentId = primary.id;
    renderRoute(<QuestAssignmentPage />, repository);

    expect(await screen.findByRole("button", { name: "開始任務" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "提交成果" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "開始任務" }));

    expect(await screen.findByRole("button", { name: "提交成果" })).toBeVisible();
    expect((await repository.getSnapshot()).assignments[primary.id].status).toBe("in_progress");
  });

  test("shows specific revision feedback with zero XP, then awards a valid resubmission", async () => {
    const repository = createRepository();
    const state = await completeOnboarding(repository);
    const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!;
    navigation.pathname = `/quests/${primary.id}`;
    navigation.assignmentId = primary.id;
    renderRoute(<QuestAssignmentPage />, repository);

    fireEvent.click(await screen.findByRole("button", { name: "開始任務" }));
    fireEvent.change(await screen.findByLabelText("成果網址"), { target: { value: "https://example.com/not-a-commit" } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "This reflection is deliberately longer than forty characters for the review." } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid evidence: commit");
    expect(screen.queryByText("成果已完成 Demo 評估。")).not.toBeInTheDocument();
    let revised = await repository.getSnapshot();
    expect(revised.progress.totalXp).toBe(0);
    expect(revised.assignments[primary.id].status).toBe("needs_revision");

    fireEvent.change(screen.getByLabelText("成果網址"), { target: { value: "https://github.com/example/project/commit/abc123" } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(await screen.findByRole("heading", { name: "任務驗證完成" })).toBeInTheDocument();
    revised = await repository.getSnapshot();
    expect(revised.progress.totalXp).toBeGreaterThan(0);
    expect(revised.assignments[primary.id].status).toBe("completed");
    expect(revised.artifacts).toHaveLength(1);
    expect(revised.activity.length).toBeGreaterThan(0);
  });

  test("retries the same logical submission with the same stable identity", async () => {
    const repository = createRepository();
    const state = await completeOnboarding(repository);
    const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!;
    const realSubmit = repository.submitQuest.bind(repository);
    const submitSpy = vi.spyOn(repository, "submitQuest")
      .mockRejectedValueOnce(new Error("temporary submit failure"))
      .mockImplementation((input) => realSubmit(input));
    navigation.pathname = `/quests/${primary.id}`;
    navigation.assignmentId = primary.id;
    renderRoute(<QuestAssignmentPage />, repository);

    fireEvent.click(await screen.findByRole("button", { name: "開始任務" }));
    fireEvent.change(await screen.findByLabelText("成果網址"), { target: { value: "https://github.com/example/project/commit/abc123" } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "This reflection is deliberately longer than forty characters for retry." } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporary submit failure");

    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));
    expect(await screen.findByRole("heading", { name: "任務驗證完成" })).toBeVisible();
    expect(submitSpy).toHaveBeenCalledTimes(2);
    expect(submitSpy.mock.calls[1][0].idempotencyKey).toBe(submitSpy.mock.calls[0][0].idempotencyKey);
    expect(submitSpy.mock.calls[1][0].evidence[0].id).toBe(submitSpy.mock.calls[0][0].evidence[0].id);
  });

  test("records invalid nonnumeric metric evidence as a zero-XP revision", async () => {
    const repository = createRepository();
    const state = await repository.completeOnboarding({
      displayName: "Demo Hunter",
      goal: "job-ready",
      contract: "foundation",
      weeklyMinutes: 300,
      timezone: DEFAULT_TIMEZONE,
    });
    const primary = Object.values(state.assignments).find((item) => item.slot === "primary")!;
    navigation.pathname = `/quests/${primary.id}`;
    navigation.assignmentId = primary.id;
    renderRoute(<QuestAssignmentPage />, repository);

    fireEvent.click(await screen.findByRole("button", { name: "開始任務" }));
    fireEvent.change(await screen.findByLabelText("指標結果"), { target: { value: "accuracy: unavailable" } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "This reflection is sufficiently detailed for deterministic metric review." } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid evidence: metric");
    const revised = await repository.getSnapshot();
    expect(Object.values(revised.submissions)).toHaveLength(1);
    expect(Object.values(revised.feedback)[0].xpAwarded).toBe(0);
    expect(revised.activity[0].type).toBe("submissionNeedsRevision");
    expect(revised.progress.totalXp).toBe(0);
  });

  test("records zero-byte empty-MIME file evidence as a zero-XP revision", async () => {
    const repository = createRepository();
    const state = await completeOnboarding(repository);
    const report = Object.values(state.assignments).find((item) => item.questId === "quest-standard-report")!;
    navigation.pathname = `/quests/${report.id}`;
    navigation.assignmentId = report.id;
    renderRoute(<QuestAssignmentPage />, repository);

    fireEvent.click(await screen.findByRole("button", { name: "開始任務" }));
    const input = await screen.findByLabelText("成果檔案");
    fireEvent.change(input, { target: { files: [new File([], "report.txt", { type: "" })] } });
    fireEvent.change(screen.getByLabelText("自我反思"), { target: { value: "This reflection is sufficiently detailed for deterministic file review." } });
    fireEvent.click(screen.getByRole("button", { name: "提交成果" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid evidence: report");
    const revised = await repository.getSnapshot();
    expect(Object.values(revised.submissions)).toHaveLength(1);
    expect(Object.values(revised.feedback)[0].xpAwarded).toBe(0);
    expect(revised.activity[0].type).toBe("submissionNeedsRevision");
    expect(revised.progress.totalXp).toBe(0);
  });

  test("saves profile preferences and reset returns to onboarding", async () => {
    const repository = createRepository();
    await completeOnboarding(repository);
    navigation.pathname = "/profile";
    renderRoute(<ProfilePage />, repository);

    fireEvent.change(await screen.findByLabelText("訓練目標"), { target: { value: "competition" } });
    fireEvent.change(screen.getByLabelText("訓練契約"), { target: { value: "intensive" } });
    fireEvent.change(screen.getByLabelText("每週投入分鐘數"), { target: { value: "1260" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存個人設定" }));

    await waitFor(async () => expect((await repository.getSnapshot()).profile.contract).toBe("intensive"));
    fireEvent.click(screen.getByRole("button", { name: "重設 Demo 資料" }));
    fireEvent.click(await screen.findByRole("button", { name: "確認重設" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/onboarding"));
    expect((await repository.getSnapshot()).profile.onboardingCompleted).toBe(false);
  });

  test("clears command success when the pathname changes", async () => {
    const repository = createRepository();
    await completeOnboarding(repository);
    const create = () => repository;
    navigation.pathname = "/dashboard";
    const rendered = render(
      <TrainingProvider createRepository={create}>
        <CommandStatusHarness />
      </TrainingProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "儲存測試設定" }));
    expect(await screen.findByText("個人設定已儲存。")).toBeInTheDocument();

    navigation.pathname = "/profile";
    rendered.rerender(
      <TrainingProvider createRepository={create}>
        <CommandStatusHarness />
      </TrainingProvider>,
    );
    await waitFor(() => expect(screen.queryByText("個人設定已儲存。")).not.toBeInTheDocument());
  });

  test("hydrates and sanitizes all resource filters without prefiltering options", async () => {
    const repository = createRepository();
    await completeOnboarding(repository);
    navigation.pathname = "/resources";
    navigation.search =
      "type=repository&skill=Engineering&relevance=90&difficulty=3&freshness=80&credibility=80&maxTime=30";
    const rendered = renderRoute(<ResourcesPage />, repository);

    expect(await screen.findByLabelText("資源類型")).toHaveValue("repository");
    expect(screen.getByLabelText("能力標籤")).toHaveValue("Engineering");
    expect(screen.getByLabelText("最低相關性")).toHaveValue("90");
    expect(screen.getByLabelText("資源難度")).toHaveValue("3");
    expect(screen.getByLabelText("最低新鮮度")).toHaveValue("80");
    expect(screen.getByLabelText("最低可信度")).toHaveValue("80");
    expect(screen.getByLabelText("最長預估時間")).toHaveValue("30");
    expect(screen.getByText("Reproducible baselines")).toBeVisible();
    expect(
      within(screen.getByLabelText("資源類型")).getByRole("option", {
        name: "article",
      }),
    ).toBeInTheDocument();

    rendered.unmount();
    navigation.search =
      "type=unknown&skill=Unknown&relevance=85&difficulty=9&freshness=75&credibility=101&maxTime=31";
    renderRoute(<ResourcesPage />, repository);
    expect(await screen.findByLabelText("資源類型")).toHaveValue("all");
    expect(screen.getByLabelText("能力標籤")).toHaveValue("all");
    expect(screen.getByLabelText("最低相關性")).toHaveValue("0");
    expect(screen.getByLabelText("資源難度")).toHaveValue("all");
    expect(screen.getByLabelText("最低新鮮度")).toHaveValue("0");
    expect(screen.getByLabelText("最低可信度")).toHaveValue("0");
    expect(screen.getByLabelText("最長預估時間")).toHaveValue("0");
  });

  test("writes complete resource filters to the URL and removes defaults on clear", async () => {
    const repository = createRepository();
    await completeOnboarding(repository);
    navigation.pathname = "/resources";
    navigation.search = "type=repository&skill=Evaluation";
    renderRoute(<ResourcesPage />, repository);

    expect(
      await screen.findByText("沒有符合目前篩選條件的資源"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("最低相關性"), {
      target: { value: "90" },
    });
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/resources?type=repository&skill=Evaluation&relevance=90",
      { scroll: false },
    );

    fireEvent.click(screen.getByRole("button", { name: "清除資源篩選" }));
    expect(navigation.replace).toHaveBeenLastCalledWith("/resources", {
      scroll: false,
    });
  });

  test("hydrates portfolio filters and writes a complete sanitized query", async () => {
    const repository = createRepository();
    await completePrimaryQuest(repository);
    navigation.pathname = "/portfolio";
    navigation.search = "type=githubRepository&skill=Modeling";
    renderRoute(<PortfolioPage />, repository);

    expect(await screen.findByLabelText("成果類型")).toHaveValue(
      "githubRepository",
    );
    expect(screen.getByLabelText("能力標籤")).toHaveValue("Modeling");
    expect(screen.getByText("Ship a reproducible baseline")).toBeVisible();

    fireEvent.change(screen.getByLabelText("能力標籤"), {
      target: { value: "Engineering" },
    });
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/portfolio?type=githubRepository&skill=Engineering",
      { scroll: false },
    );
  });

  test("hydrates archive event filters and writes the selected event to the URL", async () => {
    const repository = createRepository();
    await completePrimaryQuest(repository);
    navigation.pathname = "/archive";
    navigation.search = "event=artifactCreated";
    renderRoute(<ArchivePage />, repository);

    expect(await screen.findByLabelText("紀錄類型")).toHaveValue(
      "artifactCreated",
    );
    expect(
      screen.getByRole("heading", { name: "Portfolio artifact created" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Ship a reproducible baseline" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("紀錄類型"), {
      target: { value: "questCompleted" },
    });
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/archive?event=questCompleted",
      { scroll: false },
    );
  });
});
