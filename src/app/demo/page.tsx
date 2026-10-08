import { WorkspaceDashboard } from "@/components/workspace-dashboard";
export default function Demo() {
  return (
    <WorkspaceDashboard
      demo
      name="Ian’s Studio"
      userName="Ian"
      role="owner"
      projects={[
        {
          id: "1",
          name: "Savanna brand identity",
          client: "Savanna Coffee",
          category: "Brand design",
          progress: 65,
          status: "In progress",
          due: "Due in 8 days",
        },
        {
          id: "2",
          name: "A new home on the web",
          client: "Nuru Collective",
          category: "Web development",
          progress: 85,
          status: "Awaiting approval",
          due: "Due in 3 days",
        },
        {
          id: "3",
          name: "Spring campaign",
          client: "Bloom Studio",
          category: "Creative direction",
          progress: 25,
          status: "In progress",
          due: "Due in 14 days",
        },
      ]}
    />
  );
}
