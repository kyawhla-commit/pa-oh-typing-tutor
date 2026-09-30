import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useLearningData } from "../../data/LearningContext";
import { useLessonCatalog } from "../lessons/LessonCatalogContext";
import {
  type LessonCategory,
  type LessonDifficulty,
  type LessonRecord,
  type LessonStatus,
} from "../lessons/lessonCatalog";

type AdminView = "overview" | "lessons" | "learners" | "activity";
type LessonForm = Omit<LessonRecord, "id" | "updatedAt">;

const blankForm: LessonForm = {
  title: "",
  description: "",
  difficulty: "Beginner",
  category: "Beginner",
  durationMinutes: 10,
  content: "",
  status: "Draft",
};

const navItems: {
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "learners", label: "Learner profile", icon: Users },
  { id: "activity", label: "Practice activity", icon: Activity },
];

function relativeDate(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof BookOpen;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
        >
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <FileText size={22} />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{copy}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function AdminCMS() {
  const { learner, results } = useLearningData();
  const {
    catalog,
    catalogStatus,
    catalogError,
    canManageCatalog,
    isLocalCatalog,
    saveLesson: persistLesson,
    changeLessonStatus: persistStatus,
    deleteLesson: removeLesson,
    restoreDefaultCatalog,
  } = useLessonCatalog();
  const [view, setView] = useState<AdminView>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LessonStatus>("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LessonForm>(blankForm);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  const publishedCount = catalog.filter(
    (lesson) => lesson.status === "Published",
  ).length;
  const draftCount = catalog.length - publishedCount;
  const averageSpeed = results.length
    ? Math.round(
        results.reduce((sum, item) => sum + item.wpm, 0) / results.length,
      )
    : 0;
  const totalMinutes = Math.round(
    results.reduce((sum, item) => sum + item.durationSeconds, 0) / 60,
  );
  const filteredLessons = useMemo(
    () =>
      catalog
        .filter((lesson) => {
          const matchesSearch =
            `${lesson.title} ${lesson.description} ${lesson.category}`
              .toLowerCase()
              .includes(search.toLowerCase());
          return (
            matchesSearch &&
            (statusFilter === "All" || lesson.status === statusFilter)
          );
        })
        .sort((a, b) => a.id - b.id),
    [catalog, search, statusFilter],
  );

  const startCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setEditorOpen(true);
  };
  const startEdit = (lesson: LessonRecord) => {
    setEditingId(lesson.id);
    const { id: _id, updatedAt: _updatedAt, ...values } = lesson;
    void _id;
    void _updatedAt;
    setForm(values);
    setEditorOpen(true);
  };
  const updateField = <K extends keyof LessonForm>(
    key: K,
    value: LessonForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const saveLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status: LessonStatus =
      submitter?.value === "Published" ? "Published" : "Draft";
    const clean = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      content: form.content.trim(),
    };
    if (!clean.title || !clean.description || clean.content.length < 10) return;
    setSaving(true);
    setActionError("");
    try {
      await persistLesson({ ...clean, status }, editingId ?? undefined);
      setEditorOpen(false);
      setNotice(
        editingId === null
          ? `Lesson saved as ${status.toLowerCase()}.`
          : `Lesson updated and ${status.toLowerCase()}.`,
      );
      window.setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The lesson could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (lesson: LessonRecord, status: LessonStatus) => {
    setActionError("");
    try {
      await persistStatus(lesson.id, status);
      setNotice(
        `${lesson.title} ${status === "Published" ? "published" : "moved to drafts"}.`,
      );
      window.setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The lesson status could not be changed.",
      );
    }
  };

  const deleteLesson = async (lesson: LessonRecord) => {
    if (
      !window.confirm(
        `Delete “${lesson.title}” from the shared lesson catalog? Existing learner completion history will remain.`,
      )
    )
      return;
    setActionError("");
    try {
      await removeLesson(lesson.id);
      setNotice("Lesson deleted from the shared catalog.");
      window.setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The lesson could not be deleted.",
      );
    }
  };

  const resetCatalog = async () => {
    if (
      !window.confirm(
        "Restore the original eight lessons? This replaces their content and moves custom lessons to drafts; learner completion records will be kept.",
      )
    )
      return;
    setActionError("");
    try {
      await restoreDefaultCatalog();
      setNotice("Default lesson catalog restored.");
      window.setTimeout(() => setNotice(""), 3500);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The original catalog could not be restored.",
      );
    }
  };

  const pageTitle =
    navItems.find((item) => item.id === view)?.label ?? "Overview";

  if (!isLocalCatalog && catalogStatus === "loading")
    return (
      <div
        className="mx-auto max-w-3xl p-8 text-sm text-slate-500"
        role="status"
      >
        Checking lesson administrator access…
      </div>
    );
  if (!isLocalCatalog && !canManageCatalog)
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-10">
        <section className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldCheck size={22} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Administrator access required
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            The shared lesson catalog can only be edited by an account
            provisioned with the administrator role. Learners can still read
            published lessons.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Set{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              app_metadata.role = admin
            </code>{" "}
            through a trusted server-side Supabase Admin API.
          </p>
        </section>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            <ShieldCheck size={15} /> Admin workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the shared lesson catalog and review your learner activity.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-medium sm:self-auto ${isLocalCatalog ? "border border-amber-200 bg-amber-50 text-amber-800" : catalogStatus === "error" ? "border border-rose-200 bg-rose-50 text-rose-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {isLocalCatalog ? (
            <>
              <CircleAlert size={14} /> Local preview
            </>
          ) : catalogStatus === "error" ? (
            <>
              <CircleAlert size={14} /> Sync issue
            </>
          ) : (
            <>
              <Check size={14} /> Shared catalog synced
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <nav
            aria-label="Admin sections"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-col lg:gap-1"
          >
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${view === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <Icon size={17} />
                {label}
                {id === "lessons" && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${view === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {catalog.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-4 hidden rounded-2xl border border-slate-200 bg-white p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck
                size={17}
                className={
                  isLocalCatalog ? "text-amber-600" : "text-emerald-600"
                }
              />
              Workspace status
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {isLocalCatalog
                ? "Changes are saved to this browser only. Configure Supabase to publish a shared catalog."
                : "Published lesson content is shared with learners through Supabase RLS."}
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          {notice && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <Check size={16} />
              {notice}
            </div>
          )}
          {(actionError || catalogError) && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {actionError || catalogError}
            </div>
          )}

          {view === "overview" && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Published lessons"
                  value={publishedCount}
                  helper={`${draftCount} draft${draftCount === 1 ? "" : "s"} in the catalog`}
                  icon={BookOpen}
                  tone="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  label="Practice sessions"
                  value={results.length}
                  helper="Saved for the current local learner"
                  icon={Activity}
                  tone="bg-violet-50 text-violet-600"
                />
                <MetricCard
                  label="Average speed"
                  value={`${averageSpeed} WPM`}
                  helper={
                    results.length
                      ? "Across saved sessions"
                      : "No completed sessions yet"
                  }
                  icon={ArrowUpRight}
                  tone="bg-emerald-50 text-emerald-600"
                />
                <MetricCard
                  label="Practice time"
                  value={`${totalMinutes} min`}
                  helper="Total recorded duration"
                  icon={Clock3}
                  tone="bg-amber-50 text-amber-600"
                />
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Lesson catalog
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Content shared with learners
                      </p>
                    </div>
                    <button
                      onClick={() => setView("lessons")}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Manage
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {catalog.slice(0, 5).map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                          <BookOpen size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lesson.category} · {lesson.durationMinutes} min
                          </p>
                        </div>
                        <StatusPill status={lesson.status} />
                      </div>
                    ))}
                    {catalog.length === 0 && (
                      <p className="py-6 text-center text-sm text-slate-500">
                        No lessons yet. Create one to start building your
                        catalog.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="font-semibold text-slate-900">
                      Recent practice
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest sessions for {learner?.name || "the local learner"}
                    </p>
                  </div>
                  {results.length ? (
                    <div className="space-y-2">
                      {results.slice(0, 6).map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {result.label || result.mode}
                            </p>
                            <p className="text-xs text-slate-500">
                              {relativeDate(result.createdAt)} ·{" "}
                              {Math.max(
                                1,
                                Math.round(result.durationSeconds / 60),
                              )}{" "}
                              min
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {result.wpm} WPM
                            </p>
                            <p className="text-xs text-emerald-700">
                              {result.accuracy}% accuracy
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No saved sessions"
                      copy="Completed typing sessions will appear here when the learner finishes a practice or test."
                    />
                  )}
                </div>
              </section>
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
                <Eye size={18} className="mt-0.5 shrink-0 text-blue-600" />
                <p>
                  <span className="font-semibold">Scope note:</span> learner and
                  activity figures are taken from this browser’s current
                  profile. There is no connected user directory or shared
                  analytics service in this frontend.
                </p>
              </div>
            </div>
          )}

          {view === "lessons" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Lesson content
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Published lessons appear in the learner catalog.
                  </p>
                </div>
                <button
                  onClick={startCreate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Plus size={17} />
                  New lesson
                </button>
              </div>
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <label className="relative block w-full sm:max-w-sm">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search lessons"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <div
                  className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"
                  role="group"
                  aria-label="Filter lessons by status"
                >
                  {(["All", "Published", "Draft"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={statusFilter === status}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              {filteredLessons.length === 0 ? (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    title="No matching lessons"
                    copy={
                      catalog.length
                        ? "Try a different search or status filter."
                        : "Create a lesson to start your learning catalog."
                    }
                    action={
                      !catalog.length ? (
                        <button
                          onClick={startCreate}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Create lesson
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Lesson</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Length</th>
                        <th className="px-4 py-3">Updated</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLessons.map((lesson) => (
                        <tr
                          key={lesson.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                                <BookOpen size={17} />
                              </span>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {lesson.title}
                                </p>
                                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                                  {lesson.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-slate-700">
                              {lesson.difficulty}
                            </div>
                            <div className="text-xs text-slate-400">
                              {lesson.category}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {lesson.durationMinutes} min
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {relativeDate(lesson.updatedAt)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill status={lesson.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => startEdit(lesson)}
                                aria-label={`Edit ${lesson.title}`}
                                title="Edit lesson"
                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  changeStatus(
                                    lesson,
                                    lesson.status === "Published"
                                      ? "Draft"
                                      : "Published",
                                  )
                                }
                                aria-label={
                                  lesson.status === "Published"
                                    ? `Unpublish ${lesson.title}`
                                    : `Publish ${lesson.title}`
                                }
                                title={
                                  lesson.status === "Published"
                                    ? "Move to drafts"
                                    : "Publish lesson"
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              >
                                {lesson.status === "Published" ? (
                                  <Archive size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => deleteLesson(lesson)}
                                aria-label={`Delete ${lesson.title}`}
                                title="Delete lesson"
                                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span>
                  {filteredLessons.length} of {catalog.length} lessons ·{" "}
                  {isLocalCatalog ? "saved locally" : "shared through Supabase"}
                </span>
                <button
                  onClick={() => void resetCatalog()}
                  className="inline-flex items-center gap-1.5 self-start font-medium text-slate-500 hover:text-slate-900"
                >
                  <ArrowDownRight size={14} />
                  Restore original catalog
                </button>
              </div>
            </section>
          )}

          {view === "learners" && (
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Local profile"
                  value={learner ? "1" : "0"}
                  helper="This browser only"
                  icon={Users}
                  tone="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  label="Saved sessions"
                  value={results.length}
                  helper="For this local profile"
                  icon={Activity}
                  tone="bg-emerald-50 text-emerald-600"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="font-semibold text-slate-900">
                    Current learner profile
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Profile information available in the local learning
                    workspace.
                  </p>
                </div>
                {learner ? (
                  <div className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-700">
                      {learner.name
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {learner.name}
                      </p>
                      <p className="break-all text-sm text-slate-500">
                        {learner.email}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Local profile
                    </span>
                  </div>
                ) : (
                  <EmptyState
                    title="No active learner"
                    copy="Sign in through the learner app to create a local profile."
                  />
                )}
                <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  <CircleAlert size={15} className="mt-0.5 shrink-0" />
                  This prototype has no shared accounts, roles, permissions, or
                  server-side learner directory. Account administration requires
                  a secured backend.
                </p>
              </div>
            </section>
          )}

          {view === "activity" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5 sm:px-6">
                <h2 className="font-semibold text-slate-900">
                  Practice activity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completed sessions for the current learner account.
                </p>
              </div>
              {results.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Activity</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Speed</th>
                        <th className="px-4 py-3">Accuracy</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((result) => (
                        <tr key={result.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {result.label ||
                              (result.mode === "test"
                                ? "Typing test"
                                : "Practice")}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {relativeDate(result.createdAt)}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                            {result.wpm} WPM
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                              <Check size={14} />
                              {result.accuracy}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {Math.floor(result.durationSeconds / 60)}m{" "}
                            {result.durationSeconds % 60}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    title="No practice activity yet"
                    copy="Completed practice and typing test sessions will be listed here."
                  />
                </div>
              )}
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">
                This view shows only the signed-in administrator’s own learning
                records.
              </div>
            </section>
          )}
        </main>
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditorOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-editor-title"
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <h2
                  id="lesson-editor-title"
                  className="font-semibold text-slate-900"
                >
                  {editingId === null ? "Create lesson" : "Edit lesson"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isLocalCatalog
                    ? "Saved in this browser preview."
                    : "Saved to the shared Supabase lesson catalog."}
                </p>
              </div>
              <button
                onClick={() => setEditorOpen(false)}
                aria-label="Close editor"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveLesson} className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lesson title" required>
                  <input
                    autoFocus
                    required
                    maxLength={80}
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    placeholder="e.g. Home row foundations"
                    className={inputClass}
                  />
                </Field>
                <Field label="Estimated duration" required>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min={1}
                      max={180}
                      value={form.durationMinutes}
                      onChange={(event) =>
                        updateField(
                          "durationMinutes",
                          Number(event.target.value),
                        )
                      }
                      className={`${inputClass} pr-14`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      minutes
                    </span>
                  </div>
                </Field>
                <Field label="Difficulty" required>
                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      updateField(
                        "difficulty",
                        event.target.value as LessonDifficulty,
                      )
                    }
                    className={inputClass}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </Field>
                <Field label="Category" required>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value as LessonCategory,
                      )
                    }
                    className={inputClass}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Programming</option>
                  </select>
                </Field>
              </div>
              <Field label="Description" required>
                <textarea
                  required
                  maxLength={240}
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Tell learners what they will practice."
                  className={`${inputClass} resize-y`}
                />
                <span className="mt-1 block text-right text-[11px] text-slate-400">
                  {form.description.length}/240
                </span>
              </Field>
              <Field
                label="Typing passage"
                required
                hint="Learners will type this exact passage. At least 10 characters."
              >
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  value={form.content}
                  onChange={(event) =>
                    updateField("content", event.target.value)
                  }
                  placeholder="Enter the text learners should type…"
                  className={`${inputClass} resize-y font-mono leading-6`}
                />
                <span className="mt-1 block text-right text-[11px] text-slate-400">
                  {form.content.length}/3000 characters
                </span>
              </Field>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    value="Draft"
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="submit"
                    value="Published"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : editingId === null
                        ? "Publish lesson"
                        : "Save & publish"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

function StatusPill({ status }: { status: LessonStatus }) {
  const published = status === "Published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status}
    </span>
  );
}
