export type BashPolicyDecision =
  | "allow"
  | "block-direct-commit"
  | "block-push"

export function classifyBashCommand(command: string): BashPolicyDecision {
  const normalized = command.trim()

  if (/\bgit\s+push(\s|$)/i.test(normalized)) {
    return "block-push"
  }

  if (/\bgit\s+commit(\s|$)/i.test(normalized)) {
    return "block-direct-commit"
  }

  return "allow"
}
