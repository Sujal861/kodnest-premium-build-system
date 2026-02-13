import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import { JOBS, type Job, type JobExperience, type JobMode, type JobSource } from './data/jobs'

type Filters = {
  keyword: string
  location: string
  mode: '' | JobMode
  experience: '' | JobExperience
  source: '' | JobSource
  sort: 'latest' | 'matchScore' | 'salary'
  status: JobStatusFilter
}

type JobStatus = 'Not Applied' | 'Applied' | 'Rejected' | 'Selected'

type JobStatusFilter = '' | JobStatus

type Preferences = {
  roleKeywords: string
  preferredLocations: string[]
  preferredModes: JobMode[]
  experienceLevel: JobExperience | ''
  skills: string
  minMatchScore: number
}

const defaultPreferences: Preferences = {
  roleKeywords: '',
  preferredLocations: [],
  preferredModes: [],
  experienceLevel: '',
  skills: '',
  minMatchScore: 40,
}

type JobStatusRecord = {
  status: JobStatus
  updatedAt: string
}

const splitCommaSeparated = (value: string): string[] =>
  value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

const computeMatchScore = (job: Job, preferences: Preferences): number => {
  let score = 0

  const roleKeywords = splitCommaSeparated(preferences.roleKeywords)
  const prefSkills = splitCommaSeparated(preferences.skills)

  const titleLower = job.title.toLowerCase()
  const descriptionLower = job.description.toLowerCase()

  if (roleKeywords.length > 0) {
    if (roleKeywords.some((kw) => titleLower.includes(kw))) {
      score += 25
    }
    if (roleKeywords.some((kw) => descriptionLower.includes(kw))) {
      score += 15
    }
  }

  if (preferences.preferredLocations.length > 0) {
    if (preferences.preferredLocations.includes(job.location)) {
      score += 15
    }
  }

  if (preferences.preferredModes.length > 0) {
    if (preferences.preferredModes.includes(job.mode)) {
      score += 10
    }
  }

  if (preferences.experienceLevel && preferences.experienceLevel === job.experience) {
    score += 10
  }

  if (prefSkills.length > 0) {
    const jobSkillsLower = job.skills.map((s) => s.toLowerCase())
    const hasOverlap = jobSkillsLower.some((skill) => prefSkills.includes(skill))
    if (hasOverlap) {
      score += 15
    }
  }

  if (job.postedDaysAgo <= 2) {
    score += 5
  }

  if (job.source === 'LinkedIn') {
    score += 5
  }

  return Math.min(score, 100)
}

const extractSalaryValue = (salaryRange: string): number => {
  const match = salaryRange.match(/(\d+)/)
  if (!match) return 0
  let value = Number.parseInt(match[1] ?? '0', 10)
  const lower = salaryRange.toLowerCase()
  if (lower.includes('lpa')) {
    value *= 100000
  } else if (lower.includes('k')) {
    value *= 1000
  }
  return value
}

const LandingPage = () => (
  <main className="kpbs-page kpbs-page--landing">
    <section className="kpbs-landing">
      <h1 className="kpbs-page__title">Stop Missing The Right Jobs.</h1>
      <p className="kpbs-page__subtitle">
        Precision-matched job discovery delivered daily at 9AM.
      </p>
      <div className="kpbs-landing__actions">
        <Link to="/settings" className="kpbs-button kpbs-button--primary">
          Start Tracking
        </Link>
      </div>
    </section>
  </main>
)

