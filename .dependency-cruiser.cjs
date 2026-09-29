/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Warn about circular dependencies across modules',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'lib-no-ui',
      severity: 'error',
      comment: 'Core libraries and business logic must not depend on UI components or pages',
      from: {
        path: '^lib/',
      },
      to: {
        path: '^(app|components)/',
      },
    },
    {
      name: 'hooks-no-app',
      severity: 'error',
      comment: 'Custom hooks must not import from app pages or layouts',
      from: {
        path: '^hooks/',
      },
      to: {
        path: '^app/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
