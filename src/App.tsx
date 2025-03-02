import { SessionProvider } from "../";
import { ResponseModel } from "../dist/Model/ResponseModel";
import { SessionUser } from "../dist/Model/SessionUser";
import "./App.css";
import { SessionConsumer } from "./Components/SessionConsumer";

const getSessionInfo = async (): Promise<ResponseModel<SessionUser>> => {
  return new ResponseModel<SessionUser>().withData({
    id: "1",
    name: "John Doe",
    user: "JohnDoe",
    email: "john-doe@fake.com",
    roles: ["guest"],
    permissions: [],
  });
};

const requestLogout = async () => {
  return new ResponseModel<void>();
};

function App() {
  return (
    <SessionProvider
      getSessionInfo={getSessionInfo}
      requestLogout={requestLogout}
    >
      <SessionConsumer />
    </SessionProvider>
  );
}

export default App;
