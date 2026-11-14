import { useSession } from "../../lib/main";

export const SessionConsumer = () => {
  const { user, isLoading } = useSession();

  if (isLoading) return <div>Loading...</div>;
  return <div>Hello {user?.name ?? "guest"}</div>;
};
