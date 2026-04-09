"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Applicant, ApplicantInput, Job, JobInput, ScreeningResult } from "@/lib/types";

// This central API service powers all data fetching and mutations for predictable app state.
// RTK Query gives caching, invalidation, and optimistic update hooks in one consistent layer.
export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Job", "Applicant", "Screening", "Dashboard"],
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], void>({
      query: () => "/jobs",
      providesTags: ["Job"],
    }),
    createJob: builder.mutation<Job, JobInput>({
      query: (body) => ({ url: "/jobs", method: "POST", body }),
      invalidatesTags: ["Job", "Dashboard"],
    }),
    updateJob: builder.mutation<Job, { id: string; data: JobInput }>({
      query: ({ id, data }) => ({ url: `/jobs/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Job", "Dashboard"],
    }),
    deleteJob: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: "DELETE" }),
      invalidatesTags: ["Job", "Dashboard", "Screening"],
    }),
    getApplicants: builder.query<Applicant[], void>({
      query: () => "/applicants",
      providesTags: ["Applicant"],
    }),
    createApplicant: builder.mutation<Applicant, ApplicantInput | Record<string, unknown>>({
      query: (body) => ({ url: "/applicants", method: "POST", body }),
      invalidatesTags: ["Applicant", "Dashboard"],
    }),
    updateApplicant: builder.mutation<
      Applicant,
      { id: string; data: ApplicantInput | Record<string, unknown> }
    >({
      query: ({ id, data }) => ({ url: `/applicants/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Applicant", "Dashboard", "Screening"],
    }),
    deleteApplicant: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/applicants/${id}`, method: "DELETE" }),
      invalidatesTags: ["Applicant", "Dashboard", "Screening"],
    }),
    bulkApplicants: builder.mutation<{ insertedCount: number }, { applicants: ApplicantInput[] }>({
      query: (body) => ({ url: "/applicants/bulk", method: "POST", body }),
      invalidatesTags: ["Applicant", "Dashboard"],
    }),
    uploadResumes: builder.mutation<{ insertedCount: number }, FormData>({
      query: (formData) => ({ url: "/applicants/upload-resumes", method: "POST", body: formData }),
      invalidatesTags: ["Applicant", "Dashboard"],
    }),
    runScreening: builder.mutation<
      ScreeningResult,
      { jobId: string; topN: 10 | 20; applicantIds?: string[] }
    >({
      query: (body) => ({ url: "/screenings/run", method: "POST", body }),
      invalidatesTags: ["Screening", "Dashboard"],
    }),
    getScreenings: builder.query<ScreeningResult[], void>({
      query: () => "/screenings",
      providesTags: ["Screening"],
    }),
    getDashboardSummary: builder.query<
      { jobs: number; applicants: number; screenings: number; latestScreeningAt?: string },
      void
    >({
      query: () => "/dashboard/summary",
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useGetApplicantsQuery,
  useCreateApplicantMutation,
  useUpdateApplicantMutation,
  useDeleteApplicantMutation,
  useBulkApplicantsMutation,
  useUploadResumesMutation,
  useRunScreeningMutation,
  useGetScreeningsQuery,
  useGetDashboardSummaryQuery,
} = appApi;
