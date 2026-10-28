"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { LabDockProps, LabKind } from "@/components/dock/types";
import { Button, Callout, Chip, Icon, SegmentedControl } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { fetchEvents, fetchNearby, type FailCode } from "@/lib/search/client";
import { useSearchT, type SearchT } from "@/lib/search/messages";
import { EVENT_TOPICS, cityOf } from "@/lib/search/topics";
import { NEARBY_KINDS, type MakerEvent, type NearbyKind, type Place } from "@/lib/search/types";
import { PanelHead, PanelSkeleton, SearchFailure, SearchNotSetUp, StatusError, external, useFormat, useSearchAvailability, type Format } from "./shared";

/** Where the search is centred: a typed place, or the browser's position (asked for only on a click). */
type Where = { near: string } | { ll: string };

type Outcome<T> = { ok: true; items: T[] } | { ok: false; code: FailCode };

const DEFAULT_KIND: Record<LabKind, NearbyKind> = { drone: "flying-field", robotics: "makerspace", board: "electronics" };

function PlaceItem({ place, t, f }: { place: Place; t: SearchT; f: Format }) {
  return (
    <li className="space-y-1 py-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 text-sm font-semibold">{place.title}</h4>
        {place.distanceKm !== undefined ? (
          <Chip tone="plain" className="shrink-0 tabular">
            {t("nearby.distance", { km: f.one(place.distanceKm) })}
          </Chip>
        ) : null}
      </div>
      {place.address ? <p className="text-sm text-muted">{place.address}</p> : null}
      {place.rating !== undefined ? (
        <p className="text-sm">
          <span>{t("nearby.rating", { rating: f.one(place.rating) })}</span>
          {place.reviews !== undefined ? <span className="text-muted"> · {t("nearby.reviews", { count: place.reviews })}</span> : null}
        </p>
      ) : null}
      {place.hours ? <p className="font-ui text-xs text-muted">{place.hours}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
        <a href={place.mapsUrl} {...external} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
          {t("nearby.maps", { place: place.title })}
          <Icon name="external" size={14} aria-hidden="true" />
        </a>
        {place.url ? (
          <a href={place.url} {...external} className="inline-flex items-center gap-1 underline underline-offset-2">
            {t("nearby.website", { place: place.title })}
            <Icon name="external" size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function EventItem({ event, t }: { event: MakerEvent; t: SearchT }) {
  return (
    <li>
      <a
        href={event.url}
        {...external}
        aria-label={t("nearby.eventLink", { event: event.title })}
        className="-mx-2 flex gap-3 rounded-ink-sm p-2 no-underline hover:bg-sunken"
      >
        {event.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote thumbnail from Google's CDN
          <img src={event.thumbnail} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-ink border-2 border-line object-cover" />
        ) : null}
        <span className="min-w-0">
          <span className="block font-semibold">{event.title}</span>
          <span className="block font-ui text-xs">{event.when}</span>
          <span className="block truncate text-sm text-muted">{event.address ?? event.venue}</span>
        </span>
      </a>
    </li>
  );
}

/** Makerspaces, shops and flying fields near a place or the user, plus maker events. */
export function NearbyPanel({ lab }: LabDockProps) {
  const locale = useLocale();
  const t = useSearchT(locale);
  const f = useFormat(locale);
  const availability = useSearchAvailability();
  const id = useId();
  const [kind, setKind] = useState<NearbyKind>(DEFAULT_KIND[lab]);
  const [draft, setDraft] = useState("");
  const [where, setWhere] = useState<Where | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied" | "failed">("idle");
  const [places, setPlaces] = useState<{ key: string; outcome: Outcome<Place> } | null>(null);
  const [events, setEvents] = useState<{ key: string; outcome: Outcome<MakerEvent> } | null>(null);
  const [eventsRequested, setEventsRequested] = useState<string | null>(null);

  const ready = availability === "ready" && where !== null;
  const placesKey = where ? `${kind}|${"near" in where ? where.near : where.ll}|${locale}` : "";

  useEffect(() => {
    if (!ready || !where) return;
    const controller = new AbortController();
    const input = "near" in where ? { kind, near: where.near, hl: locale } : { kind, ll: where.ll, hl: locale };
    fetchNearby(input, controller.signal)
      .then((r) => setPlaces({ key: placesKey, outcome: r.ok ? { ok: true, items: r.data.places } : r }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [ready, where, kind, locale, placesKey]);

  const placeOutcome = places?.key === placesKey ? places.outcome : null;
  // Events need a place name: the typed one, or the city of the nearest result.
  const eventPlace = where && "near" in where ? where.near : placeOutcome?.ok ? (placeOutcome.items.map((p) => cityOf(p.address)).find(Boolean) ?? null) : null;
  const eventsKey = eventPlace ? `${lab}|${eventPlace}` : "";

  useEffect(() => {
    if (availability !== "ready" || !eventPlace || eventsRequested !== eventsKey) return;
    const controller = new AbortController();
    fetchEvents({ q: EVENT_TOPICS[lab], near: eventPlace }, controller.signal)
      .then((r) => setEvents({ key: eventsKey, outcome: r.ok ? { ok: true, items: r.data.events } : r }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [availability, eventPlace, eventsKey, eventsRequested, lab]);

  const eventOutcome = events?.key === eventsKey ? events.outcome : null;

  if (!t) return <PanelSkeleton />;

  function submit(event: FormEvent) {
    event.preventDefault();
    const near = draft.trim();
    if (near.length >= 2) setWhere({ near });
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocating("failed");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Three decimals (about 100 m) is plenty for "near me" and keeps the exact spot private.
        const lat = pos.coords.latitude.toFixed(3);
        const lng = pos.coords.longitude.toFixed(3);
        setWhere({ ll: `@${lat},${lng},13z` });
        setLocating("idle");
      },
      (error) => setLocating(error.code === error.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const loadingPlaces = ready && !placeOutcome;
  const eventsAsked = eventsRequested === eventsKey;
  const loadingEvents = availability === "ready" && eventsAsked && !eventOutcome;

  return (
    <section className="space-y-3" aria-labelledby={`${id}-title`}>
      <PanelHead id={`${id}-title`} title={t("nearby.title")} lede={t("nearby.lede")} />
      {availability === "loading" ? <PanelSkeleton /> : null}
      {availability === "error" ? <StatusError t={t} /> : null}
      {availability === "off" || availability === "needs_key" ? <SearchNotSetUp availability={availability} what={t("nearby.needsKey")} /> : null}
      {availability === "ready" ? (
        <>
          <SegmentedControl
            label={t("nearby.kindLabel")}
            size="sm"
            value={kind}
            onChange={setKind}
            options={NEARBY_KINDS.map((k) => ({ value: k, label: t(`nearby.kind.${k}`) }))}
            className="max-w-full overflow-x-auto"
          />
          <form onSubmit={submit} className="flex flex-wrap gap-2" role="search">
            <label htmlFor={`${id}-place`} className="sr-only">
              {t("nearby.place")}
            </label>
            <input
              id={`${id}-place`}
              type="text"
              autoComplete="address-level2"
              placeholder={t("nearby.placeHint")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={120}
              className="ink-field min-w-0 flex-1 basis-40"
            />
            <Button type="submit" size="sm" disabled={draft.trim().length < 2}>
              {t("nearby.search")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={locate} disabled={locating === "busy"} aria-describedby={`${id}-privacy`}>
              <Icon name="globe" size={16} aria-hidden="true" />
              {locating === "busy" ? t("nearby.locating") : t("nearby.locate")}
            </Button>
          </form>
          <p id={`${id}-privacy`} className="text-xs text-muted">
            {t("nearby.privacy")}
          </p>
          {locating === "denied" || locating === "failed" ? (
            <Callout tone="warn" live>
              {locating === "denied" ? t("nearby.locationDenied") : t("nearby.locationFailed")}
            </Callout>
          ) : null}
          {kind === "flying-field" ? <Callout tone="tip">{t("nearby.fieldSafety")}</Callout> : null}

          <div aria-live="polite" aria-busy={loadingPlaces}>
            {!where ? <p className="text-sm text-muted">{t("nearby.start")}</p> : null}
            {loadingPlaces ? <p className="text-sm text-muted">{t("nearby.loading")}</p> : null}
            {placeOutcome && !placeOutcome.ok ? <SearchFailure code={placeOutcome.code} t={t} what={t("nearby.needsKey")} generic={t("nearby.failed")} /> : null}
            {placeOutcome?.ok && placeOutcome.items.length === 0 ? <p className="text-sm text-muted">{t("nearby.empty")}</p> : null}
            {placeOutcome?.ok && placeOutcome.items.length > 0 ? (
              <ul className="divide-y divide-rule">
                {placeOutcome.items.map((place) => (
                  <PlaceItem key={place.mapsUrl} place={place} t={t} f={f} />
                ))}
              </ul>
            ) : null}
          </div>

          {eventPlace ? (
            <section aria-labelledby={`${id}-events`} aria-busy={loadingEvents} className="space-y-2">
              <h3 id={`${id}-events`} className="ink-kicker">
                {t("nearby.events")}
              </h3>
              {!eventsAsked ? (
                <Button type="button" size="sm" onClick={() => setEventsRequested(eventsKey)}>
                  {t("nearby.findEvents")}
                </Button>
              ) : null}
              {loadingEvents ? <p className="text-sm text-muted">{t("nearby.loading")}</p> : null}
              {eventOutcome && !eventOutcome.ok ? <SearchFailure code={eventOutcome.code} t={t} what={t("nearby.needsKey")} generic={t("nearby.failed")} /> : null}
              {eventOutcome?.ok && eventOutcome.items.length === 0 ? (
                <p className="text-sm text-muted">{t("nearby.eventsEmpty", { place: eventPlace })}</p>
              ) : null}
              {eventOutcome?.ok && eventOutcome.items.length > 0 ? (
                <ul className="grid gap-2">
                  {eventOutcome.items.map((event) => (
                    <EventItem key={event.url + event.when} event={event} t={t} />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
