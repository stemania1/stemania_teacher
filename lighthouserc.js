module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 30000,
      url: [
        "http://localhost:3001/login",
        "http://localhost:3001/privacy-policy",
        "http://localhost:3001/terms",
      ],
      numberOfRuns: 1,
      settings: {
        onlyCategories: ["accessibility"],
        // Skip audits that require authentication
        skipAudits: [],
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
