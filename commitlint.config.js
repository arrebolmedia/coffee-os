module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Code style (formatting, missing semicolons, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI configuration
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Revert a previous commit
        'security', // Security improvements
        'wip',      // Work in progress
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'pos',
        'admin',
        'mobile',
        'ui',
        'database',
        'shared',
        'integrations',
        'auth',
        'users',
        'organizations',
        'inventory',
        'recipes',
        'quality',
        'crm',
        'finance',
        'hr',
        'analytics',
        'twilio',
        'mailrelay',
        'cfdi',
        'redis',
        'infra',
        'ci',
        'docs',
        'ide',
        'agent',
        'evals',
      ],
    ],
    'scope-empty': [1, 'never'],
    'subject-case': [2, 'never', ['upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
