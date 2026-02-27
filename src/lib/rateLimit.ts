import { createRateLimitMiddleware, getClientIp } from "@stemania/shared";

const middleware = createRateLimitMiddleware({ prefix: "teacher" });

export const checkRateLimit = middleware.checkRateLimit;
export const checkAuthRateLimit = middleware.checkAuthRateLimit;
export { getClientIp };
