'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Project, CreateProjectRequest } from '@blueprint/shared';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchJson<T>(url: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  const json = await res.json();
  return json.data as T;
}

export function useProjects() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchJson<Project[]>(`${API}/api/v1/projects`, undefined, token),
    enabled: !!token,
  });
}

export function useProject(id: string) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchJson<Project>(`${API}/api/v1/projects/${id}`, undefined, token),
    enabled: !!id && !!token,
  });
}

export function useCreateProject() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      fetchJson<Project>(
        `${API}/api/v1/projects`,
        { method: 'POST', body: JSON.stringify(data) },
        token,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
