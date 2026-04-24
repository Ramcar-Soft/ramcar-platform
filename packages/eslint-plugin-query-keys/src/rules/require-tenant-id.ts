import type { Rule } from "eslint";

const QUERY_HOOKS = new Set(["useQuery", "useInfiniteQuery"]);
const TENANT_KEY_PATTERNS = ["tenantId", "activeTenantId"];
const IGNORE_QUERY_KEYS = new Set([
  "access-events", // Bitacora logbook uses URL-scoped key
  "tenants",       // useTenantSelector — cross-tenant by design
  "auth",          // auth/profile queries
  "health",
  "version",
]);

interface ElementInfo {
  value: string;
  isLiteral: boolean;
}

function firstThreeElements(node: Rule.Node): ElementInfo[] {
  if (node.type !== "ArrayExpression") return [];
  const elements = (node as unknown as { elements: Rule.Node[] }).elements;
  return elements.slice(0, 3).map((el): ElementInfo => {
    if (!el) return { value: "", isLiteral: false };
    if (el.type === "Literal") return { value: String((el as unknown as { value: unknown }).value), isLiteral: true };
    if (el.type === "Identifier") return { value: (el as unknown as { name: string }).name, isLiteral: false };
    return { value: "__dynamic__", isLiteral: false };
  });
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Require activeTenantId in TanStack Query keys for scoped queries",
      recommended: true,
    },
    messages: {
      missingTenantId:
        'Query key for "{{ queryName }}" is missing activeTenantId. Add it as the second element: ["{{ resource }}", activeTenantId, ...].',
    },
    schema: [
      {
        type: "object",
        properties: {
          ignore: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as { ignore?: string[] }) ?? {};
    const extraIgnore = new Set(options.ignore ?? []);

    return {
      CallExpression(node) {
        const callNode = node as unknown as {
          callee: { type: string; name?: string };
          arguments: Rule.Node[];
        };

        if (callNode.callee.type !== "Identifier") return;
        if (!QUERY_HOOKS.has(callNode.callee.name ?? "")) return;

        const firstArg = callNode.arguments[0];
        if (!firstArg || firstArg.type !== "ObjectExpression") return;

        const objNode = firstArg as unknown as {
          properties: Array<{
            type: string;
            key: { type: string; name?: string; value?: string };
            value: Rule.Node;
          }>;
        };

        const queryKeyProp = objNode.properties.find(
          (p) =>
            p.type === "Property" &&
            (p.key.name === "queryKey" || p.key.value === "queryKey"),
        );

        if (!queryKeyProp) return;

        const keyNode = queryKeyProp.value as Rule.Node;
        const elements = firstThreeElements(keyNode);
        if (elements.length === 0) return;

        const first = elements[0];
        // Only check when the first element is a string literal (static resource name)
        if (!first || !first.isLiteral) return;
        const resourceName = first.value;
        if (!resourceName) return;
        if (IGNORE_QUERY_KEYS.has(resourceName)) return;
        if (extraIgnore.has(resourceName)) return;

        const hasTenantKey = elements.some(
          (el) => TENANT_KEY_PATTERNS.includes(el.value),
        );

        if (!hasTenantKey) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "missingTenantId",
            data: {
              queryName: callNode.callee.name ?? "useQuery",
              resource: resourceName,
            },
          });
        }
      },
    };
  },
};

export default rule;
