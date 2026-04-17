import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next/*", "next"],
              message: "@ramcar/features must not import from Next.js — use adapter ports instead.",
            },
            {
              group: ["@supabase/supabase-js", "@supabase/ssr"],
              message: "@ramcar/features must not import Supabase — use the transport adapter port instead.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='use client']",
          message: "@ramcar/features must not use the 'use client' directive — it is platform-neutral.",
        },
        {
          selector: "MemberExpression[object.name='window'][property.name='electron']",
          message: "@ramcar/features must not reference window.electron — use the transport adapter port instead.",
        },
      ],
    },
  },
];