const formatPosted = (days: number) => {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

type JobCardProps = {
  job: Job
  matchScore: number
  status: JobStatus
  isSaved: boolean
  onSave: (id: number) => void
  onView: (job: Job) => void
  onStatusChange: (status: JobStatus) => void
}

const JobCard = ({
  job,
  matchScore,
  status,
  isSaved,
  onSave,
  onView,
  onStatusChange,
}: JobCardProps) => {
  const scoreClass =
    matchScore >= 80
      ? 'kpbs-badge--score-high'
      : matchScore >= 60
        ? 'kpbs-badge--score-medium'
        : matchScore >= 40
          ? 'kpbs-badge--score-low'
          : 'kpbs-badge--score-dim'

  return (
    <article className="kpbs-job-card">
      <div className="kpbs-job-card__main">
        <div className="kpbs-job-card__heading">
          <div>
            <h2 className="kpbs-job-card__title">{job.title}</h2>
            <p className="kpbs-job-card__company">{job.company}</p>
          </div>
          <div className="kpbs-job-card__score">
            <span
              className={`kpbs-badge kpbs-badge--score ${scoreClass}`}
            >
              {matchScore}% match
            </span>
          </div>
        </div>
        <div className="kpbs-job-card__meta">
          <span className="kpbs-pill">
            {job.location} · {job.mode}
          </span>
          <span className="kpbs-pill">Experience: {job.experience}</span>
          <span className="kpbs-pill">Salary: {job.salaryRange}</span>
        </div>
      </div>
      <div className="kpbs-job-card__footer">
        <div className="kpbs-job-card__footer-left">
          <span className="kpbs-badge kpbs-badge--source">{job.source}</span>
          <span className="kpbs-job-card__posted">
            {formatPosted(job.postedDaysAgo)}
          </span>
          <span
            className={`
              kpbs-badge
              kpbs-badge--status
              ${
                status === 'Applied'
                  ? 'kpbs-badge--status-applied'
                  : status === 'Rejected'
                    ? 'kpbs-badge--status-rejected'
                    : status === 'Selected'
                      ? 'kpbs-badge--status-selected'
                      : 'kpbs-badge--status-neutral'
              }
            `}
          >
            {status}
          </span>
        </div>
        <div className="kpbs-job-card__actions">
          <button
            type="button"
            className="kpbs-button kpbs-button--ghost"
            onClick={() => onView(job)}
          >
            View
          </button>
          <button
            type="button"
            className="kpbs-button kpbs-button--secondary"
            onClick={() => {
              if (!isSaved) {
                onSave(job.id)
              }
            }}
            disabled={isSaved}
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <div className="kpbs-status-group">
            {(['Not Applied', 'Applied', 'Rejected', 'Selected'] as JobStatus[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={`kpbs-status-button${
                    status === value ? ' kpbs-status-button--active' : ''
                  }`}
                  onClick={() => onStatusChange(value)}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="kpbs-button kpbs-button--primary"
            onClick={() =>
              window.open(job.applyUrl, '_blank', 'noopener,noreferrer')
            }
          >
            Apply
          </button>
        </div>
      </div>
    </article>
  )
}

type FilterBarProps = {
  filters: Filters
  onChange: (next: Filters) => void
  locations: string[]
  modes: JobMode[]
  experiences: JobExperience[]
  sources: JobSource[]
}

const FilterBar = ({
  filters,
  onChange,
  locations,
  modes,
  experiences,
  sources,
}: FilterBarProps) => {
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial })

  return (
    <section className="kpbs-filter-bar">
      <div className="kpbs-filter-bar__row">
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-keyword">
            Search
          </label>
          <input
            id="filter-keyword"
            className="kpbs-input"
            placeholder="Search by title or company"
            value={filters.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
          />
        </div>
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-location">
            Location
          </label>
          <select
            id="filter-location"
            className="kpbs-input kpbs-input--select"
            value={filters.location}
            onChange={(e) => update({ location: e.target.value })}
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-mode">
            Mode
          </label>
          <select
            id="filter-mode"
            className="kpbs-input kpbs-input--select"
            value={filters.mode}
            onChange={(e) => update({ mode: e.target.value as Filters['mode'] })}
          >
            <option value="">All modes</option>
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="kpbs-filter-bar__row">
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-experience">
            Experience
          </label>
          <select
            id="filter-experience"
            className="kpbs-input kpbs-input--select"
            value={filters.experience}
            onChange={(e) => update({ experience: e.target.value as Filters['experience'] })}
          >
            <option value="">All experience levels</option>
            {experiences.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-source">
            Source
          </label>
          <select
            id="filter-source"
            className="kpbs-input kpbs-input--select"
            value={filters.source}
            onChange={(e) => update({ source: e.target.value as Filters['source'] })}
          >
            <option value="">All sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
        <div className="kpbs-field kpbs-field--inline">
          <label className="kpbs-label" htmlFor="filter-sort">
            Sort
          </label>
          <select
            id="filter-sort"
            className="kpbs-input kpbs-input--select"
            value={filters.sort}
            onChange={(e) =>
              update({ sort: e.target.value as Filters['sort'] })
            }
          >
            <option value="latest">Latest</option>
            <option value="matchScore">Best match</option>
            <option value="salary">Highest salary</option>
          </select>
        </div>
      </div>
    </section>
  )
}

type JobsDashboardProps = {
  jobs: Job[]
  savedJobIds: number[]
  preferences: Preferences
  hasPreferences: boolean
  jobStatuses: Record<number, JobStatusRecord>
  onSaveJob: (id: number) => void
  onViewJob: (job: Job) => void
  onChangeStatus: (jobId: number, status: JobStatus) => void
}

const JobsDashboard = ({
  jobs,
  savedJobIds,
  preferences,
  hasPreferences,
  jobStatuses,
  onSaveJob,
  onViewJob,
  onChangeStatus,
}: JobsDashboardProps) => {
  const [filters, setFilters] = useState<Filters>({
    keyword: '',
    location: '',
    mode: '',
    experience: '',
    source: '',
    sort: 'latest',
    status: '',
  })
  const [showOnlyMatches, setShowOnlyMatches] = useState(false)

  const locations = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.location))).sort(),
    [jobs],
  )
  const modes = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.mode))).sort(),
    [jobs],
  )
  const experiences = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.experience))).sort(),
    [jobs],
  )
  const sources = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.source))).sort(),
    [jobs],
  )

  const jobsWithScores = useMemo(
    () =>
      jobs.map((job) => ({
        job,
        score: computeMatchScore(job, preferences),
      })),
    [jobs, preferences],
  )

  const filteredJobs = useMemo(() => {
    let result = [...jobsWithScores]
    if (filters.keyword.trim()) {
      const q = filters.keyword.toLowerCase()
      result = result.filter(
        ({ job }) =>
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q),
      )
    }
    if (filters.location) {
      result = result.filter(({ job }) => job.location === filters.location)
    }
    if (filters.mode) {
      result = result.filter(({ job }) => job.mode === filters.mode)
    }
    if (filters.experience) {
      result = result.filter(
        ({ job }) => job.experience === filters.experience,
      )
    }
    if (filters.source) {
      result = result.filter(({ job }) => job.source === filters.source)
    }
    if (filters.status) {
      result = result.filter(({ job }) => {
        const statusRecord = jobStatuses[job.id]
        const status = statusRecord?.status ?? 'Not Applied'
        return status === filters.status
      })
    }
    if (showOnlyMatches && hasPreferences) {
      const threshold = preferences.minMatchScore ?? 40
      result = result.filter(({ score }) => score >= threshold)
    }
    result.sort((a, b) => {
      if (filters.sort === 'matchScore') {
        return b.score - a.score
      }
      if (filters.sort === 'salary') {
        return (
          extractSalaryValue(b.job.salaryRange) -
          extractSalaryValue(a.job.salaryRange)
        )
      }
      // latest by postedDaysAgo ascending
      return a.job.postedDaysAgo - b.job.postedDaysAgo
    })
    return result
  }, [jobsWithScores, filters, showOnlyMatches, hasPreferences, preferences])

  return (
    <main className="kpbs-page">
      <h1 className="kpbs-page__title">Dashboard</h1>
      {!hasPreferences && (
        <section className="kpbs-card kpbs-card--banner">
          <p className="kpbs-card__body">
            Set your preferences to activate intelligent matching.
          </p>
        </section>
      )}
      <div className="kpbs-dashboard-toggle-row">
        <label className="kpbs-toggle">
          <input
            type="checkbox"
            checked={showOnlyMatches}
            disabled={!hasPreferences}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setShowOnlyMatches(event.target.checked)
            }
          />
          <span>Show only jobs above my threshold</span>
        </label>
        {hasPreferences && (
          <span className="kpbs-toggle__hint">
            Threshold: {preferences.minMatchScore}
          </span>
        )}
      </div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        locations={locations}
        modes={modes}
        experiences={experiences}
        sources={sources}
      />
      {filteredJobs.length === 0 ? (
        <section className="kpbs-card kpbs-card--empty">
          <h2 className="kpbs-card__title">
            No roles match your criteria.
          </h2>
          <p className="kpbs-card__body">
            Adjust filters or lower your threshold to see more opportunities.
          </p>
        </section>
      ) : (
        <section className="kpbs-jobs">
          {filteredJobs.map(({ job, score }) => (
            <JobCard
              key={job.id}
              job={job}
              matchScore={score}
              status={
                jobStatuses[job.id]?.status
                  ? jobStatuses[job.id]!.status
                  : 'Not Applied'
              }
              isSaved={savedJobIds.includes(job.id)}
              onSave={onSaveJob}
              onView={onViewJob}
              onStatusChange={(nextStatus) => onChangeStatus(job.id, nextStatus)}
            />
          ))}
        </section>
      )}
    </main>
  )
}

