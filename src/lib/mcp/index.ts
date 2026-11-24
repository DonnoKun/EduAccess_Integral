import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGroups from "./tools/list-groups";
import listLessons from "./tools/list-lessons";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "eduaccess-integral",
  title: "EduAccess Integral",
  version: "0.1.0",
  instructions: "Tools for EduAccess Integral: list the signed-in user's course groups and the lessons inside a group.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGroups, listLessons],
});
