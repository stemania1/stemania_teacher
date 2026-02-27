import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function handleApiError(
  error: unknown,
  defaultMessage: string = "Internal server error",
  defaultStatus: number = 500
): NextResponse<{ error: string }> {
  console.error("API Error:", error);

  const isClientError =
    error instanceof Error &&
    (error.message === "Unauthorized" || error.message === "Forbidden");
  if (!isClientError) {
    Sentry.captureException(error);
  }

  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const errorMessage = error.message || defaultMessage;
    const statusCode = (error as any).status || (error as any).statusCode || defaultStatus;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }

  if (typeof error === "string") {
    if (error === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error }, { status: defaultStatus });
  }

  if (error && typeof error === "object") {
    const errorObj = error as any;
    if (errorObj.message) {
      return handleApiError(new Error(errorObj.message), defaultMessage, defaultStatus);
    }
    if (errorObj.error) {
      return NextResponse.json(
        { error: errorObj.error },
        { status: errorObj.status || defaultStatus }
      );
    }
  }

  return NextResponse.json({ error: defaultMessage }, { status: defaultStatus });
}

export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}