type SettingsPageProps = {
  jobsCount: number
  preferences: Preferences
  onChange: (prefs: Preferences) => void
}

const SettingsPage = ({ jobsCount, preferences, onChange }: SettingsPageProps) => {
  const toggleMode = (mode: JobMode) => {
    const exists = preferences.preferredModes.includes(mode)
    const nextModes = exists
      ? preferences.preferredModes.filter((m) => m !== mode)
      : [...preferences.preferredModes, mode]
    onChange({ ...preferences, preferredModes: nextModes })
  }

  const handleLocationsChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    const selected = Array.from(event.target.selectedOptions).map(
      (opt) => opt.value,
    )
    onChange({ ...preferences, preferredLocations: selected })
  }

  return (
    <main className="kpbs-page">
      <h1 className="kpbs-page__title">Settings</h1>
      <section className="kpbs-card">
        <p className="kpbs-page__subtitle">
          Define the preferences Job Notification Tracker will use in the next
          step. The current dataset includes {jobsCount} live opportunities.
        </p>
        <form className="kpbs-form">
          <div className="kpbs-field">
            <label className="kpbs-label" htmlFor="role-keywords">
              Role keywords
            </label>
            <input
              id="role-keywords"
              className="kpbs-input"
              placeholder="e.g. SDE Intern, React Developer"
              value={preferences.roleKeywords}
              onChange={(event) =>
                onChange({ ...preferences, roleKeywords: event.target.value })
              }
            />
          </div>
          <div className="kpbs-field">
            <label className="kpbs-label" htmlFor="preferred-locations">
              Preferred locations
            </label>
            <select
              id="preferred-locations"
              multiple
              className="kpbs-input kpbs-input--select kpbs-input--multiselect"
              value={preferences.preferredLocations}
              onChange={handleLocationsChange}
            >
              {Array.from(new Set(JOBS.map((job) => job.location)))
                .sort()
                .map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
            </select>
          </div>
          <div className="kpbs-field">
            <span className="kpbs-label">Preferred mode</span>
            <div className="kpbs-checkbox-row">
              {(['Remote', 'Hybrid', 'Onsite'] as JobMode[]).map((mode) => (
                <label key={mode} className="kpbs-checkbox">
                  <input
                    type="checkbox"
                    checked={preferences.preferredModes.includes(mode)}
                    onChange={() => toggleMode(mode)}
                  />
                  <span>{mode}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="kpbs-field">
            <label className="kpbs-label" htmlFor="experience-level">
              Experience level
            </label>
            <select
              id="experience-level"
              className="kpbs-input kpbs-input--select"
              value={preferences.experienceLevel}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  experienceLevel: event.target.value as Preferences['experienceLevel'],
                })
              }
            >
              <option value="">All experience levels</option>
              <option value="Fresher">Fresher</option>
              <option value="0-1">0-1</option>
              <option value="1-3">1-3</option>
              <option value="3-5">3-5</option>
            </select>
          </div>
          <div className="kpbs-field">
            <label className="kpbs-label" htmlFor="skills">
              Skills
            </label>
            <input
              id="skills"
              className="kpbs-input"
              placeholder="e.g. React, Java, SQL"
              value={preferences.skills}
              onChange={(event) =>
                onChange({ ...preferences, skills: event.target.value })
              }
            />
          </div>
          <div className="kpbs-field">
            <label className="kpbs-label" htmlFor="min-match-score">
              Minimum match score
            </label>
            <div className="kpbs-slider-row">
              <input
                id="min-match-score"
                type="range"
                min={0}
                max={100}
                step={5}
                value={preferences.minMatchScore}
                onChange={(event) =>
                  onChange({
                    ...preferences,
                    minMatchScore: Number.parseInt(event.target.value, 10),
                  })
                }
              />
              <span className="kpbs-slider-value">
                {preferences.minMatchScore}
              </span>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

type SavedPageProps = {
  savedJobIds: number[]
  onViewJob: (job: Job) => void
  preferences: Preferences
  jobStatuses: Record<number, JobStatusRecord>
  onChangeStatus: (jobId: number, status: JobStatus) => void
}

const SavedPage = ({
  savedJobIds,
  onViewJob,
  preferences,
  jobStatuses,
  onChangeStatus,
}: SavedPageProps) => {
  const savedJobs = useMemo(
    () => JOBS.filter((job) => savedJobIds.includes(job.id)),
    [savedJobIds],
  )

  return (
    <main className="kpbs-page">
      <h1 className="kpbs-page__title">Saved</h1>
      {savedJobs.length === 0 ? (
        <section className="kpbs-card kpbs-card--empty">
          <h2 className="kpbs-card__title">No saved jobs yet.</h2>
          <p className="kpbs-card__body">
            As you review opportunities on the dashboard, the strongest fits will appear here.
          </p>
        </section>
      ) : (
        <section className="kpbs-jobs">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              matchScore={computeMatchScore(job, preferences)}
              status={
                jobStatuses[job.id]?.status
                  ? jobStatuses[job.id]!.status
                  : 'Not Applied'
              }
              isSaved
              onSave={() => {}}
              onView={onViewJob}
              onStatusChange={(nextStatus) => onChangeStatus(job.id, nextStatus)}
            />
          ))}
        </section>
      )}
    </main>
  )
}

