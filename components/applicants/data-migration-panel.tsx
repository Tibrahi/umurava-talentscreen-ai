"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export function DataMigrationPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/applicants/migrate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!result && !error) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h3 className="font-semibold text-blue-900">Data Migration Available</h3>
            <p className="text-sm text-blue-800 mt-1">
              Some applicants may need their profiles updated to the new structured format.
            </p>
            <Button
              onClick={handleMigrate}
              disabled={isLoading}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h3 className="font-semibold text-red-900">Migration Error</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setResult(null);
              }}
              className="mt-3"
              variant="outline"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h3 className="font-semibold text-green-900">Migration Completed</h3>
            <div className="text-sm text-green-800 mt-2 space-y-1">
              <p>Total applicants processed: {result.total}</p>
              <p className="text-green-700 font-medium">✓ Successful: {result.successful}</p>
              {result.failed > 0 && (
                <p className="text-red-700 font-medium">✗ Failed: {result.failed}</p>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <details className="mt-3 cursor-pointer">
                <summary className="text-sm font-medium text-green-900 hover:text-green-700">
                  View errors ({result.errors.length})
                </summary>
                <div className="mt-2 space-y-1 text-xs text-red-700 bg-white p-2 rounded border border-red-200 max-h-40 overflow-y-auto">
                  {result.errors.map((err: any, idx: number) => (
                    <div key={idx} className="break-words">
                      <strong>{err.id}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </details>
            )}
            <Button
              onClick={() => {
                setError(null);
                setResult(null);
              }}
              className="mt-3"
              variant="outline"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
