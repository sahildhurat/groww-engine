"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import MiniSearch from "minisearch";
import { Search, Filter, X, ChevronLeft, ChevronRight, Layers, Tag, ExternalLink, Calendar, Briefcase, DollarSign, Quote, AlertCircle, Loader2 } from "lucide-react";

interface Story {
  uid: string;
  source: string;
  scope: string;
  posted?: string;
  group: string;
  action: string;
  routes?: string[];
  areas?: string[];
  quote?: string;
  spans?: Record<string, any>;
  work?: string;
  age?: number | string;
  amount?: number;
  first_time?: boolean;
  targeted?: boolean;
  unmet_need?: { v?: string; s?: string };
}

interface Manifest {
  total_stories: number;
  chunk_count: number;
  chunk_files: string[];
  total_size_bytes: number;
}

const PAGE_SIZE = 20;

export function StoryExplorer({ manifest }: { manifest: Manifest }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stories accumulator
  const [stories, setStories] = useState<Story[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(true);

  // Search input state (debounced sync to URL)
  const qParam = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState<string>(qParam);

  // Filters from URL
  const selectedGroup = searchParams.get("group") || "all";
  const selectedSource = searchParams.get("source") || "all";
  const selectedScope = searchParams.get("scope") || "all";
  const selectedRoute = searchParams.get("route") || "all";
  const selectedArea = searchParams.get("area") || "all";
  const selectedWork = searchParams.get("work") || "all";
  const selectedFirstTime = searchParams.get("first_time") || "all";
  const selectedPage = parseInt(searchParams.get("page") || "1", 10);

  // MiniSearch instance ref
  const miniSearchRef = useRef<MiniSearch | null>(null);

  // Initialize MiniSearch once
  useEffect(() => {
    miniSearchRef.current = new MiniSearch({
      fields: ["quote", "unmet_need", "spans_text", "uid"],
      storeFields: ["uid"],
      searchOptions: {
        boost: { quote: 2, unmet_need: 1.5, uid: 3 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }, []);

  // Fetch chunks progressively: chunk 1 immediately, then chunks 2..N
  useEffect(() => {
    let cancelled = false;

    async function loadAllChunks() {
      setIsLoadingMore(true);
      const total = manifest.chunk_count;

      for (let i = 1; i <= total; i++) {
        if (cancelled) break;
        try {
          const res = await fetch(`/api/stories?chunk=${i}`);
          if (!res.ok) continue;
          const chunkStories: Story[] = await res.json();
          if (cancelled) break;

          // Index in MiniSearch
          if (miniSearchRef.current) {
            const docs = chunkStories.map((s) => {
              const spansText = s.spans
                ? Object.values(s.spans)
                    .map((item: any) => {
                      if (typeof item === "string") return item;
                      if (Array.isArray(item)) return item.map((sub: any) => sub?.s || sub?.v || "").join(" ");
                      return item?.s || item?.v || "";
                    })
                    .join(" ")
                : "";

              return {
                id: s.uid,
                uid: s.uid,
                quote: s.quote || "",
                unmet_need: s.unmet_need?.v || "",
                spans_text: spansText,
              };
            });
            miniSearchRef.current.addAll(docs);
          }

          setStories((prev) => [...prev, ...chunkStories]);
          setLoadedChunks(i);
        } catch (err) {
          console.error(`Error loading story chunk ${i}:`, err);
        }
      }
      setIsLoadingMore(false);
    }

    loadAllChunks();

    return () => {
      cancelled = true;
    };
  }, [manifest.chunk_count]);

  // URL helper to push state changes
  const updateFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all" || !val) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
      params.set("page", "1"); // reset page on filter change
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Free text query execution
  const matchedUids = useMemo(() => {
    if (!qParam.trim() || !miniSearchRef.current) return null;
    try {
      const results = miniSearchRef.current.search(qParam.trim());
      return new Set(results.map((r) => r.id as string));
    } catch {
      return null;
    }
  }, [qParam, stories.length]);

  // Apply filters
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (matchedUids && !matchedUids.has(story.uid)) {
        return false;
      }
      if (selectedGroup !== "all" && story.group !== selectedGroup) {
        return false;
      }
      if (selectedSource !== "all" && story.source !== selectedSource) {
        return false;
      }
      if (selectedScope !== "all" && story.scope !== selectedScope) {
        return false;
      }
      if (selectedRoute !== "all" && !(story.routes || []).includes(selectedRoute)) {
        return false;
      }
      if (selectedArea !== "all" && !(story.areas || []).includes(selectedArea)) {
        return false;
      }
      if (selectedWork !== "all" && story.work !== selectedWork) {
        return false;
      }
      if (selectedFirstTime === "first_time" && story.first_time !== true) {
        return false;
      }
      if (selectedFirstTime === "experienced" && story.first_time === true) {
        return false;
      }
      return true;
    });
  }, [
    stories,
    matchedUids,
    selectedGroup,
    selectedSource,
    selectedScope,
    selectedRoute,
    selectedArea,
    selectedWork,
    selectedFirstTime,
  ]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredStories.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, selectedPage), totalPages);
  const pageStories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStories.slice(start, start + PAGE_SIZE);
  }, [filteredStories, currentPage]);

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters =
    qParam !== "" ||
    selectedGroup !== "all" ||
    selectedSource !== "all" ||
    selectedScope !== "all" ||
    selectedRoute !== "all" ||
    selectedArea !== "all" ||
    selectedWork !== "all" ||
    selectedFirstTime !== "all";

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        {/* Top line: Search and Clear */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quotes, needs, spans or IDs, then press Enter"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("q", searchInput);
                }
              }}
              className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  updateFilter("q", "");
                }}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => updateFilter("q", searchInput)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition shrink-0"
          >
            Search
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition shrink-0 inline-flex items-center gap-1.5"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        {/* Filter Selects Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Group</label>
            <select
              value={selectedGroup}
              onChange={(e) => updateFilter("group", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Groups</option>
              <option value="stop">Stopped / Cancelled</option>
              <option value="consider">Considering Stop</option>
              <option value="cont">Kept Going</option>
              <option value="none">No action stated</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => updateFilter("source", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Sources</option>
              <option value="reddit_post">Reddit Post</option>
              <option value="reddit_comment">Reddit Comment</option>
              <option value="youtube_comment">YouTube Comment</option>
              <option value="app_review">App Review</option>
              <option value="tradingqna">TradingQ&A</option>
              <option value="x_post">X / Twitter</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Scope</label>
            <select
              value={selectedScope}
              onChange={(e) => updateFilter("scope", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Scopes</option>
              <option value="groww">Groww</option>
              <option value="other_app">Other App</option>
              <option value="general">General / Unspecified</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Opportunity Area</label>
            <select
              value={selectedArea}
              onChange={(e) => updateFilter("area", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Opportunity Areas</option>
              <option value="A_first_debit_and_autopay">A: First debit & autopay</option>
              <option value="B_money_status_and_resolution">B: Money status & support</option>
              <option value="C_returns_expectations">C: Returns vs expectations</option>
              <option value="D_cash_flow_flex">D: Cash flow flex</option>
              <option value="E_sip_control">E: SIP control</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Stop Route</label>
            <select
              value={selectedRoute}
              onChange={(e) => updateFilter("route", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Stop Routes</option>
              <option value="app_friction">App Friction</option>
              <option value="returns_dissatisfaction">Returns Dissatisfaction</option>
              <option value="advice_external">External Advice</option>
              <option value="cash_flow">Cash Flow Shock</option>
              <option value="sip_control">SIP Control</option>
              <option value="market_fear">Market Fear</option>
              <option value="target_reached">Target Reached</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">First-Time</label>
            <select
              value={selectedFirstTime}
              onChange={(e) => updateFilter("first_time", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Investors</option>
              <option value="first_time">First-time explicitly confirmed</option>
              <option value="experienced">Experienced</option>
            </select>
          </div>
        </div>

        {/* Status / Loading Line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-foreground">{filteredStories.length.toLocaleString()}</strong> of{" "}
              {stories.length.toLocaleString()} loaded stories
              {filteredStories.some((st) => st.targeted) && (
                <span className="block text-xs">
                  Includes {filteredStories.filter((st) => st.targeted).length.toLocaleString()} targeted top-up stories
                  (marked), which the shares on the other pages leave out.
                </span>
              )}
            </span>
            {isLoadingMore && (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                loading corpus chunk {loadedChunks + 1} of {manifest.chunk_count}...
              </span>
            )}
          </div>
          <div>Page {currentPage} of {totalPages}</div>
        </div>
      </div>

      {/* Story Cards List */}
      <div className="space-y-4">
        {pageStories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No stories match your current filters.</p>
            <p className="text-xs text-muted-foreground">Try clearing search terms or resetting dropdown filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          pageStories.map((story) => (
            <div
              key={story.uid}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-primary/40 transition"
            >
              {/* Card Header: UID, Source, Date, Group Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-medium break-all">
                    {story.uid}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {story.source?.replace("_", " ")}
                  </span>
                  {story.posted && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {story.posted}
                    </span>
                  )}
                  {story.scope && story.scope !== "general" && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium capitalize">
                      {story.scope.replace("_", " ")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      story.group === "stop"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        : story.group === "consider"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : story.group === "cont"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {story.group === "stop"
                      ? "Stopped"
                      : story.group === "consider"
                      ? "Considering Stop"
                      : story.group === "cont"
                      ? "Kept Going"
                      : "No action stated"}
                  </span>
                  {story.targeted && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                      Targeted top-up
                    </span>
                  )}
                </div>
              </div>

              {/* Quote Block */}
              {story.quote ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Quote className="h-3 w-3" />
                    Verbatim Quote
                  </div>
                  <blockquote className="border-l-2 border-primary/60 pl-3 py-1 text-sm italic text-foreground/90 font-serif leading-relaxed">
                    &ldquo;{story.quote}&rdquo;
                  </blockquote>
                </div>
              ) : null}

              {/* Unmet Need */}
              {story.unmet_need?.v && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground/90">Unmet Need (Interpreted)</div>
                  <div className="text-muted-foreground">{story.unmet_need.v}</div>
                  {story.unmet_need.s && (
                    <div className="text-[11px] italic text-muted-foreground/80 mt-1">
                      Evidence: &ldquo;{story.unmet_need.s}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* Evidence Spans Grid */}
              {story.spans && Object.keys(story.spans).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Grounded Evidence Spans
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {Object.entries(story.spans).map(([key, item]: [string, any]) => {
                      if (key === "unmet_need") return null;
                      const spanItems = Array.isArray(item) ? item : [item];

                      return (
                        <div key={key} className="rounded-md border border-border/70 bg-background/50 p-2.5 space-y-1">
                          <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
                            {key.replace(/_/g, " ")}
                          </span>
                          {spanItems.map((si, idx) => (
                            <div key={idx} className="space-y-0.5">
                              {si.v && (
                                <div className="font-medium text-foreground text-[11px]">
                                  {typeof si.v === "string" ? si.v.replace(/_/g, " ") : String(si.v)}
                                </div>
                              )}
                              {si.s && (
                                <div className="text-[11px] text-muted-foreground italic bg-muted/30 px-1.5 py-0.5 rounded">
                                  &ldquo;{si.s}&rdquo;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags & Metadata Footer */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50 text-xs">
                {story.routes?.map((route) => (
                  <span
                    key={route}
                    className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {route.replace(/_/g, " ")}
                  </span>
                ))}

                {story.areas?.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
                  >
                    Area {area.charAt(0)}
                  </span>
                ))}

                {story.work && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Briefcase className="h-2.5 w-2.5" />
                    {story.work}
                  </span>
                )}

                {story.amount ? (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <DollarSign className="h-2.5 w-2.5" />
                    ₹{story.amount.toLocaleString()}
                  </span>
                ) : null}

                {story.first_time && (
                  <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                    First-Time
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

