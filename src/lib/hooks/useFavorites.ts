"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lapredi:favorites";

const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

let cached: string[] | null = null;
function getSnapshot(): string[] {
  const fresh = read();
  if (!cached || cached.length !== fresh.length || cached.some((id, i) => id !== fresh[i])) {
    cached = fresh;
  }
  return cached;
}

function getServerSnapshot(): string[] {
  return [];
}

/** Fixture favorites, kept in localStorage - this app has no user accounts, so there's no server-side place to store them. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function isFavorite(fixtureId: string): boolean {
    return favorites.includes(fixtureId);
  }

  function toggleFavorite(fixtureId: string) {
    const current = read();
    const next = current.includes(fixtureId) ? current.filter((id) => id !== fixtureId) : [...current, fixtureId];
    write(next);
  }

  return { favorites, isFavorite, toggleFavorite };
}
