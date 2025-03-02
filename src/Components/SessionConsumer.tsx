import { useEffect } from "react";
import { useSession } from "../../";

export const SessionConsumer = () => {
  const { user, isLoading } = useSession();

  useEffect(() => {
    console.log(user);
    console.log(isLoading);
  }, [user, isLoading]);

  return <div>Hello world</div>;
};
