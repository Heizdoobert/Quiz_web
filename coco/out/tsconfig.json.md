# tsconfig.json
lines:37 exports:
---
{
  "compilerOptions": { "baseUrl": ".",
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": false,
    "plugins": [{ "name": "next" }],
    "paths": {
    "@/lib/*": ["./lib/*"],
      "@/*": ["./*"],
      "@heizdoobert/quickquiz-sdk": ["./sdk/src/index.ts"],
      "@heizdoobert/quickquiz-sdk/client": ["./sdk/src/client/index.ts"],
      "@heizdoobert/quickquiz-sdk/server": ["./sdk/src/server/index.ts"],
      "@heizdoobert/quickquiz-ui": ["./packages/ui/src/index.ts"],
      "@heizdoobert/quickquiz-ui/styles.css": ["./packages/ui/src/styles/tokens.css"],
      "@quizweb/sdk-core": ["./sdk/shared_modules/src/index.ts"]
    }
  },
  "exclude": ["node_modules", ".agents", "mobile", "sdk/dist", "server", "lib/api"],
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ]
}