type DigestItem = {
  jobId: number
  score: number
}

type DigestState = {
  date: string
  items: DigestItem[]
}

const getTodayDigestKey = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`
  return {
    key: `jobTrackerDigest_${dateStr}`,
    dateStr,
  }
}

type DigestPageProps = {
  preferences: Preferences
  hasPreferences: boolean
  jobStatuses: Record<number, JobStatusRecord>
}

const DigestPage = ({ preferences, hasPreferences, jobStatuses }: DigestPageProps) => {
  const [{ key: digestKey, dateStr }] = useState(getTodayDigestKey)
  const [digest, setDigest] = useState<DigestState | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [noMatchesToday, setNoMatchesToday] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem(digestKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { items?: DigestItem[] }
      if (parsed && Array.isArray(parsed.items)) {
        setDigest({ date: dateStr, items: parsed.items })
        setNoMatchesToday(parsed.items.length === 0)
      }
    } catch {
      // ignore parse errors
    }
  }, [digestKey, dateStr])

  const digestJobs = useMemo(() => {
    if (!digest) return []
    const byId = new Map(JOBS.map((job) => [job.id, job] as const))
    return digest.items
      .map(({ jobId, score }) => {
        const job = byId.get(jobId)
        if (!job) return null
        return { job, score }
      })
      .filter(Boolean) as { job: Job; score: number }[]
  }, [digest])

  const generateDigest = () => {
    if (!hasPreferences) return
    setIsGenerating(true)
    try {
      const existing = window.localStorage.getItem(digestKey)
      if (existing) {
        const parsed = JSON.parse(existing) as { items?: DigestItem[] }
        if (parsed && Array.isArray(parsed.items)) {
          setDigest({ date: dateStr, items: parsed.items })
          setNoMatchesToday(parsed.items.length === 0)
          return
        }
      }

      const jobsWithScores = JOBS.map((job) => ({
        job,
        score: computeMatchScore(job, preferences),
      }))

      const matching = jobsWithScores.filter(({ score }) => score > 0)
      if (matching.length === 0) {
        const emptyDigest: DigestState = { date: dateStr, items: [] }
        window.localStorage.setItem(
          digestKey,
          JSON.stringify({ items: [] as DigestItem[] }),
        )
        setDigest(emptyDigest)
        setNoMatchesToday(true)
        return
      }

      matching.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.job.postedDaysAgo - b.job.postedDaysAgo
      })

      const top10 = matching.slice(0, 10)
      const items: DigestItem[] = top10.map(({ job, score }) => ({
        jobId: job.id,
        score,
      }))

      window.localStorage.setItem(digestKey, JSON.stringify({ items }))
      setDigest({ date: dateStr, items })
      setNoMatchesToday(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const buildDigestText = () => {
    if (!digest) return ''
    const dateLabel = new Date(digest.date).toLocaleDateString()
    const lines: string[] = []
    lines.push('Top 10 Jobs For You — 9AM Digest')
    lines.push(dateLabel)
    lines.push('')
    digestJobs.forEach(({ job, score }, index) => {
      lines.push(
        `${index + 1}. ${job.title} — ${job.company} (${job.location}, ${job.experience}) — Match: ${score}%`,
      )
      lines.push(`   Apply: ${job.applyUrl}`)
      lines.push('')
    })
    lines.push('This digest was generated based on your preferences.')
    return lines.join('\n')
  }

  const handleCopy = async () => {
    if (!digest || digestJobs.length === 0) return
    const text = buildDigestText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      // ignore clipboard failures
    }
  }

  const handleEmailDraft = () => {
    if (!digest || digestJobs.length === 0) return
    const text = buildDigestText()
    const subject = 'My 9AM Job Digest'
    const mailto = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(text)}`
    window.location.href = mailto
  }

  const recentStatusUpdates = useMemo(() => {
    const entries = Object.entries(jobStatuses)
    if (entries.length === 0) return []
    const jobsById = new Map(JOBS.map((job) => [job.id, job] as const))
    return entries
      .map(([id, record]) => {
        const job = jobsById.get(Number(id))
        if (!job) return null
        return { job, record }
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.record.updatedAt).getTime() -
          new Date(a!.record.updatedAt).getTime(),
      )
      .slice(0, 5) as { job: Job; record: JobStatusRecord }[]
  }, [jobStatuses])

  return (
    <main className="kpbs-page">
      <h1 className="kpbs-page__title">Digest</h1>
      {!hasPreferences ? (
        <section className="kpbs-card kpbs-card--empty">
          <h2 className="kpbs-card__title">
            Set preferences to generate a personalized digest.
          </h2>
          <p className="kpbs-card__body">
            Configure your roles, locations, and skills in settings to see a tailored 9AM digest.
          </p>
          <p className="kpbs-digest-note">
            Demo Mode: Daily 9AM trigger simulated manually.
          </p>
        </section>
      ) : (
        <>
          <section className="kpbs-card kpbs-card--digest">
            <header className="kpbs-digest-header">
              <div>
                <h2 className="kpbs-card__title">
                  Top 10 Jobs For You — 9AM Digest
                </h2>
                <p className="kpbs-digest-subtitle">{dateStr}</p>
              </div>
              <button
                type="button"
                className="kpbs-button kpbs-button--primary"
                onClick={generateDigest}
                disabled={isGenerating}
              >
                Generate Today&apos;s 9AM Digest (Simulated)
              </button>
            </header>

            {noMatchesToday ? (
              <div className="kpbs-digest-empty">
                <p className="kpbs-card__body">
                  No matching roles today. Check again tomorrow.
                </p>
              </div>
            ) : digest && digestJobs.length > 0 ? (
              <>
                <div className="kpbs-digest-jobs">
                  {digestJobs.map(({ job, score }) => (
                    <div key={job.id} className="kpbs-digest-job">
                      <div className="kpbs-digest-job-main">
                        <h3 className="kpbs-digest-job-title">{job.title}</h3>
                        <p className="kpbs-digest-job-meta">
                          {job.company} · {job.location} · {job.experience}
                        </p>
                      </div>
                      <div className="kpbs-digest-job-actions">
                        <span className="kpbs-badge kpbs-badge--score">
                          {score}% match
                        </span>
                        <button
                          type="button"
                          className="kpbs-button kpbs-button--secondary"
                          onClick={() =>
                            window.open(
                              job.applyUrl,
                              '_blank',
                              'noopener,noreferrer',
                            )
                          }
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <footer className="kpbs-digest-footer">
                  <p className="kpbs-card__body">
                    This digest was generated based on your preferences.
                  </p>
                  <div className="kpbs-digest-actions">
                    <button
                      type="button"
                      className="kpbs-button kpbs-button--secondary"
                      onClick={handleCopy}
                      disabled={!digest || digestJobs.length === 0}
                    >
                      Copy Digest to Clipboard
                    </button>
                    <button
                      type="button"
                      className="kpbs-button kpbs-button--ghost"
                      onClick={handleEmailDraft}
                      disabled={!digest || digestJobs.length === 0}
                    >
                      Create Email Draft
                    </button>
                  </div>
                  <p className="kpbs-digest-note">
                    Demo Mode: Daily 9AM trigger simulated manually.
                  </p>
                </footer>
              </>
            ) : (
              <div className="kpbs-digest-empty">
                <p className="kpbs-card__body">
                  Generate today&apos;s digest to see your top matches.
                </p>
                <p className="kpbs-digest-note">
                  Demo Mode: Daily 9AM trigger simulated manually.
                </p>
              </div>
            )}
          </section>
          {recentStatusUpdates.length > 0 && (
            <section className="kpbs-card">
              <h2 className="kpbs-card__title">Recent Status Updates</h2>
              <div className="kpbs-digest-jobs">
                {recentStatusUpdates.map(({ job, record }) => (
                  <div
                    key={`${job.id}-${record.updatedAt}`}
                    className="kpbs-digest-job"
                  >
                    <div className="kpbs-digest-job-main">
                      <h3 className="kpbs-digest-job-title">{job.title}</h3>
                      <p className="kpbs-digest-job-meta">{job.company}</p>
                    </div>
                    <div className="kpbs-digest-job-actions">
                      <span className="kpbs-badge kpbs-badge--status kpbs-badge--status-neutral">
                        {record.status}
                      </span>
                      <span className="kpbs-job-card__posted">
                        {new Date(record.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

const ProofPage = () => (
  <main className="kpbs-page">
    <h1 className="kpbs-page__title">Proof</h1>
    <section className="kpbs-card kpbs-card--empty">
      <h2 className="kpbs-card__title">Artifact collection coming next.</h2>
      <p className="kpbs-card__body">
        In the next step, you will attach artifacts that show how tracking
        performs across job searches and applications.
      </p>
    </section>
  </main>
)

type JobModalProps = {
  job: Job | null
  onClose: () => void
}

const JobModal = ({ job, onClose }: JobModalProps) => {
  if (!job) return null

  return (
    <div className="kpbs-modal" role="dialog" aria-modal="true">
      <div className="kpbs-modal__backdrop" onClick={onClose} />
      <div className="kpbs-modal__content">
        <header className="kpbs-modal__header">
          <div>
            <h2 className="kpbs-modal__title">{job.title}</h2>
            <p className="kpbs-modal__subtitle">
              {job.company} · {job.location} · {job.mode}
            </p>
          </div>
          <button
            type="button"
            className="kpbs-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <section className="kpbs-modal__body">
          <p className="kpbs-modal__meta">
            Experience: {job.experience} · Salary: {job.salaryRange} · Source: {job.source} ·{' '}
            {formatPosted(job.postedDaysAgo)}
          </p>
          <p className="kpbs-modal__description">{job.description}</p>
          <div className="kpbs-modal__skills">
            {job.skills.map((skill) => (
              <span key={skill} className="kpbs-pill kpbs-pill--skill">
                {skill}
              </span>
            ))}
          </div>
        </section>
        <footer className="kpbs-modal__footer">
          <button
            type="button"
            className="kpbs-button kpbs-button--ghost"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="kpbs-button kpbs-button--primary"
            onClick={() =>
              window.open(job.applyUrl, '_blank', 'noopener,noreferrer')
            }
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedJobIds, setSavedJobIds] = useState<number[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [jobStatuses, setJobStatuses] = useState<Record<number, JobStatusRecord>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem('jnt-saved-jobs')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as number[]
      if (Array.isArray(parsed)) {
        setSavedJobIds(parsed)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    const raw = window.localStorage.getItem('jobTrackerPreferences')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<Preferences>
      setPreferences((prev) => ({
        ...prev,
        ...parsed,
        preferredLocations: parsed.preferredLocations ?? prev.preferredLocations,
        preferredModes: parsed.preferredModes ?? prev.preferredModes,
        minMatchScore:
          typeof parsed.minMatchScore === 'number'
            ? parsed.minMatchScore
            : prev.minMatchScore,
      }))
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      'jobTrackerPreferences',
      JSON.stringify(preferences),
    )
  }, [preferences])

  useEffect(() => {
    const raw = window.localStorage.getItem('jobTrackerStatus')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, JobStatusRecord>
      const normalized: Record<number, JobStatusRecord> = {}
      Object.entries(parsed).forEach(([id, record]) => {
        const numericId = Number(id)
        if (!Number.isNaN(numericId) && record?.status) {
          normalized[numericId] = record
        }
      })
      setJobStatuses(normalized)
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => {
      setToastMessage(null)
    }, 2400)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const handleSaveJob = (id: number) => {
    setSavedJobIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      window.localStorage.setItem('jnt-saved-jobs', JSON.stringify(next))
      return next
    })
  }

  const handleChangeStatus = (jobId: number, status: JobStatus) => {
    setJobStatuses((prev) => {
      const next: Record<number, JobStatusRecord> = {
        ...prev,
        [jobId]: {
          status,
          updatedAt: new Date().toISOString(),
        },
      }
      const serializable: Record<string, JobStatusRecord> = {}
      Object.entries(next).forEach(([id, record]) => {
        serializable[id] = record
      })
      window.localStorage.setItem(
        'jobTrackerStatus',
        JSON.stringify(serializable),
      )
      return next
    })
    setToastMessage(`Status updated: ${status}`)
  }

  const hasPreferences = useMemo(() => {
    return Boolean(
      preferences.roleKeywords.trim() ||
        preferences.skills.trim() ||
        preferences.preferredLocations.length > 0 ||
        preferences.preferredModes.length > 0 ||
        preferences.experienceLevel,
    )
  }, [preferences])

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="kpbs-app">
      <header className="kpbs-topbar">
        <div className="kpbs-topbar__brand">Job Notification Tracker</div>
        <button
          className="kpbs-topbar__menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          className={`kpbs-topbar__nav ${
            menuOpen ? 'kpbs-topbar__nav--open' : ''
          }`}
        >
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `kpbs-topbar__link ${isActive ? 'kpbs-topbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/saved"
            className={({ isActive }) =>
              `kpbs-topbar__link ${isActive ? 'kpbs-topbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Saved
          </NavLink>
          <NavLink
            to="/digest"
            className={({ isActive }) =>
              `kpbs-topbar__link ${isActive ? 'kpbs-topbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Digest
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `kpbs-topbar__link ${isActive ? 'kpbs-topbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Settings
          </NavLink>
          <NavLink
            to="/proof"
            className={({ isActive }) =>
              `kpbs-topbar__link ${isActive ? 'kpbs-topbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Proof
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <JobsDashboard
              jobs={JOBS}
              savedJobIds={savedJobIds}
              preferences={preferences}
              hasPreferences={hasPreferences}
              jobStatuses={jobStatuses}
              onSaveJob={handleSaveJob}
              onViewJob={setSelectedJob}
              onChangeStatus={handleChangeStatus}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              jobsCount={JOBS.length}
              preferences={preferences}
              onChange={setPreferences}
            />
          }
        />
        <Route
          path="/saved"
          element={
            <SavedPage
              savedJobIds={savedJobIds}
              preferences={preferences}
              jobStatuses={jobStatuses}
              onChangeStatus={handleChangeStatus}
              onViewJob={setSelectedJob}
            />
          }
        />
        <Route
          path="/digest"
          element={
            <DigestPage
              preferences={preferences}
              hasPreferences={hasPreferences}
              jobStatuses={jobStatuses}
            />
          }
        />
        <Route path="/proof" element={<ProofPage />} />
      </Routes>
      <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      {toastMessage && (
        <div className="kpbs-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default App
