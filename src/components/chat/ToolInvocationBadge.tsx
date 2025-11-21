import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args?: any;
  result?: any;
}

function getToolDescription(toolName: string, args?: any): string {
  if (toolName === "str_replace_editor" && args?.command) {
    const path = args.path || "";
    const fileName = path.split("/").pop() || "file";

    switch (args.command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
        return `Editing ${fileName}`;
      case "insert":
        return `Inserting into ${fileName}`;
      case "view":
        return `Viewing ${fileName}`;
      default:
        return `Modifying ${fileName}`;
    }
  }

  if (toolName === "file_manager" && args?.command) {
    const path = args.path || "";
    const fileName = path.split("/").pop() || "file";

    switch (args.command) {
      case "rename":
        const newFileName = args.new_path?.split("/").pop() || "file";
        return `Renaming ${fileName} to ${newFileName}`;
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return `Managing ${fileName}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({
  toolName,
  state,
  args,
  result,
}: ToolInvocationBadgeProps) {
  const description = getToolDescription(toolName, args);
  const isComplete = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{description}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{description}</span>
        </>
      )}
    </div>
  );
}
